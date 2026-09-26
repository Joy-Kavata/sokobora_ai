const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

/**
 * @desc   Place a new bid on a produce listing
 * @route  POST /api/bids
 */
const placeBid = async (req, res) => {
  try {
    const { listingId, buyerId, bidAmountPerKg } = req.body;

    // 1. Fetch current listing details
    const listing = await prisma.produceListing.findUnique({
      where: { id: listingId },
      include: { bids: true }
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Produce listing not found"
      });
    }

    if (listing.status === 'LOCKED' || listing.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: "This listing is locked or completed. No new bids allowed."
      });
    }

    const numericBid = parseFloat(bidAmountPerKg);
    const minStartingPrice = listing.startingPricePerKg;

    // 2. Validate bid amount
    if (numericBid < minStartingPrice) {
      return res.status(400).json({
        success: false,
        message: `Bid must be at least KES ${minStartingPrice} per kg`
      });
    }

    if (listing.currentHighestBid && numericBid <= listing.currentHighestBid) {
      return res.status(400).json({
        success: false,
        message: `Bid must be higher than current highest bid of KES ${listing.currentHighestBid}`
      });
    }

    const totalValue = numericBid * listing.quantityKg;

    // 3. Create bid and update current highest bid in a transaction
    const result = await prisma.$transaction([
      prisma.bid.create({
        data: {
          listingId,
          buyerId,
          bidAmountPerKg: numericBid,
          totalValue: totalValue,
          status: 'PENDING'
        }
      }),
      prisma.produceListing.update({
        where: { id: listingId },
        data: { currentHighestBid: numericBid }
      })
    ]);

    return res.status(201).json({
      success: true,
      message: "Bid placed successfully",
      data: {
        bid: result[0],
        updatedListing: result[1]
      }
    });

  } catch (error) {
    console.error("Error placing bid:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error processing bid",
      error: error.message
    });
  }
};

/**
 * @desc   Farmer accepts a bid -> Locks transaction & generates pickup code
 * @route  POST /api/bids/accept
 */
const acceptBid = async (req, res) => {
  try {
    const { bidId, farmerId } = req.body;

    // 1. Fetch bid with listing reference
    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: { listing: true }
    });

    if (!bid) {
      return res.status(404).json({
        success: false,
        message: "Bid not found"
      });
    }

    // Ensure farmer owns the listing
    if (bid.listing.farmerId !== farmerId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. You do not own this listing."
      });
    }

    // 2. Generate secure 8-character digital pickup pass token
    const pickupCode = "SB-" + crypto.randomBytes(4).toString('hex').toUpperCase();

    // 3. Impact Calculations (kg saved and estimated CO2 offset)
    const kgSaved = bid.listing.quantityKg;
    const co2AvoidedKg = parseFloat((kgSaved * 1.4).toFixed(2));

    // 4. Execute atomic updates
    const [acceptedBid, updatedListing, transaction] = await prisma.$transaction([
      // Update accepted bid
      prisma.bid.update({
        where: { id: bidId },
        data: { status: 'ACCEPTED' }
      }),
      // Lock the listing status
      prisma.produceListing.update({
        where: { id: bid.listingId },
        data: { status: 'LOCKED' }
      }),
      // Create final Transaction record with impact metrics
      prisma.transaction.create({
        data: {
          listingId: bid.listingId,
          finalPricePerKg: bid.bidAmountPerKg,
          totalAmount: bid.totalValue,
          kgSaved: kgSaved,
          co2AvoidedKg: co2AvoidedKg,
          pickupCode: pickupCode
        }
      })
    ]);

    // Reject remaining pending bids for this listing
    await prisma.bid.updateMany({
      where: {
        listingId: bid.listingId,
        id: { not: bidId },
        status: 'PENDING'
      },
      data: { status: 'REJECTED' }
    });

    return res.status(200).json({
      success: true,
      message: "Bid accepted. Order locked and pickup pass generated.",
      data: {
        bid: acceptedBid,
        listingStatus: updatedListing.status,
        transaction: transaction
      }
    });

  } catch (error) {
    console.error("Error accepting bid:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error accepting bid",
      error: error.message
    });
  }
};

module.exports = { placeBid, acceptBid };