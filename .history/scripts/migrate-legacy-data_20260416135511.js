/**
 * Legacy Data Migration Script
 * 
 * Imports data from the original hotelms.sql (MySQL/MariaDB) into the new Prisma schema.
 * 
 * Usage:
 *   npx tsx scripts/migrate-legacy-data.ts
 * 
 * Prerequisites:
 *   - Database must be set up (npx prisma db push)
 *   - Run the regular seed first (POST /api/seed)
 * 
 * NOTE: This script uses direct Prisma calls (no API routes needed).
 *       It reads from the hardcoded legacy data below (extracted from hotelms.sql).
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ============ LEGACY DATA (extracted from hotelms.sql) ============

const LEGACY_ROOM_TYPES = [
  { id: 23, type: 'Executive Suite', price: 65000, maxPerson: 3 },
  { id: 24, type: 'Executive', price: 50000, maxPerson: 2 },
  { id: 25, type: 'Deluxe', price: 40000, maxPerson: 2 },
  { id: 26, type: 'Standard', price: 30000, maxPerson: 2 },
];

const LEGACY_ROOMS = [
  { id: 47, typeId: 23, no: 'RM-010' },
  { id: 48, typeId: 23, no: 'RM-016' },
  { id: 51, typeId: 25, no: 'RM-007' },
  { id: 52, typeId: 26, no: 'RM-002' },
  { id: 53, typeId: 26, no: 'RM-004' },
  { id: 54, typeId: 26, no: 'RM-005' },
  { id: 56, typeId: 24, no: 'RM-008' },
  { id: 57, typeId: 24, no: 'RM-009' },
  { id: 59, typeId: 24, no: 'RM-012' },
  { id: 60, typeId: 24, no: 'RM-013' },
  { id: 61, typeId: 24, no: 'RM-014' },
  { id: 62, typeId: 24, no: 'RM-015' },
  { id: 63, typeId: 24, no: 'RM-011' },
  { id: 64, typeId: 26, no: 'RM-006' },
  { id: 66, typeId: 25, no: 'RM-003' },
  { id: 67, typeId: 26, no: 'RM-001' },
];

const LEGACY_CUSTOMERS = [
  { id: 20, name: 'THE REFINER EVENT', phone: '91221932716', email: 'default@gmail.com', idNo: '0000000000000', address: 'NOT ASSIGN' },
  { id: 33, name: 'THE REFINER EVENT', phone: '9122193276', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 34, name: 'Adetutu Liadi', phone: '8033838515', email: 'default@gmail', idNo: 'DONOTHAVE1', address: 'JDP IJEBU ODE' },
  { id: 36, name: 'ADEKUNLE BEN', phone: '7055367217', email: 'defalt@gmail.com', idNo: 'DONOTHAVE1', address: 'JDP IJEBU ODE' },
  { id: 37, name: 'ALADESHUWA AKIN', phone: '7087959090', email: 'default@gmail', idNo: 'DONOTHAVE1', address: 'JDP IJEBU ODE' },
  { id: 39, name: 'ODEYEMI REMILEKUN', phone: '8106963535', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 40, name: 'FREEMAN TUNDE', phone: '8054646706', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 42, name: 'ALABI OLUWASEYI', phone: '8162230998', email: 'oluwaseyi2000@yahoo.com', idNo: 'DONOTHAVE1', address: 'BLOCK 42 FLAT 1 ABESAN HOUSING ESTATE IPAJA LAGOS' },
  { id: 43, name: 'AWE OLASUNKANMI', phone: '7039371251', email: 'awesunkanmi71@yahoo.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 45, name: 'KELECHI NDUKWE', phone: '8062431446', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'ILESHA' },
  { id: 46, name: 'ADERINTO ADETOYOSE', phone: '8026149740', email: 'hhardeytoyese@gmail.com', idNo: 'DONOTHAVE1', address: 'LEKKI LAGOS STATE' },
  { id: 49, name: 'ADEFUYE KAYODE', phone: '7033249174', email: 'adefuye1@yahoo.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 50, name: 'OLASENI ABAYOMI', phone: '8033539662', email: 'olaseni@gmail.com', idNo: 'DONOTHAVE1', address: 'PLOT 37 SHAGARI ESTATE AKURE' },
  { id: 52, name: 'ASANI FUNMILOLA', phone: '8130493858', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 53, name: 'AJIBAWO OLAJIDE', phone: '8139358527', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 54, name: 'AKINBOBOSE AYOAKIN', phone: '8036862982', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 55, name: 'OYEDIBU ENOCH', phone: '8100272514', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 58, name: 'UBECHI JOY', phone: '8028524016', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'AJAH LAGOS' },
  { id: 59, name: 'OHIREMEN OHIS', phone: '8180187466', email: 'ohisb120@gmail.com', idNo: 'DONOTHAVE1', address: 'LAGOS' },
  { id: 60, name: 'EZOMOH JUDE', phone: '8080801180', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: '30 OBANIKORO STREET' },
  { id: 62, name: 'SEKOMI TUNDE', phone: '8036520909', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'EBUTE METTA LAGOS' },
  { id: 66, name: 'FEHINTOLA SULE', phone: '8038116276', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'VICTORIA ISLAND LAGOS' },
  { id: 69, name: 'FADAUNSI OLANREWAJU', phone: '8052979036', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 70, name: 'OJO AJIBOLA', phone: '8037003010', email: 'ojoAjibola455@gmail.com', idNo: 'DONOTHAVE1', address: 'OKEOMIRU ILESHA' },
  { id: 71, name: 'ISHOLA MAGRET', phone: '8037003080', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'OKEOMIRU ILESHA' },
  { id: 72, name: 'ADENIYI SAMUEL', phone: '8034734060', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'P&T IPAYA LAGOS' },
  { id: 73, name: 'AFOLABI OLANIYI', phone: '8110000841', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'OPP 3RD EXT NTA ADO EKITI' },
  { id: 74, name: 'IZEFAEGBE FRANK', phone: '8033882995', email: 'frankzeffy@gmail.com', idNo: 'DONOTHAVE1', address: 'PLOT 7/9 LAYOUT ABUJA' },
  { id: 75, name: 'BASHIR IBRAHIM', phone: '8033882995', email: 'frankzeffy@gmail.com', idNo: 'DONOTHAVE1', address: 'PLOT 7/9 IDU LAD.LAYOUT ABUJA' },
  { id: 76, name: 'OYEBAMIJI ADEWALE', phone: '8132522968', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'ADEBAYO ABON NO 1' },
  { id: 77, name: 'IKPE DANIEL', phone: '8065368885', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 78, name: 'SAMOND DARE', phone: '7084532737', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'AKABAI STREET LAGOS' },
  { id: 79, name: 'OMOBOLANLE SAMUEL', phone: '8147858288', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'IBADAN' },
  { id: 80, name: 'ALALU DARE', phone: '8060403363', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'IBADAN' },
  { id: 81, name: 'OLADEHINDE MICHAEL', phone: '7047832319', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'SANGO OTA OGUN STATE' },
  { id: 82, name: 'KOMOLAFE AYODEJI', phone: '8100120130', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'FADAHUNSI IMO ILESA OSUN STATE' },
  { id: 83, name: 'AHMED OMOTOLA', phone: '9065448283', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'OMI ASORO ILESHA' },
  { id: 84, name: 'AFOLABI OLANIYI', phone: '81100', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NTA ADO EKITI' },
  { id: 85, name: 'LUKERA DAVID', phone: '8169001110', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NO 27 KUBWA ABUJA' },
  { id: 86, name: 'FAKOYA BABATUNDE', phone: '9134324355', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'LAGOS' },
  { id: 87, name: 'KOMOLAFE OLAYEMI', phone: '8053319086', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'IMO ILESHA' },
  { id: 88, name: 'ADEYEMO ADEKUNLE', phone: '8031160725', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'IMO ILESHA' },
  { id: 89, name: 'ABUBAKIR SODIQ', phone: '8088103916', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'ABUJA' },
  { id: 90, name: 'SEKETI ADEBOWALE', phone: '7030992863', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'MOGAJI HOME AULE AKURE' },
  { id: 91, name: 'ABUBAKAR SODIQ', phone: '8088103916', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'ABUJA' },
  { id: 92, name: 'ALIMI ABDULLAHI', phone: '8036520909', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'AJIBOYE ROYAL CAMP OSUN STATE' },
  { id: 93, name: 'OLUCHI JOY', phone: '9133462114', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGNED' },
  { id: 94, name: 'KOMOLAFE OLAYEMI', phone: '7056480888', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'INTERNATIONAL BREWERIES' },
  { id: 95, name: 'AWONIYI SUNDAY', phone: '8136764181', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'OGUN STATE NO 14 GBENGA STREET' },
  { id: 96, name: 'ISMAIL LATEEF', phone: '8047273031', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'AJEGUNLE ISE EKITI' },
  { id: 97, name: 'BABATUNDE ALIYU', phone: '8033743459', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 98, name: 'OGUNNIYI TAIWO', phone: '8036187684', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'LAGOS' },
  { id: 99, name: 'ADAMU ABBA', phone: '8063230588', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'APAPA LAGOS' },
  { id: 100, name: 'POPOOLA ABDULJELIL', phone: '7037264803', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 101, name: 'BELLO FAITIA', phone: '9128209859', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 102, name: 'ADEWUMI DUPE', phone: '7011084797', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'LAGOS' },
  { id: 103, name: 'WILLIAMS KEHINDE', phone: '8086028594', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 104, name: 'ADEWUMI DUPE', phone: '7011847974', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'LAGOS' },
  { id: 106, name: 'AKINOLA SUNDAY', phone: '8023636020', email: 'ayeoyenikan90w@gmail.com', idNo: 'DONOTHAVE1', address: 'OJOTA LAGOS' },
  { id: 107, name: 'JOHN SUNDAY', phone: '9122193276', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'KAJOLA STREET IMO ILESHA' },
  { id: 108, name: 'ABDULLAHI YUNUSA', phone: '9164542480', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'OLUFEMI STREET' },
  { id: 110, name: 'OLUCHUKWU VINCENT', phone: '8066185052', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 111, name: 'OLADIPO OLUWASEUN', phone: '8134786492', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'ABEOKUTA' },
  { id: 112, name: 'ADIGUN LEMON', phone: '8165031677', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 113, name: 'MICHAEL GOODNESS', phone: '8057733374', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'IBADAN' },
  { id: 114, name: 'SUNDAY SAMUEL', phone: '8052979036', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 115, name: 'IGBALAJOBI SUNDAY', phone: '8160731034', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 116, name: 'BAYONLE SAMSON', phone: '8131662636', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 117, name: 'OJO TEMITAYO', phone: '8027359334', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'LUCAS STREET OBAWOLE LAGOS' },
  { id: 118, name: 'ISAIAH EJOH', phone: '8107390395', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 119, name: 'ADELEKE OLARENWAJU', phone: '9036843606', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 120, name: 'ADAURA MUHAMMED', phone: '8143758894', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'ABUJA' },
  { id: 121, name: 'AKANDE IYANUOLUWA', phone: '8133416780', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 122, name: 'AKANDE IYANUOLUWA', phone: '8133416783', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'IJAMO IKORODU' },
  { id: 123, name: 'JOHN SUNDAY', phone: '7042888741', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 124, name: 'JAMES UGBEDE', phone: '8030685778', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'ABUJA' },
  { id: 125, name: 'OLUWASEUN MOSES', phone: '8051840497', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NOT ASSIGN' },
  { id: 126, name: 'AKEEM LAMIDI', phone: '8154300122', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'ILESHA' },
  { id: 127, name: 'AJAYI SHEGUN', phone: '7048773475', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'BREWERIES EXPRESS' },
  { id: 128, name: 'ADENIYI ADEDAYO', phone: '8037642692', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'NO 13 OKUNBOR STREET BENIN' },
  { id: 129, name: 'OYENIYI OMOBUKOLA', phone: '8136616280', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'OMI ASORO ILESHA' },
  { id: 130, name: 'OLAFARE ABIOLA', phone: '8098313712', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'RING ROAD IBADAN' },
  { id: 131, name: 'ONI REINHORD', phone: '8123401005', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'ILE IFE' },
  { id: 132, name: 'ONI REINHORD', phone: '8123401005', email: 'default@gmail.com', idNo: 'DONOTHAVE1', address: 'ILE IFE' },
];

// Selected bookings for migration
const LEGACY_BOOKINGS = [
  { id: 19, custId: 20, roomId: 52, checkIn: '2025-12-12', checkOut: '2025-12-13', price: 60000, discount: 0 },
  { id: 34, custId: 33, roomId: 66, checkIn: '2025-12-12', checkOut: '2025-12-14', price: 80000, discount: 0 },
  { id: 36, custId: 34, roomId: 53, checkIn: '2025-12-14', checkOut: '2025-12-16', price: 30000, discount: 10000 },
  { id: 37, custId: 36, roomId: 54, checkIn: '2025-12-14', checkOut: '2025-12-16', price: 60000, discount: 20000 },
  { id: 39, custId: 38, roomId: 48, checkIn: '2025-12-12', checkOut: '2025-12-14', price: 100000, discount: 30000 },
  { id: 81, custId: 73, roomId: 67, checkIn: '2025-12-18', checkOut: '2025-12-19', price: 20000, discount: 10000 },
  { id: 82, custId: 74, roomId: 64, checkIn: '2025-12-20', checkOut: '2025-12-21', price: 20000, discount: 10000 },
  { id: 95, custId: 85, roomId: 67, checkIn: '2026-01-04', checkOut: '2026-01-05', price: 20000, discount: 10000 },
  { id: 105, custId: 89, roomId: 53, checkIn: '2026-01-10', checkOut: '2026-01-11', price: 20000, discount: 10000 },
  { id: 111, custId: 94, roomId: 52, checkIn: '2026-01-18', checkOut: '2026-01-19', price: 20000, discount: 10000 },
  { id: 116, custId: 97, roomId: 48, checkIn: '2026-01-22', checkOut: '2026-01-24', price: 90000, discount: 40000 },
  { id: 117, custId: 97, roomId: 48, checkIn: '2026-01-24', checkOut: '2026-01-25', price: 50000, discount: 15000 },
  { id: 128, custId: 105, roomId: 64, checkIn: '2026-02-07', checkOut: '2026-02-08', price: 20000, discount: 10000 },
  { id: 134, custId: 110, roomId: 64, checkIn: '2026-02-15', checkOut: '2026-02-19', price: 80000, discount: 40000 },
  { id: 144, custId: 115, roomId: 52, checkIn: '2026-03-07', checkOut: '2026-03-08', price: 20000, discount: 10000 },
  { id: 152, custId: 120, roomId: 67, checkIn: '2026-03-18', checkOut: '2026-03-19', price: 20000, discount: 10000 },
  { id: 158, custId: 125, roomId: 66, checkIn: '2026-03-27', checkOut: '2026-03-28', price: 25000, discount: 15000 },
  { id: 161, custId: 128, roomId: 52, checkIn: '2026-04-02', checkOut: '2026-04-03', price: 20000, discount: 10000 },
  { id: 162, custId: 129, roomId: 67, checkIn: '2026-04-02', checkOut: '2026-04-03', price: 20000, discount: 10000 },
  { id: 163, custId: 130, roomId: 53, checkIn: '2026-04-03', checkOut: '2026-04-04', price: 20000, discount: 10000 },
  { id: 165, custId: 131, roomId: 67, checkIn: '2026-04-12', checkOut: '2026-04-13', price: 20000, discount: 10000 },
  { id: 166, custId: 132, roomId: 52, checkIn: '2026-04-12', checkOut: '2026-04-13', price: 20000, discount: 10000 },
  { id: 167, custId: 131, roomId: 53, checkIn: '2026-04-12', checkOut: '2026-04-13', price: 20000, discount: 10000 },
  { id: 168, custId: 132, roomId: 54, checkIn: '2026-04-12', checkOut: '2026-04-13', price: 20000, discount: 10000 },
  { id: 169, custId: 131, roomId: 64, checkIn: '2026-04-12', checkOut: '2026-04-13', price: 20000, discount: 10000 },
];

// ============ HELPERS ============

function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
  }
  return { firstName: fullName, lastName: '' };
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

// ============ MAIN MIGRATION ============

async function migrate() {
  console.log('========================================');
  console.log('  Royal Loft - Legacy Data Migration');
  console.log('========================================\n');

  try {
    // 1. Room Types
    console.log('[1/6] Room types...');
    for (const rt of LEGACY_ROOM_TYPES) {
      const exists = await prisma.roomType.findFirst({ where: { name: rt.type } });
      if (!exists) {
        await prisma.roomType.create({
          data: {
            name: rt.type,
            description: `${rt.type} room - imported from legacy system`,
            baseRate: rt.price,
            maxOccupancy: rt.maxPerson,
            amenities: JSON.stringify(['TV', 'AC', 'WiFi', 'Mini Fridge']),
            sortOrder: rt.id,
            isActive: true,
          },
        });
        console.log(`  + ${rt.type} (NGN ${rt.price.toLocaleString()}/night)`);
      }
    }

    // 2. Rooms
    console.log('[2/6] Rooms...');
    const roomTypes = await prisma.roomType.findMany();
    for (const room of LEGACY_ROOMS) {
      const exists = await prisma.room.findFirst({ where: { roomNumber: room.no } });
      if (!exists) {
        const legacyRt = LEGACY_ROOM_TYPES.find(l => l.id === room.typeId);
        const rt = roomTypes.find(t => t.name === legacyRt?.type);
        if (rt) {
          await prisma.room.create({
            data: { roomNumber: room.no, floor: 1, roomTypeId: rt.id, status: 'available' },
          });
          console.log(`  + ${room.no} (${rt.name})`);
        }
      }
    }

    // 3. Guests
    console.log('[3/6] Guests...');
    const guestMap = new Map();
    let newGuests = 0;
    for (const cust of LEGACY_CUSTOMERS) {
      const existing = await prisma.guest.findFirst({ where: { phone: cust.phone.toString() } });
      if (!existing) {
        const { firstName, lastName } = splitName(cust.name);
        const guest = await prisma.guest.create({
          data: {
            firstName: firstName || cust.name,
            lastName,
            phone: cust.phone.toString(),
            email: (!cust.email.includes('default') && !cust.email.includes('defalt')) ? cust.email : null,
            address: (cust.address && cust.address !== 'NOT ASSIGN' && cust.address !== 'NOT ASSIGN ') ? cust.address : null,
            country: 'Nigeria',
            idType: 'NIN',
            idNumber: (cust.idNo && cust.idNo !== 'DONOTHAVE1' && !cust.idNo.startsWith('000')) ? cust.idNo : null,
          },
        });
        guestMap.set(cust.id, guest.id);
        newGuests++;
      } else {
        guestMap.set(cust.id, existing.id);
      }
    }
    console.log(`  ${newGuests} new guests imported (${guestMap.size} total mapped)`);

    // 4. Reservations
    console.log('[4/6] Reservations...');
    const rooms = await prisma.room.findMany();
    let resCount = 0;
    for (const booking of LEGACY_BOOKINGS) {
      const guestId = guestMap.get(booking.custId);
      if (!guestId) continue;

      const legacyRoom = LEGACY_ROOMS.find(r => r.id === booking.roomId);
      const newRoom = rooms.find(r => r.roomNumber === legacyRoom?.no);
      if (!newRoom) continue;

      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      const nights = Math.max(1, Math.ceil((checkOut - checkIn) / 86400000));
      const legacyRt = LEGACY_ROOM_TYPES.find(rt => rt.id === legacyRoom?.typeId);
      const roomRate = legacyRt?.price || 30000;
      const totalAmount = roomRate * nights;
      const paidAmount = totalAmount - (booking.discount || 0);
      const now = new Date();
      const status = checkOut <= now ? 'checked_out' : checkIn > now ? 'confirmed' : 'checked_in';

      try {
        await prisma.reservation.create({
          data: {
            confirmationCode: `RL-${String(booking.id).padStart(4, '0')}`,
            guestId,
            roomId: newRoom.id,
            checkIn,
            checkOut,
            status,
            source: 'walk_in',
            adults: 1,
            roomRate,
            totalAmount,
            paidAmount,
            checkedInAt: checkIn <= now ? checkIn : null,
            checkedOutAt: checkOut <= now ? checkOut : null,
            notes: 'Imported from legacy hotelms system',
          },
        });
        resCount++;
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log(`  ${resCount} reservations imported`);

    // 5. Bills
    console.log('[5/6] Bills...');
    const migrated = await prisma.reservation.findMany({ where: { notes: 'Imported from legacy hotelms system' } });
    let billCount = 0;
    for (const res of migrated) {
      const exists = await prisma.bill.findUnique({ where: { reservationId: res.id } });
      if (!exists) {
        const tax = res.totalAmount * 0.075;
        await prisma.bill.create({
          data: {
            reservationId: res.id,
            guestId: res.guestId,
            roomCharges: res.totalAmount * 0.7,
            otherCharges: res.totalAmount * 0.3,
            taxAmount: tax,
            totalAmount: res.totalAmount + tax,
            paidAmount: res.paidAmount,
            balanceAmount: res.totalAmount + tax - res.paidAmount,
            status: res.paidAmount >= res.totalAmount ? 'paid' : 'partially_paid',
            paymentMethod: 'cash',
          },
        });
        billCount++;
      }
    }
    console.log(`  ${billCount} bills created`);

    // 6. Legacy staff
    console.log('[6/6] Legacy staff...');
    const legacyStaff = { name: 'POLYCARP CHIKE', phone: '9133273608', email: 'polycarpchike@royalloft.com', dept: 'front_desk', pos: 'Front Desk Receptionist', salary: 90000 };
    const exists = await prisma.user.findUnique({ where: { email: legacyStaff.email } });
    if (!exists) {
      const user = await prisma.user.create({
        data: { email: legacyStaff.email, password: hashPassword('Staff@123'), name: legacyStaff.name, phone: `+234 ${legacyStaff.phone}`, role: 'staff', department: legacyStaff.dept },
      });
      await prisma.staffProfile.create({
        data: { userId: user.id, employeeId: 'LEG-PC', department: legacyStaff.dept, position: legacyStaff.pos, baseSalary: legacyStaff.salary, startDate: new Date('2025-12-08'), status: 'active' },
      });
      console.log('  + POLYCARP CHIKE imported');
    }

    console.log('\n========================================');
    console.log('  Migration complete!');
    console.log(`  Room types: ${LEGACY_ROOM_TYPES.length}`);
    console.log(`  Rooms: ${LEGACY_ROOMS.length}`);
    console.log(`  Guests: ${newGuests} new`);
    console.log(`  Reservations: ${resCount}`);
    console.log(`  Bills: ${billCount}`);
    console.log('========================================');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
