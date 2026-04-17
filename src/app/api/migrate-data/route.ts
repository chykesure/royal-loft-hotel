import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateConfirmationCode } from '@/lib/auth';

// ============ YOUR LEGACY DATA FROM hotelms ============

const ROOM_TYPES = [
  { room_type_id: 23, room_type: 'Executive Suite', price: 65000, max_person: 3 },
  { room_type_id: 24, room_type: 'Executive', price: 50000, max_person: 2 },
  { room_type_id: 25, room_type: 'Deluxe', price: 40000, max_person: 2 },
  { room_type_id: 26, room_type: 'Standard', price: 30000, max_person: 2 },
];

const ROOMS = [
  { room_id: 47, room_type_id: 23, room_no: 'RM-010', status: 0, check_out_status: 1, deleteStatus: 0 },
  { room_id: 48, room_type_id: 23, room_no: 'RM-016', status: 0, check_out_status: 1, deleteStatus: 0 },
  { room_id: 51, room_type_id: 25, room_no: 'RM-007', status: 0, check_out_status: 1, deleteStatus: 0 },
  { room_id: 52, room_type_id: 26, room_no: 'RM-002', status: 0, check_out_status: 1, deleteStatus: 0 },
  { room_id: 53, room_type_id: 26, room_no: 'RM-004', status: 0, check_out_status: 1, deleteStatus: 0 },
  { room_id: 54, room_type_id: 26, room_no: 'RM-005', status: 0, check_out_status: 1, deleteStatus: 0 },
  { room_id: 55, room_type_id: 25, room_no: 'RM-006', status: null, check_out_status: 0, deleteStatus: 1 },
  { room_id: 56, room_type_id: 24, room_no: 'RM-008', status: 0, check_out_status: 1, deleteStatus: 0 },
  { room_id: 57, room_type_id: 24, room_no: 'RM-009', status: 0, check_out_status: 1, deleteStatus: 0 },
  { room_id: 58, room_type_id: 23, room_no: 'RM-011', status: null, check_out_status: 0, deleteStatus: 1 },
  { room_id: 59, room_type_id: 24, room_no: 'RM-012', status: 0, check_out_status: 1, deleteStatus: 0 },
  { room_id: 60, room_type_id: 24, room_no: 'RM-013', status: 0, check_out_status: 1, deleteStatus: 0 },
  { room_id: 61, room_type_id: 24, room_no: 'RM-014', status: 0, check_out_status: 1, deleteStatus: 0 },
  { room_id: 62, room_type_id: 24, room_no: 'RM-015', status: 0, check_out_status: 1, deleteStatus: 0 },
  { room_id: 63, room_type_id: 24, room_no: 'RM-011B', status: 0, check_out_status: 1, deleteStatus: 0 },
  { room_id: 64, room_type_id: 26, room_no: 'RM-006B', status: 0, check_out_status: 1, deleteStatus: 0 },
  { room_id: 66, room_type_id: 25, room_no: 'RM-003', status: 0, check_out_status: 1, deleteStatus: 0 },
  { room_id: 67, room_type_id: 26, room_no: 'RM-001', status: 0, check_out_status: 1, deleteStatus: 0 },
];

const ID_CARD_TYPES: Record<number, string> = {
  1: 'National Identity Card',
  2: 'Voters Card',
  3: 'NIN',
  4: 'Driving License',
};

const CUSTOMERS = [
  { customer_id: 20, customer_name: 'THE REFINER EVENT', contact_no: 91221932716, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: '0000000000000', address: 'NOT ASSIGN', date_created: '2025-12-11 17:27:53' },
  { customer_id: 21, customer_name: 'THE REFINER EVENT', contact_no: 91221932716, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: '00000000000000000', address: 'NOT ASSIGN', date_created: '2025-12-11 17:29:08' },
  { customer_id: 22, customer_name: 'THE REFINER EVENT', contact_no: 91221932716, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: '00000000000000', address: 'NOT ASSIGN', date_created: '2025-12-11 17:29:36' },
  { customer_id: 23, customer_name: 'THE REFINER EVENT', contact_no: 91221932716, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: '000000000000000', address: 'NOT ASSIGN', date_created: '2025-12-11 17:30:03' },
  { customer_id: 24, customer_name: 'THE REFINER EVENT', contact_no: 91221932716, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: '0000000000000', address: 'NOT ASSIGN', date_created: '2025-12-11 17:30:34' },
  { customer_id: 25, customer_name: 'THE REFINER EVENT', contact_no: 91221932716, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: '0000000000000000', address: 'NOT ASSIGN', date_created: '2025-12-11 17:30:58' },
  { customer_id: 26, customer_name: 'THE REFINER EVENT', contact_no: 91221932716, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: '00000000000000000000', address: 'NOT ASSIGN', date_created: '2025-12-11 17:31:29' },
  { customer_id: 27, customer_name: 'THE REFINER EVENT', contact_no: 91221932716, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: '00000000000000000000', address: 'NOT ASSIGN', date_created: '2025-12-11 17:32:08' },
  { customer_id: 28, customer_name: 'THE REFINER EVENT', contact_no: 91221932716, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: '00000000000000000000', address: 'NOT ASSIGN', date_created: '2025-12-11 17:32:33' },
  { customer_id: 29, customer_name: 'THE REFINER EVENT', contact_no: 91221932716, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: '00000000000000000000', address: 'NOT ASSIGN', date_created: '2025-12-11 17:33:26' },
  { customer_id: 30, customer_name: 'THE REFINER EVENT', contact_no: 91221932716, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: '00000000000000000000', address: 'NOT ASSIGN', date_created: '2025-12-11 17:34:08' },
  { customer_id: 31, customer_name: 'THE REFINER EVENT', contact_no: 91221932716, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: '00000000000000000000', address: 'NOT ASSIGN', date_created: '2025-12-11 17:35:20' },
  { customer_id: 32, customer_name: 'THE REFINER EVENT', contact_no: 91221932716, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: '00000000000000000000', address: 'NOT ASSIGN', date_created: '2025-12-11 17:37:36' },
  { customer_id: 33, customer_name: 'THE REFINER EVENT', contact_no: 9122193276, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: '00000000000000000000', address: 'NOT ASSIGN', date_created: '2025-12-12 20:33:35' },
  { customer_id: 34, customer_name: 'Adetutu Liadi', contact_no: 8033838515, email: 'default@gmail', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'JDP IJEBU ODE', date_created: '2025-12-14 18:47:30' },
  { customer_id: 36, customer_name: 'ADEKUNLE BEN', contact_no: 7055367217, email: 'defalt@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'JDP IJEBU ODE', date_created: '2025-12-14 18:54:39' },
  { customer_id: 37, customer_name: 'ALADESHUWA AKIN', contact_no: 7087959090, email: 'default@gmail', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'JDP IJEBU ODE', date_created: '2025-12-14 18:58:56' },
  { customer_id: 38, customer_name: 'THE REFINER EVENT', contact_no: 9122193276, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2025-12-17 11:12:44' },
  { customer_id: 39, customer_name: 'ODEYEMI REMILEKUN', contact_no: 8106963535, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: '00000000000000000000', address: 'NOT ASSIGN', date_created: '2025-12-17 13:26:13' },
  { customer_id: 40, customer_name: 'FREEMAN TUNDE', contact_no: 8054646706, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: '00000000000000000000', address: 'NOT ASSIGN', date_created: '2025-12-17 13:32:15' },
  { customer_id: 41, customer_name: 'OLALIN HAMMED', contact_no: 9071678191, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: '00000000000000000000', address: 'NOT ASSIGN', date_created: '2025-12-17 13:43:03' },
  { customer_id: 42, customer_name: 'ALABI OLUWASEYI', contact_no: 8162230998, email: 'oluwaseyi2000@yahoo.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'BLOCK 42 FLAT 1 ABESAN HOUSING ESTATE IPAJA LAGOS', date_created: '2025-12-17 13:49:37' },
  { customer_id: 43, customer_name: 'AWE OLASUNKANMI', contact_no: 7039371251, email: 'awesunkanmi71@yahoo.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2025-12-17 13:56:03' },
  { customer_id: 44, customer_name: 'AKUIWU PASCAL', contact_no: 7032308696, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: '00000000000000000000', address: 'NOT ASSIGN', date_created: '2025-12-17 13:58:41' },
  { customer_id: 45, customer_name: 'KELECHI NDUKWE', contact_no: 8062431446, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'ILESHA', date_created: '2025-12-17 14:01:26' },
  { customer_id: 46, customer_name: 'ADERINTO ADETOYOSE', contact_no: 8026149740, email: 'hhardeytoyese@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'LEKKI LAGOS STATE', date_created: '2025-12-17 14:07:22' },
  { customer_id: 47, customer_name: 'ADERINTO ADETOYOSE', contact_no: 8171880668, email: 'hhardeytoyese@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'LEKKI LAGOS STATE', date_created: '2025-12-17 14:20:43' },
  { customer_id: 48, customer_name: 'OMOTOSHO SANMI', contact_no: 810500751, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2025-12-17 14:24:14' },
  { customer_id: 49, customer_name: 'ADEFUYE KAYODE', contact_no: 7033249174, email: 'adefuye1@yahoo.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2025-12-17 14:27:29' },
  { customer_id: 50, customer_name: 'OLASENI ABAYOMI', contact_no: 8033539662, email: 'olaseni@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'PLOT 37 SHAGARI ESTATE AKURE', date_created: '2025-12-17 14:32:45' },
  { customer_id: 51, customer_name: 'UMEH DANIEL', contact_no: 7059962543, email: 'default@gmail', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2025-12-17 14:36:20' },
  { customer_id: 52, customer_name: 'ASANI FUNMILOLA', contact_no: 8130493858, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2025-12-17 14:39:11' },
  { customer_id: 53, customer_name: 'AJIBAWO OLAJIDE', contact_no: 8139358527, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2025-12-17 14:41:55' },
  { customer_id: 54, customer_name: 'AKINBOBOSE AYOAKIN', contact_no: 8036862982, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2025-12-17 14:48:25' },
  { customer_id: 55, customer_name: 'OYEDIBU ENOCH', contact_no: 8100272514, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2025-12-17 14:55:59' },
  { customer_id: 56, customer_name: 'ALAKE TUNBOSUN', contact_no: 8180445694, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2025-12-17 15:00:38' },
  { customer_id: 57, customer_name: 'ADETOKUNBO ADESIN', contact_no: 8139627315, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2025-12-17 15:03:37' },
  { customer_id: 58, customer_name: 'UBECHI JOY', contact_no: 8028524016, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'AJAH LAGOS', date_created: '2025-12-17 15:07:23' },
  { customer_id: 59, customer_name: 'OHIREMEN OHIS', contact_no: 8180187466, email: 'ohisb120@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'LAGOS', date_created: '2025-12-17 15:10:18' },
  { customer_id: 60, customer_name: 'EZOMOH JUDE', contact_no: 8080801180, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: '30 OBANIKORO STREET', date_created: '2025-12-17 15:20:33' },
  { customer_id: 61, customer_name: 'SIMEON KEKERE', contact_no: 8023019882, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2025-12-17 15:23:57' },
  { customer_id: 62, customer_name: 'SEKOMI TUNDE', contact_no: 8036520909, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'EBUTE METTA LAGOS', date_created: '2025-12-17 15:25:53' },
  { customer_id: 63, customer_name: 'EZOMOH TUNDE', contact_no: 8080801180, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: '3', date_created: '2025-12-17 15:30:46' },
  { customer_id: 64, customer_name: 'SIMEON KEKERE', contact_no: 8023019882, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: '00000000000000000000', address: 'NOT ASSIGN', date_created: '2025-12-17 15:34:36' },
  { customer_id: 65, customer_name: 'OLATUN SEUN', contact_no: 7087511301, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'OLUBI STREET OYO', date_created: '2025-12-17 15:51:27' },
  { customer_id: 66, customer_name: 'FEHINTOLA SULE', contact_no: 8038116276, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'VICTORIA ISLAND LAGOS', date_created: '2025-12-17 15:58:16' },
  { customer_id: 67, customer_name: 'AYOMIDE VICTOR', contact_no: 907035647567, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: '00000000000000000000', address: 'NOT ASSIGN', date_created: '2025-12-17 16:11:18' },
  { customer_id: 68, customer_name: 'ADELABU ADEWALE', contact_no: 8035792353, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2025-12-17 16:16:13' },
  { customer_id: 69, customer_name: 'FADAUNSI OLANREWAJU', contact_no: 8052979036, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2025-12-17 16:27:11' },
  { customer_id: 70, customer_name: 'OJO AJIBOLA', contact_no: 8037003010, email: 'ojoAjibola455@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'OKEOMIRU ILESHA', date_created: '2025-12-17 16:31:10' },
  { customer_id: 71, customer_name: 'ISHOLA MAGRET', contact_no: 8037003080, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'OKEOMIRU ILESHA', date_created: '2025-12-17 16:34:50' },
  { customer_id: 72, customer_name: 'ADENIYI SAMUEL', contact_no: 8034734060, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NO 4 GABRIEL AKINOLA CLOSE P&T IPAYA LAGOS', date_created: '2025-12-17 16:40:08' },
  { customer_id: 73, customer_name: 'AFOLABI OLANIYI', contact_no: 8110000841, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'OPP 3rd extension NTA ado ekiti', date_created: '2025-12-19 18:26:29' },
  { customer_id: 74, customer_name: 'IZEFAEGBE FRANK', contact_no: 8033882995, email: 'frankzeffy@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'PLOT 7/9 LAYOUT ABUJA', date_created: '2025-12-21 22:03:29' },
  { customer_id: 75, customer_name: 'BASHIR IBRAHIM', contact_no: 8033882995, email: 'frankzeffy@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'PLOT 7/9 IDU LAD.LAYOUT ABUJA', date_created: '2025-12-21 22:09:01' },
  { customer_id: 76, customer_name: 'OYEBAMIJI ADEWALE', contact_no: 8132522968, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'ADEBAYO ABON NO 1', date_created: '2025-12-23 18:24:58' },
  { customer_id: 77, customer_name: 'IKPE DANIEL', contact_no: 8065368885, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2025-12-23 18:37:17' },
  { customer_id: 78, customer_name: 'SAMOND DARE', contact_no: 7084532737, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'AKABAI STREET LAGOS', date_created: '2025-12-23 18:42:55' },
  { customer_id: 79, customer_name: 'OMOBOLANLE SAMUEL', contact_no: 8147858288, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'IBADAN', date_created: '2025-12-26 22:49:06' },
  { customer_id: 80, customer_name: 'ALALU DARE', contact_no: 8060403363, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'IBADAN', date_created: '2025-12-26 22:52:48' },
  { customer_id: 81, customer_name: 'OLADEHINDE MICHAEL', contact_no: 7047832319, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'SANGO OTA OGUN STATE', date_created: '2025-12-26 22:56:59' },
  { customer_id: 82, customer_name: 'KOMOLAFE AYODEJI', contact_no: 8100120130, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'FADAHUNSI IMO ILESA OSUN STATE', date_created: '2025-12-28 06:26:06' },
  { customer_id: 83, customer_name: 'AHMED OMOTOLA', contact_no: 9065448283, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'OMI ASORO ILESHA', date_created: '2025-12-28 22:29:21' },
  { customer_id: 84, customer_name: 'AFOLABI OLANIYI', contact_no: 81100, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'OPP 3RD EXTENTION GATE NTA ADO EKITI', date_created: '2025-12-30 19:58:29' },
  { customer_id: 85, customer_name: 'LUKERA DAVID', contact_no: 8169001110, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NO 27 KUBWA ABUJA', date_created: '2026-01-05 19:59:14' },
  { customer_id: 86, customer_name: 'FAKOYA BABATUNDE', contact_no: 9134324355, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'LAGOS', date_created: '2026-01-05 20:01:25' },
  { customer_id: 87, customer_name: 'KOMOLAFE OLAYEMI', contact_no: 8053319086, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'IMO ILESHA', date_created: '2026-01-10 16:21:08' },
  { customer_id: 88, customer_name: 'ADEYEMO ADEKUNLE', contact_no: 8031160725, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'IMO ILESHA', date_created: '2026-01-10 16:24:01' },
  { customer_id: 89, customer_name: 'ABUBAKIR SODIQ', contact_no: 8088103916, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'ABUJA', date_created: '2026-01-10 19:51:37' },
  { customer_id: 90, customer_name: 'SEKETI ADEBOWALE', contact_no: 7030992863, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'MOGAJI HOME AULE AKURE', date_created: '2026-01-14 16:04:56' },
  { customer_id: 91, customer_name: 'ABUBAKAR SODIQ', contact_no: 8088103916, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'ABUJA', date_created: '2026-01-14 16:07:59' },
  { customer_id: 92, customer_name: 'ALIMI ABDULLAHI', contact_no: 8036520909, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'AJIBOYE ROYAL CAMP OSUN STATE', date_created: '2026-01-14 16:12:38' },
  { customer_id: 93, customer_name: 'OLUCHI JOY', contact_no: 9133462114, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'N', date_created: '2026-01-16 13:37:12' },
  { customer_id: 94, customer_name: 'KOMOLAFE OLAYEMI', contact_no: 7056480888, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'INTERNATIONAL BREWERIES', date_created: '2026-01-19 11:25:13' },
  { customer_id: 95, customer_name: 'AWONIYI SUNDAY', contact_no: 8136764181, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'OGUN STATE NO 14 GBENGA STREET', date_created: '2026-01-23 13:12:52' },
  { customer_id: 96, customer_name: 'ISMAIL LATEEF', contact_no: 8047273031, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'AJEGUNLE ISE EKITI', date_created: '2026-01-23 13:21:52' },
  { customer_id: 97, customer_name: 'BABATUNDE ALIYU', contact_no: 8033743459, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2026-01-24 18:16:49' },
  { customer_id: 98, customer_name: 'OGUNNIYI TAIWO', contact_no: 8036187684, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'LAGOS', date_created: '2026-02-01 15:11:30' },
  { customer_id: 99, customer_name: 'ADAMU ABBA', contact_no: 8063230588, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'APAPA LAGOS', date_created: '2026-02-08 18:12:02' },
  { customer_id: 100, customer_name: 'POPOOLA ABDULJELIL', contact_no: 7037264803, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2026-02-08 18:23:23' },
  { customer_id: 101, customer_name: 'BELLO FAITIA', contact_no: 9128209859, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2026-02-08 18:26:03' },
  { customer_id: 102, customer_name: 'ADEWUMI DUPE', contact_no: 7011084797, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'LAGOS', date_created: '2026-02-08 18:29:46' },
  { customer_id: 103, customer_name: 'WILLIAMS KEHINDE', contact_no: 8086028594, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2026-02-08 18:31:53' },
  { customer_id: 104, customer_name: 'ADEWUMI DUPE', contact_no: 7011847974, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'LAGOS', date_created: '2026-02-08 18:35:47' },
  { customer_id: 105, customer_name: 'POPOOLA ABDULJELIL', contact_no: 7037264803, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2026-02-15 17:23:12' },
  { customer_id: 106, customer_name: 'AKINOLA SUNDAY', contact_no: 8023636020, email: 'ayeoyenikan90w@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'OJOTA LAGOS', date_created: '2026-02-15 17:31:25' },
  { customer_id: 107, customer_name: 'JOHN SUNDAY', contact_no: 9122193276, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'KAJOLA STREET IMO ILESHA', date_created: '2026-02-15 17:34:36' },
  { customer_id: 108, customer_name: 'ABDULLAHI YUNUSA', contact_no: 9164542480, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'OLUFEMI STREET', date_created: '2026-02-15 17:40:53' },
  { customer_id: 109, customer_name: 'OLUCHUKWU VINCENT', contact_no: 8066185052, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2026-02-18 16:00:43' },
  { customer_id: 110, customer_name: 'OLUCHUKWU VINCENT', contact_no: 8066185052, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2026-02-18 16:04:49' },
  { customer_id: 111, customer_name: 'OLADIPO OLUWASEUN', contact_no: 8134786492, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'ABEOKUTA', date_created: '2026-02-20 14:53:14' },
  { customer_id: 112, customer_name: 'ADIGUN LEMON', contact_no: 8165031677, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2026-03-01 16:58:19' },
  { customer_id: 113, customer_name: 'MICHAEL GOODNESS', contact_no: 8057733374, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'IBADAN', date_created: '2026-03-01 17:00:32' },
  { customer_id: 114, customer_name: 'SUNDAY SAMUEL', contact_no: 8052979036, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2026-03-01 17:02:37' },
  { customer_id: 115, customer_name: 'IGBALAJOBI SUNDAY', contact_no: 8160731034, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2026-03-08 17:01:47' },
  { customer_id: 116, customer_name: 'BAYONLE SAMSON', contact_no: 8131662636, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2026-03-08 17:11:30' },
  { customer_id: 117, customer_name: 'OJO TEMITAYO', contact_no: 8027359334, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'LUCAS STREET OBAWOLE LAGOS', date_created: '2026-03-13 12:50:37' },
  { customer_id: 118, customer_name: 'ISAIAH EJOH', contact_no: 8107390395, email: 'default@gmail.com', id_card_type_id: 2, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2026-03-13 12:52:23' },
  { customer_id: 119, customer_name: 'ADELEKE OLARENWAJU', contact_no: 9036843606, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2026-03-18 17:39:53' },
  { customer_id: 120, customer_name: 'ADAURA MUHAMMED', contact_no: 8143758894, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'ABUJA', date_created: '2026-03-19 16:35:22' },
  { customer_id: 121, customer_name: 'AKANDE IYANUOLUWA', contact_no: 8133416780, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2026-03-19 16:38:01' },
  { customer_id: 122, customer_name: 'AKANDE IYANUOLUWA', contact_no: 8133416783, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'IJAMO IKORODU', date_created: '2026-03-28 15:50:14' },
  { customer_id: 123, customer_name: 'JOHN SUNDAY', contact_no: 7042888741, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2026-03-28 15:53:10' },
  { customer_id: 124, customer_name: 'JAMES UGBEDE', contact_no: 8030685778, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'ABUJA', date_created: '2026-03-28 15:56:08' },
  { customer_id: 125, customer_name: 'OLUWASEUN MOSES', contact_no: 8051840497, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NOT ASSIGN', date_created: '2026-03-28 16:00:21' },
  { customer_id: 126, customer_name: 'AKEEM LAMIDI', contact_no: 8154300122, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'ILESHA', date_created: '2026-03-28 16:02:35' },
  { customer_id: 127, customer_name: 'AJAYI SHEGUN', contact_no: 7048773475, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'BREWERIES EXPRESS', date_created: '2026-03-30 17:50:25' },
  { customer_id: 128, customer_name: 'ADENIYI ADEDAYO', contact_no: 8037642692, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'NO 13 OKUNBOR STREET BENIN', date_created: '2026-04-13 17:54:28' },
  { customer_id: 129, customer_name: 'OYENIYI OMOBUKOLA', contact_no: 8136616280, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'OMI ASORO ILESHA', date_created: '2026-04-13 17:57:41' },
  { customer_id: 130, customer_name: 'OLAFARE ABIOLA', contact_no: 8098313712, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'RING ROAD IBADAN', date_created: '2026-04-13 18:01:47' },
  { customer_id: 131, customer_name: 'ONI REINHORD', contact_no: 8123401005, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'ILE IFE', date_created: '2026-04-14 12:41:45' },
  { customer_id: 132, customer_name: 'ONI REINHORD', contact_no: 8123401005, email: 'default@gmail.com', id_card_type_id: 3, id_card_no: 'DONOTHAVE1', address: 'ILE IFE', date_created: '2026-04-14 12:43:57' },
];

const BOOKINGS = [
  [19,20,52,'2025-12-11 17:27:53','12-12-2025','13-12-2025',60000,0,1],
  [20,21,53,'2025-12-11 17:29:08','12-12-2025','13-12-2025',60000,0,1],
  [21,22,54,'2025-12-11 17:29:36','12-12-2025','13-12-2025',60000,0,1],
  [22,23,64,'2025-12-11 17:30:03','12-12-2025','13-12-2025',60000,0,1],
  [23,24,56,'2025-12-11 17:30:34','12-12-2025','13-12-2025',100000,0,1],
  [24,25,57,'2025-12-11 17:30:58','12-12-2025','13-12-2025',100000,0,1],
  [25,26,47,'2025-12-11 17:31:29','12-12-2025','13-12-2025',130000,0,1],
  [26,27,63,'2025-12-11 17:32:08','12-12-2025','13-12-2025',100000,0,1],
  [27,28,59,'2025-12-11 17:32:33','12-12-2025','13-12-2025',100000,0,1],
  [28,29,60,'2025-12-11 17:33:26','12-12-2025','13-12-2025',100000,0,1],
  [29,30,61,'2025-12-11 17:34:08','12-12-2025','13-12-2025',100000,0,1],
  [30,31,62,'2025-12-11 17:35:20','12-12-2025','13-12-2025',100000,0,1],
  [31,32,48,'2025-12-11 17:37:36','12-12-2025','13-12-2025',130000,0,1],
  [34,33,66,'2025-12-12 20:56:16','12-12-2025','14-12-2025',80000,0,1],
  [35,33,51,'2025-12-12 20:57:23','12-12-2025','14-12-2025',80000,0,1],
  [36,34,53,'2025-12-14 18:47:30','14-12-2025','15-12-2025',30000,10000,1],
  [37,36,54,'2025-12-14 18:54:39','14-12-2025','16-12-2025',60000,20000,1],
  [38,37,64,'2025-12-14 18:58:56','14-12-2025','16-12-2025',60000,20000,1],
  [39,38,48,'2025-12-12 11:12:44','2025-12-12','2025-12-14',100000,30000,1],
  [40,39,67,'2025-12-17 13:26:13','2025-12-16','2025-12-17',15000,15000,1],
  [41,40,67,'2025-12-17 13:32:15','2025-10-21','2025-10-22',15000,15000,1],
  [42,40,47,'2025-12-17 13:36:38','2025-10-25','2025-10-26',50000,15000,1],
  [43,40,48,'2025-12-17 13:38:27','2025-10-25','2025-10-26',40000,25000,1],
  [44,41,67,'2025-12-17 13:43:03','2025-10-27','2025-10-28',20000,10000,1],
  [45,42,52,'2025-12-17 13:49:37','2025-10-28','2025-10-30',40000,20000,1],
  [46,43,66,'2025-12-17 13:56:03','2025-10-31','2025-11-01',20000,20000,1],
  [47,44,51,'2025-12-17 13:58:41','2025-10-31','2025-11-01',20000,20000,1],
  [48,45,52,'2025-12-17 14:01:26','2025-10-31','2025-11-01',20000,10000,1],
  [49,45,67,'2025-12-17 14:03:29','2025-10-31','2025-11-01',20000,10000,1],
  [50,46,47,'2025-12-17 14:07:22','2025-10-31','2025-11-01',50000,15000,1],
  [51,47,47,'2025-12-17 14:20:43','2025-11-01','2025-11-02',50000,15000,1],
  [52,48,52,'2025-12-17 14:24:14','2025-11-04','2025-11-05',20000,10000,1],
  [53,49,66,'2025-12-17 14:27:29','2025-11-07','2025-11-08',20000,20000,1],
  [54,50,52,'2025-12-17 14:32:45','2025-11-07','2025-11-08',20000,10000,1],
  [55,51,51,'2025-12-17 14:36:20','2025-11-08','2025-11-09',20000,20000,1],
  [56,52,66,'2025-12-17 14:39:11','2025-11-08','2025-11-09',20000,20000,1],
  [57,53,53,'2025-12-17 14:41:55','2025-11-08','2025-11-09',20000,10000,1],
  [58,54,66,'2025-12-17 14:48:25','2025-11-11','2025-11-12',25000,15000,1],
  [59,55,52,'2025-12-17 14:55:59','2025-11-09','2025-11-10',20000,10000,1],
  [60,56,63,'2025-12-17 15:00:38','2025-11-13','2025-11-14',50000,0,1],
  [61,57,67,'2025-12-17 15:03:37','2025-11-13','2025-11-16',90000,0,1],
  [62,58,52,'2025-12-17 15:07:23','2025-11-13','2025-11-16',90000,30000,1],
  [63,59,66,'2025-12-17 15:10:18','2025-11-13','2025-11-16',90000,30000,1],
  [64,60,48,'2025-12-17 15:20:33','2025-11-14','2025-11-15',50000,15000,1],
  [65,61,51,'2025-12-17 15:23:57','2025-11-14','2025-11-15',30000,10000,1],
  [66,62,56,'2025-12-17 15:25:53','2025-11-14','2025-11-15',50000,0,1],
  [67,63,57,'2025-12-17 15:30:46','2025-11-14','2025-11-15',50000,0,1],
  [68,60,63,'2025-12-17 15:32:49','2025-11-14','2025-11-15',50000,0,1],
  [69,64,53,'2025-12-17 15:34:36','2025-11-14','2025-11-15',30000,0,1],
  [70,62,47,'2025-12-17 15:37:10','2025-11-14','2025-11-15',65000,0,1],
  [71,62,64,'2025-12-17 15:46:50','2025-11-14','2025-11-15',30000,0,1],
  [72,65,60,'2025-12-17 15:51:27','2025-11-15','2025-11-16',50000,0,1],
  [73,66,51,'2025-12-17 15:58:16','2025-11-15','2025-11-16',30000,10000,1],
  [74,67,52,'2025-12-17 16:11:18','2025-11-19','2025-11-20',20000,10000,1],
  [75,68,66,'2025-12-17 16:16:13','2025-11-19','2025-11-20',30000,10000,1],
  [76,69,51,'2025-12-17 16:27:11','2025-11-21','2025-11-22',30000,10000,1],
  [77,70,52,'2025-12-17 16:31:10','2025-11-21','2025-11-23',60000,0,1],
  [78,71,66,'2025-12-17 16:34:50','2025-11-21','2025-11-22',30000,10000,1],
  [79,72,64,'2025-12-17 16:40:08','2025-11-27','2025-11-28',30000,0,1],
  [81,73,67,'2025-12-19 18:28:52','2025-12-18','2025-12-19',20000,10000,1],
  [82,74,64,'2025-12-21 22:03:29','2025-12-20','2025-12-21',20000,10000,1],
  [83,75,53,'2025-12-21 22:09:01','2025-12-20','2025-12-21',20000,10000,1],
  [84,76,66,'2025-12-23 18:24:58','2025-12-22','2025-12-23',25000,15000,1],
  [85,77,52,'2025-12-23 18:37:17','2025-12-22','2025-12-23',20000,10000,1],
  [86,78,51,'2025-12-23 18:42:55','2025-12-22','2025-12-23',25000,15000,1],
  [87,79,67,'2025-12-26 22:49:06','2025-12-24','2025-12-25',20000,10000,1],
  [88,80,64,'2025-12-26 22:52:48','2025-12-24','2025-12-25',20000,10000,1],
  [89,81,54,'2025-12-26 22:56:59','2025-12-23','2025-12-24',20000,10000,1],
  [90,82,64,'2025-12-28 06:26:06','2025-12-27','2025-12-29',40000,20000,1],
  [91,83,54,'2025-12-28 22:29:21','2025-12-28','2025-12-29',20000,10000,1],
  [92,83,54,'2025-12-29 18:21:49','2025-12-29','2025-12-30',20000,10000,1],
  [93,84,52,'2025-12-30 19:58:29','2025-12-29','2025-12-30',20000,10000,1],
  [94,83,54,'2025-12-30 20:00:52','2025-12-30','2025-12-31',20000,10000,1],
  [95,85,67,'2026-01-05 19:59:14','2026-01-04','2026-01-05',20000,10000,1],
  [96,86,52,'2026-01-05 20:01:25','2026-01-04','2026-01-05',20000,10000,1],
  [97,82,64,'2026-01-07 07:10:01','2026-01-05','2026-01-06',20000,10000,1],
  [98,86,52,'2026-01-07 07:14:20','2026-01-06','2026-01-07',20000,10000,1],
  [100,87,53,'2026-01-10 16:21:08','2026-01-07','2026-01-08',20000,10000,1],
  [101,88,67,'2026-01-10 16:24:01','2026-01-08','2026-01-09',20000,10000,1],
  [102,36,66,'2025-12-03 17:59:22','2025-12-03','2025-12-04',25000,15000,1],
  [103,73,67,'2025-12-08 18:20:11','2025-12-08','2025-12-09',20000,10000,1],
  [104,79,66,'2025-12-08 18:22:21','2025-12-08','2025-12-09',20000,20000,1],
  [105,89,53,'2026-01-10 19:51:37','2026-01-10','2026-01-11',20000,10000,1],
  [106,90,54,'2026-01-14 16:04:56','2026-01-10','2026-01-11',20000,10000,1],
  [107,91,53,'2026-01-14 16:07:59','2026-01-11','2026-01-14',60000,30000,1],
  [108,92,64,'2026-01-14 16:12:38','2026-01-13','2026-01-14',20000,10000,1],
  [109,93,67,'2026-01-16 13:37:12','2026-01-15','2026-01-16',20000,10000,1],
  [110,73,52,'2026-01-16 13:39:20','2026-01-15','2026-01-16',20000,10000,1],
  [111,94,52,'2026-01-19 11:25:13','2026-01-18','2026-01-19',20000,10000,1],
  [112,95,64,'2026-01-23 13:12:52','2026-01-19','2026-01-20',20000,10000,1],
  [113,96,67,'2026-01-23 13:21:52','2026-01-21','2026-01-22',20000,10000,1],
  [114,97,52,'2026-01-24 18:16:49','2026-01-22','2026-01-24',40000,20000,1],
  [115,97,48,'2026-01-24 18:19:48','2026-01-22','2026-01-24',90000,40000,1],
  [116,97,48,'2026-01-26 15:32:23','2026-01-24','2026-01-25',50000,15000,1],
  [117,98,53,'2026-02-01 15:11:30','2026-01-30','2026-01-31',20000,10000,1],
  [118,99,52,'2026-02-08 18:12:02','2026-02-02','2026-02-03',20000,10000,1],
  [119,99,53,'2026-02-08 18:14:13','2026-02-04','2026-02-05',20000,10000,1],
  [120,100,64,'2026-02-08 18:23:23','2026-02-06','2026-02-08',40000,20000,1],
  [121,101,52,'2026-02-08 18:26:03','2026-02-06','2026-02-07',20000,10000,1],
  [122,101,66,'2026-02-08 18:27:35','2026-02-06','2026-02-07',25000,15000,1],
  [123,102,53,'2026-02-08 18:29:46','2026-02-06','2026-02-07',20000,10000,1],
  [124,103,51,'2026-02-08 18:31:53','2026-02-06','2026-02-07',25000,15000,1],
  [125,104,47,'2026-02-08 18:35:47','2026-02-06','2026-02-08',100000,30000,1],
  [126,99,54,'2026-02-08 18:37:40','2026-02-06','2026-02-07',20000,10000,1],
  [127,104,47,'2026-02-15 17:17:17','2026-02-07','2026-02-08',50000,15000,1],
  [128,105,64,'2026-02-15 17:23:12','2026-02-07','2026-02-08',20000,10000,1],
  [129,89,54,'2026-02-15 17:26:34','2026-02-10','2026-02-11',20000,10000,1],
  [130,106,52,'2026-02-15 17:31:25','2026-02-13','2026-02-14',20000,10000,1],
  [131,107,52,'2026-02-15 17:34:36','2026-02-14','2026-02-15',20000,10000,1],
  [132,108,64,'2026-02-15 17:40:53','2026-02-14','2026-02-15',20000,10000,1],
  [134,110,64,'2026-02-18 16:04:49','2026-02-15','2026-02-19',80000,40000,1],
  [136,91,54,'2026-02-18 16:17:41','2026-02-18','2026-02-19',20000,10000,1],
  [137,111,52,'2026-02-20 14:53:14','2026-02-19','2026-02-20',20000,10000,1],
  [138,112,52,'2026-03-01 16:58:19','2026-02-28','2026-03-01',20000,10000,1],
  [139,113,53,'2026-03-01 17:00:32','2026-02-28','2026-03-01',20000,10000,1],
  [141,114,51,'2026-03-04 14:40:05','2026-02-28','2026-03-01',25000,15000,1],
  [142,114,51,'2026-03-04 14:45:27','2026-03-01','2026-03-03',50000,30000,1],
  [143,114,51,'2026-03-06 16:43:18','2026-03-04','2026-03-05',25000,15000,1],
  [144,115,52,'2026-03-08 17:01:47','2026-03-07','2026-03-08',20000,10000,1],
  [145,113,66,'2026-03-08 17:05:54','2026-03-07','2026-03-08',25000,15000,1],
  [146,83,54,'2026-03-08 17:08:18','2026-03-07','2026-03-08',20000,10000,1],
  [147,116,64,'2026-03-08 17:11:30','2026-03-07','2026-03-08',20000,10000,1],
  [148,117,51,'2026-03-13 12:50:37','2026-03-10','2026-03-11',25000,15000,1],
  [149,118,64,'2026-03-13 12:52:23','2026-03-12','2026-03-13',20000,10000,1],
  [150,119,52,'2026-03-18 17:39:53','2026-03-14','2026-03-15',20000,10000,1],
  [151,119,53,'2026-03-18 17:41:38','2026-03-14','2026-03-15',20000,10000,1],
  [152,120,67,'2026-03-19 16:35:22','2026-03-18','2026-03-19',20000,10000,1],
  [153,121,64,'2026-03-19 16:38:01','2026-03-18','2026-03-19',20000,10000,1],
  [154,73,52,'2026-03-19 16:44:41','2026-03-18','2026-03-20',40000,20000,1],
  [155,122,53,'2026-03-28 15:50:14','2026-03-19','2026-03-20',20000,10000,1],
  [156,123,52,'2026-03-28 15:53:10','2026-03-21','2026-03-22',20000,10000,1],
  [157,124,64,'2026-03-28 15:56:08','2026-03-25','2026-03-26',20000,10000,1],
  [158,125,66,'2026-03-28 16:00:21','2026-03-27','2026-03-28',25000,15000,1],
  [159,126,67,'2026-03-28 16:02:35','2026-03-27','2026-03-28',20000,10000,1],
  [160,127,54,'2026-03-30 17:50:25','2026-03-28','2026-03-29',20000,10000,1],
  [161,128,52,'2026-04-13 17:54:28','2026-04-02','2026-04-03',20000,10000,1],
  [162,129,67,'2026-04-13 17:57:41','2026-04-02','2026-04-03',20000,10000,1],
  [163,130,53,'2026-04-13 18:01:47','2026-04-03','2026-04-04',20000,10000,1],
  [164,108,64,'2026-04-13 18:11:30','2026-04-05','2026-04-06',20000,10000,1],
  [165,131,67,'2026-04-14 12:41:45','2026-04-12','2026-04-13',20000,10000,1],
  [166,132,52,'2026-04-14 12:43:57','2026-04-12','2026-04-13',20000,10000,1],
  [167,131,53,'2026-04-14 12:46:45','2026-04-12','2026-04-13',20000,10000,1],
  [168,132,54,'2026-04-14 12:49:27','2026-04-12','2026-04-13',20000,10000,1],
  [169,131,64,'2026-04-14 12:53:07','2026-04-12','2026-04-13',20000,10000,1],
];

const COMPLAINTS = [
  { id: 1, complainant_name: 'Janice Alexander', complaint_type: 'Room Windows', complaint: 'Does not operate properly', created_at: '2020-07-16 06:51:24', resolve_status: 1, budget: 3600 },
  { id: 2, complainant_name: 'Robert Peter', complaint_type: 'Air Conditioner', complaint: 'Sensor Problems', created_at: '2020-10-01 06:51:44', resolve_status: 1, budget: 7950 },
  { id: 3, complainant_name: 'Jason J Pirkle', complaint_type: 'Bad Smells', complaint: 'Some odd smells around room areas', created_at: '2018-04-01 07:01:17', resolve_status: 1, budget: 500 },
  { id: 5, complainant_name: 'Will Williams', complaint_type: 'Faulty Electronics', complaint: 'Due to some weird reasons, the electronics are not working as it should; some voltage problems too - M-135', created_at: '2021-04-09 08:38:19', resolve_status: 1, budget: 2500 },
];

const STAFF = [
  { emp_id: 15, emp_name: 'POLYCARP CHIKE', staff_type_id: 3, shift_id: 3, id_card_type: 1, id_card_no: '00009', address: 'OROGBA', contact_no: 9133273608, salary: 90000, joining_date: '2025-12-08 08:22:50' },
];

const STAFF_TYPES: Record<number, string> = {
  1: 'Manager', 2: 'Housekeeping Manager', 3: 'Front Desk Receptionist',
  4: 'Chef', 5: 'Waiter', 6: 'Room Attendant', 7: 'Concierge',
  8: 'Hotel Maintenance Engineer', 9: 'Hotel Sales Manager',
};

const SHIFTS: Record<number, { name: string; timing: string }> = {
  1: { name: 'Morning', timing: '5:00 AM - 10:00 AM' },
  2: { name: 'Day', timing: '10:00 AM - 4:00 PM' },
  3: { name: 'Evening', timing: '4:00 PM - 10:00 PM' },
  4: { name: 'Night', timing: '10:00 PM - 5:00 AM' },
};

// ============ HELPER FUNCTIONS ============

function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  // Try YYYY-MM-DD format first
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return new Date(dateStr);
  }
  // Try DD-MM-YYYY format
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length <= 2) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00.000Z`);
  }
  return new Date(dateStr);
}

function parseName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim().replace(/\s+/g, ' ');
  const parts = trimmed.split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function getFloor(roomNo: string): number {
  const match = roomNo.match(/\d+/);
  if (!match) return 1;
  const num = parseInt(match[0]);
  if (num <= 5) return 1;
  if (num <= 10) return 2;
  return 3;
}

function calcNights(checkIn: Date, checkOut: Date): number {
  const diff = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ============ MAIN MIGRATION ============

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const secret = body.secret;

    // Security: require the secret key
    if (secret !== 'royalloft-migrate-2026') {
      return NextResponse.json({ error: 'Invalid secret key' }, { status: 403 });
    }

    console.log('🔄 Starting data migration from legacy hotelms...');

    const stats = { roomTypes: 0, rooms: 0, guests: 0, reservations: 0, feedbacks: 0, staff: 0, users: 0, errors: [] as string[] };

    // ===== STEP 1: Clear existing data (preserve users with protected emails) =====
    console.log('  Step 1: Clearing existing data...');
    try {
      await db.payment.deleteMany();
      await db.bill.deleteMany();
      await db.reservation.deleteMany();
      await db.guestFeedback.deleteMany();
      await db.housekeepingTask.deleteMany();
      await db.maintenanceRequest.deleteMany();
      await db.iotDevice.deleteMany();
      await db.room.deleteMany();
      await db.roomType.deleteMany();
      await db.roomPricing.deleteMany();
      await db.guest.deleteMany();
      await db.expense.deleteMany();
      await db.stockMovement.deleteMany();
      await db.inventoryItem.deleteMany();
      // Clear non-protected users
      await db.user.deleteMany({
        where: {
          email: { notIn: ['admin@royalloft.com', 'developer@royalloft.com'] },
        },
      });
      console.log('  ✅ Existing data cleared');
    } catch (err: any) {
      console.log('  ⚠️ Clear error (may be empty):', err.message);
    }

    // ===== STEP 2: Create Room Types =====
    console.log('  Step 2: Creating room types...');
    const roomTypeIdMap: Record<number, string> = {};

    const amenitiesMap: Record<string, string> = {
      'Executive Suite': JSON.stringify(['TV', 'AC', 'WiFi', 'Mini Bar', 'Sofa', 'Bathtub', 'Work Desk', 'Coffee Maker', 'Living Area', 'Premium Toiletries']),
      'Executive': JSON.stringify(['TV', 'AC', 'WiFi', 'Mini Fridge', 'Work Desk', 'Coffee Maker', 'Premium Bedding']),
      'Deluxe': JSON.stringify(['TV', 'AC', 'WiFi', 'Mini Fridge', 'Work Desk', 'Coffee Maker']),
      'Standard': JSON.stringify(['TV', 'AC', 'WiFi', 'Mini Fridge']),
    };

    for (const rt of ROOM_TYPES) {
      try {
        const created = await db.roomType.create({
          data: {
            name: rt.room_type,
            description: `${rt.room_type} room at ${rt.price.toLocaleString()} NGN per night`,
            baseRate: rt.price,
            maxOccupancy: rt.max_person,
            amenities: amenitiesMap[rt.room_type] || '[]',
            sortOrder: rt.price >= 65000 ? 1 : rt.price >= 50000 ? 2 : rt.price >= 40000 ? 3 : 4,
            isActive: true,
          },
        });
        roomTypeIdMap[rt.room_type_id] = created.id;
        stats.roomTypes++;

        // Create regular season pricing
        await db.roomPricing.create({
          data: {
            roomTypeId: created.id,
            season: 'regular',
            price: rt.price,
          },
        });
      } catch (err: any) {
        stats.errors.push(`RoomType ${rt.room_type}: ${err.message}`);
      }
    }
    console.log(`  ✅ Created ${stats.roomTypes} room types`);

    // ===== STEP 3: Create Rooms =====
    console.log('  Step 3: Creating rooms...');
    const roomIdMap: Record<number, string> = {};

    for (const r of ROOMS) {
      try {
        const typeId = roomTypeIdMap[r.room_type_id];
        if (!typeId) {
          stats.errors.push(`Room ${r.room_no}: missing type ${r.room_type_id}`);
          continue;
        }
        const created = await db.room.create({
          data: {
            roomNumber: r.room_no,
            floor: getFloor(r.room_no),
            roomTypeId: typeId,
            status: r.deleteStatus === 1 ? 'out_of_service' : 'available',
            notes: r.deleteStatus === 1 ? 'Removed from service (legacy)' : undefined,
          },
        });
        roomIdMap[r.room_id] = created.id;
        stats.rooms++;
      } catch (err: any) {
        stats.errors.push(`Room ${r.room_no}: ${err.message}`);
      }
    }
    console.log(`  ✅ Created ${stats.rooms} rooms`);

    // ===== STEP 4: Create Guests =====
    console.log('  Step 4: Importing guests...');
    const customerIdMap: Record<number, string> = {};
    const guestStaysCount: Record<number, number> = {};
    const guestSpentCount: Record<number, number> = {};

    // First pass: count stays and spending per customer from bookings
    for (const b of BOOKINGS) {
      const custId = b[1];
      const total = Number(b[6]); // b[6] = total_price
      guestStaysCount[custId] = (guestStaysCount[custId] || 0) + 1;
      guestSpentCount[custId] = (guestSpentCount[custId] || 0) + total;
    }

    for (const c of CUSTOMERS) {
      try {
        const { firstName, lastName } = parseName(c.customer_name);
        const idType = ID_CARD_TYPES[c.id_card_type_id] || 'NIN';
        const phoneStr = String(c.contact_no);
        const isValidPhone = phoneStr.length >= 10;
        const isValidEmail = c.email.includes('@');

        // Determine loyalty tier based on stays
        const stays = guestStaysCount[c.customer_id] || 0;
        const spent = guestSpentCount[c.customer_id] || 0;
        let loyaltyTier = 'none';
        let loyaltyPoints = 0;
        if (stays >= 10) { loyaltyTier = 'platinum'; loyaltyPoints = 5000; }
        else if (stays >= 5) { loyaltyTier = 'gold'; loyaltyPoints = 2500; }
        else if (stays >= 3) { loyaltyTier = 'silver'; loyaltyPoints = 800; }

        const created = await db.guest.create({
          data: {
            firstName,
            lastName,
            email: isValidEmail ? c.email : null,
            phone: isValidPhone ? phoneStr : '0' + phoneStr,
            address: c.address !== 'NOT ASSIGN' && c.address !== 'NOT ASSIGN ' && c.address.length > 2 ? c.address : null,
            country: 'Nigeria',
            idType,
            idNumber: c.id_card_no && c.id_card_no !== 'DONOTHAVE1' && !c.id_card_no.startsWith('0000') ? c.id_card_no : null,
            loyaltyTier,
            loyaltyPoints,
            totalStays: stays,
            totalSpent: spent,
            createdAt: new Date(c.date_created),
          },
        });
        customerIdMap[c.customer_id] = created.id;
        stats.guests++;
      } catch (err: any) {
        stats.errors.push(`Guest ${c.customer_name}: ${err.message}`);
      }
    }
    console.log(`  ✅ Imported ${stats.guests} guests`);

    // ===== STEP 5: Create Reservations + Bills =====
    console.log('  Step 5: Importing reservations...');
    const roomTypePrices: Record<number, number> = {};
    for (const rt of ROOM_TYPES) {
      roomTypePrices[rt.room_type_id] = rt.price;
    }

    for (const b of BOOKINGS) {
      const [bookingId, custId, roomId, bookingDate, checkInStr, checkOutStr, totalPrice, discount, paymentStatus] = b;
      const guestId = customerIdMap[custId];
      const newRoomId = roomIdMap[roomId];

      if (!guestId || !newRoomId) {
        stats.errors.push(`Booking ${bookingId}: missing guest ${custId} or room ${roomId}`);
        continue;
      }

      try {
        const checkIn = parseDate(checkInStr);
        const checkOut = parseDate(checkOutStr);
        const room = ROOMS.find(r => r.room_id === roomId);
        const roomTypeId = room?.room_type_id;
        const roomRate = roomTypeId ? roomTypePrices[roomTypeId] || 30000 : 30000;
        const nights = calcNights(checkIn, checkOut);
        const discountAmount = Number(discount) || 0;
        const paidAmount = paymentStatus === 1 ? (Number(totalPrice) - discountAmount) : 0;

        // All old bookings are checked out (completed)
        const status = 'checked_out';

        const reservation = await db.reservation.create({
          data: {
            confirmationCode: generateConfirmationCode(),
            guestId,
            roomId: newRoomId,
            checkIn,
            checkOut,
            status,
            source: 'walk_in',
            adults: 1,
            roomRate,
            totalAmount: Number(totalPrice),
            paidAmount,
            notes: `Legacy booking #${bookingId}${discountAmount > 0 ? ` (Discount: ₦${discountAmount.toLocaleString()})` : ''}`,
            createdAt: new Date(bookingDate),
            checkedInAt: checkIn,
            checkedOutAt: checkOut,
          },
        });

        // Create a bill for the reservation
        await db.bill.create({
          data: {
            reservationId: reservation.id,
            guestId,
            roomCharges: Number(totalPrice),
            discountAmount,
            totalAmount: Number(totalPrice),
            paidAmount,
            balanceAmount: 0,
            status: paymentStatus === 1 ? 'paid' : 'open',
            paymentMethod: 'cash',
            paidAt: paymentStatus === 1 ? checkOut : null,
          },
        });

        stats.reservations++;
      } catch (err: any) {
        stats.errors.push(`Booking ${bookingId}: ${err.message}`);
      }
    }
    console.log(`  ✅ Imported ${stats.reservations} reservations with bills`);

    // ===== STEP 6: Import Complaints as Guest Feedback =====
    console.log('  Step 6: Importing complaints...');
    for (const c of COMPLAINTS) {
      try {
        const { firstName, lastName } = parseName(c.complainant_name);
        // Create a guest record for the complainant if not exists
        let guest = await db.guest.findFirst({
          where: {
            AND: [
              { firstName: { equals: firstName } },
              { lastName: { equals: lastName } },
            ],
          },
        });

        if (!guest) {
          guest = await db.guest.create({
            data: {
              firstName,
              lastName,
              phone: '0000000000',
              country: 'Nigeria',
              createdAt: new Date(c.created_at),
            },
          });
          stats.guests++;
        }

        // Map complaint type to category
        const categoryMap: Record<string, string> = {
          'Room Windows': 'room',
          'Air Conditioner': 'room',
          'Bad Smells': 'cleanliness',
          'Faulty Electronics': 'amenities',
        };

        await db.guestFeedback.create({
          data: {
            guestId: guest.id,
            category: categoryMap[c.complaint_type] || 'other',
            comment: c.complaint,
            rating: 2,
            isResolved: c.resolve_status === 1,
            createdAt: new Date(c.created_at),
          },
        });
        stats.feedbacks++;
      } catch (err: any) {
        stats.errors.push(`Complaint ${c.id}: ${err.message}`);
      }
    }
    console.log(`  ✅ Imported ${stats.feedbacks} complaints as feedback`);

    // ===== STEP 7: Import Staff =====
    console.log('  Step 7: Importing staff...');
    for (const s of STAFF) {
      try {
        const { firstName, lastName } = parseName(s.emp_name);
        const position = STAFF_TYPES[s.staff_type_id] || 'Staff';
        const shift = SHIFTS[s.shift_id];

        // Create User account for staff
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@royalloft.com`.replace(/\s/g, '');
        const hashedPassword = await hashPassword('Staff@123');

        const user = await db.user.create({
          data: {
            email,
            password: hashedPassword,
            name: s.emp_name,
            role: 'staff',
            department: position.toLowerCase().replace(/\s+/g, '_'),
            phone: String(s.contact_no),
            isActive: true,
          },
        });

        // Create StaffProfile
        await db.staffProfile.create({
          data: {
            userId: user.id,
            employeeId: `EMP-${String(s.emp_id).padStart(4, '0')}`,
            department: position.toLowerCase().replace(/\s+/g, '_'),
            position,
            baseSalary: Number(s.salary),
            startDate: new Date(s.joining_date),
            status: 'active',
            address: s.address,
          },
        });

        stats.staff++;
        stats.users++;
      } catch (err: any) {
        stats.errors.push(`Staff ${s.emp_name}: ${err.message}`);
      }
    }
    console.log(`  ✅ Imported ${stats.staff} staff members`);

    // ===== STEP 8: Create Developer user if not exists =====
    console.log('  Step 8: Ensuring developer user exists...');
    const devExists = await db.user.findUnique({ where: { email: 'developer@royalloft.com' } });
    if (!devExists) {
      const devHash = await hashPassword('Dev@12345');
      await db.user.create({
        data: {
          email: 'developer@royalloft.com',
          password: devHash,
          name: 'System Developer',
          role: 'developer',
          department: 'management',
          isActive: true,
        },
      });
      console.log('  ✅ Developer user created');
    }

    // ===== Update room statuses for latest active bookings =====
    console.log('  Step 9: Updating room statuses...');
    // Find rooms with bookings that haven't been checked out yet (recent dates)
    // For now, all rooms are set to available since all legacy bookings are completed
    await db.room.updateMany({
      where: { status: { not: 'out_of_service' } },
      data: { status: 'available' },
    });
    console.log('  ✅ Room statuses updated');

    const errorCount = stats.errors.length;
    console.log(`\n🎉 Migration complete!`);
    console.log(`  Room Types: ${stats.roomTypes}`);
    console.log(`  Rooms: ${stats.rooms}`);
    console.log(`  Guests: ${stats.guests}`);
    console.log(`  Reservations: ${stats.reservations}`);
    console.log(`  Feedbacks: ${stats.feedbacks}`);
    console.log(`  Staff: ${stats.staff}`);
    console.log(`  Errors: ${errorCount}`);
    if (errorCount > 0) {
      console.log('  Error details:', stats.errors);
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully!',
      stats: {
        roomTypes: stats.roomTypes,
        rooms: stats.rooms,
        guests: stats.guests,
        reservations: stats.reservations,
        feedbacks: stats.feedbacks,
        staff: stats.staff,
        users: stats.users,
        errors: stats.errors,
      },
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Legacy Data Migration API',
    instructions: 'POST with { secret: "royalloft-migrate-2026" } to run migration',
    dataSummary: {
      roomTypes: ROOM_TYPES.length,
      rooms: ROOMS.length,
      customers: CUSTOMERS.length,
      bookings: BOOKINGS.length,
      complaints: COMPLAINTS.length,
      staff: STAFF.length,
    },
  });
}
