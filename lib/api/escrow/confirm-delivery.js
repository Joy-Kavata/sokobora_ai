const prisma = require('../../prisma');
const { getAuthenticatedUser } = require('../../auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  const { transactionId } = req.body || {};
  if (typeof transactionId !== 'string' || !transactionId) {
    return res.status(400).json({ success: false, message: 'A transaction is required.' });
  }

  try {
    const user = await getAuthenticatedUser(req, prisma);
    if (!user) return res.status(401).json({ success: false, message: 'Please sign in to continue.' });
    if (user.role !== 'BUYER') {
      return res.status(403).json({ success: false, message: 'Only the buyer can confirm delivery.' });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        listing: {
          select: {
            bids: {
              where: { status: 'ACCEPTED' },
              select: { buyerId: true }
            }
          }
        }
      }
    });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }
    if (!transaction.listing.bids.some((bid) => bid.buyerId === user.id)) {
      return res.status(403).json({ success: false, message: 'You cannot confirm delivery for another buyer’s transaction.' });
    }

    const result = await prisma.transaction.updateMany({
      where: { id: transactionId, escrowStatus: 'FUNDS_HELD' },
      data: {
        escrowStatus: 'DELIVERY_CONFIRMED',
        deliveryConfirmedAt: new Date()
      }
    });
    if (result.count !== 1) {
      return res.status(409).json({
        success: false,
        message: 'Delivery can only be confirmed after the deposit has been recorded as held.'
      });
    }

    const updatedTransaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
    return res.status(200).json({
      success: true,
      message: 'Delivery confirmed. The farmer can now record the release; no funds are transferred by this prototype.',
      data: updatedTransaction
    });
  } catch (error) {
    console.error('Error confirming delivery:', error);
    return res.status(500).json({ success: false, message: 'Could not confirm delivery. Please try again.' });
  }
};
