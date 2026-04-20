import { db } from '@/lib/db';
import { hashPassword, generateConfirmationCode } from '@/lib/auth';

// ═══════════════════════════════════════════════════════════════════════════════
// ROYAL LOFT — MASTER SEED FILE
// ═══════════════════════════════════════════════════════════════════════════════
// Room Prices: Standard ₦30,000 | Deluxe ₦40,000 | Executive ₦50,000 | Executive Suite ₦65,000
// Includes ALL real transaction data from existing system (IDs 20–132)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Room Types & Prices ─────────────────────────────────────────────────────
const ROOM_TYPES = [
  { name: 'Standard', description: 'Comfortable room with essential amenities for a pleasant stay', baseRate: 30000, maxOccupancy: 2, amenities: JSON.stringify(['TV', 'AC', 'WiFi', 'Mini Fridge', 'Telephone']), sortOrder: 1 },
  { name: 'Deluxe', description: 'Spacious room with premium amenities and city views', baseRate: 40000, maxOccupancy: 3, amenities: JSON.stringify(['TV', 'AC', 'WiFi', 'Mini Fridge', 'Work Desk', 'Coffee Maker', 'Safe']), sortOrder: 2 },
  { name: 'Executive', description: 'Upscale room with executive lounge access and premium fittings', baseRate: 50000, maxOccupancy: 3, amenities: JSON.stringify(['TV', 'AC', 'WiFi', 'Mini Bar', 'Work Desk', 'Coffee Maker', 'Sofa', 'Bathtub', 'Safe']), sortOrder: 3 },
  { name: 'Executive Suite', description: 'Top-tier luxury suite with separate living area and panoramic views', baseRate: 65000, maxOccupancy: 4, amenities: JSON.stringify(['TV', 'AC', 'WiFi', 'Mini Bar', 'Work Desk', 'Coffee Maker', 'Living Room', 'Dining Area', 'Jacuzzi', 'Balcony', 'Safe']), sortOrder: 4 },
];

const ROOMS = [
  { roomNumber: '101', floor: 1, type: 'Standard', status: 'available' },
  { roomNumber: '102', floor: 1, type: 'Standard', status: 'occupied' },
  { roomNumber: '103', floor: 1, type: 'Deluxe', status: 'available' },
  { roomNumber: '104', floor: 1, type: 'Deluxe', status: 'housekeeping' },
  { roomNumber: '105', floor: 1, type: 'Standard', status: 'available' },
  { roomNumber: '106', floor: 1, type: 'Executive Suite', status: 'reserved' },
  { roomNumber: '107', floor: 1, type: 'Standard', status: 'available' },
  { roomNumber: '201', floor: 2, type: 'Deluxe', status: 'available' },
  { roomNumber: '202', floor: 2, type: 'Standard', status: 'occupied' },
  { roomNumber: '203', floor: 2, type: 'Executive', status: 'available' },
  { roomNumber: '204', floor: 2, type: 'Deluxe', status: 'maintenance' },
  { roomNumber: '205', floor: 2, type: 'Standard', status: 'available' },
  { roomNumber: '206', floor: 2, type: 'Executive', status: 'occupied' },
  { roomNumber: '207', floor: 2, type: 'Executive Suite', status: 'available' },
  { roomNumber: '301', floor: 3, type: 'Executive', status: 'available' },
  { roomNumber: '302', floor: 3, type: 'Executive Suite', status: 'available' },
  { roomNumber: '303', floor: 3, type: 'Executive Suite', status: 'occupied' },
  { roomNumber: '304', floor: 3, type: 'Deluxe', status: 'available' },
  { roomNumber: '305', floor: 3, type: 'Executive Suite', status: 'reserved' },
  { roomNumber: '306', floor: 3, type: 'Executive', status: 'available' },
];

// ─── Staff Members ───────────────────────────────────────────────────────────
const STAFF_MEMBERS = [
  { name: 'Adaobi Nwosu', email: 'adaobi@royalloft.com', phone: '+234 801 111 1111', role: 'front_desk', department: 'front_desk', position: 'Front Desk Agent', baseSalary: 120000, status: 'active' },
  { name: 'Kola Babatunde', email: 'kola@royalloft.com', phone: '+234 801 222 2222', role: 'housekeeping', department: 'housekeeping', position: 'Housekeeper', baseSalary: 80000, status: 'active' },
  { name: 'Ngozi Eze', email: 'ngozi@royalloft.com', phone: '+234 801 333 3333', role: 'staff', department: 'kitchen', position: 'Head Chef', baseSalary: 150000, status: 'active' },
  { name: 'Musa Ibrahim', email: 'musa@royalloft.com', phone: '+234 801 444 4444', role: 'staff', department: 'security', position: 'Security Guard', baseSalary: 100000, status: 'on_leave' },
  { name: 'Funke Adeyemi', email: 'funke@royalloft.com', phone: '+234 801 555 5555', role: 'accountant', department: 'accounts', position: 'Senior Accountant', baseSalary: 180000, status: 'active' },
  { name: 'Chinedu Okafor', email: 'chinedu@royalloft.com', phone: '+234 801 666 6666', role: 'staff', department: 'maintenance', position: 'Maintenance Officer', baseSalary: 90000, status: 'active' },
  { name: 'Blessing Obi', email: 'blessing@royalloft.com', phone: '+234 801 777 7777', role: 'front_desk', department: 'front_desk', position: 'Receptionist', baseSalary: 100000, status: 'active' },
  { name: 'Tunde Bakare', email: 'tunde@royalloft.com', phone: '+234 801 888 8888', role: 'housekeeping', department: 'housekeeping', position: 'Housekeeping Supervisor', baseSalary: 110000, status: 'active' },
  { name: 'Aisha Mohammed', email: 'aisha@royalloft.com', phone: '+234 801 999 9999', role: 'staff', department: 'kitchen', position: 'Kitchen Assistant', baseSalary: 70000, status: 'active' },
  { name: 'Emeka Ogun', email: 'emekao@royalloft.com', phone: '+234 802 000 0001', role: 'staff', department: 'security', position: 'Security Supervisor', baseSalary: 120000, status: 'active' },
  { name: 'Sade Akinola', email: 'sade@royalloft.com', phone: '+234 802 000 0002', role: 'housekeeping', department: 'housekeeping', position: 'Laundry Attendant', baseSalary: 70000, status: 'on_leave' },
  { name: 'Obinna Eze', email: 'obinna@royalloft.com', phone: '+234 802 000 0003', role: 'front_desk', department: 'front_desk', position: 'Concierge', baseSalary: 110000, status: 'active' },
  { name: 'Hauwa Garba', email: 'hauwa@royalloft.com', phone: '+234 802 000 0004', role: 'staff', department: 'kitchen', position: 'Pastry Chef', baseSalary: 110000, status: 'active' },
  { name: 'Gbenga Ade', email: 'gbenga@royalloft.com', phone: '+234 802 000 0005', role: 'manager', department: 'management', position: 'Operations Manager', baseSalary: 250000, status: 'active' },
  { name: 'Toyin Alade', email: 'toyin@royalloft.com', phone: '+234 802 000 0006', role: 'manager', department: 'management', position: 'General Manager', baseSalary: 350000, status: 'active' },
];

// ─── EXPENSE CATEGORIES ─────────────────────────────────────────────────────
const EXPENSE_TEMPLATES = [
  { category: 'utilities', description: 'PHCN electricity bill', vendor: 'Ibadan Electricity Distribution Company', amount: 450000 },
  { category: 'utilities', description: 'Water supply & treatment', vendor: 'State Water Corporation', amount: 85000 },
  { category: 'utilities', description: 'Internet service subscription', vendor: 'Spectranet', amount: 120000 },
  { category: 'utilities', description: 'Diesel generator fuel', vendor: 'Total Energies', amount: 380000 },
  { category: 'food_beverage', description: 'Fresh food supplies - meat, fish, vegetables', vendor: 'Cold Room Market', amount: 320000 },
  { category: 'food_beverage', description: 'Beverages and drinks stock', vendor: 'Nigerian Breweries Distributor', amount: 185000 },
  { category: 'food_beverage', description: 'Baking ingredients and dry goods', vendor: 'UTC Foods', amount: 95000 },
  { category: 'supplies', description: 'Guest amenities - soap, shampoo, lotion', vendor: 'Hospitality Supplies Ltd', amount: 75000 },
  { category: 'supplies', description: 'Cleaning chemicals and detergents', vendor: 'Diversey Nigeria', amount: 65000 },
  { category: 'supplies', description: 'Bed linens and towels replenishment', vendor: 'Textile Mills Plc', amount: 140000 },
  { category: 'supplies', description: 'Office stationery and printing', vendor: 'Printwell Ltd', amount: 35000 },
  { category: 'maintenance', description: 'Generator servicing and parts', vendor: 'Caterpillar Nigeria', amount: 150000 },
  { category: 'maintenance', description: 'AC maintenance and gas refill', vendor: 'CoolTech Services', amount: 95000 },
  { category: 'maintenance', description: 'Plumbing repairs', vendor: 'Fix-It Plumbing', amount: 45000 },
  { category: 'maintenance', description: 'Painting and renovation materials', vendor: 'Paint Masters', amount: 180000 },
  { category: 'marketing', description: 'Social media advertising', vendor: 'Meta Ads', amount: 120000 },
  { category: 'marketing', description: 'OTA listing fees (Jumia, Hotels.com)', vendor: 'Jumia Travel', amount: 85000 },
  { category: 'marketing', description: 'Signage and branding materials', vendor: 'QuickSign Ltd', amount: 55000 },
  { category: 'laundry', description: 'Industrial laundry machine lease', vendor: 'LaundryTech Nigeria', amount: 75000 },
  { category: 'miscellaneous', description: 'Staff welfare and team building', vendor: 'N/A', amount: 100000 },
  { category: 'miscellaneous', description: 'Security gadgets and CCTV maintenance', vendor: 'SecureTech Ltd', amount: 60000 },
  { category: 'miscellaneous', description: 'Insurance premium - property', vendor: 'Leadway Assurance', amount: 200000 },
  { category: 'miscellaneous', description: 'Waste disposal services', vendor: 'Waste Management Ltd', amount: 45000 },
  { category: 'salaries', description: 'Security outsourcing (external guards)', vendor: 'Shield Security Ltd', amount: 240000 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// REAL TRANSACTION DATA — Imported from existing system (IDs 20–132)
// Format: [name, phone, email, adults, idNumber, address, datetime]
// ═══════════════════════════════════════════════════════════════════════════════

interface RawTransaction {
  originalId: number;
  name: string;
  phone: number;
  email: string;
  adults: number;
  idNumber: string;
  address: string;
  datetime: string;
}

const REAL_TRANSACTIONS: RawTransaction[] = [
  { originalId: 20, name: 'THE REFINER EVENT', phone: 91221932716, email: 'default@gmail.com', adults: 3, idNumber: '0000000000000', address: 'NOT ASSIGN', datetime: '2025-12-11 17:27:53' },
  { originalId: 21, name: 'THE REFINER EVENT', phone: 91221932716, email: 'default@gmail.com', adults: 3, idNumber: '00000000000000', address: 'NOT ASSIGN', datetime: '2025-12-11 17:29:08' },
  { originalId: 22, name: 'THE REFINER EVENT', phone: 91221932716, email: 'default@gmail.com', adults: 3, idNumber: '00000000000000', address: 'NOT ASSIGN', datetime: '2025-12-11 17:29:36' },
  { originalId: 23, name: 'THE REFINER EVENT', phone: 91221932716, email: 'default@gmail.com', adults: 3, idNumber: '000000000000000', address: 'NOT ASSIGN', datetime: '2025-12-11 17:30:03' },
  { originalId: 24, name: 'THE REFINER EVENT', phone: 91221932716, email: 'default@gmail.com', adults: 3, idNumber: '0000000000000', address: 'NOT ASSIGN', datetime: '2025-12-11 17:30:34' },
  { originalId: 25, name: 'THE REFINER EVENT', phone: 91221932716, email: 'default@gmail.com', adults: 3, idNumber: '0000000000000000', address: 'NOT ASSIGN', datetime: '2025-12-11 17:30:58' },
  { originalId: 26, name: 'THE REFINER EVENT', phone: 91221932716, email: 'default@gmail.com', adults: 3, idNumber: '00000000000000000000', address: 'NOT ASSIGN', datetime: '2025-12-11 17:31:29' },
  { originalId: 27, name: 'THE REFINER EVENT', phone: 91221932716, email: 'default@gmail.com', adults: 3, idNumber: '00000000000000000000', address: 'NOT ASSIGN', datetime: '2025-12-11 17:32:08' },
  { originalId: 28, name: 'THE REFINER EVENT', phone: 91221932716, email: 'default@gmail.com', adults: 3, idNumber: '00000000000000000000', address: 'NOT ASSIGN', datetime: '2025-12-11 17:32:33' },
  { originalId: 29, name: 'THE REFINER EVENT', phone: 91221932716, email: 'default@gmail.com', adults: 3, idNumber: '00000000000000000000', address: 'NOT ASSIGN', datetime: '2025-12-11 17:33:26' },
  { originalId: 30, name: 'THE REFINER EVENT', phone: 91221932716, email: 'default@gmail.com', adults: 3, idNumber: '00000000000000000000', address: 'NOT ASSIGN', datetime: '2025-12-11 17:34:08' },
  { originalId: 31, name: 'THE REFINER EVENT', phone: 91221932716, email: 'default@gmail.com', adults: 3, idNumber: '00000000000000000000', address: 'NOT ASSIGN', datetime: '2025-12-11 17:35:20' },
  { originalId: 32, name: 'THE REFINER EVENT', phone: 91221932716, email: 'default@gmail.com', adults: 3, idNumber: '00000000000000000000', address: 'NOT ASSIGN', datetime: '2025-12-11 17:37:36' },
  { originalId: 33, name: 'THE REFINER EVENT', phone: 9122193276, email: 'default@gmail.com', adults: 3, idNumber: '00000000000000000000', address: 'NOT ASSIGN', datetime: '2025-12-12 20:33:35' },
  { originalId: 34, name: 'Adetutu Liadi', phone: 8033838515, email: 'default@gmail', adults: 3, idNumber: 'DONOTHAVE1', address: 'JDP IJEBU ODE', datetime: '2025-12-14 18:47:30' },
  { originalId: 36, name: 'ADEKUNLE BEN', phone: 7055367217, email: 'defalt@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'JDP IJEBU ODE', datetime: '2025-12-14 18:54:39' },
  { originalId: 37, name: 'ALADESHUWA AKIN', phone: 7087959090, email: 'default@gmail', adults: 3, idNumber: 'DONOTHAVE1', address: 'JDP IJEBU ODE', datetime: '2025-12-14 18:58:56' },
  { originalId: 38, name: 'THE REFINER EVENT', phone: 9122193276, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2025-12-17 11:12:44' },
  { originalId: 39, name: 'ODEYEMI REMILEKUN', phone: 8106963535, email: 'default@gmail.com', adults: 3, idNumber: '00000000000000000000', address: 'NOT ASSIGN', datetime: '2025-12-17 13:26:13' },
  { originalId: 40, name: 'FREEMAN TUNDE', phone: 8054646706, email: 'default@gmail.com', adults: 3, idNumber: '00000000000000000000', address: 'NOT ASSIGN', datetime: '2025-12-17 13:32:15' },
  { originalId: 41, name: 'OLALIN HAMMED', phone: 9071678191, email: 'default@gmail.com', adults: 3, idNumber: '00000000000000000000', address: 'NOT ASSIGN', datetime: '2025-12-17 13:43:03' },
  { originalId: 42, name: 'ALABI OLUWASEYI', phone: 8162230998, email: 'oluwaseyi2000@yahoo.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'BLOCK 42 FLAT 1 ABESAN HOUSING ESTATE IPAJA LAGOS', datetime: '2025-12-17 13:49:37' },
  { originalId: 43, name: 'AWE OLASUNKANMI', phone: 7039371251, email: 'awesunkanmi71@yahoo.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2025-12-17 13:56:03' },
  { originalId: 44, name: 'AKUIWU PASCAL', phone: 7032308696, email: 'default@gmail.com', adults: 3, idNumber: '00000000000000000000', address: 'NOT ASSIGN', datetime: '2025-12-17 13:58:41' },
  { originalId: 45, name: 'KELECHI NDUKWE', phone: 8062431446, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'ILESHA', datetime: '2025-12-17 14:01:26' },
  { originalId: 46, name: 'ADERINTO ADETOYOSE', phone: 8026149740, email: 'hhardeytoyese@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'LEKKI LAGOS STATE', datetime: '2025-12-17 14:07:22' },
  { originalId: 47, name: 'ADERINTO ADETOYOSE', phone: 8171880668, email: 'hhardeytoyese@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'LEKKI LAGOS STATE', datetime: '2025-12-17 14:20:43' },
  { originalId: 48, name: 'OMOTOSHO SANMI', phone: 810500751, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2025-12-17 14:24:14' },
  { originalId: 49, name: 'ADEFUYE KAYODE', phone: 7033249174, email: 'adefuye1@yahoo.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2025-12-17 14:27:29' },
  { originalId: 50, name: 'OLASENI ABAYOMI', phone: 8033539662, email: 'olaseni@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'PLOT 37 SHAGARI ESTATE AKURE', datetime: '2025-12-17 14:32:45' },
  { originalId: 51, name: 'UMEH DANIEL', phone: 7059962543, email: 'default@gmail', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2025-12-17 14:36:20' },
  { originalId: 52, name: 'ASANI FUNMILOLA', phone: 8130493858, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2025-12-17 14:39:11' },
  { originalId: 53, name: 'AJIBAWO OLAJIDE', phone: 8139358527, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2025-12-17 14:41:55' },
  { originalId: 54, name: 'AKINBOBOSE AYOAKIN', phone: 8036862982, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2025-12-17 14:48:25' },
  { originalId: 55, name: 'OYEDIBU ENOCH', phone: 8100272514, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2025-12-17 14:55:59' },
  { originalId: 56, name: 'ALAKE TUNBOSUN', phone: 8180445694, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2025-12-17 15:00:38' },
  { originalId: 57, name: 'ADETOKUNBO ADESIN', phone: 8139627315, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2025-12-17 15:03:37' },
  { originalId: 58, name: 'UBECHI JOY', phone: 8028524016, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'AJAH LAGOS', datetime: '2025-12-17 15:07:23' },
  { originalId: 59, name: 'OHIREMEN OHIS', phone: 8180187466, email: 'ohisb120@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'LAGOS', datetime: '2025-12-17 15:10:18' },
  { originalId: 60, name: 'EZOMOH JUDE', phone: 8080801180, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: '30 OBANIKORO STREET', datetime: '2025-12-17 15:20:33' },
  { originalId: 61, name: 'SIMEON KEKERE', phone: 8023019882, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2025-12-17 15:23:57' },
  { originalId: 62, name: 'SEKOMI TUNDE', phone: 8036520909, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'EBUTE METTA LAGOS', datetime: '2025-12-17 15:25:53' },
  { originalId: 63, name: 'EZOMOH TUNDE', phone: 8080801180, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: '3', datetime: '2025-12-17 15:30:46' },
  { originalId: 64, name: 'SIMEON KEKERE', phone: 8023019882, email: 'default@gmail.com', adults: 3, idNumber: '00000000000000000000', address: 'NOT ASSIGN', datetime: '2025-12-17 15:34:36' },
  { originalId: 65, name: 'OLATUN SEUN', phone: 7087511301, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'OLUBI STREET OYO', datetime: '2025-12-17 15:51:27' },
  { originalId: 66, name: 'FEHINTOLA SULE', phone: 8038116276, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'VICTORIA ISLAND LAGOS', datetime: '2025-12-17 15:58:16' },
  { originalId: 67, name: 'AYOMIDE VICTOR', phone: 907035647567, email: 'default@gmail.com', adults: 3, idNumber: '00000000000000000000', address: 'NOT ASSIGN', datetime: '2025-12-17 16:11:18' },
  { originalId: 68, name: 'ADELABU ADEWALE', phone: 8035792353, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2025-12-17 16:16:13' },
  { originalId: 69, name: 'FADAUNSI OLANREWAJU', phone: 8052979036, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2025-12-17 16:27:11' },
  { originalId: 70, name: 'OJO AJIBOLA', phone: 8037003010, email: 'ojoAjibola455@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'OKEOMIRU ILESHA', datetime: '2025-12-17 16:31:10' },
  { originalId: 71, name: 'ISHOLA MAGRET', phone: 8037003080, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'OKEOMIRU ILESHA', datetime: '2025-12-17 16:34:50' },
  { originalId: 72, name: 'ADENIYI SAMUEL', phone: 8034734060, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NO 4 GABRIEL AKINOLA CLOSE P&T IPAYA LAGOS', datetime: '2025-12-17 16:40:08' },
  { originalId: 73, name: 'AFOLABI OLANIYI', phone: 8110000841, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'OPP 3rd extension NTA ado ekiti', datetime: '2025-12-19 18:26:29' },
  { originalId: 74, name: 'IZEFAEGBE FRANK', phone: 8033882995, email: 'frankzeffy@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'PLOT 7/9 LAYOUT ABUJA', datetime: '2025-12-21 22:03:29' },
  { originalId: 75, name: 'BASHIR IBRAHIM', phone: 8033882995, email: 'frankzeffy@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'PLOT 7/9 IDU LAD.LAYOUT ABUJA', datetime: '2025-12-21 22:09:01' },
  { originalId: 76, name: 'OYEBAMIJI ADEWALE', phone: 8132522968, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'ADEBAYO ABON NO 1', datetime: '2025-12-23 18:24:58' },
  { originalId: 77, name: 'IKPE DANIEL', phone: 8065368885, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2025-12-23 18:37:17' },
  { originalId: 78, name: 'SAMOND DARE', phone: 7084532737, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'AKABAI STREET LAGOS', datetime: '2025-12-23 18:42:55' },
  { originalId: 79, name: 'OMOBOLANLE SAMUEL', phone: 8147858288, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'IBADAN', datetime: '2025-12-26 22:49:06' },
  { originalId: 80, name: 'ALALU DARE', phone: 8060403363, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'IBADAN', datetime: '2025-12-26 22:52:48' },
  { originalId: 81, name: 'OLADEHINDE MICHAEL', phone: 7047832319, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'SANGO OTA OGUN STATE', datetime: '2025-12-26 22:56:59' },
  { originalId: 82, name: 'KOMOLAFE AYODEJI', phone: 8100120130, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'FADAHUNSI IMO ILESA OSUN STATE', datetime: '2025-12-28 06:26:06' },
  { originalId: 83, name: 'AHMED OMOTOLA', phone: 9065448283, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'OMI ASORO ILESHA', datetime: '2025-12-28 22:29:21' },
  { originalId: 84, name: 'AFOLABI OLANIYI', phone: 81100, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: '0PP 3RD EXTENTION GATE NTA ADO EKITI', datetime: '2025-12-30 19:58:29' },
  { originalId: 85, name: 'LUKERA DAVID', phone: 8169001110, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NO 27 KUBWA ABUJA', datetime: '2026-01-05 19:59:14' },
  { originalId: 86, name: 'FAKOYA BABATUNDE', phone: 9134324355, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'LAGOS', datetime: '2026-01-05 20:01:25' },
  { originalId: 87, name: 'KOMOLAFE OLAYEMI', phone: 8053319086, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'IMO ILESHA', datetime: '2026-01-10 16:21:08' },
  { originalId: 88, name: 'ADEYEMO ADEKUNLE', phone: 8031160725, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'IMO ILESHA', datetime: '2026-01-10 16:24:01' },
  { originalId: 89, name: 'ABUBAKIR SODIQ', phone: 8088103916, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'ABUJA', datetime: '2026-01-10 19:51:37' },
  { originalId: 90, name: 'SEKETI ADEBOWALE', phone: 7030992863, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'MOGAJI HOME AULE AKURE', datetime: '2026-01-14 16:04:56' },
  { originalId: 91, name: 'ABUBAKAR SODIQ', phone: 8088103916, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'ABUJA', datetime: '2026-01-14 16:07:59' },
  { originalId: 92, name: 'ALIMI ABDULLAHI', phone: 8036520909, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'AJIBOYE ROYALS CAMP OSUN STATE', datetime: '2026-01-14 16:12:38' },
  { originalId: 93, name: 'OLUCHI JOY', phone: 9133462114, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'N', datetime: '2026-01-16 13:37:12' },
  { originalId: 94, name: 'KOMOLAFE OLAYEMI', phone: 7056480888, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'INTERNATIONAL BREWERIES', datetime: '2026-01-19 11:25:13' },
  { originalId: 95, name: 'AWONIYI SUNDAY', phone: 8136764181, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'OGUN STATE NO 14 GBENGA STREET', datetime: '2026-01-23 13:12:52' },
  { originalId: 96, name: 'ISMAIL LATEEF', phone: 8047273031, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'AJEGUNLE ISE EKITI', datetime: '2026-01-23 13:21:52' },
  { originalId: 97, name: 'BABATUNDE ALIYU', phone: 8033743459, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2026-01-24 18:16:49' },
  { originalId: 98, name: 'OGUNNIYI TAIWO', phone: 8036187684, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'LAGOS', datetime: '2026-02-01 15:11:30' },
  { originalId: 99, name: 'ADAMU ABBA', phone: 8063230588, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'APAPA LAGOS', datetime: '2026-02-08 18:12:02' },
  { originalId: 100, name: 'POPOOLA ABDULJELIL', phone: 7037264803, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2026-02-08 18:23:23' },
  { originalId: 101, name: 'BELLO FAITIA', phone: 9128209859, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2026-02-08 18:26:03' },
  { originalId: 102, name: 'ADEWUMI DUPE', phone: 7011084797, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'LAGOS', datetime: '2026-02-08 18:29:46' },
  { originalId: 103, name: 'WILLIAMS KEHINDE', phone: 8086028594, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2026-02-08 18:31:53' },
  { originalId: 104, name: 'ADEWUMI DUPE', phone: 7011847974, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'LAGOS', datetime: '2026-02-08 18:35:47' },
  { originalId: 105, name: 'POPOOLA ABDULJELIL', phone: 7037264803, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2026-02-15 17:23:12' },
  { originalId: 106, name: 'AKINOLA SUNDAY', phone: 8023636020, email: 'ayeoyenikan90w@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'OJOTA LAGOS', datetime: '2026-02-15 17:31:25' },
  { originalId: 107, name: 'JOHN SUNDAY', phone: 9122193276, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'KAJOLA STREET IMO ILESHA', datetime: '2026-02-15 17:34:36' },
  { originalId: 108, name: 'ABDULLAHI YUNUSA', phone: 9164542480, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'OLUFEMI STREET', datetime: '2026-02-15 17:40:53' },
  { originalId: 109, name: 'OLUCHUKWU VINCENT', phone: 8066185052, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2026-02-18 16:00:43' },
  { originalId: 110, name: 'OLUCHUKWU VINCENT', phone: 8066185052, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2026-02-18 16:04:49' },
  { originalId: 111, name: 'OLADIPO OLUWASEUN', phone: 8134786492, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'ABEOKUTA', datetime: '2026-02-20 14:53:14' },
  { originalId: 112, name: 'ADIGUN LEMON', phone: 8165031677, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2026-03-01 16:58:19' },
  { originalId: 113, name: 'MICHAEL GOODNESS', phone: 8057733374, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'IBADAN', datetime: '2026-03-01 17:00:32' },
  { originalId: 114, name: 'SUNDAY SAMUEL', phone: 8052979036, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2026-03-01 17:02:37' },
  { originalId: 115, name: 'IGBALAJOBI SUNDAY', phone: 8160731034, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2026-03-08 17:01:47' },
  { originalId: 116, name: 'BAYONLE SAMSON', phone: 8131662636, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2026-03-08 17:11:30' },
  { originalId: 117, name: 'OJO TEMITAYO', phone: 8027359334, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'LUCAS STREET OBAWOLE LAGOS', datetime: '2026-03-13 12:50:37' },
  { originalId: 118, name: 'ISAIAH EJOH', phone: 8107390395, email: 'default@gmail.com', adults: 2, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2026-03-13 12:52:23' },
  { originalId: 119, name: 'ADELEKE OLARENWAJU', phone: 9036843606, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2026-03-18 17:39:53' },
  { originalId: 120, name: 'ADAURA MUHAMMED', phone: 8143758894, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'ABUJA', datetime: '2026-03-19 16:35:22' },
  { originalId: 121, name: 'AKANDE IYANUOLUWA', phone: 8133416780, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2026-03-19 16:38:01' },
  { originalId: 122, name: 'AKANDE IYANUOLUWA', phone: 8133416783, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'IJAMO IKORODU', datetime: '2026-03-28 15:50:14' },
  { originalId: 123, name: 'JOHN SUNDAY', phone: 7042888741, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2026-03-28 15:53:10' },
  { originalId: 124, name: 'JAMES UGBEDE', phone: 8030685778, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'ABUJA', datetime: '2026-03-28 15:56:08' },
  { originalId: 125, name: 'OLUWASEUN MOSES', phone: 8051840497, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NOT ASSIGN', datetime: '2026-03-28 16:00:21' },
  { originalId: 126, name: 'AKEEM LAMIDI', phone: 8154300122, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'ILESHA', datetime: '2026-03-28 16:02:35' },
  { originalId: 127, name: 'AJAYI SHEGUN', phone: 7048773475, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'BREWERIES EXPRESS', datetime: '2026-03-30 17:50:25' },
  { originalId: 128, name: 'ADENIYI ADEDAYO', phone: 8037642692, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'NO 13 OKUNBOR STREET BENIN', datetime: '2026-04-13 17:54:28' },
  { originalId: 129, name: 'OYENIYI OMOBUKOLA', phone: 8136616280, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'OMI ASORO ILESHA', datetime: '2026-04-13 17:57:41' },
  { originalId: 130, name: 'OLAFARE ABIOLA', phone: 8098313712, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'RING ROAD IBADAN', datetime: '2026-04-13 18:01:47' },
  { originalId: 131, name: 'ONI REINHORD', phone: 8123401005, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'ILE IFE', datetime: '2026-04-14 12:41:45' },
  { originalId: 132, name: 'ONI REINHORD', phone: 8123401005, email: 'default@gmail.com', adults: 3, idNumber: 'DONOTHAVE1', address: 'ILE IFE', datetime: '2026-04-14 12:43:57' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SOURCES = ['walk_in', 'website', 'phone', 'whatsapp', 'ota_booking', 'ota_jumia', 'ota_hotels'];
const PAYMENT_METHODS = ['cash', 'pos', 'bank_transfer', 'opay', 'palmpay', 'moniepoint'];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

function periodStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatPhone(phone: number): string {
  const s = phone.toString();
  return `+234 ${s.length >= 10 ? s.slice(0, Math.min(4, s.length)) + ' ' + s.slice(Math.min(4, s.length)) : s}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function seedDatabase() {
  console.log('🌱 Seeding Royal Loft database with real transaction data...');

  // ─── 1. Admin User ─────────────────────────────────────────────────────────
   const adminExists = await db.user.findUnique({ where: { email: 'admin@royalloft.com' } });
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

    // Developer user
    const devHashed = await hashPassword('Admin@123');
    await db.user.create({
      data: {
        email: 'developer@royalloft.com',
        password: devHashed,
        name: 'Developer',
        role: 'developer',
        department: 'management',
        phone: '+234 801 000 0000',
      },
    });
    console.log('✅ Developer user created');
  }

  // ─── 2. Roles ──────────────────────────────────────────────────────────────
  const roleNames = ['super_admin', 'manager', 'front_desk', 'housekeeping', 'accountant', 'auditor', 'staff', 'developer'];
  for (const roleName of roleNames) {
    const exists = await db.role.findUnique({ where: { name: roleName } });
    if (!exists) {
      await db.role.create({ data: { name: roleName, description: `${roleName.replace(/_/g, ' ')} role` } });
    }
  }

  // ─── 3. Room Types (Royal Loft prices) ─────────────────────────────────────
  const roomTypeCount = await db.roomType.count();
  let roomTypeMap: Record<string, string> = {};

  if (roomTypeCount === 0) {
    for (const rt of ROOM_TYPES) {
      const created = await db.roomType.create({ data: rt });
      roomTypeMap[rt.name] = created.id;
    }
    console.log('✅ Room types created (Standard ₦30k, Deluxe ₦40k, Executive ₦50k, Executive Suite ₦65k)');
  } else {
    const validNames = ROOM_TYPES.map(r => r.name);
    const allTypes = await db.roomType.findMany();
    for (const t of allTypes) {
      if (!validNames.includes(t.name)) {
        const roomCount = await db.room.count({ where: { roomTypeId: t.id } });
        if (roomCount === 0) await db.roomType.delete({ where: { id: t.id } });
      }
    }
    // Update prices for existing types
    for (const rt of ROOM_TYPES) {
      const existing = await db.roomType.findFirst({ where: { name: rt.name } });
      if (existing) {
        await db.roomType.update({ where: { id: existing.id }, data: { baseRate: rt.baseRate, maxOccupancy: rt.maxOccupancy, amenities: rt.amenities, description: rt.description } });
        roomTypeMap[rt.name] = existing.id;
      }
    }
    const refreshedTypes = await db.roomType.findMany();
    for (const t of refreshedTypes) roomTypeMap[t.name] = t.id;
    console.log('✅ Room types updated');
  }

  // ─── 4. Rooms ──────────────────────────────────────────────────────────────
  const roomCount = await db.room.count();
  if (roomCount === 0) {
    for (const r of ROOMS) {
      const typeId = roomTypeMap[r.type];
      if (!typeId) continue;
      await db.room.create({ data: { roomNumber: r.roomNumber, floor: r.floor, roomTypeId: typeId, status: r.status } });
    }
    console.log('✅ Rooms created (20 rooms across 3 floors)');
  }

  // ─── 5. Real Guests from Transactions ─────────────────────────────────────
  const guestCount = await db.guest.count();
  if (guestCount === 0) {
    // Deduplicate guests by name (case-insensitive) — keep first occurrence's details
    const guestMap = new Map<string, { firstName: string; lastName: string; email: string; phone: string; address: string | null; idNumber: string | null; stayCount: number; originalIds: number[] }>();

    for (const tx of REAL_TRANSACTIONS) {
      const key = tx.name.trim().toUpperCase();
      const parts = tx.name.trim().split(/\s+/);
      const firstName = parts[0];
      const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';

      if (guestMap.has(key)) {
        const existing = guestMap.get(key)!;
        existing.stayCount++;
        existing.originalIds.push(tx.originalId);
      } else {
        guestMap.set(key, {
          firstName,
          lastName,
          email: tx.email.includes('@') ? tx.email : `${tx.name.trim().toLowerCase().replace(/\s+/g, '.')}@email.com`,
          phone: formatPhone(tx.phone),
          address: tx.address !== 'NOT ASSIGN' && tx.address !== 'N' ? tx.address : null,
          idNumber: !tx.idNumber.startsWith('0000') && !tx.idNumber.startsWith('DONOTHAVE') ? tx.idNumber : null,
          stayCount: 1,
          originalIds: [tx.originalId],
        });
      }
    }

    let createdGuests = 0;
    for (const [, guestData] of guestMap) {
      try {
        await db.guest.create({
          data: {
            firstName: guestData.firstName,
            lastName: guestData.lastName || guestData.firstName,
            email: guestData.email,
            phone: guestData.phone,
            address: guestData.address,
            idNumber: guestData.idNumber,
            country: 'Nigeria',
            totalStays: guestData.stayCount,
            totalSpent: 0, // Will be updated after creating bills
            loyaltyTier: guestData.stayCount >= 5 ? 'gold' : guestData.stayCount >= 3 ? 'silver' : guestData.stayCount >= 2 ? 'silver' : 'none',
            loyaltyPoints: guestData.stayCount * 200,
            vip: guestData.stayCount >= 5,
          },
        });
        createdGuests++;
      } catch {
        // Skip duplicate emails
      }
    }
    console.log(`✅ ${createdGuests} unique guests created from ${REAL_TRANSACTIONS.length} transactions`);
  }

  // ─── 6. Real Reservations + Bills + Payments ──────────────────────────────
  const resCount = await db.reservation.count();
  if (resCount === 0) {
    const allGuests = await db.guest.findMany();
    const allRooms = await db.room.findMany({ include: { roomType: true } });
    const now = new Date();
    let roomIndex = 0;

    // Sort transactions chronologically
    const sorted = [...REAL_TRANSACTIONS].sort((a, b) => a.datetime.localeCompare(b.datetime));

    for (const tx of sorted) {
      // Find matching guest (by name, case-insensitive)
      const guest = allGuests.find(g => {
        const fullName = `${g.firstName} ${g.lastName}`.toUpperCase().trim();
        const txName = tx.name.trim().toUpperCase();
        return fullName === txName || g.firstName.toUpperCase() === txName;
      });

      if (!guest) continue;

      // Assign room (cycle through available rooms)
      const room = allRooms[roomIndex % allRooms.length];
      roomIndex++;

      const checkIn = new Date(tx.datetime);
      const nights = randomBetween(1, 3);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + nights);

      // Determine status
      let status: string;
      if (checkOut < now) {
        status = 'checked_out';
      } else if (checkIn <= now && checkOut > now) {
        status = 'checked_in';
      } else {
        status = 'confirmed';
      }

      const roomRate = room.roomType.baseRate;
      const totalAmount = roomRate * nights;

      try {
        const reservation = await db.reservation.create({
          data: {
            confirmationCode: generateConfirmationCode(),
            guestId: guest.id,
            roomId: room.id,
            checkIn,
            checkOut,
            status,
            source: randomFrom(SOURCES),
            adults: tx.adults || 3,
            roomRate,
            totalAmount,
            paidAmount: status === 'checked_out' ? totalAmount : status === 'checked_in' ? Math.round(totalAmount * 0.5) : 0,
            checkedInAt: status !== 'confirmed' ? checkIn : null,
            checkedOutAt: status === 'checked_out' ? checkOut : null,
            createdBy: 'admin',
          },
        });

        // Create bill for non-cancelled reservations
        if (status !== 'confirmed') {
          const roomCharges = totalAmount * (0.55 + Math.random() * 0.2);
          const foodCharges = totalAmount * (Math.random() * 0.2);
          const barCharges = totalAmount * (Math.random() * 0.1);
          const spaCharges = Math.random() > 0.75 ? totalAmount * 0.05 : 0;
          const laundryCharges = Math.random() > 0.8 ? totalAmount * 0.03 : 0;
          const otherCharges = Math.random() > 0.85 ? totalAmount * 0.02 : 0;
          const subTotal = roomCharges + foodCharges + barCharges + spaCharges + laundryCharges + otherCharges;
          const taxAmount = Math.round(subTotal * 0.075);
          const billTotal = Math.round(subTotal + taxAmount);
          const isPaid = status === 'checked_out';
          const paidAmt = isPaid ? billTotal : Math.round(billTotal * (0.3 + Math.random() * 0.4));

          const bill = await db.bill.create({
            data: {
              reservationId: reservation.id,
              guestId: guest.id,
              roomCharges: Math.round(roomCharges),
              foodCharges: Math.round(foodCharges),
              barCharges: Math.round(barCharges),
              spaCharges: Math.round(spaCharges),
              laundryCharges: Math.round(laundryCharges),
              otherCharges: Math.round(otherCharges),
              taxAmount,
              totalAmount: billTotal,
              paidAmount: paidAmt,
              balanceAmount: billTotal - paidAmt,
              status: paidAmt >= billTotal ? 'paid' : paidAmt > 0 ? 'partially_paid' : 'open',
              paymentMethod: randomFrom(PAYMENT_METHODS),
              paidAt: isPaid ? checkOut : null,
            },
          });

          // Create payment records
          if (paidAmt > 0) {
            const method = randomFrom(PAYMENT_METHODS);
            if (paidAmt >= billTotal) {
              await db.payment.create({
                data: {
                  billId: bill.id,
                  amount: paidAmt,
                  paymentMethod: method,
                  notes: status === 'checked_out' ? 'Full payment at checkout' : 'Advance payment',
                  createdAt: status === 'checked_out' ? checkOut : checkIn,
                },
              });
            } else {
              const firstPay = Math.round(paidAmt * 0.6);
              const secondPay = paidAmt - firstPay;
              await db.payment.create({
                data: { billId: bill.id, amount: firstPay, paymentMethod: method, notes: 'Initial payment', createdAt: checkIn },
              });
              if (secondPay > 0) {
                await db.payment.create({
                  data: {
                    billId: bill.id,
                    amount: secondPay,
                    paymentMethod: randomFrom(PAYMENT_METHODS),
                    notes: 'Balance payment',
                    createdAt: new Date(checkIn.getTime() + (checkOut.getTime() - checkIn.getTime()) * 0.5),
                  },
                });
              }
            }
          }
        }
      } catch {
        // Skip constraint violations
      }
    }
    console.log(`✅ Reservations, bills, and payments created from real transaction data`);
  }

  // ─── 7. Staff, Attendance, Payroll ─────────────────────────────────────────
  const staffCount = await db.staffProfile.count();
  if (staffCount === 0) {
    const hashedPw = await hashPassword('Staff@123');
    const now = new Date();

    for (let i = 0; i < STAFF_MEMBERS.length; i++) {
      const s = STAFF_MEMBERS[i];
      const user = await db.user.create({
        data: { email: s.email, password: hashedPw, name: s.name, phone: s.phone, role: s.role, department: s.department },
      });

      const profile = await db.staffProfile.create({
        data: {
          userId: user.id,
          employeeId: `EMP-${String(i + 1).padStart(4, '0')}`,
          department: s.department,
          position: s.position,
          baseSalary: s.baseSalary,
          startDate: new Date(2024, Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28)),
          status: s.status,
          bankName: 'GTBank',
          bankAccount: `0${String(Math.floor(Math.random() * 9000000000) + 1000000000)}`,
          emergencyContact: 'N/A',
          emergencyPhone: '+234 800 000 0000',
        },
      });

      // Today's attendance
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const attStatus = s.status === 'on_leave' ? 'on_leave' : (Math.random() > 0.15 ? 'present' : 'absent');
      const clockIn = attStatus === 'present' ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60)) : null;
      const clockOut = attStatus === 'present' ? new Date(clockIn!.getTime() + (7 + Math.random() * 3) * 3600000) : null;

      await db.attendance.create({
        data: {
          staffId: profile.id,
          date: today,
          clockIn,
          clockOut,
          hoursWorked: attStatus === 'present' ? parseFloat(((clockOut!.getTime() - clockIn!.getTime()) / 3600000).toFixed(1)) : 0,
          status: attStatus,
        },
      });

      // Payroll for 3 months
      const periods = [
        periodStr(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
        periodStr(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        periodStr(now),
      ];

      for (let pi = 0; pi < periods.length; pi++) {
        const tax = Math.round(s.baseSalary * 0.05);
        const overtime = Math.random() > 0.4 ? Math.round(s.baseSalary * (0.05 + Math.random() * 0.1)) : 0;
        const bonus = Math.random() > 0.6 ? Math.round(s.baseSalary * (0.03 + Math.random() * 0.07)) : 0;
        const deductions = tax;
        const netPay = s.baseSalary + overtime + bonus - deductions;
        const isPaid = pi < periods.length - 1 || Math.random() > 0.3;

        await db.payrollRecord.create({
          data: {
            staffId: profile.id,
            period: periods[pi],
            basicSalary: s.baseSalary,
            overtimePay: overtime,
            bonus,
            deductions,
            taxAmount: tax,
            netPay,
            status: isPaid ? 'paid' : 'pending',
            paidAt: isPaid ? new Date(now.getFullYear(), now.getMonth() - (periods.length - 1 - pi), 25) : null,
            processedBy: 'admin',
          },
        });
      }
    }
    console.log('✅ Staff, attendance, and payroll created (15 staff × 3 months payroll)');
  }

  // ─── 8. Expenses (3 months) ────────────────────────────────────────────────
  const expenseCount = await db.expense.count();
  if (expenseCount === 0) {
    const now = new Date();
    for (const exp of EXPENSE_TEMPLATES) {
      for (let monthsAgo = 2; monthsAgo >= 0; monthsAgo--) {
        const variation = 0.85 + Math.random() * 0.3;
        const amount = Math.round(exp.amount * variation);
        const dayOfMonth = 1 + Math.floor(Math.random() * 25);
        const expDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, dayOfMonth);
        await db.expense.create({
          data: {
            date: expDate,
            category: exp.category,
            description: exp.description,
            amount,
            vendor: exp.vendor,
            reference: `EXP-${periodStr(expDate)}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
            createdBy: 'admin',
          },
        } as any);
      }
    }
    console.log('✅ Expenses created (24 categories × 3 months = 72 records)');
  }

  // ─── 9. Hotel Policies ─────────────────────────────────────────────────────
  const policyCount = await db.hotelPolicy.count();
  if (policyCount === 0) {
    const policies = [
      { title: 'Check-in & Check-out', description: 'Check-in time is 2:00 PM. Check-out time is 12:00 PM (noon). Early check-in and late check-out are subject to availability and may incur additional charges.', category: 'checkin_checkout', sortOrder: 1 },
      { title: 'Cancellation Policy', description: 'Free cancellation up to 24 hours before check-in. Cancellations within 24 hours will be charged one night\'s stay. No-shows will be charged the full reservation amount.', category: 'cancellation', sortOrder: 2 },
      { title: 'Payment Policy', description: 'All payments must be made in Nigerian Naira (₦). We accept Cash, POS/Card, Bank Transfer, OPay, PalmPay, and Moniepoint.', category: 'payment', sortOrder: 3 },
      { title: 'Guest Conduct', description: 'Guests are expected to maintain peaceful behavior. Loud noise, disorderly conduct, and damage to hotel property are strictly prohibited.', category: 'conduct', sortOrder: 4 },
      { title: 'No Smoking Policy', description: 'All indoor areas are strictly non-smoking. A cleaning fee of ₦50,000 will be charged for smoking in rooms.', category: 'smoking', sortOrder: 5 },
      { title: 'Children Policy', description: 'Children under 12 stay free when using existing bedding. Extra beds and cribs available upon request.', category: 'children', sortOrder: 6 },
      { title: 'Pet Policy', description: 'Pets are not allowed in the hotel. Service animals are welcome with proper documentation.', category: 'pets', sortOrder: 7 },
    ];
    for (const p of policies) await db.hotelPolicy.create({ data: p });
    console.log('✅ Hotel policies created');
  }

  // ─── 10. Inventory Items ───────────────────────────────────────────────────
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
    for (const item of items) await db.inventoryItem.create({ data: item });
    console.log('✅ Inventory items created');
  }

  // ─── 11. Housekeeping Tasks ────────────────────────────────────────────────
  const hkCount = await db.housekeepingTask.count();
  if (hkCount === 0) {
    const hkRooms = await db.room.findMany({ where: { status: { in: ['housekeeping', 'occupied'] } } });
    for (const room of hkRooms) {
      await db.housekeepingTask.create({
        data: {
          roomId: room.id,
          type: 'cleaning',
          priority: room.status === 'housekeeping' ? 'high' : 'normal',
          status: room.status === 'housekeeping' ? 'pending' : 'completed',
          scheduledAt: new Date(),
          completedAt: room.status === 'occupied' ? new Date() : null,
        },
      });
    }
    console.log('✅ Housekeeping tasks created');
  }

  // ─── 12. Role Module Access (Dynamic RBAC) ─────────────────────────────────
  const rmaCount = await db.roleModuleAccess.count();
  if (rmaCount === 0) {
    const defaults: Record<string, string[]> = {
      super_admin: ['dashboard', 'front_desk', 'reservations', 'rooms', 'guests', 'billing', 'expenses', 'accounts', 'staff', 'inventory', 'reports', 'rules', 'security', 'cloud', 'settings', 'developer_tools'],
      manager: ['dashboard', 'front_desk', 'reservations', 'rooms', 'guests', 'billing', 'expenses', 'accounts', 'staff', 'inventory', 'reports', 'rules', 'security', 'cloud', 'settings'],
      front_desk: ['dashboard', 'front_desk', 'reservations', 'rooms', 'guests', 'billing'],
      housekeeping: ['dashboard', 'rooms'],
      accountant: ['dashboard', 'billing', 'expenses', 'accounts', 'reports', 'cloud'],
      auditor: ['dashboard', 'billing', 'expenses', 'accounts', 'reports', 'staff'],
      staff: ['dashboard'],
      developer: ['dashboard', 'front_desk', 'reservations', 'rooms', 'guests', 'billing', 'expenses', 'accounts', 'staff', 'inventory', 'reports', 'rules', 'security', 'cloud', 'settings', 'developer_tools'],
    };
    for (const [role, modules] of Object.entries(defaults)) {
      await db.roleModuleAccess.create({ data: { role, modules: JSON.stringify(modules) } });
    }
    console.log('✅ Role module access (RBAC) created');
  }

  // ─── Final Summary ─────────────────────────────────────────────────────────
  const counts = {
    guests: await db.guest.count(),
    reservations: await db.reservation.count(),
    bills: await db.bill.count(),
    payments: await db.payment.count(),
    expenses: await db.expense.count(),
    staff: await db.staffProfile.count(),
    payroll: await db.payrollRecord.count(),
  };

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🌱 Royal Loft seed completed successfully!');
  console.log(`   Guests: ${counts.guests} | Reservations: ${counts.reservations}`);
  console.log(`   Bills: ${counts.bills} | Payments: ${counts.payments}`);
  console.log(`   Expenses: ${counts.expenses} | Staff: ${counts.staff}`);
  console.log(`   Payroll Records: ${counts.payroll}`);
  console.log('═══════════════════════════════════════════════════════════');
}
