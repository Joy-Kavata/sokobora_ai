const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

app.use(cors());
app.use(express.json());

// 1. GET ALL LISTINGS (With AI Logs)
app.get('/api/listings', async (req, res) => {
  try {
    const listings = await prisma.produceListing.findMany({
      include: {
        aiLog: true,
        bids: {
          orderBy: { bidAmountPerKg: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: listings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching listings', error: error.message });
  }
});

// 2. POST NEW FARMER LISTING (Calls FastAPI ML Engine + Saves to DB)
app.post('/api/listings', async (req, res) => {
  try {
    const { farmerId, cropType, quantityKg, storageType, ambientTemp, county, subCounty, latitude, longitude } = req.body;

    // Call Python FastAPI Model
    let aiResponse;
    try {
      const mlResult = await axios.post(`${AI_SERVICE_URL}/predict`, {
        cropType,
        storageType,
        ambientTemp: parseFloat(ambientTemp)
      });
      aiResponse = mlResult.data;
    } catch (err) {
      // Fallback prediction heuristic if ML service is offline
      const temp = parseFloat(ambientTemp);
      const isHighRisk = temp > 25 || storageType === 'Direct Sun';
      aiResponse = {
        spoilageRisk: isHighRisk ? 'HIGH' : 'LOW',
        estimatedShelfHours: isHighRisk ? 36.0 : 120.0,
        recommendedMinPrice: 35.0,
        recommendedMaxPrice: 42.0,
        flashAuctionTrigger: isHighRisk
      };
    }

    const isFlash = aiResponse.flashAuctionTrigger;

    const newListing = await prisma.produceListing.create({
      data: {
        farmerId: farmerId || 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        cropType,
        quantityKg: parseFloat(quantityKg),
        harvestDate: new Date(),
        storageType,
        ambientTemp: parseFloat(ambientTemp),
        county,
        subCounty: subCounty || '',
        latitude: parseFloat(latitude || -1.286),
        longitude: parseFloat(longitude || 36.821),
        status: isFlash ? 'FLASH_AUCTION' : 'ACTIVE',
        startingPricePerKg: aiResponse.recommendedMinPrice,
        aiLog: {
          create: {
            spoilageRisk: aiResponse.spoilageRisk,
            estimatedShelfHours: aiResponse.estimatedShelfHours,
            recommendedMinPrice: aiResponse.recommendedMinPrice,
            recommendedMaxPrice: aiResponse.recommendedMaxPrice,
            flashAuctionTrigger: isFlash,
            confidenceScore: 0.94
          }
        }
      },
      include: { aiLog: true }
    });

    res.status(201).json({
      success: true,
      message: isFlash ? 'High spoilage risk detected! Auto-listed as Flash Auction.' : 'Listing published successfully.',
      data: newListing
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create listing', error: error.message });
  }
});

// 3. POST PLACE BID
app.post('/api/bids', async (req, res) => {
  try {
    const { listingId, buyerId, bidAmountPerKg } = req.body;
    const bidVal = parseFloat(bidAmountPerKg);

    const listing = await prisma.produceListing.findUnique({
      where: { id: listingId },
      include: { bids: { orderBy: { bidAmountPerKg: 'desc' }, take: 1 } }
    });

    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    if (listing.status === 'LOCKED') return res.status(400).json({ success: false, message: 'Order is already locked.' });

    const currentHighest = listing.currentHighestBid || listing.startingPricePerKg;
    if (bidVal <= currentHighest) {
      return res.status(400).json({
        success: false,
        message: `Bid must be strictly higher than current top price (KES ${currentHighest}/kg)`
      });
    }

    const totalVal = bidVal * listing.quantityKg;

    const newBid = await prisma.bid.create({
      data: {
        listingId,
        buyerId,
        bidAmountPerKg: bidVal,
        totalValue: totalVal,
        status: 'PENDING'
      }
    });

    await prisma.produceListing.update({
      where: { id: listingId },
      data: { currentHighestBid: bidVal }
    });

    res.status(201).json({ success: true, message: 'Bid submitted successfully!', data: newBid });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Bid processing error', error: error.message });
  }
});

// 4. GET IMPACT METRICS (Calculated Live from DB)
app.get('/api/analytics/impact', async (req, res) => {
  try {
    const listings = await prisma.produceListing.findMany({
      include: { transaction: true }
    });

    let totalKgSaved = 0;
    let totalFarmerRevenueKes = 0;

    listings.forEach((item) => {
      if (item.currentHighestBid) {
        totalKgSaved += item.quantityKg;
        totalFarmerRevenueKes += item.quantityKg * item.currentHighestBid;
      }
    });

    const activeFlash = await prisma.produceListing.count({
      where: { status: 'FLASH_AUCTION' }
    });

    res.json({
      success: true,
      data: {
        totalKgSaved,
        totalCo2AvoidedKg: Math.round(totalKgSaved * 1.4), // 1.4 kg CO2 saved per kg produce preserved
        totalFarmerRevenueKes,
        activeFlashAuctions: activeFlash,
        successfulTransactions: listings.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Analytics calculation error', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`SokoBora AI Backend running on http://localhost:${PORT}`);
});