const prisma = require('../../lib/prisma');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  try {
    const listings = await prisma.produceListing.findMany({
      where: { status: 'ACTIVE' },
      select: { quantityKg: true, startingPricePerKg: true, county: true }
    });

    const data = {
      listedVolumeKg: listings.reduce((total, listing) => total + listing.quantityKg, 0),
      grossTradeValueKes: listings.reduce((total, listing) => total + listing.quantityKg * listing.startingPricePerKg, 0),
      activeListings: listings.length,
      regionsRepresented: new Set(listings.map((listing) => listing.county)).size
    };

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error loading market metrics:', error);
    return res.status(500).json({ success: false, message: 'Could not load market metrics. Check the database connection.' });
  }
};