const prisma = require('./prisma');
const { getAuthenticatedUser } = require('./auth');

async function transitionEscrow(req, res, { expectedStatus, nextStatus, timestampField, actionLabel }) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  const { transactionId } = req.body || {};
  if (!transactionId) {
    return res.status(400).json({ success: false, message: 'A transaction is required.' });
  }

  try {
    const user = await getAuthenticatedUser(req, prisma);
    if (!user) return res.status(401).json({ success: false, message: 'Please sign in to continue.' });

    if (user.role !== 'FARMER') {
      return res.status(403).json({ success: false, message: 'Only the listing farmer can update its escrow workflow.' });
    }

    const existingTransaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: { listing: { select: { farmerId: true } } }
    });
    if (!existingTransaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }
    if (existingTransaction.listing.farmerId !== user.id) {
      return res.status(403).json({ success: false, message: 'You cannot update escrow for another farmer’s listing.' });
    }

    const result = await prisma.transaction.updateMany({
      where: { id: transactionId, escrowStatus: expectedStatus },
      data: {
        escrowStatus: nextStatus,
        [timestampField]: new Date()
      }
    });

    if (result.count !== 1) {
      return res.status(409).json({
        success: false,
        message: `Cannot ${actionLabel}: the transaction is missing or has already moved to another escrow state.`
      });
    }

    const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
    return res.status(200).json({
      success: true,
      message: `Escrow status updated to ${nextStatus}. This records workflow status only; it does not move funds.`,
      data: transaction
    });
  } catch (error) {
    console.error(`Error changing escrow state to ${nextStatus}:`, error);
    return res.status(500).json({ success: false, message: 'Could not update escrow status. Check the database migration.' });
  }
}

module.exports = transitionEscrow;