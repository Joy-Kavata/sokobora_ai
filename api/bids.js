const prisma = require('../lib/prisma');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  const { listingId, buyerId, bidAmountPerKg } = req.body || {};
  const bidAmount = Number(bidAmountPerKg);

  if (!listingId || !buyerId || !Number.isFinite(bidAmount) || bidAmount <= 0) {
    return res.status(400).json({ success: false, message: 'A listing, buyer account, and positive bid are required.' });
  }

  try {
    const listing = await prisma.produceListing.findUnique({ where: { id: listingId } });
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }
    if (listing.status !== 'ACTIVE' && listing.status !== 'FLASH_AUCTION') {
      return res.status(400).json({ success: false, message: 'This listing is not available for bids.' });
    }
    if (bidAmount < listing.startingPricePerKg || (listing.currentHighestBid && bidAmount <= listing.currentHighestBid)) {
      return res.status(400).json({ success: false, message: 'Bid must exceed the current price.' });
    }

    const result = await prisma.$transaction([
      prisma.bid.create({
        data: {
          listingId,
          buyerId,
          bidAmountPerKg: bidAmount,
          totalValue: bidAmount * listing.quantityKg,
          status: 'PENDING'
        }
      }),
      prisma.produceListing.update({
        where: { id: listingId },
        data: { currentHighestBid: bidAmount }
      })
    ]);

    return res.status(201).json({
      success: true,
      message: 'Bid placed successfully.',
      data: { bid: result[0], updatedListing: result[1] }
    });
  } catch (error) {
    console.error('Error placing bid:', error);
    return res.status(500).json({ success: false, message: 'Could not place bid. Check the database connection.' });
  }
};