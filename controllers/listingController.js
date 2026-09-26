const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * @desc   Create a new produce listing & trigger AI classification
 * @route  POST /api/listings
 */
const createProduceListing = async (req, res) => {
  try {
    const {
      farmerId,
      cropType,
      quantityKg,
      harvestDate,
      storageType,
      ambientTemp,
      county,
      subCounty,
      latitude,
      longitude,
      startingPricePerKg
    } = req.body;

    // Calculate days since harvest for the ML model
    const harvest = new Date(harvestDate);
    const today = new Date();
    const diffTime = Math.abs(today - harvest);
    const daysSinceHarvest = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // 1. Call Python FastAPI AI Microservice
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/predict`, {
      crop_type: cropType,
      quantity_kg: parseFloat(quantityKg),
      days_since_harvest: daysSinceHarvest,
      storage_type: storageType,
      ambient_temp_c: parseFloat(ambientTemp),
      county: county
    });

    const aiData = aiResponse.data;

    // 2. Save ProduceListing + AIPredictionLog simultaneously in Prisma
    const newListing = await prisma.produceListing.create({
      data: {
        farmerId,
        cropType,
        quantityKg: parseFloat(quantityKg),
        harvestDate: harvest,
        storageType,
        ambientTemp: parseFloat(ambientTemp),
        county,
        subCounty,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        startingPricePerKg: parseFloat(startingPricePerKg || aiData.recommended_min_price),
        status: aiData.flash_auction_trigger ? 'FLASH_AUCTION' : 'ACTIVE',

        // Create related AI Prediction Log automatically
        aiLog: {
          create: {
            spoilageRisk: aiData.spoilage_risk.toUpperCase(), // Enum matching Prisma (LOW, MEDIUM, HIGH, CRITICAL)
            estimatedShelfHours: aiData.estimated_shelf_hours,
            recommendedMinPrice: aiData.recommended_min_price,
            recommendedMaxPrice: aiData.recommended_max_price,
            flashAuctionTrigger: aiData.flash_auction_trigger,
            confidenceScore: aiData.confidence_score
          }
        }
      },
      include: {
        aiLog: true // Include AI log in the JSON response
      }
    });

    return res.status(201).json({
      success: true,
      message: "Produce listing created and analyzed by SokoBora AI engine",
      data: newListing
    });

  } catch (error) {
    console.error("Error creating produce listing:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error creating produce listing",
      error: error.message
    });
  }
};

module.exports = { createProduceListing };