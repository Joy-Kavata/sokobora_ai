const prisma = require('../../prisma');
const { getSessionSecret, setSessionCookie, verifyPassword } = require('../../auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  const { email, password } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalizedEmail || typeof password !== 'string' || !password || password.length > 128) {
    return res.status(400).json({ success: false, message: 'Enter your email address and password.' });
  }

  try {
    getSessionSecret();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const account = { id: user.id, fullName: user.fullName, email: user.email, role: user.role };
    setSessionCookie(res, user.id);
    return res.status(200).json({ success: true, data: account });
  } catch (error) {
    console.error('Error signing in:', error);
    return res.status(500).json({ success: false, message: 'Could not sign in. Please try again later.' });
  }
};
