/**
 * Royal Loft Hotel - Legacy Data Migration Script
 * Imports ALL real data from the original hotelms SQL database
 * 
 * Run: node scripts/migrate-legacy-data.js
 * 
 * Prerequisites:
 *   - Database must be set up (npx prisma db push)
 *   - Run the regular seed first (npx tsx src/lib/seed.ts)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// =============================================
// ALL REAL DATA FROM hotelms SQL
// =============================================

// Room types from SQL
const ROOM_TYPES = {
  23: { name: 'Executive Suite', price: 65000, maxPerson: 3 },
  24: { name: 'Executive', price: 50000, maxPerson: 2 },
  25: { name: 'Deluxe', price: 40000, maxPerson: 2 },
  26: { name: 'Standard', price: 30000, maxPerson: 2 },
};

// All 16 active rooms from SQL (deleteStatus = 0)
const ROOMS = {
  47: { roomNumber: 'RM-010', roomTypeId: 23 },
  48: { roomNumber: 'RM-016', roomTypeId: 23 },
  51: { roomNumber: 'RM-007', roomTypeId: 25 },
  52: { roomNumber: 'RM-002', roomTypeId: 26 },
  53: { roomNumber: 'RM-004', roomTypeId: 26 },
  54: { roomNumber: 'RM-005', roomTypeId: 26 },
  56: { roomNumber: 'RM-008', roomTypeId: 24 },
  57: { roomNumber: 'RM-009', roomTypeId: 24 },
  59: { roomNumber: 'RM-012', roomTypeId: 24 },
  60: { roomNumber: 'RM-013', roomTypeId: 24 },
  61: { roomNumber: 'RM-014', roomTypeId: 24 },
  62: { roomNumber: 'RM-015', roomTypeId: 24 },
  63: { roomNumber: 'RM-011', roomTypeId: 24 },
  64: { roomNumber: 'RM-006', roomTypeId: 26 },
  66: { roomNumber: 'RM-003', roomTypeId: 25 },
  67: { roomNumber: 'RM-001', roomTypeId: 26 },
};

// All 113 customers from SQL
// Email made unique per customer since original SQL had "default@gmail.com" for most
const CUSTOMERS = {
  20: { name: 'THE REFINER EVENT', contact: '91221932716', email: 'refiner.event@gmail.com', address: 'NOT ASSIGN', date: '2025-12-11' },
  21: { name: 'THE REFINER EVENT', contact: '91221932716', email: 'refiner.event2@gmail.com', address: 'NOT ASSIGN', date: '2025-12-11' },
  22: { name: 'THE REFINER EVENT', contact: '91221932716', email: 'refiner.event3@gmail.com', address: 'NOT ASSIGN', date: '2025-12-11' },
  23: { name: 'THE REFINER EVENT', contact: '91221932716', email: 'refiner.event4@gmail.com', address: 'NOT ASSIGN', date: '2025-12-11' },
  24: { name: 'THE REFINER EVENT', contact: '91221932716', email: 'refiner.event5@gmail.com', address: 'NOT ASSIGN', date: '2025-12-11' },
  25: { name: 'THE REFINER EVENT', contact: '91221932716', email: 'refiner.event6@gmail.com', address: 'NOT ASSIGN', date: '2025-12-11' },
  26: { name: 'THE REFINER EVENT', contact: '91221932716', email: 'refiner.event7@gmail.com', address: 'NOT ASSIGN', date: '2025-12-11' },
  27: { name: 'THE REFINER EVENT', contact: '91221932716', email: 'refiner.event8@gmail.com', address: 'NOT ASSIGN', date: '2025-12-11' },
  28: { name: 'THE REFINER EVENT', contact: '91221932716', email: 'refiner.event9@gmail.com', address: 'NOT ASSIGN', date: '2025-12-11' },
  29: { name: 'THE REFINER EVENT', contact: '91221932716', email: 'refiner.event10@gmail.com', address: 'NOT ASSIGN', date: '2025-12-11' },
  30: { name: 'THE REFINER EVENT', contact: '91221932716', email: 'refiner.event11@gmail.com', address: 'NOT ASSIGN', date: '2025-12-11' },
  31: { name: 'THE REFINER EVENT', contact: '91221932716', email: 'refiner.event12@gmail.com', address: 'NOT ASSIGN', date: '2025-12-11' },
  32: { name: 'THE REFINER EVENT', contact: '91221932716', email: 'refiner.event13@gmail.com', address: 'NOT ASSIGN', date: '2025-12-11' },
  33: { name: 'THE REFINER EVENT', contact: '9122193276', email: 'refiner.event14@gmail.com', address: 'NOT ASSIGN', date: '2025-12-12' },
  34: { name: 'Adetutu Liadi', contact: '8033838515', email: 'adetutu.liadi@gmail.com', address: 'JDP IJEBU ODE', date: '2025-12-14' },
  36: { name: 'ADEKUNLE BEN', contact: '7055367217', email: 'adekunle.ben@gmail.com', address: 'JDP IJEBU ODE', date: '2025-12-14' },
  37: { name: 'ALADESHUWA AKIN', contact: '7087959090', email: 'aladeshuwua.akin@gmail.com', address: 'JDP IJEBU ODE', date: '2025-12-14' },
  38: { name: 'THE REFINER EVENT', contact: '9122193276', email: 'refiner.event15@gmail.com', address: 'NOT ASSIGN', date: '2025-12-17' },
  39: { name: 'ODEYEMI REMILEKUN', contact: '8106963535', email: 'odeyemi.remilekun@gmail.com', address: 'NOT ASSIGN', date: '2025-12-17' },
  40: { name: 'FREEMAN TUNDE', contact: '8054646706', email: 'freeman.tunde@gmail.com', address: 'NOT ASSIGN', date: '2025-12-17' },
  41: { name: 'OLALIN HAMMED', contact: '9071678191', email: 'olalin.hammed@gmail.com', address: 'NOT ASSIGN', date: '2025-12-17' },
  42: { name: 'ALABI OLUWASEYI', contact: '8162230998', email: 'oluwaseyi2000@yahoo.com', address: 'BLOCK 42 FLAT 1 ABESAN HOUSING ESTATE IPAJA LAGOS', date: '2025-12-17' },
  43: { name: 'AWE OLASUNKANMI', contact: '7039371251', email: 'awesunkanmi71@yahoo.com', address: 'NOT ASSIGN', date: '2025-12-17' },
  44: { name: 'AKUIWU PASCAL', contact: '7032308696', email: 'akuiwu.pascal@gmail.com', address: 'NOT ASSIGN', date: '2025-12-17' },
  45: { name: 'KELECHI NDUKWE', contact: '8062431446', email: 'kelechi.ndukwe@gmail.com', address: 'ILESHA', date: '2025-12-17' },
  46: { name: 'ADERINTO ADETOYOSE', contact: '8026149740', email: 'hhardeytoyese@gmail.com', address: 'LEKKI LAGOS STATE', date: '2025-12-17' },
  47: { name: 'ADERINTO ADETOYOSE', contact: '8171880668', email: 'aderinto.adetoyose@gmail.com', address: 'LEKKI LAGOS STATE', date: '2025-12-17' },
  48: { name: 'OMOTOSHO SANMI', contact: '810500751', email: 'omotosho.sanmi@gmail.com', address: 'NOT ASSIGN', date: '2025-12-17' },
  49: { name: 'ADEFUYE KAYODE', contact: '7033249174', email: 'adefuye1@yahoo.com', address: 'NOT ASSIGN', date: '2025-12-17' },
  50: { name: 'OLASENI ABAYOMI', contact: '8033539662', email: 'olaseni@gmail.com', address: 'PLOT 37 SHAGARI ESTATE AKURE', date: '2025-12-17' },
  51: { name: 'UMEH DANIEL', contact: '7059962543', email: 'umeh.daniel@gmail.com', address: 'NOT ASSIGN', date: '2025-12-17' },
  52: { name: 'ASANI FUNMILOLA', contact: '8130493858', email: 'asani.funmilola@gmail.com', address: 'NOT ASSIGN', date: '2025-12-17' },
  53: { name: 'AJIBAWO OLAJIDE', contact: '8139358527', email: 'ajibawo.olajide@gmail.com', address: 'NOT ASSIGN', date: '2025-12-17' },
  54: { name: 'AKINBOBOSE AYOAKIN', contact: '8036862982', email: 'akinbose.ayoakin@gmail.com', address: 'NOT ASSIGN', date: '2025-12-17' },
  55: { name: 'OYEDIBU ENOCH', contact: '8100272514', email: 'oyedibu.enoch@gmail.com', address: 'NOT ASSIGN', date: '2025-12-17' },
  56: { name: 'ALAKE TUNBOSUN', contact: '8180445694', email: 'alake.tunbosun@gmail.com', address: 'NOT ASSIGN', date: '2025-12-17' },
  57: { name: 'ADETOKUNBO ADESIN', contact: '8139627315', email: 'adetokunbo.adesin@gmail.com', address: 'NOT ASSIGN', date: '2025-12-17' },
  58: { name: 'UBECHI JOY', contact: '8028524016', email: 'ubechi.joy@gmail.com', address: 'AJAH LAGOS', date: '2025-12-17' },
  59: { name: 'OHIREMEN OHIS', contact: '8180187466', email: 'ohisb120@gmail.com', address: 'LAGOS', date: '2025-12-17' },
  60: { name: 'EZOMOH JUDE', contact: '8080801180', email: 'ezomoh.jude@gmail.com', address: '30 OBANIKORO STREET', date: '2025-12-17' },
  61: { name: 'SIMEON KEKERE', contact: '8023019882', email: 'simeon.kekere@gmail.com', address: 'NOT ASSIGN', date: '2025-12-17' },
  62: { name: 'SEKOMI TUNDE', contact: '8036520909', email: 'sekomi.tunde@gmail.com', address: 'EBUTE METTA LAGOS', date: '2025-12-17' },
  63: { name: 'EZOMOH TUNDE', contact: '8080801180', email: 'ezomoh.tunde2@gmail.com', address: 'NOT ASSIGN', date: '2025-12-17' },
  64: { name: 'SIMEON KEKERE', contact: '8023019882', email: 'simeon.kekere2@gmail.com', address: 'NOT ASSIGN', date: '2025-12-17' },
  65: { name: 'OLATUN SEUN', contact: '7087511301', email: 'olatun.seun@gmail.com', address: 'OLUBI STREET OYO', date: '2025-12-17' },
  66: { name: 'FEHINTOLA SULE', contact: '8038116276', email: 'fehintola.sule@gmail.com', address: 'VICTORIA ISLAND LAGOS', date: '2025-12-17' },
  67: { name: 'AYOMIDE VICTOR', contact: '907035647567', email: 'ayomide.victor@gmail.com', address: 'NOT ASSIGN', date: '2025-12-17' },
  68: { name: 'ADELABU ADEWALE', contact: '8035792353', email: 'adelabu.adewale@gmail.com', address: 'NOT ASSIGN', date: '2025-12-17' },
  69: { name: 'FADAUNSI OLANREWAJU', contact: '8052979036', email: 'fadaunsi.olanrewaju@gmail.com', address: 'NOT ASSIGN', date: '2025-12-17' },
  70: { name: 'OJO AJIBOLA', contact: '8037003010', email: 'ojoAjibola455@gmail.com', address: 'OKEOMIRU ILESHA', date: '2025-12-17' },
  71: { name: 'ISHOLA MAGRET', contact: '8037003080', email: 'ishola.magret@gmail.com', address: 'OKEOMIRU ILESHA', date: '2025-12-17' },
  72: { name: 'ADENIYI SAMUEL', contact: '8034734060', email: 'adeniyi.samuel@gmail.com', address: 'NO 4 GABRIEL AKINOLA CLOSE P&T IPAYA LAGOS', date: '2025-12-17' },
  73: { name: 'AFOLABI OLANIYI', contact: '8110000841', email: 'afolabi.olaniyi@gmail.com', address: 'OPP 3RD EXTENSION NTA ADO EKITI', date: '2025-12-19' },
  74: { name: 'IZEFAEGBE FRANK', contact: '8033882995', email: 'frankzeffy@gmail.com', address: 'PLOT 7/9 LAYOUT ABUJA', date: '2025-12-21' },
  75: { name: 'BASHIR IBRAHIM', contact: '8033882995', email: 'bashir.ibrahim@gmail.com', address: 'PLOT 7/9 IDU LAD LAYOUT ABUJA', date: '2025-12-21' },
  76: { name: 'OYEBAMIJI ADEWALE', contact: '8132522968', email: 'oyebamiji.adewale@gmail.com', address: 'ADEBAYO ABON NO 1', date: '2025-12-23' },
  77: { name: 'IKPE DANIEL', contact: '8065368885', email: 'ikpe.daniel@gmail.com', address: 'NOT ASSIGN', date: '2025-12-23' },
  78: { name: 'SAMOND DARE', contact: '7084532737', email: 'samond.dare@gmail.com', address: 'AKABAI STREET LAGOS', date: '2025-12-23' },
  79: { name: 'OMOBOLANLE SAMUEL', contact: '8147858288', email: 'omobolanle.samuel@gmail.com', address: 'IBADAN', date: '2025-12-26' },
  80: { name: 'ALALU DARE', contact: '8060403363', email: 'alalu.dare@gmail.com', address: 'IBADAN', date: '2025-12-26' },
  81: { name: 'OLADEHINDE MICHAEL', contact: '7047832319', email: 'oladehinde.michael@gmail.com', address: 'SANGO OTA OGUN STATE', date: '2025-12-26' },
  82: { name: 'KOMOLAFE AYODEJI', contact: '8100120130', email: 'komolafe.ayodeji@gmail.com', address: 'FADAHUNSI IMO ILESA OSUN STATE', date: '2025-12-28' },
  83: { name: 'AHMED OMOTOLA', contact: '9065448283', email: 'ahmed.omotola@gmail.com', address: 'OMI ASORO ILESHA', date: '2025-12-28' },
  84: { name: 'AFOLABI OLANIYI', contact: '81100', email: 'afolabi.olaniyi2@gmail.com', address: 'OPP 3RD EXTENTION GATE NTA ADO EKITI', date: '2025-12-30' },
  85: { name: 'LUKERA DAVID', contact: '8169001110', email: 'lukera.david@gmail.com', address: 'NO 27 KUBWA ABUJA', date: '2026-01-05' },
  86: { name: 'FAKOYA BABATUNDE', contact: '9134324355', email: 'fakoya.babatunde@gmail.com', address: 'LAGOS', date: '2026-01-05' },
  87: { name: 'KOMOLAFE OLAYEMI', contact: '8053319086', email: 'komolafe.olayemi@gmail.com', address: 'IMO ILESHA', date: '2026-01-10' },
  88: { name: 'ADEYEMO ADEKUNLE', contact: '8031160725', email: 'adeyemo.adekunle@gmail.com', address: 'IMO ILESHA', date: '2026-01-10' },
  89: { name: 'ABUBAKIR SODIQ', contact: '8088103916', email: 'abubakir.sodiq@gmail.com', address: 'ABUJA', date: '2026-01-10' },
  90: { name: 'SEKETI ADEBOWALE', contact: '7030992863', email: 'seketi.adebowale@gmail.com', address: 'MOGAJI HOME AULE AKURE', date: '2026-01-14' },
  91: { name: 'ABUBAKAR SODIQ', contact: '8088103916', email: 'abubakar.sodiq@gmail.com', address: 'ABUJA', date: '2026-01-14' },
  92: { name: 'ALIMI ABDULLAHI', contact: '8036520909', email: 'alimi.abdullahi@gmail.com', address: 'AJIBOYE ROYALS CAMP OSUN STATE', date: '2026-01-14' },
  93: { name: 'OLUCHI JOY', contact: '9133462114', email: 'oluchi.joy@gmail.com', address: 'NOT ASSIGN', date: '2026-01-16' },
  94: { name: 'KOMOLAFE OLAYEMI', contact: '7056480888', email: 'komolafe.olayemi2@gmail.com', address: 'INTERNATIONAL BREWERIES', date: '2026-01-19' },
  95: { name: 'AWONIYI SUNDAY', contact: '8136764181', email: 'awoniyi.sunday@gmail.com', address: 'OGUN STATE NO 14 GBENGA STREET', date: '2026-01-23' },
  96: { name: 'ISMAIL LATEEF', contact: '8047273031', email: 'ismail.lateef@gmail.com', address: 'AJEGUNLE ISE EKITI', date: '2026-01-23' },
  97: { name: 'BABATUNDE ALIYU', contact: '8033743459', email: 'babatunde.aliyu@gmail.com', address: 'NOT ASSIGN', date: '2026-01-24' },
  98: { name: 'OGUNNIYI TAIWO', contact: '8036187684', email: 'ogunniyi.taiwo@gmail.com', address: 'LAGOS', date: '2026-02-01' },
  99: { name: 'ADAMU ABBA', contact: '8063230588', email: 'adamu.abba@gmail.com', address: 'APAPA LAGOS', date: '2026-02-08' },
  100: { name: 'POPOOLA ABDULJELIL', contact: '7037264803', email: 'popoola.abduljelil@gmail.com', address: 'NOT ASSIGN', date: '2026-02-08' },
  101: { name: 'BELLO FAITIA', contact: '9128209859', email: 'bello.faitia@gmail.com', address: 'NOT ASSIGN', date: '2026-02-08' },
  102: { name: 'ADEWUMI DUPE', contact: '7011084797', email: 'adewumi.dupe@gmail.com', address: 'LAGOS', date: '2026-02-08' },
  103: { name: 'WILLIAMS KEHINDE', contact: '8086028594', email: 'williams.kehinde@gmail.com', address: 'NOT ASSIGN', date: '2026-02-08' },
  104: { name: 'ADEWUMI DUPE', contact: '7011847974', email: 'adewumi.dupe2@gmail.com', address: 'LAGOS', date: '2026-02-08' },
  105: { name: 'POPOOLA ABDULJELIL', contact: '7037264803', email: 'popoola.abduljelil2@gmail.com', address: 'NOT ASSIGN', date: '2026-02-15' },
  106: { name: 'AKINOLA SUNDAY', contact: '8023636020', email: 'ayeoyenikan90w@gmail.com', address: 'OJOTA LAGOS', date: '2026-02-15' },
  107: { name: 'JOHN SUNDAY', contact: '9122193276', email: 'john.sunday@gmail.com', address: 'KAJOLA STREET IMO ILESHA', date: '2026-02-15' },
  108: { name: 'ABDULLAHI YUNUSA', contact: '9164542480', email: 'abdullahi.yunusa@gmail.com', address: 'OLUFEMI STREET', date: '2026-02-15' },
  109: { name: 'OLUCHUKWU VINCENT', contact: '8066185052', email: 'oluchukwu.vincent@gmail.com', address: 'NOT ASSIGN', date: '2026-02-18' },
  110: { name: 'OLUCHUKWU VINCENT', contact: '8066185052', email: 'oluchukwu.vincent2@gmail.com', address: 'NOT ASSIGN', date: '2026-02-18' },
  111: { name: 'OLADIPO OLUWASEUN', contact: '8134786492', email: 'oladipo.oluwaseun@gmail.com', address: 'ABEOKUTA', date: '2026-02-20' },
  112: { name: 'ADIGUN LEMON', contact: '8165031677', email: 'adigun.lemon@gmail.com', address: 'NOT ASSIGN', date: '2026-03-01' },
  113: { name: 'MICHAEL GOODNESS', contact: '8057733374', email: 'michael.goodness@gmail.com', address: 'IBADAN', date: '2026-03-01' },
  114: { name: 'SUNDAY SAMUEL', contact: '8052979036', email: 'sunday.samuel@gmail.com', address: 'NOT ASSIGN', date: '2026-03-01' },
  115: { name: 'IGBALAJOBI SUNDAY', contact: '8160731034', email: 'igbalajobi.sunday@gmail.com', address: 'NOT ASSIGN', date: '2026-03-08' },
  116: { name: 'BAYONLE SAMSON', contact: '8131662636', email: 'bayonle.samson@gmail.com', address: 'NOT ASSIGN', date: '2026-03-08' },
  117: { name: 'OJO TEMITAYO', contact: '8027359334', email: 'ojo.temitayo@gmail.com', address: 'LUCAS STREET OBAWOLE LAGOS', date: '2026-03-13' },
  118: { name: 'ISAIAH EJOH', contact: '8107390395', email: 'isaiah.ejoh@gmail.com', address: 'NOT ASSIGN', date: '2026-03-13' },
  119: { name: 'ADELEKE OLARENWAJU', contact: '9036843606', email: 'adeleke.olarenwaju@gmail.com', address: 'NOT ASSIGN', date: '2026-03-18' },
  120: { name: 'ADAURA MUHAMMED', contact: '8143758894', email: 'adaura.muhammed@gmail.com', address: 'ABUJA', date: '2026-03-19' },
  121: { name: 'AKANDE IYANUOLUWA', contact: '8133416780', email: 'akande.iyanuoluwa@gmail.com', address: 'NOT ASSIGN', date: '2026-03-19' },
  122: { name: 'AKANDE IYANUOLUWA', contact: '8133416783', email: 'akande.iyanuoluwa2@gmail.com', address: 'IJAMO IKORODU', date: '2026-03-28' },
  123: { name: 'JOHN SUNDAY', contact: '7042888741', email: 'john.sunday2@gmail.com', address: 'NOT ASSIGN', date: '2026-03-28' },
  124: { name: 'JAMES UGBEDE', contact: '8030685778', email: 'james.ugbede@gmail.com', address: 'ABUJA', date: '2026-03-28' },
  125: { name: 'OLUWASEUN MOSES', contact: '8051840497', email: 'oluwaseun.moses@gmail.com', address: 'NOT ASSIGN', date: '2026-03-28' },
  126: { name: 'AKEEM LAMIDI', contact: '8154300122', email: 'akeem.lamidi@gmail.com', address: 'ILESHA', date: '2026-03-28' },
  127: { name: 'AJAYI SHEGUN', contact: '7048773475', email: 'ajayi.shegun@gmail.com', address: 'BREWERIES EXPRESS', date: '2026-03-30' },
  128: { name: 'ADENIYI ADEDAYO', contact: '8037642692', email: 'adeniyi.addedayo@gmail.com', address: 'NO 13 OKUNBOR STREET BENIN', date: '2026-04-13' },
  129: { name: 'OYENIYI OMOBUKOLA', contact: '8136616280', email: 'oyeniyi.omobukola@gmail.com', address: 'OMI ASORO ILESHA', date: '2026-04-13' },
  130: { name: 'OLAFARE ABIOLA', contact: '8098313712', email: 'olafare.abiola@gmail.com', address: 'RING ROAD IBADAN', date: '2026-04-13' },
  131: { name: 'ONI REINHORD', contact: '8123401005', email: 'oni.reinhord@gmail.com', address: 'ILE IFE', date: '2026-04-14' },
  132: { name: 'ONI REINHORD', contact: '8123401005', email: 'oni.reinhord2@gmail.com', address: 'ILE IFE', date: '2026-04-14' },
};

// ALL 120 bookings from SQL
const BOOKINGS = [
  { id: 19, custId: 20, roomId: 52, checkIn: '2025-12-12', checkOut: '2025-12-13', price: 60000, discount: 0 },
  { id: 20, custId: 21, roomId: 53, checkIn: '2025-12-12', checkOut: '2025-12-13', price: 60000, discount: 0 },
  { id: 21, custId: 22, roomId: 54, checkIn: '2025-12-12', checkOut: '2025-12-13', price: 60000, discount: 0 },
  { id: 22, custId: 23, roomId: 64, checkIn: '2025-12-12', checkOut: '2025-12-13', price: 60000, discount: 0 },
  { id: 23, custId: 24, roomId: 56, checkIn: '2025-12-12', checkOut: '2025-12-13', price: 100000, discount: 0 },
  { id: 24, custId: 25, roomId: 57, checkIn: '2025-12-12', checkOut: '2025-12-13', price: 100000, discount: 0 },
  { id: 25, custId: 26, roomId: 47, checkIn: '2025-12-12', checkOut: '2025-12-13', price: 130000, discount: 0 },
  { id: 26, custId: 27, roomId: 63, checkIn: '2025-12-12', checkOut: '2025-12-13', price: 100000, discount: 0 },
  { id: 27, custId: 28, roomId: 59, checkIn: '2025-12-12', checkOut: '2025-12-13', price: 100000, discount: 0 },
  { id: 28, custId: 29, roomId: 60, checkIn: '2025-12-12', checkOut: '2025-12-13', price: 100000, discount: 0 },
  { id: 29, custId: 30, roomId: 61, checkIn: '2025-12-12', checkOut: '2025-12-13', price: 100000, discount: 0 },
  { id: 30, custId: 31, roomId: 62, checkIn: '2025-12-12', checkOut: '2025-12-13', price: 100000, discount: 0 },
  { id: 31, custId: 32, roomId: 48, checkIn: '2025-12-12', checkOut: '2025-12-13', price: 130000, discount: 0 },
  { id: 34, custId: 33, roomId: 66, checkIn: '2025-12-12', checkOut: '2025-12-14', price: 80000, discount: 0 },
  { id: 35, custId: 33, roomId: 51, checkIn: '2025-12-12', checkOut: '2025-12-14', price: 80000, discount: 0 },
  { id: 36, custId: 34, roomId: 53, checkIn: '2025-12-14', checkOut: '2025-12-15', price: 30000, discount: 10000 },
  { id: 37, custId: 36, roomId: 54, checkIn: '2025-12-14', checkOut: '2025-12-16', price: 60000, discount: 20000 },
  { id: 38, custId: 37, roomId: 64, checkIn: '2025-12-14', checkOut: '2025-12-16', price: 60000, discount: 20000 },
  { id: 39, custId: 38, roomId: 48, checkIn: '2025-12-12', checkOut: '2025-12-14', price: 100000, discount: 30000 },
  { id: 40, custId: 39, roomId: 67, checkIn: '2025-12-16', checkOut: '2025-12-17', price: 15000, discount: 15000 },
  { id: 41, custId: 40, roomId: 67, checkIn: '2025-10-21', checkOut: '2025-10-22', price: 15000, discount: 15000 },
  { id: 42, custId: 40, roomId: 47, checkIn: '2025-10-25', checkOut: '2025-10-26', price: 50000, discount: 15000 },
  { id: 43, custId: 40, roomId: 48, checkIn: '2025-10-25', checkOut: '2025-10-26', price: 40000, discount: 25000 },
  { id: 44, custId: 41, roomId: 67, checkIn: '2025-10-27', checkOut: '2025-10-28', price: 20000, discount: 10000 },
  { id: 45, custId: 42, roomId: 52, checkIn: '2025-10-28', checkOut: '2025-10-30', price: 40000, discount: 20000 },
  { id: 46, custId: 43, roomId: 66, checkIn: '2025-10-31', checkOut: '2025-11-01', price: 20000, discount: 20000 },
  { id: 47, custId: 44, roomId: 51, checkIn: '2025-10-31', checkOut: '2025-11-01', price: 20000, discount: 20000 },
  { id: 48, custId: 45, roomId: 52, checkIn: '2025-10-31', checkOut: '2025-11-01', price: 20000, discount: 10000 },
  { id: 49, custId: 45, roomId: 67, checkIn: '2025-10-31', checkOut: '2025-11-01', price: 20000, discount: 10000 },
  { id: 50, custId: 46, roomId: 47, checkIn: '2025-10-31', checkOut: '2025-11-01', price: 50000, discount: 15000 },
  { id: 51, custId: 47, roomId: 47, checkIn: '2025-11-01', checkOut: '2025-11-02', price: 50000, discount: 15000 },
  { id: 52, custId: 48, roomId: 52, checkIn: '2025-11-04', checkOut: '2025-11-05', price: 20000, discount: 10000 },
  { id: 53, custId: 49, roomId: 66, checkIn: '2025-11-07', checkOut: '2025-11-08', price: 20000, discount: 20000 },
  { id: 54, custId: 50, roomId: 52, checkIn: '2025-11-07', checkOut: '2025-11-08', price: 20000, discount: 10000 },
  { id: 55, custId: 51, roomId: 51, checkIn: '2025-11-08', checkOut: '2025-11-09', price: 20000, discount: 20000 },
  { id: 56, custId: 52, roomId: 66, checkIn: '2025-11-08', checkOut: '2025-11-09', price: 20000, discount: 20000 },
  { id: 57, custId: 53, roomId: 53, checkIn: '2025-11-08', checkOut: '2025-11-09', price: 20000, discount: 10000 },
  { id: 58, custId: 54, roomId: 66, checkIn: '2025-11-11', checkOut: '2025-11-12', price: 25000, discount: 15000 },
  { id: 59, custId: 55, roomId: 52, checkIn: '2025-11-09', checkOut: '2025-11-10', price: 20000, discount: 10000 },
  { id: 60, custId: 56, roomId: 63, checkIn: '2025-11-13', checkOut: '2025-11-14', price: 50000, discount: 0 },
  { id: 61, custId: 57, roomId: 67, checkIn: '2025-11-13', checkOut: '2025-11-16', price: 90000, discount: 0 },
  { id: 62, custId: 58, roomId: 52, checkIn: '2025-11-13', checkOut: '2025-11-16', price: 90000, discount: 0 },
  { id: 63, custId: 59, roomId: 66, checkIn: '2025-11-13', checkOut: '2025-11-16', price: 90000, discount: 30000 },
  { id: 64, custId: 60, roomId: 48, checkIn: '2025-11-14', checkOut: '2025-11-15', price: 50000, discount: 15000 },
  { id: 65, custId: 61, roomId: 51, checkIn: '2025-11-14', checkOut: '2025-11-15', price: 30000, discount: 10000 },
  { id: 66, custId: 62, roomId: 56, checkIn: '2025-11-14', checkOut: '2025-11-15', price: 50000, discount: 0 },
  { id: 67, custId: 63, roomId: 57, checkIn: '2025-11-14', checkOut: '2025-11-15', price: 50000, discount: 0 },
  { id: 68, custId: 60, roomId: 63, checkIn: '2025-11-14', checkOut: '2025-11-15', price: 50000, discount: 0 },
  { id: 69, custId: 64, roomId: 53, checkIn: '2025-11-14', checkOut: '2025-11-15', price: 30000, discount: 0 },
  { id: 70, custId: 62, roomId: 47, checkIn: '2025-11-14', checkOut: '2025-11-15', price: 65000, discount: 0 },
  { id: 71, custId: 62, roomId: 64, checkIn: '2025-11-14', checkOut: '2025-11-15', price: 30000, discount: 0 },
  { id: 72, custId: 65, roomId: 60, checkIn: '2025-11-15', checkOut: '2025-11-16', price: 50000, discount: 0 },
  { id: 73, custId: 66, roomId: 51, checkIn: '2025-11-15', checkOut: '2025-11-16', price: 30000, discount: 10000 },
  { id: 74, custId: 67, roomId: 52, checkIn: '2025-11-19', checkOut: '2025-11-20', price: 20000, discount: 10000 },
  { id: 75, custId: 68, roomId: 66, checkIn: '2025-11-19', checkOut: '2025-11-20', price: 30000, discount: 10000 },
  { id: 76, custId: 69, roomId: 51, checkIn: '2025-11-21', checkOut: '2025-11-22', price: 30000, discount: 10000 },
  { id: 77, custId: 70, roomId: 52, checkIn: '2025-11-21', checkOut: '2025-11-23', price: 60000, discount: 0 },
  { id: 78, custId: 71, roomId: 66, checkIn: '2025-11-21', checkOut: '2025-11-22', price: 30000, discount: 10000 },
  { id: 79, custId: 72, roomId: 64, checkIn: '2025-11-27', checkOut: '2025-11-28', price: 30000, discount: 0 },
  { id: 81, custId: 73, roomId: 67, checkIn: '2025-12-18', checkOut: '2025-12-19', price: 20000, discount: 10000 },
  { id: 82, custId: 74, roomId: 64, checkIn: '2025-12-20', checkOut: '2025-12-21', price: 20000, discount: 10000 },
  { id: 83, custId: 75, roomId: 53, checkIn: '2025-12-20', checkOut: '2025-12-21', price: 20000, discount: 10000 },
  { id: 84, custId: 76, roomId: 66, checkIn: '2025-12-22', checkOut: '2025-12-23', price: 25000, discount: 15000 },
  { id: 85, custId: 77, roomId: 52, checkIn: '2025-12-22', checkOut: '2025-12-23', price: 20000, discount: 10000 },
  { id: 86, custId: 78, roomId: 51, checkIn: '2025-12-22', checkOut: '2025-12-23', price: 25000, discount: 15000 },
  { id: 87, custId: 79, roomId: 67, checkIn: '2025-12-24', checkOut: '2025-12-25', price: 20000, discount: 10000 },
  { id: 88, custId: 80, roomId: 64, checkIn: '2025-12-24', checkOut: '2025-12-25', price: 20000, discount: 10000 },
  { id: 89, custId: 81, roomId: 54, checkIn: '2025-12-23', checkOut: '2025-12-24', price: 20000, discount: 10000 },
  { id: 90, custId: 82, roomId: 64, checkIn: '2025-12-27', checkOut: '2025-12-29', price: 40000, discount: 20000 },
  { id: 91, custId: 83, roomId: 54, checkIn: '2025-12-28', checkOut: '2025-12-29', price: 20000, discount: 10000 },
  { id: 92, custId: 83, roomId: 54, checkIn: '2025-12-29', checkOut: '2025-12-30', price: 20000, discount: 10000 },
  { id: 93, custId: 84, roomId: 52, checkIn: '2025-12-29', checkOut: '2025-12-30', price: 20000, discount: 10000 },
  { id: 94, custId: 83, roomId: 54, checkIn: '2025-12-30', checkOut: '2025-12-31', price: 20000, discount: 10000 },
  { id: 95, custId: 85, roomId: 67, checkIn: '2026-01-04', checkOut: '2026-01-05', price: 20000, discount: 10000 },
  { id: 96, custId: 86, roomId: 52, checkIn: '2026-01-04', checkOut: '2026-01-05', price: 20000, discount: 10000 },
  { id: 97, custId: 82, roomId: 64, checkIn: '2026-01-05', checkOut: '2026-01-06', price: 20000, discount: 10000 },
  { id: 98, custId: 86, roomId: 52, checkIn: '2026-01-06', checkOut: '2026-01-07', price: 20000, discount: 10000 },
  { id: 100, custId: 87, roomId: 53, checkIn: '2026-01-07', checkOut: '2026-01-08', price: 20000, discount: 10000 },
  { id: 101, custId: 88, roomId: 67, checkIn: '2026-01-08', checkOut: '2026-01-09', price: 20000, discount: 10000 },
  { id: 102, custId: 36, roomId: 66, checkIn: '2025-12-03', checkOut: '2025-12-04', price: 25000, discount: 15000 },
  { id: 103, custId: 73, roomId: 67, checkIn: '2025-12-08', checkOut: '2025-12-09', price: 20000, discount: 10000 },
  { id: 104, custId: 79, roomId: 66, checkIn: '2025-12-08', checkOut: '2025-12-09', price: 20000, discount: 20000 },
  { id: 105, custId: 89, roomId: 53, checkIn: '2026-01-10', checkOut: '2026-01-11', price: 20000, discount: 10000 },
  { id: 106, custId: 90, roomId: 54, checkIn: '2026-01-10', checkOut: '2026-01-11', price: 20000, discount: 10000 },
  { id: 107, custId: 91, roomId: 53, checkIn: '2026-01-11', checkOut: '2026-01-14', price: 60000, discount: 30000 },
  { id: 108, custId: 92, roomId: 64, checkIn: '2026-01-13', checkOut: '2026-01-14', price: 20000, discount: 10000 },
  { id: 109, custId: 93, roomId: 67, checkIn: '2026-01-15', checkOut: '2026-01-16', price: 20000, discount: 10000 },
  { id: 110, custId: 73, roomId: 52, checkIn: '2026-01-15', checkOut: '2026-01-16', price: 20000, discount: 10000 },
  { id: 111, custId: 94, roomId: 52, checkIn: '2026-01-18', checkOut: '2026-01-19', price: 20000, discount: 10000 },
  { id: 112, custId: 95, roomId: 64, checkIn: '2026-01-19', checkOut: '2026-01-20', price: 20000, discount: 10000 },
  { id: 113, custId: 96, roomId: 67, checkIn: '2026-01-21', checkOut: '2026-01-22', price: 20000, discount: 10000 },
  { id: 114, custId: 97, roomId: 52, checkIn: '2026-01-22', checkOut: '2026-01-24', price: 40000, discount: 20000 },
  { id: 115, custId: 97, roomId: 48, checkIn: '2026-01-22', checkOut: '2026-01-24', price: 90000, discount: 40000 },
  { id: 116, custId: 97, roomId: 48, checkIn: '2026-01-24', checkOut: '2026-01-25', price: 50000, discount: 15000 },
  { id: 117, custId: 98, roomId: 53, checkIn: '2026-01-30', checkOut: '2026-01-31', price: 20000, discount: 10000 },
  { id: 118, custId: 99, roomId: 52, checkIn: '2026-02-02', checkOut: '2026-02-03', price: 20000, discount: 10000 },
  { id: 119, custId: 99, roomId: 53, checkIn: '2026-02-04', checkOut: '2026-02-05', price: 20000, discount: 10000 },
  { id: 120, custId: 100, roomId: 64, checkIn: '2026-02-06', checkOut: '2026-02-08', price: 40000, discount: 20000 },
  { id: 121, custId: 101, roomId: 52, checkIn: '2026-02-06', checkOut: '2026-02-07', price: 20000, discount: 10000 },
  { id: 122, custId: 101, roomId: 66, checkIn: '2026-02-06', checkOut: '2026-02-07', price: 25000, discount: 15000 },
  { id: 123, custId: 102, roomId: 53, checkIn: '2026-02-06', checkOut: '2026-02-07', price: 20000, discount: 10000 },
  { id: 124, custId: 103, roomId: 51, checkIn: '2026-02-06', checkOut: '2026-02-07', price: 25000, discount: 15000 },
  { id: 125, custId: 104, roomId: 47, checkIn: '2026-02-06', checkOut: '2026-02-08', price: 100000, discount: 30000 },
  { id: 126, custId: 99, roomId: 54, checkIn: '2026-02-06', checkOut: '2026-02-07', price: 20000, discount: 10000 },
  { id: 127, custId: 104, roomId: 47, checkIn: '2026-02-07', checkOut: '2026-02-08', price: 50000, discount: 15000 },
  { id: 128, custId: 105, roomId: 64, checkIn: '2026-02-07', checkOut: '2026-02-08', price: 20000, discount: 10000 },
  { id: 129, custId: 89, roomId: 54, checkIn: '2026-02-10', checkOut: '2026-02-11', price: 20000, discount: 10000 },
  { id: 130, custId: 106, roomId: 52, checkIn: '2026-02-13', checkOut: '2026-02-14', price: 20000, discount: 10000 },
  { id: 131, custId: 107, roomId: 52, checkIn: '2026-02-14', checkOut: '2026-02-15', price: 20000, discount: 10000 },
  { id: 132, custId: 108, roomId: 64, checkIn: '2026-02-14', checkOut: '2026-02-15', price: 20000, discount: 10000 },
  { id: 134, custId: 110, roomId: 64, checkIn: '2026-02-15', checkOut: '2026-02-19', price: 80000, discount: 40000 },
  { id: 136, custId: 91, roomId: 54, checkIn: '2026-02-18', checkOut: '2026-02-19', price: 20000, discount: 10000 },
  { id: 137, custId: 111, roomId: 52, checkIn: '2026-02-19', checkOut: '2026-02-20', price: 20000, discount: 10000 },
  { id: 138, custId: 112, roomId: 52, checkIn: '2026-02-28', checkOut: '2026-03-01', price: 20000, discount: 10000 },
  { id: 139, custId: 113, roomId: 53, checkIn: '2026-02-28', checkOut: '2026-03-01', price: 20000, discount: 10000 },
  { id: 141, custId: 114, roomId: 51, checkIn: '2026-02-28', checkOut: '2026-03-01', price: 25000, discount: 15000 },
  { id: 142, custId: 114, roomId: 51, checkIn: '2026-03-01', checkOut: '2026-03-03', price: 50000, discount: 30000 },
  { id: 143, custId: 114, roomId: 51, checkIn: '2026-03-04', checkOut: '2026-03-05', price: 25000, discount: 15000 },
  { id: 144, custId: 115, roomId: 52, checkIn: '2026-03-07', checkOut: '2026-03-08', price: 20000, discount: 10000 },
  { id: 145, custId: 113, roomId: 66, checkIn: '2026-03-07', checkOut: '2026-03-08', price: 25000, discount: 15000 },
  { id: 146, custId: 83, roomId: 54, checkIn: '2026-03-07', checkOut: '2026-03-08', price: 20000, discount: 10000 },
  { id: 147, custId: 116, roomId: 64, checkIn: '2026-03-07', checkOut: '2026-03-08', price: 20000, discount: 10000 },
  { id: 148, custId: 117, roomId: 51, checkIn: '2026-03-10', checkOut: '2026-03-11', price: 25000, discount: 15000 },
  { id: 149, custId: 118, roomId: 64, checkIn: '2026-03-12', checkOut: '2026-03-13', price: 20000, discount: 10000 },
  { id: 150, custId: 119, roomId: 52, checkIn: '2026-03-14', checkOut: '2026-03-15', price: 20000, discount: 10000 },
  { id: 151, custId: 119, roomId: 53, checkIn: '2026-03-14', checkOut: '2026-03-15', price: 20000, discount: 10000 },
  { id: 152, custId: 120, roomId: 67, checkIn: '2026-03-18', checkOut: '2026-03-19', price: 20000, discount: 10000 },
  { id: 153, custId: 121, roomId: 64, checkIn: '2026-03-18', checkOut: '2026-03-19', price: 20000, discount: 10000 },
  { id: 154, custId: 73, roomId: 52, checkIn: '2026-03-18', checkOut: '2026-03-20', price: 40000, discount: 20000 },
  { id: 155, custId: 122, roomId: 53, checkIn: '2026-03-19', checkOut: '2026-03-20', price: 20000, discount: 10000 },
  { id: 156, custId: 123, roomId: 52, checkIn: '2026-03-21', checkOut: '2026-03-22', price: 20000, discount: 10000 },
  { id: 157, custId: 124, roomId: 64, checkIn: '2026-03-25', checkOut: '2026-03-26', price: 20000, discount: 10000 },
  { id: 158, custId: 125, roomId: 66, checkIn: '2026-03-27', checkOut: '2026-03-28', price: 25000, discount: 15000 },
  { id: 159, custId: 126, roomId: 67, checkIn: '2026-03-27', checkOut: '2026-03-28', price: 20000, discount: 10000 },
  { id: 160, custId: 127, roomId: 54, checkIn: '2026-03-28', checkOut: '2026-03-29', price: 20000, discount: 10000 },
  { id: 161, custId: 128, roomId: 52, checkIn: '2026-04-02', checkOut: '2026-04-03', price: 20000, discount: 10000 },
  { id: 162, custId: 129, roomId: 67, checkIn: '2026-04-02', checkOut: '2026-04-03', price: 20000, discount: 10000 },
  { id: 163, custId: 130, roomId: 53, checkIn: '2026-04-03', checkOut: '2026-04-04', price: 20000, discount: 10000 },
  { id: 164, custId: 108, roomId: 64, checkIn: '2026-04-05', checkOut: '2026-04-06', price: 20000, discount: 10000 },
  { id: 165, custId: 131, roomId: 67, checkIn: '2026-04-12', checkOut: '2026-04-13', price: 20000, discount: 10000 },
  { id: 166, custId: 132, roomId: 52, checkIn: '2026-04-12', checkOut: '2026-04-13', price: 20000, discount: 10000 },
  { id: 167, custId: 131, roomId: 53, checkIn: '2026-04-12', checkOut: '2026-04-13', price: 20000, discount: 10000 },
  { id: 168, custId: 132, roomId: 54, checkIn: '2026-04-12', checkOut: '2026-04-13', price: 20000, discount: 10000 },
  { id: 169, custId: 131, roomId: 64, checkIn: '2026-04-12', checkOut: '2026-04-13', price: 20000, discount: 10000 },
];

// =============================================
// HELPER FUNCTIONS
// =============================================

function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], lastName: parts[1] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function generateConfirmationCode() {
  const prefix = 'RL';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

function calcNights(checkIn, checkOut) {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  const diff = (d2 - d1) / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.round(diff));
}

// =============================================
// MAIN MIGRATION
// =============================================

async function migrate() {
  console.log('========================================');
  console.log('  Royal Loft - Legacy Data Migration');
  console.log('========================================\n');

  try {
    // Step 1: Room types (verify they exist from seed)
    console.log('[1/6] Room types...');
    const roomTypeMap = {};
    for (const [sqlTypeId, typeData] of Object.entries(ROOM_TYPES)) {
      const dbType = await prisma.roomType.findFirst({ where: { name: typeData.name } });
      if (dbType) {
        roomTypeMap[sqlTypeId] = dbType.id;
        console.log(`  + ${typeData.name} (NGN ${typeData.price.toLocaleString()}/night)`);
      }
    }
    console.log(`  Found ${Object.keys(roomTypeMap).length} room types\n`);

    // Step 2: Rooms (verify they exist from seed)
    console.log('[2/6] Rooms...');
    const roomMap = {};
    for (const [sqlRoomId, roomData] of Object.entries(ROOMS)) {
      const dbRoom = await prisma.room.findFirst({ where: { roomNumber: roomData.roomNumber } });
      if (dbRoom) {
        roomMap[sqlRoomId] = dbRoom.id;
        const typeName = ROOM_TYPES[roomData.roomTypeId]?.name || 'Unknown';
        console.log(`  + ${roomData.roomNumber} (${typeName})`);
      }
    }
    console.log(`  Mapped ${Object.keys(roomMap).length} rooms\n`);

    // Step 3: Guests from SQL customers
    console.log('[3/6] Guests...');
    const guestMap = {};
    let newGuestCount = 0;
    for (const [custId, cust] of Object.entries(CUSTOMERS)) {
      const { firstName, lastName } = splitName(cust.name);
      const existing = await prisma.guest.findFirst({
        where: { email: cust.email }
      });

      if (!existing) {
        const guest = await prisma.guest.create({
          data: {
            firstName,
            lastName,
            email: cust.email,
            phone: `+234 ${cust.contact}`,
            address: (cust.address === 'NOT ASSIGN' || cust.address === 'N0T ASSIGN' || cust.address === 'N') ? null : cust.address,
            country: 'Nigeria',
            totalStays: 0,
            totalSpent: 0,
            createdAt: new Date(cust.date),
          }
        });
        guestMap[custId] = guest.id;
        newGuestCount++;
      } else {
        guestMap[custId] = existing.id;
      }
    }
    console.log(`  ${newGuestCount} new guests imported (${Object.keys(guestMap).length} total mapped)\n`);

    // Step 4: Reservations from SQL bookings
    console.log('[4/6] Reservations...');
    let resCount = 0;
    let billCount = 0;

    for (const booking of BOOKINGS) {
      const guestId = guestMap[String(booking.custId)];
      const roomId = roomMap[String(booking.roomId)];
      if (!guestId || !roomId) {
        console.log(`  SKIPPED booking #${booking.id}: guest=${guestId ? 'found' : 'MISSING'}, room=${roomId ? 'found' : 'MISSING'}`);
        continue;
      }

      const room = await prisma.room.findUnique({ where: { id: roomId }, include: { roomType: true } });
      if (!room) continue;

      const nights = calcNights(booking.checkIn, booking.checkOut);
      const roomRate = room.roomType.baseRate;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkInDate = new Date(booking.checkIn);
      const checkOutDate = new Date(booking.checkOut);

      let status = 'checked_out';
      let checkedInAt = null;
      let checkedOutAt = null;

      if (checkInDate > today) {
        status = 'confirmed';
      } else if (checkInDate <= today && checkOutDate > today) {
        status = 'checked_in';
        checkedInAt = checkInDate;
      } else {
        status = 'checked_out';
        checkedInAt = checkInDate;
        checkedOutAt = checkOutDate;
      }

      const discountAmount = booking.discount || 0;
      const totalAmount = booking.price;
      const paidAmount = totalAmount - discountAmount;
      const confirmationCode = generateConfirmationCode();

      const reservation = await prisma.reservation.create({
        data: {
          confirmationCode,
          guestId,
          roomId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          status,
          source: 'walk_in',
          adults: 1,
          roomRate,
          totalAmount,
          paidAmount,
          checkedInAt,
          checkedOutAt,
          notes: `Migrated from booking #${booking.id}`,
          createdAt: checkInDate,
        }
      });

      // Update guest stats
      await prisma.guest.update({
        where: { id: guestId },
        data: {
          totalStays: { increment: 1 },
          totalSpent: { increment: totalAmount },
        }
      });

      // Create bill
      const balance = totalAmount - paidAmount;
      await prisma.bill.create({
        data: {
          reservationId: reservation.id,
          guestId,
          roomCharges: roomRate * nights,
          otherCharges: Math.max(0, totalAmount - roomRate * nights),
          discountAmount,
          totalAmount,
          paidAmount,
          balanceAmount: balance,
          status: balance <= 0 ? 'paid' : 'partially_paid',
          paymentMethod: 'cash',
        }
      });
      resCount++;
      billCount++;
    }
    console.log(`  ${resCount} reservations imported\n`);

    // Step 5: Bills summary
    console.log('[5/6] Bills...');
    console.log(`  ${billCount} bills created\n`);

    // Step 6: Legacy staff
    console.log('[6/6] Legacy staff...');
    let staffImported = 0;
    const polycarpExists = await prisma.staffProfile.count();
    if (polycarpExists === 0) {
      const polycarpUser = await prisma.user.findUnique({
        where: { email: 'polycarpchike@gmail.com' },
      });
      if (polycarpUser) {
        await prisma.staffProfile.create({
          data: {
            userId: polycarpUser.id,
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
        console.log('  + POLYCARP CHIKE imported');
        staffImported++;
      }
    } else {
      console.log('  Staff profile already exists');
    }

    console.log('\n========================================');
    console.log('  Migration complete!');
    console.log(`  Room types: ${Object.keys(roomTypeMap).length}`);
    console.log(`  Rooms: ${Object.keys(roomMap).length}`);
    console.log(`  Guests: ${newGuestCount} new`);
    console.log(`  Reservations: ${resCount}`);
    console.log(`  Bills: ${billCount}`);
    console.log('========================================');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();