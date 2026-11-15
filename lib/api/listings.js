const prisma = require('../prisma');
const { getAuthenticatedUser } = require('../auth');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const user = await getAuthenticatedUser(req, prisma);
      if (!user) return res.status(401).json({ success: false, message: 'Please sign in to continue.' });
      if (!['FARMER', 'BUYER'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'This account cannot view marketplace listings.' });
      }

      const listings = await prisma.produceListing.findMany({
        where: user.role === 'FARMER' ? { farmerId: user.id } : undefined,
        include: {
          transaction: true,
          bids: {
            ...(user.role === 'FARMER' ? {} : { where: { buyerId: user.id } }),
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

  if (req.method === 'PATCH' || req.method === 'DELETE') {
    const listingId = req.params?.id;
    if (typeof listingId !== 'string' || !listingId) {
      return res.status(400).json({ success: false, message: 'A listing is required.' });
    }

    try {
      const user = await getAuthenticatedUser(req, prisma);
      if (!user) return res.status(401).json({ success: false, message: 'Please sign in to continue.' });
      if (user.role !== 'FARMER') {
        return res.status(403).json({ success: false, message: 'Only farmers can manage produce listings.' });
      }

      const eligibility = {
        id: listingId,
        farmerId: user.id,
        status: 'ACTIVE',
        bids: { none: {} },
        transaction: { is: null }
      };

      if (req.method === 'DELETE') {
        const result = await prisma.produceListing.deleteMany({ where: eligibility });
        if (result.count !== 1) {
          const listing = await prisma.produceListing.findFirst({
            where: { id: listingId, farmerId: user.id },
            select: { id: true }
          });
          if (!listing) return res.status(404).json({ success: false, message: 'Listing not found.' });
          return res.status(409).json({
            success: false,
            message: 'Only active listings without bids or transactions can be deleted.'
          });
        }

        return res.status(200).json({ success: true, message: 'Listing deleted.' });
      }

      const { cropType, quantityKg, county, subCounty, startingPricePerKg } = req.body || {};
      const volume = Number(quantityKg);
      const askingPrice = Number(startingPricePerKg);
      if (
        typeof cropType !== 'string' || !cropType.trim() ||
        typeof county !== 'string' || !county.trim() ||
        (subCounty != null && typeof subCounty !== 'string') ||
        !Number.isFinite(volume) || volume <= 0 ||
        !Number.isFinite(askingPrice) || askingPrice <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Enter a product, region, positive volume, and asking price.'
        });
      }

      const result = await prisma.produceListing.updateMany({
        where: eligibility,
        data: {
          cropType: cropType.trim(),
          quantityKg: volume,
          county: county.trim(),
          subCounty: subCounty?.trim() || '',
          startingPricePerKg: askingPrice
        }
      });
      if (result.count !== 1) {
        const listing = await prisma.produceListing.findFirst({
          where: { id: listingId, farmerId: user.id },
          select: { id: true }
        });
        if (!listing) return res.status(404).json({ success: false, message: 'Listing not found.' });
        return res.status(409).json({
          success: false,
          message: 'Only active listings without bids or transactions can be edited.'
        });
      }

      const listing = await prisma.produceListing.findUnique({ where: { id: listingId } });
      return res.status(200).json({ success: true, message: 'Listing updated.', data: listing });
    } catch (error) {
      console.error(`Error ${req.method === 'DELETE' ? 'deleting' : 'updating'} listing:`, error);
      return res.status(500).json({ success: false, message: 'Could not save this listing. Please try again.' });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
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
    if (user.role !== 'FARMER') {
      return res.status(403).json({ success: false, message: 'Only farmers can publish produce listings.' });
    }

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