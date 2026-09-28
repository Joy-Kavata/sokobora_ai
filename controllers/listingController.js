const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * @desc   Create a commercial produce stock listing
 * @route  POST /api/listings
 */
const createProduceListing = async (req, res) => {
  try {
    const {
      farmerId,
      cropType,
      quantityKg,
      county,
      subCounty,
      latitude,
      longitude,
      startingPricePerKg
    } = req.body;
    const volume = Number(quantityKg);
    const askingPrice = Number(startingPricePerKg);
    if (!cropType || !county || !Number.isFinite(volume) || volume <= 0 || !Number.isFinite(askingPrice) || askingPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Product, region, positive volume, and asking price are required.'
      });
    }

    const newListing = await prisma.produceListing.create({
      data: {
        farmerId,
        cropType,
        quantityKg: volume,
        harvestDate: new Date(),
        storageType: 'Not tracked',
        ambientTemp: 0,
        county,
        subCounty,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        startingPricePerKg: askingPrice,
        status: 'ACTIVE'
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Commercial stock listing created successfully.',
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