const prisma = require('../../prisma');
const { getAuthenticatedUser } = require('../../auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  try {
    const user = await getAuthenticatedUser(req, prisma);
    if (!user) return res.status(401).json({ success: false, message: 'Please sign in to continue.' });
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Error checking account session:', error);
    return res.status(500).json({ success: false, message: 'Could not verify your account session.' });
  }
};
