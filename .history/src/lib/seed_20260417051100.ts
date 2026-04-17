import { db } from '@/lib/db';
import { hashPassword, generateConfirmationCode } from '@/lib/auth';

export async function seedDatabase() {
  console.log('🌱 Seeding Royal Loft Hotel database...');

  // =============================================
  // 1. CREATE ADMIN USERS
  // =============================================
  const adminExists = await db.user.findUnique({
    where: { email: 'admin@royalloft.com' },
  });

  if (!adminExists) {
    const hashedPassword = await hashPassword('Admin@123');
    await db.user.create({
      data: {
        email: 'admin@royalloft.com',
        password: hashedPassword,
        name: 'Pascal Manager',
        role: 'super_admin',
        department: 'management',
        phone: '+234 801 234 5678',
        isActive: true,
      },
    });
    console.log('✅ Admin user created (admin@royalloft.com / Admin@123)');
  }

  const devExists = await db.user.findUnique({
    where: { email: 'developer@royalloft.com' },
  });

  if (!devExists) {
    const hashedPassword = await hashPassword('Dev@12345');
    await db.user.create({
      data: {
        email: 'developer@royalloft.com',
        password: hashedPassword,
        name: 'System Developer',
        role: 'developer',
        department: 'management',
        phone: '+234 800 000 0000',
        isActive: true,
      },
    });
    console.log('✅ Developer user created (developer@royalloft.com / Dev@12345)');
  }

  const pascalExists = await db.user.findUnique({
    where: { email: 'polycarpchike@gmail.com' },
  });

  if (!pascalExists) {
    const hashedPassword = await hashPassword('Manager@123');
    await db.user.create({
      data: {
        email: 'polycarpchike@gmail.com',
        password: hashedPassword,
        name: 'Polycarp Chike',
        role: 'manager',
        department: 'front_desk',
        phone: '+234 913 327 3608',
        isActive: true,
      },
    });
    console.log('✅ Manager user created (polycarpchike@gmail.com / Manager@123)');
  }

  // =============================================
  // 2. CREATE ROLES
  // =============================================
  const roleNames = [
    { name: 'super_admin', description: 'Full system access with all privileges' },
    { name: 'manager', description: 'Hotel management with operational oversight' },
    { name: 'developer', description: 'System developer with technical access' },
    { name: 'front_desk', description: 'Front desk operations and guest check-in/out' },
    { name: 'housekeeping', description: 'Room cleaning and maintenance coordination' },
    { name: 'accountant', description: 'Financial management and billing' },
    { name: 'staff', description: 'General staff access' },
  ];

  for (const role of roleNames) {
    const exists = await db.role.findUnique({ where: { name: role.name } });
    if (!exists) {
      await db.role.create({ data: role });
    }
  }
  console.log('✅ Roles created');

  // =============================================
  // 3. CREATE ROOM TYPES (from SQL - real data)
  // =============================================
  const roomTypeCount = await db.roomType.count();
  if (roomTypeCount === 0) {
    const roomTypes = [
      {
        name: 'Standard',
        description: 'Comfortable room with essential amenities for budget-conscious guests',
        baseRate: 30000,
        maxOccupancy: 2,
        amenities: JSON.stringify(['TV', 'AC', 'WiFi', 'Mini Fridge']),
        sortOrder: 1,
        isActive: true,
      },
      {
        name: 'Deluxe',
        description: 'Spacious room with premium amenities and enhanced comfort',
        baseRate: 40000,
        maxOccupancy: 2,
        amenities: JSON.stringify(['TV', 'AC', 'WiFi', 'Mini Fridge', 'Work Desk', 'Coffee Maker']),
        sortOrder: 2,
        isActive: true,
      },
      {
        name: 'Executive',
        description: 'Business-class room with executive amenities and workspace',
        baseRate: 50000,
        maxOccupancy: 2,
        amenities: JSON.stringify(['TV', 'AC', 'WiFi', 'Mini Bar', 'Work Desk', 'Coffee Maker', 'Sofa', 'Bathtub']),
        sortOrder: 3,
        isActive: true,
      },
      {
        name: 'Executive Suite',
        description: 'Luxury suite with living area and premium views for discerning guests',
        baseRate: 65000,
        maxOccupancy: 3,
        amenities: JSON.stringify(['TV', 'AC', 'WiFi', 'Mini Bar', 'Work Desk', 'Coffee Maker', 'Living Room', 'Dining Area', 'Jacuzzi', 'Balcony']),
        sortOrder: 4,
        isActive: true,
      },
    ];

    for (const rt of roomTypes) {
      await db.roomType.create({ data: rt });
    }
    console.log('✅ Room types created (Standard ₦30K, Deluxe ₦40K, Executive ₦50K, Executive Suite ₦65K)');
  }

  // =============================================
  // 4. CREATE ROOMS (from SQL - 16 active rooms)
  // =============================================
  const roomCount = await db.room.count();
  if (roomCount === 0) {
    const roomTypes = await db.roomType.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const standard = roomTypes.find((r) => r.name === 'Standard');
    const deluxe = roomTypes.find((r) => r.name === 'Deluxe');
    const executive = roomTypes.find((r) => r.name === 'Executive');
    const executiveSuite = roomTypes.find((r) => r.name === 'Executive Suite');

    // All 16 active rooms from SQL (deleteStatus = 0)
    const rooms = [
      // Standard rooms (₦30,000/night) - 5 rooms
      { roomNumber: 'RM-001', floor: 1, roomTypeId: standard!.id, status: 'available' },
      { roomNumber: 'RM-002', floor: 1, roomTypeId: standard!.id, status: 'available' },
      { roomNumber: 'RM-004', floor: 1, roomTypeId: standard!.id, status: 'available' },
      { roomNumber: 'RM-005', floor: 1, roomTypeId: standard!.id, status: 'available' },
      { roomNumber: 'RM-006', floor: 1, roomTypeId: standard!.id, status: 'available' },

      // Deluxe rooms (₦40,000/night) - 2 rooms
      { roomNumber: 'RM-003', floor: 1, roomTypeId: deluxe!.id, status: 'available' },
      { roomNumber: 'RM-007', floor: 2, roomTypeId: deluxe!.id, status: 'available' },

      // Executive rooms (₦50,000/night) - 7 rooms
      { roomNumber: 'RM-008', floor: 2, roomTypeId: executive!.id, status: 'available' },
      { roomNumber: 'RM-009', floor: 2, roomTypeId: executive!.id, status: 'available' },
      { roomNumber: 'RM-011', floor: 2, roomTypeId: executive!.id, status: 'available' },
      { roomNumber: 'RM-012', floor: 2, roomTypeId: executive!.id, status: 'available' },
      { roomNumber: 'RM-013', floor: 2, roomTypeId: executive!.id, status: 'available' },
      { roomNumber: 'RM-014', floor: 3, roomTypeId: executive!.id, status: 'available' },
      { roomNumber: 'RM-015', floor: 3, roomTypeId: executive!.id, status: 'available' },

      // Executive Suite rooms (₦65,000/night) - 2 rooms
      { roomNumber: 'RM-010', floor: 3, roomTypeId: executiveSuite!.id, status: 'available' },
      { roomNumber: 'RM-016', floor: 3, roomTypeId: executiveSuite!.id, status: 'available' },
    ];

    for (const room of rooms) {
      await db.room.create({ data: room });
    }
    console.log('✅ 16 rooms created (RM-001 to RM-016, all available)');
  }

  // =============================================
  // 5. CREATE STAFF PROFILE for Polycarp Chike
  // =============================================
  const staffCount = await db.staffProfile.count();
  if (staffCount === 0) {
    const pascalUser = await db.user.findUnique({
      where: { email: 'polycarpchike@gmail.com' },
    });

    if (pascalUser) {
      await db.staffProfile.create({
        data: {
          userId: pascalUser.id,
          employeeId: 'EMP-015',
          department: 'front_desk',
          position: 'Front Desk Receptionist',
          baseSalary: 90000,
          startDate: new Date('2025-12-08'),
          status: 'active',
          emergencyContact: 'N/A',
          emergencyPhone: 'N/A',
        },
      });
      console.log('✅ Staff profile created for Polycarp Chike');
    }
  }

  // =============================================
  // 6. CREATE HOTEL POLICIES
  // =============================================
  const policyCount = await db.hotelPolicy.count();
  if (policyCount === 0) {
    const policies = [
      { title: 'Check-in & Check-out', description: 'Check-in time is 2:00 PM. Check-out time is 12:00 PM (noon). Early check-in and late check-out are subject to availability and may incur additional charges.', category: 'checkin_checkout', sortOrder: 1 },
      { title: 'Cancellation Policy', description: 'Free cancellation up to 24 hours before check-in. Cancellations within 24 hours will be charged one night\'s stay. No-shows will be charged the full reservation amount.', category: 'cancellation', sortOrder: 2 },
      { title: 'Payment Policy', description: 'All payments must be made in Nigerian Naira (₦). We accept Cash, POS/Card, Bank Transfer, OPay, PalmPay, and Moniepoint. A valid ID may be required for transactions.', category: 'payment', sortOrder: 3 },
      { title: 'Guest Conduct', description: 'Guests are expected to maintain peaceful behavior. Loud noise, disorderly conduct, and damage to hotel property are strictly prohibited. Violations may result in immediate eviction without refund.', category: 'conduct', sortOrder: 4 },
      { title: 'No Smoking Policy', description: 'All indoor areas are strictly non-smoking. A cleaning fee of ₦50,000 will be charged for smoking in rooms. Designated smoking areas are available outside the building.', category: 'smoking', sortOrder: 5 },
      { title: 'Children Policy', description: 'Children under 12 stay free when using existing bedding. Extra beds and cribs are available upon request at an additional charge. Children must be supervised by an adult at all times.', category: 'children', sortOrder: 6 },
      { title: 'Pet Policy', description: 'Pets are not allowed in the hotel. Service animals are welcome with proper documentation.', category: 'pets', sortOrder: 7 },
    ];

    for (const policy of policies) {
      await db.hotelPolicy.create({ data: policy });
    }
    console.log('✅ Hotel policies created');
  }

  // =============================================
  // 7. CREATE INVENTORY ITEMS
  // =============================================
  const invCount = await db.inventoryItem.count();
  if (invCount === 0) {
    const items = [
      { name: 'Bed Sheets (King)', category: 'housekeeping', unit: 'pieces', currentQuantity: 120, minimumLevel: 30, unitCost: 3500 },
      { name: 'Pillow Cases', category: 'housekeeping', unit: 'pieces', currentQuantity: 200, minimumLevel: 50, unitCost: 800 },
      { name: 'Towels (Bath)', category: 'housekeeping', unit: 'pieces', currentQuantity: 150, minimumLevel: 40, unitCost: 1200 },
      { name: 'Toilet Paper', category: 'housekeeping', unit: 'rolls', currentQuantity: 500, minimumLevel: 100, unitCost: 150 },
      { name: 'Liquid Soap', category: 'housekeeping', unit: 'liters', currentQuantity: 25, minimumLevel: 10, unitCost: 2000 },
      { name: 'Bottled Water', category: 'bar', unit: 'packs', currentQuantity: 48, minimumLevel: 12, unitCost: 1500 },
      { name: 'Coffee Sachets', category: 'kitchen', unit: 'boxes', currentQuantity: 15, minimumLevel: 5, unitCost: 3500 },
      { name: 'Light Bulbs (LED)', category: 'maintenance', unit: 'pieces', currentQuantity: 8, minimumLevel: 10, unitCost: 800 },
      { name: 'Printer Paper (A4)', category: 'office', unit: 'packs', currentQuantity: 5, minimumLevel: 3, unitCost: 4500 },
      { name: 'Key Cards', category: 'front_desk', unit: 'pieces', currentQuantity: 40, minimumLevel: 20, unitCost: 500 },
    ];

    for (const item of items) {
      await db.inventoryItem.create({ data: item });
    }
    console.log('✅ Inventory items created');
  }

  // =============================================
  // 8. CREATE LEGACY COMPLAINTS (from SQL)
  // =============================================
  const feedbackCount = await db.guestFeedback.count();
  if (feedbackCount === 0) {
    const complaints = [
      {
        rating: 2,
        category: 'room',
        comment: 'Room Windows - Does not operate properly (Complaint by Janice Alexander)',
        isResolved: true,
        response: 'Window mechanism repaired and tested.',
        createdAt: new Date('2020-07-16'),
      },
      {
        rating: 2,
        category: 'room',
        comment: 'Air Conditioner - Sensor Problems (Complaint by Robert Peter)',
        isResolved: true,
        response: 'AC sensor replaced and calibrated.',
        createdAt: new Date('2020-10-01'),
      },
      {
        rating: 2,
        category: 'cleanliness',
        comment: 'Bad Smells - Some odd smells around room areas (Complaint by Jason J Pirkle)',
        isResolved: true,
        response: 'Deep cleaning performed and air fresheners installed.',
        createdAt: new Date('2018-04-01'),
      },
      {
        rating: 2,
        category: 'amenities',
        comment: 'Faulty Electronics - Electronics not working properly, voltage problems in RM-135 (Complaint by Will Williams)',
        isResolved: true,
        response: 'Electrical wiring fixed and voltage stabilizer installed.',
        createdAt: new Date('2021-04-09'),
      },
    ];

    for (const complaint of complaints) {
      await db.guestFeedback.create({ data: complaint });
    }
    console.log('✅ Legacy complaints created');
  }

    console.log('...Base seed completed successfully!');
  console.log('...Next step: Run "node scripts/migrate-legacy-data.js"...');
}