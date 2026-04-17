import { db } from '@/lib/db';
import { hashPassword, generateConfirmationCode } from '@/lib/auth';

export async function seedDatabase() {
  console.log('🌱 Seeding database...');

  // Create developer user (full access)
  const devExists = await db.user.findUnique({
    where: { email: 'developer@royalloft.com' },
  });

  if (!devExists) {
    const hashedDevPassword = await hashPassword('Dev@12345');
    const devUser = await db.user.create({
      data: {
        email: 'developer@royalloft.com',
        password: hashedDevPassword,
        name: 'System Developer',
        role: 'developer',
        department: 'management',
        phone: '+234 801 000 0001',
      },
    });
    console.log('✅ Developer user created');
  }

  // Create admin user
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
      },
    });
    console.log('✅ Admin user created');
  }

  // Create roles
  const roleNames = ['super_admin', 'manager', 'front_desk', 'housekeeping', 'accountant', 'staff'];
  for (const roleName of roleNames) {
    const exists = await db.role.findUnique({ where: { name: roleName } });
    if (!exists) {
      await db.role.create({
        data: {
          name: roleName,
          description: `${roleName.replace('_', ' ')} role`,
        },
      });
    }
  }

  // Check if room types exist
  const roomTypeCount = await db.roomType.count();
  if (roomTypeCount === 0) {
    const roomTypes = [
      {
        name: 'Standard',
        description: 'Comfortable room with essential amenities',
        baseRate: 30000,
        maxOccupancy: 2,
        amenities: JSON.stringify(['TV', 'AC', 'WiFi', 'Mini Fridge']),
        sortOrder: 1,
      },
      {
        name: 'Deluxe',
        description: 'Spacious room with premium amenities',
        baseRate: 40000,
        maxOccupancy: 2,
        amenities: JSON.stringify(['TV', 'AC', 'WiFi', 'Mini Fridge', 'Work Desk', 'Coffee Maker']),
        sortOrder: 2,
      },
      {
        name: 'Executive',
        description: 'Executive room with premium furnishings and city view',
        baseRate: 50000,
        maxOccupancy: 2,
        amenities: JSON.stringify(['TV', 'AC', 'WiFi', 'Mini Bar', 'Work Desk', 'Coffee Maker', 'Sofa', 'Bathtub']),
        sortOrder: 3,
      },
      {
        name: 'Executive Suite',
        description: 'Exclusive executive suite with full luxury amenities and separate living area',
        baseRate: 65000,
        maxOccupancy: 3,
        amenities: JSON.stringify(['TV', 'AC', 'WiFi', 'Mini Bar', 'Work Desk', 'Coffee Maker', 'Living Room', 'Dining Area', 'Bathtub', 'Balcony']),
        sortOrder: 4,
      },
    ];

    for (const rt of roomTypes) {
      await db.roomType.create({ data: rt });
    }
    console.log('✅ Room types created');
  }

  // Check if rooms exist
  const roomCount = await db.room.count();
  if (roomCount === 0) {
    const roomTypes = await db.roomType.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const standard = roomTypes.find((r) => r.name === 'Standard');
    const deluxe = roomTypes.find((r) => r.name === 'Deluxe');
    const executive = roomTypes.find((r) => r.name === 'Executive');
    const executiveSuite = roomTypes.find((r) => r.name === 'Executive Suite');

    const rooms = [
      // Standard Rooms (5)
      { roomNumber: 'RM-001', floor: 1, roomTypeId: standard!.id, status: 'available' },
      { roomNumber: 'RM-002', floor: 1, roomTypeId: standard!.id, status: 'occupied' },
      { roomNumber: 'RM-004', floor: 1, roomTypeId: standard!.id, status: 'available' },
      { roomNumber: 'RM-005', floor: 1, roomTypeId: standard!.id, status: 'available' },
      { roomNumber: 'RM-006', floor: 1, roomTypeId: standard!.id, status: 'available' },
      // Deluxe Rooms (2)
      { roomNumber: 'RM-003', floor: 1, roomTypeId: deluxe!.id, status: 'available' },
      { roomNumber: 'RM-007', floor: 2, roomTypeId: deluxe!.id, status: 'housekeeping' },
      // Executive Rooms (7)
      { roomNumber: 'RM-008', floor: 2, roomTypeId: executive!.id, status: 'available' },
      { roomNumber: 'RM-009', floor: 2, roomTypeId: executive!.id, status: 'available' },
      { roomNumber: 'RM-011', floor: 2, roomTypeId: executive!.id, status: 'available' },
      { roomNumber: 'RM-012', floor: 2, roomTypeId: executive!.id, status: 'occupied' },
      { roomNumber: 'RM-013', floor: 2, roomTypeId: executive!.id, status: 'available' },
      { roomNumber: 'RM-014', floor: 2, roomTypeId: executive!.id, status: 'available' },
      { roomNumber: 'RM-015', floor: 3, roomTypeId: executive!.id, status: 'available' },
      // Executive Suite Rooms (2)
      { roomNumber: 'RM-010', floor: 3, roomTypeId: executiveSuite!.id, status: 'available' },
      { roomNumber: 'RM-016', floor: 3, roomTypeId: executiveSuite!.id, status: 'reserved' },
    ];

    for (const room of rooms) {
      await db.room.create({ data: room });
    }
    console.log('✅ Rooms created');
  }

  // Create sample guests
  const guestCount = await db.guest.count();
  if (guestCount === 0) {
    const guests = [
      {
        firstName: 'Adebayo',
        lastName: 'Okonkwo',
        email: 'adebayo@email.com',
        phone: '+234 802 345 6789',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        gender: 'male',
        loyaltyTier: 'gold',
        loyaltyPoints: 2500,
        vip: true,
        totalStays: 8,
        totalSpent: 450000,
      },
      {
        firstName: 'Chioma',
        lastName: 'Eze',
        email: 'chioma.eze@email.com',
        phone: '+234 803 456 7890',
        city: 'Abuja',
        state: 'FCT',
        country: 'Nigeria',
        gender: 'female',
        loyaltyTier: 'platinum',
        loyaltyPoints: 5000,
        vip: true,
        totalStays: 15,
        totalSpent: 1200000,
      },
      {
        firstName: 'Emeka',
        lastName: 'Nwankwo',
        email: 'emekan@email.com',
        phone: '+234 804 567 8901',
        city: 'Port Harcourt',
        state: 'Rivers',
        country: 'Nigeria',
        gender: 'male',
        loyaltyTier: 'silver',
        loyaltyPoints: 800,
        totalStays: 3,
        totalSpent: 95000,
      },
      {
        firstName: 'Fatima',
        lastName: 'Abdullahi',
        email: 'fatima.a@email.com',
        phone: '+234 805 678 9012',
        city: 'Kano',
        state: 'Kano',
        country: 'Nigeria',
        gender: 'female',
        loyaltyTier: 'none',
        totalStays: 1,
        totalSpent: 25000,
      },
      {
        firstName: 'James',
        lastName: 'Williams',
        email: 'james.w@email.com',
        phone: '+234 806 789 0123',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        gender: 'male',
        loyaltyTier: 'silver',
        loyaltyPoints: 1200,
        vip: false,
        totalStays: 5,
        totalSpent: 180000,
      },
    ];

    for (const guest of guests) {
      await db.guest.create({ data: guest });
    }
    console.log('✅ Guests created');
  }

  // Create sample reservations
  const reservationCount = await db.reservation.count();
  if (reservationCount === 0) {
    const guests = await db.guest.findMany();
    const rooms = await db.room.findMany({
      where: { status: { in: ['occupied', 'reserved'] } },
      include: { roomType: true },
    });

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 3);

    const reservations = [
      {
        confirmationCode: generateConfirmationCode(),
        guestId: guests[0].id,
        roomId: rooms[0].id,
        checkIn: yesterday,
        checkOut: tomorrow,
        status: 'checked_in',
        source: 'website',
        adults: 2,
        roomRate: rooms[0].roomType.baseRate,
        totalAmount: rooms[0].roomType.baseRate * 2,
        checkedInAt: yesterday,
      },
      {
        confirmationCode: generateConfirmationCode(),
        guestId: guests[1].id,
        roomId: rooms[1].id,
        checkIn: today,
        checkOut: in3Days,
        status: 'confirmed',
        source: 'phone',
        adults: 1,
        roomRate: rooms[1].roomType.baseRate,
        totalAmount: rooms[1].roomType.baseRate * 3,
      },
      {
        confirmationCode: generateConfirmationCode(),
        guestId: guests[4].id,
        roomId: rooms[2].id,
        checkIn: yesterday,
        checkOut: in3Days,
        status: 'checked_in',
        source: 'walk_in',
        adults: 1,
        children: 1,
        roomRate: rooms[2].roomType.baseRate,
        totalAmount: rooms[2].roomType.baseRate * 4,
        checkedInAt: yesterday,
      },
    ];

    for (const res of reservations) {
      await db.reservation.create({ data: res });
    }
    console.log('✅ Reservations created');
  }

  // Create housekeeping tasks
  const hkCount = await db.housekeepingTask.count();
  if (hkCount === 0) {
    const rooms = await db.room.findMany({
      where: { status: 'housekeeping' },
    });

    for (const room of rooms) {
      await db.housekeepingTask.create({
        data: {
          roomId: room.id,
          type: 'cleaning',
          priority: 'high',
          status: 'pending',
          scheduledAt: new Date(),
          notes: 'Regular room cleaning',
        },
      });
    }
    console.log('✅ Housekeeping tasks created');
  }

  // Create some bills for checked-in reservations
  const billsCount = await db.bill.count();
  if (billsCount === 0) {
    const checkedInReservations = await db.reservation.findMany({
      where: { status: 'checked_in' },
    });

    for (const res of checkedInReservations) {
      await db.bill.create({
        data: {
          reservationId: res.id,
          guestId: res.guestId,
          roomCharges: res.totalAmount * 0.7,
          foodCharges: res.totalAmount * 0.15,
          barCharges: res.totalAmount * 0.1,
          otherCharges: res.totalAmount * 0.05,
          taxAmount: res.totalAmount * 0.075,
          totalAmount: res.totalAmount * 1.075,
          paidAmount: res.totalAmount * 0.5,
          balanceAmount: res.totalAmount * 0.575,
          status: 'partially_paid',
          paymentMethod: 'cash',
        },
      });
    }
    console.log('✅ Bills created');
  }

  // Create hotel policies
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

  // Create inventory items
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

  // Create sample staff profiles
  const staffCount = await db.staffProfile.count();
  if (staffCount === 0) {
    const adminUser = await db.user.findUnique({ where: { email: 'admin@royalloft.com' } });

    const staffData = [
      { name: 'Adaobi Nwosu', email: 'adaobi@royalloft.com', password: 'Staff@123', phone: '+234 801 111 2222', role: 'front_desk', department: 'front_desk', position: 'Front Desk Agent', baseSalary: 120000, bankName: 'GTBank', bankAccount: '0123456789', emergencyContact: 'Chidi Nwosu', emergencyPhone: '+234 802 222 3333' },
      { name: 'Kola Babatunde', email: 'kola@royalloft.com', password: 'Staff@123', phone: '+234 801 222 3333', role: 'staff', department: 'housekeeping', position: 'Housekeeper', baseSalary: 80000, bankName: 'Access Bank', bankAccount: '0234567890', emergencyContact: 'Bisi Babatunde', emergencyPhone: '+234 802 333 4444' },
      { name: 'Ngozi Eze', email: 'ngozi@royalloft.com', password: 'Staff@123', phone: '+234 801 333 4444', role: 'staff', department: 'kitchen', position: 'Head Chef', baseSalary: 150000, bankName: 'UBA', bankAccount: '0345678901', emergencyContact: 'Obi Eze', emergencyPhone: '+234 802 444 5555' },
      { name: 'Musa Ibrahim', email: 'musa@royalloft.com', password: 'Staff@123', phone: '+234 801 444 5555', role: 'staff', department: 'security', position: 'Security Guard', baseSalary: 90000, bankName: 'Zenith Bank', bankAccount: '0456789012', emergencyContact: 'Aisha Ibrahim', emergencyPhone: '+234 802 555 6666' },
      { name: 'Funke Adeyemi', email: 'funke@royalloft.com', password: 'Staff@123', phone: '+234 801 555 6666', role: 'accountant', department: 'accounts', position: 'Accountant', baseSalary: 130000, bankName: 'First Bank', bankAccount: '0567890123', emergencyContact: 'Tunde Adeyemi', emergencyPhone: '+234 802 666 7777' },
      { name: 'Chinedu Okafor', email: 'chinedu@royalloft.com', password: 'Staff@123', phone: '+234 801 666 7777', role: 'staff', department: 'maintenance', position: 'Maintenance Technician', baseSalary: 100000, bankName: 'GTBank', bankAccount: '0678901234', emergencyContact: 'Grace Okafor', emergencyPhone: '+234 802 777 8888' },
      { name: 'Blessing Okon', email: 'blessing@royalloft.com', password: 'Staff@123', phone: '+234 801 777 8888', role: 'staff', department: 'housekeeping', position: 'Laundry Supervisor', baseSalary: 85000, bankName: 'UBA', bankAccount: '0789012345', emergencyContact: 'Emem Okon', emergencyPhone: '+234 802 888 9999' },
      { name: 'Tunde Rahman', email: 'tunde.r@royalloft.com', password: 'Staff@123', phone: '+234 801 888 9999', role: 'front_desk', department: 'front_desk', position: 'Receptionist', baseSalary: 110000, bankName: 'Access Bank', bankAccount: '0890123456', emergencyContact: 'Shade Rahman', emergencyPhone: '+234 802 999 0000' },
    ];

    let empCounter = 1;
    for (const s of staffData) {
      const hashedPwd = await hashPassword(s.password);
      const user = await db.user.create({
        data: {
          email: s.email,
          password: hashedPwd,
          name: s.name,
          phone: s.phone,
          role: s.role,
          department: s.department,
        },
      });
      await db.staffProfile.create({
        data: {
          userId: user.id,
          employeeId: `RL-${String(empCounter).padStart(3, '0')}`,
          department: s.department,
          position: s.position,
          baseSalary: s.baseSalary,
          startDate: new Date('2025-01-15'),
          status: 'active',
          bankName: s.bankName,
          bankAccount: s.bankAccount,
          emergencyContact: s.emergencyContact,
          emergencyPhone: s.emergencyPhone,
        },
      });
      empCounter++;
    }

    // Set Musa as on_leave
    const musaUser = await db.user.findUnique({ where: { email: 'musa@royalloft.com' } });
    if (musaUser) {
      await db.staffProfile.update({
        where: { userId: musaUser.id },
        data: { status: 'on_leave' },
      });
    }

    // Create admin staff profile if not exists
    if (adminUser) {
      const adminProfile = await db.staffProfile.findUnique({ where: { userId: adminUser.id } });
      if (!adminProfile) {
        await db.staffProfile.create({
          data: {
            userId: adminUser.id,
            employeeId: `RL-${String(empCounter).padStart(3, '0')}`,
            department: 'management',
            position: 'General Manager',
            baseSalary: 350000,
            startDate: new Date('2024-06-01'),
            status: 'active',
            bankName: 'Zenith Bank',
            bankAccount: '0000000001',
            emergencyContact: 'N/A',
            emergencyPhone: '+234 800 000 0000',
          },
        });
      }
    }

    // Create attendance records for today for active staff
    const activeStaff = await db.staffProfile.findMany({
      where: { status: 'active' },
      include: { user: true },
    });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (const staff of activeStaff) {
      // Only mark present for staff with front_desk, kitchen, management departments
      if (['front_desk', 'kitchen', 'management'].includes(staff.department)) {
        const clockIn = new Date(todayStart);
        clockIn.setHours(8, 0 + Math.floor(Math.random() * 30), 0);
        await db.attendance.create({
          data: {
            staffId: staff.id,
            date: todayStart,
            clockIn,
            hoursWorked: 8,
            status: 'present',
          },
        });
      }
    }

    console.log('✅ Staff profiles and attendance created');
  }

  console.log('🌱 Seed completed successfully!');
}