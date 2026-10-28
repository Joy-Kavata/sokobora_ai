const prisma = require('../../lib/prisma');
const { getAuthenticatedUser } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  if (!['GET', 'PATCH', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'GET, PATCH, DELETE');
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  try {
    const user = await getAuthenticatedUser(req, prisma);
    if (!user) return res.status(401).json({ success: false, message: 'Please sign in to continue.' });
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only system administrators can manage users.' });
    }

    if (req.method === 'GET') {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          county: true,
          role: true,
          createdAt: true,
          _count: { select: { listings: true, bids: true } }
        }
      });

      return res.status(200).json({ success: true, data: users });
    }

    const { id } = req.query || {};
    if (typeof id !== 'string' || !id) {
      return res.status(400).json({ success: false, message: 'A valid user ID is required.' });
    }

    if (req.method === 'PATCH') {
      const { role } = req.body || {};
      if (!['FARMER', 'BUYER'].includes(role)) {
        return res.status(400).json({ success: false, message: 'User role must be FARMER or BUYER.' });
      }

      const target = await prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true }
      });
      if (!target) return res.status(404).json({ success: false, message: 'User not found.' });
      if (target.role === 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Administrator accounts cannot be changed here.' });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { role },
        select: { id: true, role: true }
      });
      return res.status(200).json({ success: true, data: updatedUser });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        _count: { select: { listings: true, bids: true } }
      }
    });
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });
    if (target.role === 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Administrator accounts cannot be deleted here.' });
    }
    if (target._count.listings > 0 || target._count.bids > 0) {
      return res.status(409).json({
        success: false,
        message: 'This user has listings or bids. Remove or transfer that trading activity before deleting the account.'
      });
    }

    await prisma.user.delete({ where: { id } });
    return res.status(200).json({ success: true, message: 'User deleted.' });
  } catch (error) {
    console.error('Error handling admin user request:', error);
    return res.status(500).json({ success: false, message: 'Could not manage users. Please try again later.' });
  }
};
