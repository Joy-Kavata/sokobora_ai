const prisma = require('../../lib/prisma');
const { getSessionSecret, hashPassword, setSessionCookie } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  const {
    fullName,
    email,
    password,
    phone,
    county,
    role = 'FARMER',
    businessName,
    latitude,
    longitude
  } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);
  if (
    typeof fullName !== 'string' || !fullName.trim() ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    typeof password !== 'string' || password.length < 8 || password.length > 128 ||
    typeof phone !== 'string' || !phone.trim() ||
    typeof county !== 'string' || !county.trim() ||
    latitude === '' || latitude == null || !Number.isFinite(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90 ||
    longitude === '' || longitude == null || !Number.isFinite(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180 ||
    !['FARMER', 'BUYER'].includes(role)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Enter your name, a valid email, a password between 8 and 128 characters, phone, county, valid location coordinates, and a valid account type.'
    });
  }

  try {
    getSessionSecret();
    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        passwordHash: await hashPassword(password),
        phone: phone.trim(),
        county: county.trim(),
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        role,
        businessName: typeof businessName === 'string' && businessName.trim() ? businessName.trim() : null
      },
      select: { id: true, fullName: true, email: true, role: true }
    });

    setSessionCookie(res, user.id);
    return res.status(201).json({ success: true, data: user });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'An account with that email or phone number already exists.' });
    }
    console.error('Error creating account:', error);
    return res.status(500).json({ success: false, message: 'Could not create your account. Please try again later.' });
  }
};
