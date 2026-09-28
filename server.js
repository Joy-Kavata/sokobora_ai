const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 1. GET ALL ACTIVE STOCK LISTINGS
app.get('/api/listings', async (req, res) => {
  try {
    const listings = await prisma.produceListing.findMany({
      include: {
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
    const { farmerId, cropType, quantityKg, county, subCounty, latitude, longitude, startingPricePerKg } = req.body;
    const volume = Number(quantityKg);
    const askingPrice = Number(startingPricePerKg);
    if (!cropType || !county || !Number.isFinite(volume) || volume <= 0 || !Number.isFinite(askingPrice) || askingPrice <= 0) {
      return res.status(400).json({ success: false, message: 'Product, region, positive volume, and asking price are required.' });
    }

    const newListing = await prisma.produceListing.create({
      data: {
        farmerId: farmerId || 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        cropType,
        quantityKg: volume,
        harvestDate: new Date(),
        storageType: 'Not tracked',
        ambientTemp: 0,
        county,
        subCounty: subCounty || '',
        latitude: parseFloat(latitude || -1.286),
        longitude: parseFloat(longitude || 36.821),
        status: 'ACTIVE',
        startingPricePerKg: askingPrice
      }
    });

    res.status(201).json({
      success: true,
      message: 'Commercial stock listing published successfully.',
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

    const activeListings = listings.filter((item) => item.status === 'ACTIVE');
    const listedVolumeKg = activeListings.reduce((total, item) => total + item.quantityKg, 0);
    const grossTradeValueKes = activeListings.reduce((total, item) => total + (item.quantityKg * item.startingPricePerKg), 0);
    const regionsRepresented = new Set(activeListings.map((item) => item.county)).size;

    res.json({
      success: true,
      data: {
        listedVolumeKg,
        grossTradeValueKes,
        activeListings: activeListings.length,
        regionsRepresented
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Analytics calculation error', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`SokoBora AI Backend running on http://localhost:${PORT}`);
});