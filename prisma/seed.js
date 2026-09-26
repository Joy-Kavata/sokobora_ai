const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SokoBora AI database...');

  // 1. Clean existing records
  await prisma.transaction.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.aIPredictionLog.deleteMany();
  await prisma.produceListing.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Seed Users
  const farmer1 = await prisma.user.create({
    data: {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      fullName: 'Jane Wanjiku',
      email: 'jane.wanjiku@farm.co.ke',
      phone: '+254712345678',
      passwordHash: 'hashed_password_123',
      role: 'FARMER',
      businessName: 'Kiambu Green Acres',
      county: 'Kiambu',
      subCounty: 'Kabete',
      latitude: -1.242,
      longitude: 36.721
    }
  });

  const farmer2 = await prisma.user.create({
    data: {
      id: 'f58bc10b-69cc-4372-a567-0e02b2c3d480',
      fullName: 'Peter Njoroge',
      email: 'peter.njoroge@farm.co.ke',
      phone: '+254722345679',
      passwordHash: 'hashed_password_123',
      role: 'FARMER',
      businessName: 'Rift Valley Fresh Produce',
      county: 'Nakuru',
      subCounty: 'Naivasha',
      latitude: -0.717,
      longitude: 36.431
    }
  });

  const buyer1 = await prisma.user.create({
    data: {
      id: 'b18ac20c-48dd-4372-b567-0e02b2c3d980',
      fullName: 'David Ochieng',
      email: 'procurement@citysupermarket.co.ke',
      phone: '+254733345680',
      passwordHash: 'hashed_password_123',
      role: 'BUYER',
      businessName: 'City Supermarket Ltd',
      county: 'Nairobi',
      subCounty: 'Westlands',
      latitude: -1.267,
      longitude: 36.811
    }
  });

  const buyer2 = await prisma.user.create({
    data: {
      id: 'b29bc20c-59dd-4372-b567-0e02b2c3d981',
      fullName: 'Grace Muthoni',
      email: 'supplies@safarihotel.co.ke',
      phone: '+254744345681',
      passwordHash: 'hashed_password_123',
      role: 'BUYER',
      businessName: 'Safari Grand Hotel',
      county: 'Nairobi',
      subCounty: 'CBD',
      latitude: -1.286,
      longitude: 36.821
    }
  });

  // 3. Create High Urgency Produce Listing (Tomatoes in Kiambu)
  const listing1 = await prisma.produceListing.create({
    data: {
      farmerId: farmer1.id,
      cropType: 'Tomatoes',
      quantityKg: 800,
      harvestDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      storageType: 'Direct Sun',
      ambientTemp: 28.5,
      county: 'Kiambu',
      subCounty: 'Kabete',
      latitude: -1.242,
      longitude: 36.721,
      status: 'FLASH_AUCTION',
      startingPricePerKg: 36.0,
      currentHighestBid: 40.0,
      aiLog: {
        create: {
          spoilageRisk: 'HIGH',
          estimatedShelfHours: 32.0,
          recommendedMinPrice: 38.0,
          recommendedMaxPrice: 42.0,
          flashAuctionTrigger: true,
          confidenceScore: 0.95
        }
      }
    }
  });

  // 4. Create Standard Produce Listing (Mangoes in Nakuru)
  const listing2 = await prisma.produceListing.create({
    data: {
      farmerId: farmer2.id,
      cropType: 'Mangoes',
      quantityKg: 1500,
      harvestDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      storageType: 'Ambient Shade',
      ambientTemp: 22.0,
      county: 'Nakuru',
      subCounty: 'Naivasha',
      latitude: -0.717,
      longitude: 36.431,
      status: 'ACTIVE',
      startingPricePerKg: 32.0,
      currentHighestBid: null,
      aiLog: {
        create: {
          spoilageRisk: 'LOW',
          estimatedShelfHours: 110.0,
          recommendedMinPrice: 30.0,
          recommendedMaxPrice: 35.0,
          flashAuctionTrigger: false,
          confidenceScore: 0.91
        }
      }
    }
  });

  // 5. Create Initial Bids
  await prisma.bid.create({
    data: {
      listingId: listing1.id,
      buyerId: buyer1.id,
      bidAmountPerKg: 40.0,
      totalValue: 32000.0,
      status: 'PENDING'
    }
  });

  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });