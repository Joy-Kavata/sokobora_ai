const prisma = require('../lib/prisma');

const DEFAULT_FARMER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
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
    farmerId = DEFAULT_FARMER_ID,
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
    const producer = await prisma.user.findUnique({ where: { id: farmerId }, select: { id: true } });
    if (!producer) {
      return res.status(400).json({
        success: false,
        message: 'The producer account is missing from the connected database. Configure a valid producer account before listing stock.'
      });
    }

    const listing = await prisma.produceListing.create({
      data: {
        farmerId: producer.id,
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