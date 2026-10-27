const prisma = require('../../lib/prisma');
const { getAuthenticatedUser } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  try {
    const user = await getAuthenticatedUser(req, prisma);
    if (!user) return res.status(401).json({ success: false, message: 'Please sign in to continue.' });
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only system administrators can manage users.' });
    }

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
  } catch (error) {
    console.error('Error loading admin user list:', error);
    return res.status(500).json({ success: false, message: 'Could not load users. Please try again later.' });
  }
};
