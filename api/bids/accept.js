const crypto = require('crypto');
const prisma = require('../../lib/prisma');

const DEFAULT_FARMER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  const { bidId, farmerId = DEFAULT_FARMER_ID } = req.body || {};
  if (!bidId) {
    return res.status(400).json({ success: false, message: 'A bid is required.' });
  }

  try {
    const accepted = await prisma.$transaction(async (tx) => {
      const bid = await tx.bid.findUnique({ where: { id: bidId }, include: { listing: true } });
      if (!bid) {
        return { error: { status: 404, message: 'Bid not found.' } };
      }
      if (bid.listing.farmerId !== farmerId) {
        return { error: { status: 403, message: 'You cannot accept bids for this listing.' } };
      }
      if (bid.status !== 'PENDING' || bid.listing.status !== 'ACTIVE') {
        return { error: { status: 409, message: 'This bid or listing is no longer available.' } };
      }

      const pickupCode = `SB-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      await tx.bid.update({ where: { id: bid.id }, data: { status: 'ACCEPTED' } });
      await tx.produceListing.update({ where: { id: bid.listingId }, data: { status: 'LOCKED' } });
      await tx.bid.updateMany({
        where: { listingId: bid.listingId, id: { not: bid.id }, status: 'PENDING' },
        data: { status: 'REJECTED' }
      });

      const transaction = await tx.transaction.create({
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

      return { bid, transaction };
    });

    if (accepted.error) {
      return res.status(accepted.error.status).json({ success: false, message: accepted.error.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Bid accepted. Escrow tracking started; no funds were moved.',
      data: accepted
    });
  } catch (error) {
    console.error('Error accepting bid:', error);
    return res.status(500).json({ success: false, message: 'Could not accept bid. Check the database connection and migration.' });
  }
};