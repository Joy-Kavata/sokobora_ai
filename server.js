const express = require('express');
const cors = require('cors');
require('dotenv').config();
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
        transaction: true,
        bids: {
          orderBy: { bidAmountPerKg: 'desc' },
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

    const producer = await prisma.user.findUnique({
      where: { id: farmerId || 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
      select: { id: true }
    });
    if (!producer) {
      return res.status(400).json({
        success: false,
        message: 'The producer account is missing from the connected database. Configure a valid producer account before listing stock.'
      });
    }

    const newListing = await prisma.produceListing.create({
      data: {
        farmerId: producer.id,
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

app.post('/api/bids/accept', async (req, res) => {
  try {
    const { bidId, farmerId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' } = req.body;
    const bid = await prisma.bid.findUnique({ where: { id: bidId }, include: { listing: true } });
    if (!bid) return res.status(404).json({ success: false, message: 'Bid not found.' });
    if (bid.listing.farmerId !== farmerId) return res.status(403).json({ success: false, message: 'You cannot accept bids for this listing.' });
    if (bid.status !== 'PENDING' || bid.listing.status !== 'ACTIVE') {
      return res.status(409).json({ success: false, message: 'This bid or listing is no longer available.' });
    }

    const pickupCode = `SB-${require('crypto').randomBytes(4).toString('hex').toUpperCase()}`;
    const transaction = await prisma.$transaction(async (tx) => {
      await tx.bid.update({ where: { id: bid.id }, data: { status: 'ACCEPTED' } });
      await tx.produceListing.update({ where: { id: bid.listingId }, data: { status: 'LOCKED' } });
      await tx.bid.updateMany({
        where: { listingId: bid.listingId, id: { not: bid.id }, status: 'PENDING' },
        data: { status: 'REJECTED' }
      });
      return tx.transaction.create({
        data: {
          listingId: bid.listingId,
          finalPricePerKg: bid.bidAmountPerKg,
          totalAmount: bid.totalValue,
          kgSaved: bid.listing.quantityKg,
          co2AvoidedKg: Number((bid.listing.quantityKg * 1.4).toFixed(2)),
          pickupCode,
          escrowStatus: 'PENDING_DEPOSIT'
        }
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Bid accepted. Escrow tracking started; no funds were moved.',
      data: { bid, transaction }
    });
  } catch (error) {
    console.error('Error accepting bid:', error);
    return res.status(500).json({ success: false, message: 'Could not accept bid. Check the database connection and migration.' });
  }
});

app.post('/api/escrow/deposit', async (req, res) => updateEscrowState(req, res, 'PENDING_DEPOSIT', 'FUNDS_HELD', 'depositRecordedAt'));
app.post('/api/escrow/release', async (req, res) => updateEscrowState(req, res, 'FUNDS_HELD', 'RELEASED', 'fundsReleasedAt'));

async function updateEscrowState(req, res, expectedStatus, nextStatus, timestampField) {
  try {
    const { transactionId } = req.body;
    const result = await prisma.transaction.updateMany({
      where: { id: transactionId, escrowStatus: expectedStatus },
      data: { escrowStatus: nextStatus, [timestampField]: new Date() }
    });
    if (result.count !== 1) {
      return res.status(409).json({ success: false, message: 'Transaction is missing or is not in the required escrow state.' });
    }
    const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
    return res.status(200).json({
      success: true,
      message: `Escrow status updated to ${nextStatus}. This records workflow status only; it does not move funds.`,
      data: transaction
    });
  } catch (error) {
    console.error('Error updating escrow state:', error);
    return res.status(500).json({ success: false, message: 'Could not update escrow status. Check the database migration.' });
  }
}