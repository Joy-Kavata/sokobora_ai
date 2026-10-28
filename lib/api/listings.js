const prisma = require('../prisma');
const { getAuthenticatedUser } = require('../auth');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const user = await getAuthenticatedUser(req, prisma);
      if (!user) return res.status(401).json({ success: false, message: 'Please sign in to continue.' });

      const listings = await prisma.produceListing.findMany({
        include: {
          transaction: true,
          bids: {
            orderBy: { bidAmountPerKg: 'desc' }
          },
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json({ success: true, data: listings });
    } catch (error) {
      console.error('Error fetching listings:', error);
      return res.status(500).json({ success: false, message: 'Could not load listings. Check the database connection.' });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  const {
    cropType,
    quantityKg,
    county,
    subCounty,
    latitude,
    longitude,
    startingPricePerKg
  } = req.body || {};
  const volume = Number(quantityKg);
  const askingPrice = Number(startingPricePerKg);

  if (!cropType || !county || !Number.isFinite(volume) || volume <= 0 || !Number.isFinite(askingPrice) || askingPrice <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Enter a product, region, positive volume, and asking price.'
    });
  }

  try {
    const user = await getAuthenticatedUser(req, prisma);
    if (!user) return res.status(401).json({ success: false, message: 'Please sign in to continue.' });

    const listing = await prisma.produceListing.create({
      data: {
        farmerId: user.id,
        cropType,
        quantityKg: volume,
        harvestDate: new Date(),
        storageType: 'Not tracked',
        ambientTemp: 0,
        county,
        subCounty: subCounty || '',
        latitude: Number.isFinite(Number(latitude)) ? Number(latitude) : -1.286,
        longitude: Number.isFinite(Number(longitude)) ? Number(longitude) : 36.821,
        startingPricePerKg: askingPrice,
        status: 'ACTIVE'
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Commercial stock listing published successfully.',
      data: listing
    });
  } catch (error) {
    console.error('Error creating listing:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not create listing. Check the database connection and schema.'
    });
  }
};