const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const db = new PrismaClient();

// ============ DATA ============
const ROOM_TYPES = [
  { id: 23, name: 'Executive Suite', price: 65000, max: 3 },
  { id: 24, name: 'Executive', price: 50000, max: 2 },
  { id: 25, name: 'Deluxe', price: 40000, max: 2 },
  { id: 26, name: 'Standard', price: 30000, max: 2 },
];

const ROOMS = [
  [47,23,'RM-010',0,0],[48,23,'RM-016',0,0],[51,25,'RM-007',0,0],[52,26,'RM-002',0,0],
  [53,26,'RM-004',0,0],[54,26,'RM-005',0,0],[55,25,'RM-006',null,1],[56,24,'RM-008',0,0],
  [57,24,'RM-009',0,0],[58,23,'RM-011',null,1],[59,24,'RM-012',0,0],[60,24,'RM-013',0,0],
  [61,24,'RM-014',0,0],[62,24,'RM-015',0,0],[63,24,'RM-011B',0,0],[64,26,'RM-006B',0,0],
  [66,25,'RM-003',0,0],[67,26,'RM-001',0,0]
];

const ID_CARD_TYPES = { 1:'National Identity Card', 2:'Voters Card', 3:'NIN', 4:'Driving License' };

const CUSTOMERS = [
  [20,"THE REFINER EVENT",91221932716,"default@gmail.com",3,"0000000000000","NOT ASSIGN","2025-12-11 17:27:53"],
  [21,"THE REFINER EVENT",91221932716,"default@gmail.com",3,"00000000000000000","NOT ASSIGN","2025-12-11 17:29:08"],
  [22,"THE REFINER EVENT",91221932716,"default@gmail.com",3,"00000000000000","NOT ASSIGN","2025-12-11 17:29:36"],
  [23,"THE REFINER EVENT",91221932716,"default@gmail.com",3,"000000000000000","NOT ASSIGN","2025-12-11 17:30:03"],
  [24,"THE REFINER EVENT",91221932716,"default@gmail.com",3,"0000000000000","NOT ASSIGN","2025-12-11 17:30:34"],
  [25,"THE REFINER EVENT",91221932716,"default@gmail.com",3,"0000000000000000","NOT ASSIGN","2025-12-11 17:30:58"],
  [26,"THE REFINER EVENT",91221932716,"default@gmail.com",3,"00000000000000000000","NOT ASSIGN","2025-12-11 17:31:29"],
  [27,"THE REFINER EVENT",91221932716,"default@gmail.com",3,"00000000000000000000","NOT ASSIGN","2025-12-11 17:32:08"],
  [28,"THE REFINER EVENT",91221932716,"default@gmail.com",3,"00000000000000000000","NOT ASSIGN","2025-12-11 17:32:33"],
  [29,"THE REFINER EVENT",91221932716,"default@gmail.com",3,"00000000000000000000","NOT ASSIGN","2025-12-11 17:33:26"],
  [30,"THE REFINER EVENT",91221932716,"default@gmail.com",3,"00000000000000000000","NOT ASSIGN","2025-12-11 17:34:08"],
  [31,"THE REFINER EVENT",91221932716,"default@gmail.com",3,"00000000000000000000","NOT ASSIGN","2025-12-11 17:35:20"],
  [32,"THE REFINER EVENT",91221932716,"default@gmail.com",3,"00000000000000000000","NOT ASSIGN","2025-12-11 17:37:36"],
  [33,"THE REFINER EVENT",9122193276,"default@gmail.com",3,"00000000000000000000","NOT ASSIGN","2025-12-12 20:33:35"],
  [34,"Adetutu Liadi",8033838515,"default@gmail",3,"DONOTHAVE1","JDP IJEBU ODE","2025-12-14 18:47:30"],
  [36,"ADEKUNLE BEN",7055367217,"defalt@gmail.com",3,"DONOTHAVE1","JDP IJEBU ODE","2025-12-14 18:54:39"],
  [37,"ALADESHUWA AKIN",7087959090,"default@gmail",3,"DONOTHAVE1","JDP IJEBU ODE","2025-12-14 18:58:56"],
  [38,"THE REFINER EVENT",9122193276,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2025-12-17 11:12:44"],
  [39,"ODEYEMI REMILEKUN",8106963535,"default@gmail.com",3,"00000000000000000000","NOT ASSIGN","2025-12-17 13:26:13"],
  [40,"FREEMAN TUNDE",8054646706,"default@gmail.com",3,"00000000000000000000","NOT ASSIGN","2025-12-17 13:32:15"],
  [41,"OLALIN HAMMED",9071678191,"default@gmail.com",3,"00000000000000000000","NOT ASSIGN","2025-12-17 13:43:03"],
  [42,"ALABI OLUWASEYI",8162230998,"oluwaseyi2000@yahoo.com",3,"DONOTHAVE1","BLOCK 42 FLAT 1 ABESAN HOUSING ESTATE IPAJA LAGOS","2025-12-17 13:49:37"],
  [43,"AWE OLASUNKANMI",7039371251,"awesunkanmi71@yahoo.com",3,"DONOTHAVE1","NOT ASSIGN","2025-12-17 13:56:03"],
  [44,"AKUIWU PASCAL",7032308696,"default@gmail.com",3,"00000000000000000000","NOT ASSIGN","2025-12-17 13:58:41"],
  [45,"KELECHI NDUKWE",8062431446,"default@gmail.com",3,"DONOTHAVE1","ILESHA","2025-12-17 14:01:26"],
  [46,"ADERINTO ADETOYOSE",8026149740,"hhardeytoyese@gmail.com",3,"DONOTHAVE1","LEKKI LAGOS STATE","2025-12-17 14:07:22"],
  [47,"ADERINTO ADETOYOSE",8171880668,"hhardeytoyese@gmail.com",3,"DONOTHAVE1","LEKKI LAGOS STATE","2025-12-17 14:20:43"],
  [48,"OMOTOSHO SANMI",810500751,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2025-12-17 14:24:14"],
  [49,"ADEFUYE KAYODE",7033249174,"adefuye1@yahoo.com",3,"DONOTHAVE1","NOT ASSIGN","2025-12-17 14:27:29"],
  [50,"OLASENI ABAYOMI",8033539662,"olaseni@gmail.com",3,"DONOTHAVE1","PLOT 37 SHAGARI ESTATE AKURE","2025-12-17 14:32:45"],
  [51,"UMEH DANIEL",7059962543,"default@gmail",3,"DONOTHAVE1","NOT ASSIGN","2025-12-17 14:36:20"],
  [52,"ASANI FUNMILOLA",8130493858,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2025-12-17 14:39:11"],
  [53,"AJIBAWO OLAJIDE",8139358527,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2025-12-17 14:41:55"],
  [54,"AKINBOBOSE AYOAKIN",8036862982,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2025-12-17 14:48:25"],
  [55,"OYEDIBU ENOCH",8100272514,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2025-12-17 14:55:59"],
  [56,"ALAKE TUNBOSUN",8180445694,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2025-12-17 15:00:38"],
  [57,"ADETOKUNBO ADESIN",8139627315,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2025-12-17 15:03:37"],
  [58,"UBECHI JOY",8028524016,"default@gmail.com",3,"DONOTHAVE1","AJAH LAGOS","2025-12-17 15:07:23"],
  [59,"OHIREMEN OHIS",8180187466,"ohisb120@gmail.com",3,"DONOTHAVE1","LAGOS","2025-12-17 15:10:18"],
  [60,"EZOMOH JUDE",8080801180,"default@gmail.com",3,"DONOTHAVE1","30 OBANIKORO STREET","2025-12-17 15:20:33"],
  [61,"SIMEON KEKERE",8023019882,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2025-12-17 15:23:57"],
  [62,"SEKOMI TUNDE",8036520909,"default@gmail.com",3,"DONOTHAVE1","EBUTE METTA LAGOS","2025-12-17 15:25:53"],
  [63,"EZOMOH TUNDE",8080801180,"default@gmail.com",3,"DONOTHAVE1","3","2025-12-17 15:30:46"],
  [64,"SIMEON KEKERE",8023019882,"default@gmail.com",3,"00000000000000000000","NOT ASSIGN","2025-12-17 15:34:36"],
  [65,"OLATUN SEUN",7087511301,"default@gmail.com",3,"DONOTHAVE1","OLUBI STREET OYO","2025-12-17 15:51:27"],
  [66,"FEHINTOLA SULE",8038116276,"default@gmail.com",3,"DONOTHAVE1","VICTORIA ISLAND LAGOS","2025-12-17 15:58:16"],
  [67,"AYOMIDE VICTOR",907035647567,"default@gmail.com",3,"00000000000000000000","NOT ASSIGN","2025-12-17 16:11:18"],
  [68,"ADELABU ADEWALE",8035792353,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2025-12-17 16:16:13"],
  [69,"FADAUNSI OLANREWAJU",8052979036,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2025-12-17 16:27:11"],
  [70,"OJO AJIBOLA",8037003010,"ojoAjibola455@gmail.com",3,"DONOTHAVE1","OKEOMIRU ILESHA","2025-12-17 16:31:10"],
  [71,"ISHOLA MAGRET",8037003080,"default@gmail.com",3,"DONOTHAVE1","OKEOMIRU ILESHA","2025-12-17 16:34:50"],
  [72,"ADENIYI SAMUEL",8034734060,"default@gmail.com",3,"DONOTHAVE1","NO 4 GABRIEL AKINOLA CLOSE P&T IPAYA LAGOS","2025-12-17 16:40:08"],
  [73,"AFOLABI OLANIYI",8110000841,"default@gmail.com",3,"DONOTHAVE1","OPP 3rd extension NTA ado ekiti","2025-12-19 18:26:29"],
  [74,"IZEFAEGBE FRANK",8033882995,"frankzeffy@gmail.com",3,"DONOTHAVE1","PLOT 7/9 LAYOUT ABUJA","2025-12-21 22:03:29"],
  [75,"BASHIR IBRAHIM",8033882995,"frankzeffy@gmail.com",3,"DONOTHAVE1","PLOT 7/9 IDU LAD.LAYOUT ABUJA","2025-12-21 22:09:01"],
  [76,"OYEBAMIJI ADEWALE",8132522968,"default@gmail.com",3,"DONOTHAVE1","ADEBAYO ABON NO 1","2025-12-23 18:24:58"],
  [77,"IKPE DANIEL",8065368885,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2025-12-23 18:37:17"],
  [78,"SAMOND DARE",7084532737,"default@gmail.com",3,"DONOTHAVE1","AKABAI STREET LAGOS","2025-12-23 18:42:55"],
  [79,"OMOBOLANLE SAMUEL",8147858288,"default@gmail.com",3,"DONOTHAVE1","IBADAN","2025-12-26 22:49:06"],
  [80,"ALALU DARE",8060403363,"default@gmail.com",3,"DONOTHAVE1","IBADAN","2025-12-26 22:52:48"],
  [81,"OLADEHINDE MICHAEL",7047832319,"default@gmail.com",3,"DONOTHAVE1","SANGO OTA OGUN STATE","2025-12-26 22:56:59"],
  [82,"KOMOLAFE AYODEJI",8100120130,"default@gmail.com",3,"DONOTHAVE1","FADAHUNSI IMO ILESA OSUN STATE","2025-12-28 06:26:06"],
  [83,"AHMED OMOTOLA",9065448283,"default@gmail.com",3,"DONOTHAVE1","OMI ASORO ILESHA","2025-12-28 22:29:21"],
  [84,"AFOLABI OLANIYI",81100,"default@gmail.com",3,"DONOTHAVE1","OPP 3RD EXTENTION GATE NTA ADO EKITI","2025-12-30 19:58:29"],
  [85,"LUKERA DAVID",8169001110,"default@gmail.com",3,"DONOTHAVE1","NO 27 KUBWA ABUJA","2026-01-05 19:59:14"],
  [86,"FAKOYA BABATUNDE",9134324355,"default@gmail.com",3,"DONOTHAVE1","LAGOS","2026-01-05 20:01:25"],
  [87,"KOMOLAFE OLAYEMI",8053319086,"default@gmail.com",3,"DONOTHAVE1","IMO ILESHA","2026-01-10 16:21:08"],
  [88,"ADEYEMO ADEKUNLE",8031160725,"default@gmail.com",3,"DONOTHAVE1","IMO ILESHA","2026-01-10 16:24:01"],
  [89,"ABUBAKIR SODIQ",8088103916,"default@gmail.com",3,"DONOTHAVE1","ABUJA","2026-01-10 19:51:37"],
  [90,"SEKETI ADEBOWALE",7030992863,"default@gmail.com",3,"DONOTHAVE1","MOGAJI HOME AULE AKURE","2026-01-14 16:04:56"],
  [91,"ABUBAKAR SODIQ",8088103916,"default@gmail.com",3,"DONOTHAVE1","ABUJA","2026-01-14 16:07:59"],
  [92,"ALIMI ABDULLAHI",8036520909,"default@gmail.com",3,"DONOTHAVE1","AJIBOYE ROYAL CAMP OSUN STATE","2026-01-14 16:12:38"],
  [93,"OLUCHI JOY",9133462114,"default@gmail.com",3,"DONOTHAVE1","N","2026-01-16 13:37:12"],
  [94,"KOMOLAFE OLAYEMI",7056480888,"default@gmail.com",3,"DONOTHAVE1","INTERNATIONAL BREWERIES","2026-01-19 11:25:13"],
  [95,"AWONIYI SUNDAY",8136764181,"default@gmail.com",3,"DONOTHAVE1","OGUN STATE NO 14 GBENGA STREET","2026-01-23 13:12:52"],
  [96,"ISMAIL LATEEF",8047273031,"default@gmail.com",3,"DONOTHAVE1","AJEGUNLE ISE EKITI","2026-01-23 13:21:52"],
  [97,"BABATUNDE ALIYU",8033743459,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2026-01-24 18:16:49"],
  [98,"OGUNNIYI TAIWO",8036187684,"default@gmail.com",3,"DONOTHAVE1","LAGOS","2026-02-01 15:11:30"],
  [99,"ADAMU ABBA",8063230588,"default@gmail.com",3,"DONOTHAVE1","APAPA LAGOS","2026-02-08 18:12:02"],
  [100,"POPOOLA ABDULJELIL",7037264803,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2026-02-08 18:23:23"],
  [101,"BELLO FAITIA",9128209859,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2026-02-08 18:26:03"],
  [102,"ADEWUMI DUPE",7011084797,"default@gmail.com",3,"DONOTHAVE1","LAGOS","2026-02-08 18:29:46"],
  [103,"WILLIAMS KEHINDE",8086028594,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2026-02-08 18:31:53"],
  [104,"ADEWUMI DUPE",7011847974,"default@gmail.com",3,"DONOTHAVE1","LAGOS","2026-02-08 18:35:47"],
  [105,"POPOOLA ABDULJELIL",7037264803,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2026-02-15 17:23:12"],
  [106,"AKINOLA SUNDAY",8023636020,"ayeoyenikan90w@gmail.com",3,"DONOTHAVE1","OJOTA LAGOS","2026-02-15 17:31:25"],
  [107,"JOHN SUNDAY",9122193276,"default@gmail.com",3,"DONOTHAVE1","KAJOLA STREET IMO ILESHA","2026-02-15 17:34:36"],
  [108,"ABDULLAHI YUNUSA",9164542480,"default@gmail.com",3,"DONOTHAVE1","OLUFEMI STREET","2026-02-15 17:40:53"],
  [109,"OLUCHUKWU VINCENT",8066185052,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2026-02-18 16:00:43"],
  [110,"OLUCHUKWU VINCENT",8066185052,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2026-02-18 16:04:49"],
  [111,"OLADIPO OLUWASEUN",8134786492,"default@gmail.com",3,"DONOTHAVE1","ABEOKUTA","2026-02-20 14:53:14"],
  [112,"ADIGUN LEMON",8165031677,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2026-03-01 16:58:19"],
  [113,"MICHAEL GOODNESS",8057733374,"default@gmail.com",3,"DONOTHAVE1","IBADAN","2026-03-01 17:00:32"],
  [114,"SUNDAY SAMUEL",8052979036,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2026-03-01 17:02:37"],
  [115,"IGBALAJOBI SUNDAY",8160731034,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2026-03-08 17:01:47"],
  [116,"BAYONLE SAMSON",8131662636,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2026-03-08 17:11:30"],
  [117,"OJO TEMITAYO",8027359334,"default@gmail.com",3,"DONOTHAVE1","LUCAS STREET OBAWOLE LAGOS","2026-03-13 12:50:37"],
  [118,"ISAIAH EJOH",8107390395,"default@gmail.com",2,"DONOTHAVE1","NOT ASSIGN","2026-03-13 12:52:23"],
  [119,"ADELEKE OLARENWAJU",9036843606,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2026-03-18 17:39:53"],
  [120,"ADAURA MUHAMMED",8143758894,"default@gmail.com",3,"DONOTHAVE1","ABUJA","2026-03-19 16:35:22"],
  [121,"AKANDE IYANUOLUWA",8133416780,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2026-03-19 16:38:01"],
  [122,"AKANDE IYANUOLUWA",8133416783,"default@gmail.com",3,"DONOTHAVE1","IJAMO IKORODU","2026-03-28 15:50:14"],
  [123,"JOHN SUNDAY",7042888741,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2026-03-28 15:53:10"],
  [124,"JAMES UGBEDE",8030685778,"default@gmail.com",3,"DONOTHAVE1","ABUJA","2026-03-28 15:56:08"],
  [125,"OLUWASEUN MOSES",8051840497,"default@gmail.com",3,"DONOTHAVE1","NOT ASSIGN","2026-03-28 16:00:21"],
  [126,"AKEEM LAMIDI",8154300122,"default@gmail.com",3,"DONOTHAVE1","ILESHA","2026-03-28 16:02:35"],
  [127,"AJAYI SHEGUN",7048773475,"default@gmail.com",3,"DONOTHAVE1","BREWERIES EXPRESS","2026-03-30 17:50:25"],
  [128,"ADENIYI ADEDAYO",8037642692,"default@gmail.com",3,"DONOTHAVE1","NO 13 OKUNBOR STREET BENIN","2026-04-13 17:54:28"],
  [129,"OYENIYI OMOBUKOLA",8136616280,"default@gmail.com",3,"DONOTHAVE1","OMI ASORO ILESHA","2026-04-13 17:57:41"],
  [130,"OLAFARE ABIOLA",8098313712,"default@gmail.com",3,"DONOTHAVE1","RING ROAD IBADAN","2026-04-13 18:01:47"],
  [131,"ONI REINHORD",8123401005,"default@gmail.com",3,"DONOTHAVE1","ILE IFE","2026-04-14 12:41:45"],
  [132,"ONI REINHORD",8123401005,"default@gmail.com",3,"DONOTHAVE1","ILE IFE","2026-04-14 12:43:57"],
];

const BOOKINGS = [
  [19,20,52,"2025-12-11 17:27:53","12-12-2025","13-12-2025",60000,0,1],
  [20,21,53,"2025-12-11 17:29:08","12-12-2025","13-12-2025",60000,0,1],
  [21,22,54,"2025-12-11 17:29:36","12-12-2025","13-12-2025",60000,0,1],
  [22,23,64,"2025-12-11 17:30:03","12-12-2025","13-12-2025",60000,0,1],
  [23,24,56,"2025-12-11 17:30:34","12-12-2025","13-12-2025",100000,0,1],
  [24,25,57,"2025-12-11 17:30:58","12-12-2025","13-12-2025",100000,0,1],
  [25,26,47,"2025-12-11 17:31:29","12-12-2025","13-12-2025",130000,0,1],
  [26,27,63,"2025-12-11 17:32:08","12-12-2025","13-12-2025",100000,0,1],
  [27,28,59,"2025-12-11 17:32:33","12-12-2025","13-12-2025",100000,0,1],
  [28,29,60,"2025-12-11 17:33:26","12-12-2025","13-12-2025",100000,0,1],
  [29,30,61,"2025-12-11 17:34:08","12-12-2025","13-12-2025",100000,0,1],
  [30,31,62,"2025-12-11 17:35:20","12-12-2025","13-12-2025",100000,0,1],
  [31,32,48,"2025-12-11 17:37:36","12-12-2025","13-12-2025",130000,0,1],
  [34,33,66,"2025-12-12 20:56:16","12-12-2025","14-12-2025",80000,0,1],
  [35,33,51,"2025-12-12 20:57:23","12-12-2025","14-12-2025",80000,0,1],
  [36,34,53,"2025-12-14 18:47:30","14-12-2025","15-12-2025",30000,10000,1],
  [37,36,54,"2025-12-14 18:54:39","14-12-2025","16-12-2025",60000,20000,1],
  [38,37,64,"2025-12-14 18:58:56","14-12-2025","16-12-2025",60000,20000,1],
  [39,38,48,"2025-12-12 11:12:44","2025-12-12","2025-12-14",100000,30000,1],
  [40,39,67,"2025-12-17 13:26:13","2025-12-16","2025-12-17",15000,15000,1],
  [41,40,67,"2025-12-17 13:32:15","2025-10-21","2025-10-22",15000,15000,1],
  [42,40,47,"2025-12-17 13:36:38","2025-10-25","2025-10-26",50000,15000,1],
  [43,40,48,"2025-12-17 13:38:27","2025-10-25","2025-10-26",40000,25000,1],
  [44,41,67,"2025-12-17 13:43:03","2025-10-27","2025-10-28",20000,10000,1],
  [45,42,52,"2025-12-17 13:49:37","2025-10-28","2025-10-30",40000,20000,1],
  [46,43,66,"2025-12-17 13:56:03","2025-10-31","2025-11-01",20000,20000,1],
  [47,44,51,"2025-12-17 13:58:41","2025-10-31","2025-11-01",20000,20000,1],
  [48,45,52,"2025-12-17 14:01:26","2025-10-31","2025-11-01",20000,10000,1],
  [49,45,67,"2025-12-17 14:03:29","2025-10-31","2025-11-01",20000,10000,1],
  [50,46,47,"2025-12-17 14:07:22","2025-10-31","2025-11-01",50000,15000,1],
  [51,47,47,"2025-12-17 14:20:43","2025-11-01","2025-11-02",50000,15000,1],
  [52,48,52,"2025-12-17 14:24:14","2025-11-04","2025-11-05",20000,10000,1],
  [53,49,66,"2025-12-17 14:27:29","2025-11-07","2025-11-08",20000,20000,1],
  [54,50,52,"2025-12-17 14:32:45","2025-11-07","2025-11-08",20000,10000,1],
  [55,51,51,"2025-12-17 14:36:20","2025-11-08","2025-11-09",20000,20000,1],
  [56,52,66,"2025-12-17 14:39:11","2025-11-08","2025-11-09",20000,20000,1],
  [57,53,53,"2025-12-17 14:41:55","2025-11-08","2025-11-09",20000,10000,1],
  [58,54,66,"2025-12-17 14:48:25","2025-11-11","2025-11-12",25000,15000,1],
  [59,55,52,"2025-12-17 14:55:59","2025-11-09","2025-11-10",20000,10000,1],
  [60,56,63,"2025-12-17 15:00:38","2025-11-13","2025-11-14",50000,0,1],
  [61,57,67,"2025-12-17 15:03:37","2025-11-13","2025-11-16",90000,0,1],
  [62,58,52,"2025-12-17 15:07:23","2025-11-13","2025-11-16",90000,30000,1],
  [63,59,66,"2025-12-17 15:10:18","2025-11-13","2025-11-16",90000,30000,1],
  [64,60,48,"2025-12-17 15:20:33","2025-11-14","2025-11-15",50000,15000,1],
  [65,61,51,"2025-12-17 15:23:57","2025-11-14","2025-11-15",30000,10000,1],
  [66,62,56,"2025-12-17 15:25:53","2025-11-14","2025-11-15",50000,0,1],
  [67,63,57,"2025-12-17 15:30:46","2025-11-14","2025-11-15",50000,0,1],
  [68,60,63,"2025-12-17 15:32:49","2025-11-14","2025-11-15",50000,0,1],
  [69,64,53,"2025-12-17 15:34:36","2025-11-14","2025-11-15",30000,0,1],
  [70,62,47,"2025-12-17 15:37:10","2025-11-14","2025-11-15",65000,0,1],
  [71,62,64,"2025-12-17 15:46:50","2025-11-14","2025-11-15",30000,0,1],
  [72,65,60,"2025-12-17 15:51:27","2025-11-15","2025-11-16",50000,0,1],
  [73,66,51,"2025-12-17 15:58:16","2025-11-15","2025-11-16",30000,10000,1],
  [74,67,52,"2025-12-17 16:11:18","2025-11-19","2025-11-20",20000,10000,1],
  [75,68,66,"2025-12-17 16:16:13","2025-11-19","2025-11-20",30000,10000,1],
  [76,69,51,"2025-12-17 16:27:11","2025-11-21","2025-11-22",30000,10000,1],
  [77,70,52,"2025-12-17 16:31:10","2025-11-21","2025-11-23",60000,0,1],
  [78,71,66,"2025-12-17 16:34:50","2025-11-21","2025-11-22",30000,10000,1],
  [79,72,64,"2025-12-17 16:40:08","2025-11-27","2025-11-28",30000,0,1],
  [81,73,67,"2025-12-19 18:28:52","2025-12-18","2025-12-19",20000,10000,1],
  [82,74,64,"2025-12-21 22:03:29","2025-12-20","2025-12-21",20000,10000,1],
  [83,75,53,"2025-12-21 22:09:01","2025-12-20","2025-12-21",20000,10000,1],
  [84,76,66,"2025-12-23 18:24:58","2025-12-22","2025-12-23",25000,15000,1],
  [85,77,52,"2025-12-23 18:37:17","2025-12-22","2025-12-23",20000,10000,1],
  [86,78,51,"2025-12-23 18:42:55","2025-12-22","2025-12-23",25000,15000,1],
  [87,79,67,"2025-12-26 22:49:06","2025-12-24","2025-12-25",20000,10000,1],
  [88,80,64,"2025-12-26 22:52:48","2025-12-24","2025-12-25",20000,10000,1],
  [89,81,54,"2025-12-26 22:56:59","2025-12-23","2025-12-24",20000,10000,1],
  [90,82,64,"2025-12-28 06:26:06","2025-12-27","2025-12-29",40000,20000,1],
  [91,83,54,"2025-12-28 22:29:21","2025-12-28","2025-12-29",20000,10000,1],
  [92,83,54,"2025-12-29 18:21:49","2025-12-29","2025-12-30",20000,10000,1],
  [93,84,52,"2025-12-30 19:58:29","2025-12-29","2025-12-30",20000,10000,1],
  [94,83,54,"2025-12-30 20:00:52","2025-12-30","2025-12-31",20000,10000,1],
  [95,85,67,"2026-01-05 19:59:14","2026-01-04","2026-01-05",20000,10000,1],
  [96,86,52,"2026-01-05 20:01:25","2026-01-04","2026-01-05",20000,10000,1],
  [97,82,64,"2026-01-07 07:10:01","2026-01-05","2026-01-06",20000,10000,1],
  [98,86,52,"2026-01-07 07:14:20","2026-01-06","2026-01-07",20000,10000,1],
  [100,87,53,"2026-01-10 16:21:08","2026-01-07","2026-01-08",20000,10000,1],
  [101,88,67,"2026-01-10 16:24:01","2026-01-08","2026-01-09",20000,10000,1],
  [102,36,66,"2025-12-03 17:59:22","2025-12-03","2025-12-04",25000,15000,1],
  [103,73,67,"2025-12-08 18:20:11","2025-12-08","2025-12-09",20000,10000,1],
  [104,79,66,"2025-12-08 18:22:21","2025-12-08","2025-12-09",20000,20000,1],
  [105,89,53,"2026-01-10 19:51:37","2026-01-10","2026-01-11",20000,10000,1],
  [106,90,54,"2026-01-14 16:04:56","2026-01-10","2026-01-11",20000,10000,1],
  [107,91,53,"2026-01-14 16:07:59","2026-01-11","2026-01-14",60000,30000,1],
  [108,92,64,"2026-01-14 16:12:38","2026-01-13","2026-01-14",20000,10000,1],
  [109,93,67,"2026-01-16 13:37:12","2026-01-15","2026-01-16",20000,10000,1],
  [110,73,52,"2026-01-16 13:39:20","2026-01-15","2026-01-16",20000,10000,1],
  [111,94,52,"2026-01-19 11:25:13","2026-01-18","2026-01-19",20000,10000,1],
  [112,95,64,"2026-01-23 13:12:52","2026-01-19","2026-01-20",20000,10000,1],
  [113,96,67,"2026-01-23 13:21:52","2026-01-21","2026-01-22",20000,10000,1],
  [114,97,52,"2026-01-24 18:16:49","2026-01-22","2026-01-24",40000,20000,1],
  [115,97,48,"2026-01-24 18:19:48","2026-01-22","2026-01-24",90000,40000,1],
  [116,97,48,"2026-01-26 15:32:23","2026-01-24","2026-01-25",50000,15000,1],
  [117,98,53,"2026-02-01 15:11:30","2026-01-30","2026-01-31",20000,10000,1],
  [118,99,52,"2026-02-08 18:12:02","2026-02-02","2026-02-03",20000,10000,1],
  [119,99,53,"2026-02-08 18:14:13","2026-02-04","2026-02-05",20000,10000,1],
  [120,100,64,"2026-02-08 18:23:23","2026-02-06","2026-02-08",40000,20000,1],
  [121,101,52,"2026-02-08 18:26:03","2026-02-06","2026-02-07",20000,10000,1],
  [122,101,66,"2026-02-08 18:27:35","2026-02-06","2026-02-07",25000,15000,1],
  [123,102,53,"2026-02-08 18:29:46","2026-02-06","2026-02-07",20000,10000,1],
  [124,103,51,"2026-02-08 18:31:53","2026-02-06","2026-02-07",25000,15000,1],
  [125,104,47,"2026-02-08 18:35:47","2026-02-06","2026-02-08",100000,30000,1],
  [126,99,54,"2026-02-08 18:37:40","2026-02-06","2026-02-07",20000,10000,1],
  [127,104,47,"2026-02-15 17:17:17","2026-02-07","2026-02-08",50000,15000,1],
  [128,105,64,"2026-02-15 17:23:12","2026-02-07","2026-02-08",20000,10000,1],
  [129,89,54,"2026-02-15 17:26:34","2026-02-10","2026-02-11",20000,10000,1],
  [130,106,52,"2026-02-15 17:31:25","2026-02-13","2026-02-14",20000,10000,1],
  [131,107,52,"2026-02-15 17:34:36","2026-02-14","2026-02-15",20000,10000,1],
  [132,108,64,"2026-02-15 17:40:53","2026-02-14","2026-02-15",20000,10000,1],
  [134,110,64,"2026-02-18 16:04:49","2026-02-15","2026-02-19",80000,40000,1],
  [136,91,54,"2026-02-18 16:17:41","2026-02-18","2026-02-19",20000,10000,1],
  [137,111,52,"2026-02-20 14:53:14","2026-02-19","2026-02-20",20000,10000,1],
  [138,112,52,"2026-03-01 16:58:19","2026-02-28","2026-03-01",20000,10000,1],
  [139,113,53,"2026-03-01 17:00:32","2026-02-28","2026-03-01",20000,10000,1],
  [141,114,51,"2026-03-04 14:40:05","2026-02-28","2026-03-01",25000,15000,1],
  [142,114,51,"2026-03-04 14:45:27","2026-03-01","2026-03-03",50000,30000,1],
  [143,114,51,"2026-03-06 16:43:18","2026-03-04","2026-03-05",25000,15000,1],
  [144,115,52,"2026-03-08 17:01:47","2026-03-07","2026-03-08",20000,10000,1],
  [145,113,66,"2026-03-08 17:05:54","2026-03-07","2026-03-08",25000,15000,1],
  [146,83,54,"2026-03-08 17:08:18","2026-03-07","2026-03-08",20000,10000,1],
  [147,116,64,"2026-03-08 17:11:30","2026-03-07","2026-03-08",20000,10000,1],
  [148,117,51,"2026-03-13 12:50:37","2026-03-10","2026-03-11",25000,15000,1],
  [149,118,64,"2026-03-13 12:52:23","2026-03-12","2026-03-13",20000,10000,1],
  [150,119,52,"2026-03-18 17:39:53","2026-03-14","2026-03-15",20000,10000,1],
  [151,119,53,"2026-03-18 17:41:38","2026-03-14","2026-03-15",20000,10000,1],
  [152,120,67,"2026-03-19 16:35:22","2026-03-18","2026-03-19",20000,10000,1],
  [153,121,64,"2026-03-19 16:38:01","2026-03-18","2026-03-19",20000,10000,1],
  [154,73,52,"2026-03-19 16:44:41","2026-03-18","2026-03-20",40000,20000,1],
  [155,122,53,"2026-03-28 15:50:14","2026-03-19","2026-03-20",20000,10000,1],
  [156,123,52,"2026-03-28 15:53:10","2026-03-21","2026-03-22",20000,10000,1],
  [157,124,64,"2026-03-28 15:56:08","2026-03-25","2026-03-26",20000,10000,1],
  [158,125,66,"2026-03-28 16:00:21","2026-03-27","2026-03-28",25000,15000,1],
  [159,126,67,"2026-03-28 16:02:35","2026-03-27","2026-03-28",20000,10000,1],
  [160,127,54,"2026-03-30 17:50:25","2026-03-28","2026-03-29",20000,10000,1],
  [161,128,52,"2026-04-13 17:54:28","2026-04-02","2026-04-03",20000,10000,1],
  [162,129,67,"2026-04-13 17:57:41","2026-04-02","2026-04-03",20000,10000,1],
  [163,130,53,"2026-04-13 18:01:47","2026-04-03","2026-04-04",20000,10000,1],
  [164,108,64,"2026-04-13 18:11:30","2026-04-05","2026-04-06",20000,10000,1],
  [165,131,67,"2026-04-14 12:41:45","2026-04-12","2026-04-13",20000,10000,1],
  [166,132,52,"2026-04-14 12:43:57","2026-04-12","2026-04-13",20000,10000,1],
  [167,131,53,"2026-04-14 12:46:45","2026-04-12","2026-04-13",20000,10000,1],
  [168,132,54,"2026-04-14 12:49:27","2026-04-12","2026-04-13",20000,10000,1],
  [169,131,64,"2026-04-14 12:53:07","2026-04-12","2026-04-13",20000,10000,1],
];

const COMPLAINTS = [
  {name:"Janice Alexander",type:"Room Windows",text:"Does not operate properly",date:"2020-07-16",resolved:true},
  {name:"Robert Peter",type:"Air Conditioner",text:"Sensor Problems",date:"2020-10-01",resolved:true},
  {name:"Jason J Pirkle",type:"Bad Smells",text:"Some odd smells around room areas",date:"2018-04-01",resolved:true},
  {name:"Will Williams",type:"Faulty Electronics",text:"Due to some weird reasons, the electronics are not working as it should; some voltage problems too - M-135",date:"2021-04-09",resolved:true},
];

// ============ HELPERS ============
function parseDate(s) {
  if (!s) return new Date();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s);
  const p = s.split('-');
  if (p.length===3 && p[0].length<=2) return new Date(p[2]+'-'+p[1]+'-'+p[0]+'T12:00:00.000Z');
  return new Date(s);
}
function parseName(full) {
  const t = full.trim().replace(/\s+/g,' ');
  const p = t.split(' ');
  return p.length===1 ? {f:p[0],l:p[0]} : {f:p[0],l:p.slice(1).join(' ')};
}
function getFloor(no) {
  const m = no.match(/\d+/);
  if (!m) return 1;
  const n = parseInt(m[0]);
  return n<=5?1:n<=10?2:3;
}
function genCode() { return 'RL-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).substring(2,6).toUpperCase(); }

// ============ MAIN ============
async function migrate() {
  console.log('=== ROYAL LOFT DATA MIGRATION ===\n');
  const stats = {rt:0,rm:0,g:0,r:0,fb:0,st:0,errors:[]};

  // Step 1: Clear
  console.log('Step 1: Clearing existing data...');
  const models = ['Payment','Bill','Reservation','GuestFeedback','HousekeepingTask','MaintenanceRequest','IoTDevice','Room','RoomPricing','RoomType','Guest','Expense','StockMovement','InventoryItem'];
  for (const m of models) {
    try { await db[m].deleteMany(); } catch(e) {}
  }
  try { await db.user.deleteMany({where:{email:{notIn:['admin@royalloft.com','developer@royalloft.com']}}}); } catch(e) {}
  console.log('  Cleared.');

  // Step 2: Room Types
  console.log('Step 2: Creating room types...');
  const amenMap = {
    'Executive Suite': JSON.stringify(['TV','AC','WiFi','Mini Bar','Sofa','Bathtub','Work Desk','Coffee Maker','Living Area','Premium Toiletries']),
    'Executive': JSON.stringify(['TV','AC','WiFi','Mini Fridge','Work Desk','Coffee Maker','Premium Bedding']),
    'Deluxe': JSON.stringify(['TV','AC','WiFi','Mini Fridge','Work Desk','Coffee Maker']),
    'Standard': JSON.stringify(['TV','AC','WiFi','Mini Fridge']),
  };
  const rtIdMap = {};
  for (const rt of ROOM_TYPES) {
    try {
      const c = await db.roomType.create({
        data: {name:rt.name,description:rt.name+' room at '+rt.price.toLocaleString()+' NGN/night',baseRate:rt.price,maxOccupancy:rt.max,amenities:amenMap[rt.name]||'[]',sortOrder:rt.price>=65000?1:rt.price>=50000?2:rt.price>=40000?3:4,isActive:true}
      });
      rtIdMap[rt.id] = c.id;
      await db.roomPricing.create({data:{roomTypeId:c.id,season:'regular',price:rt.price}});
      stats.rt++;
    } catch(e) { stats.errors.push('RT '+rt.name+': '+e.message); }
  }
  console.log('  Created', stats.rt, 'room types');

  // Step 3: Rooms
  console.log('Step 3: Creating rooms...');
  const rmIdMap = {};
  for (const [rid,rtid,rno,st,del] of ROOMS) {
    try {
      const tid = rtIdMap[rtid];
      if (!tid) { stats.errors.push('Room '+rno+': missing type'); continue; }
      const c = await db.room.create({data:{roomNumber:rno,floor:getFloor(rno),roomTypeId:tid,status:del===1?'out_of_service':'available',notes:del===1?'Removed from service (legacy)':undefined}});
      rmIdMap[rid] = c.id;
      stats.rm++;
    } catch(e) { stats.errors.push('Room '+rno+': '+e.message); }
  }
  console.log('  Created', stats.rm, 'rooms');

  // Step 4: Guests
  console.log('Step 4: Importing guests...');
  const stayCount = {};
  const spendCount = {};
  for (const b of BOOKINGS) {
    const cid = b[1];
    stayCount[cid] = (stayCount[cid]||0)+1;
    spendCount[cid] = (spendCount[cid]||0)+Number(b[6]);
  }
  const custIdMap = {};
  for (const c of CUSTOMERS) {
    try {
      const [cid,name,phone,email,idType,idNo,addr,date] = c;
      const {f,l} = parseName(name);
      const stays = stayCount[cid]||0;
      const spent = spendCount[cid]||0;
      let loyalty='none',pts=0;
      if (stays>=10){loyalty='platinum';pts=5000;}else if(stays>=5){loyalty='gold';pts=2500;}else if(stays>=3){loyalty='silver';pts=800;}
      const gc = await db.guest.create({
        data:{
          firstName:f,lastName:l,
          email: email&&email.includes('@')?email:null,
          phone: String(phone).length>=10?String(phone):'0'+String(phone),
          address: addr&&addr!=='NOT ASSIGN'&&addr.length>2?addr:null,
          country:'Nigeria',idType:ID_CARD_TYPES[idType]||'NIN',
          idNumber: idNo&&idNo!=='DONOTHAVE1'&&!idNo.startsWith('0000')?idNo:null,
          loyaltyTier:loyalty,loyaltyPoints:pts,totalStays:stays,totalSpent:spent,
          createdAt:new Date(date)
        }
      });
      custIdMap[cid] = gc.id;
      stats.g++;
    } catch(e) { stats.errors.push('Guest '+c[1]+': '+e.message); }
  }
  console.log('  Created', stats.g, 'guests');

  // Step 5: Reservations + Bills
  console.log('Step 5: Importing reservations...');
  const rtPrices = {};
  for (const rt of ROOM_TYPES) rtPrices[rt.id] = rt.price;

  for (const b of BOOKINGS) {
    const [bid,cid,rid,bdate,ciStr,coStr,total,disc,paySt] = b;
    const gid = custIdMap[cid];
    const nrid = rmIdMap[rid];
    if (!gid||!nrid) { stats.errors.push('Booking '+bid+': missing guest/room'); continue; }
    try {
      const ci = parseDate(ciStr);
      const co = parseDate(coStr);
      const rm = ROOMS.find(r=>r[0]===rid);
      const rtid = rm?rm[1]:null;
      const rate = rtid?rtPrices[rtid]||30000:30000;
      const discAmt = Number(disc)||0;
      const paid = paySt===1?(Number(total)-discAmt):0;

      const res = await db.reservation.create({
        data:{
          confirmationCode:genCode(),guestId:gid,roomId:nrid,
          checkIn:ci,checkOut:co,status:'checked_out',source:'walk_in',adults:1,
          roomRate:rate,totalAmount:Number(total),paidAmount:paid,
          notes:'Legacy booking #'+bid+(discAmt>0?' (Discount: N'+discAmt+')':''),
          createdAt:new Date(bdate),checkedInAt:ci,checkedOutAt:co,
        }
      });

      await db.bill.create({
        data:{
          reservationId:res.id,guestId:gid,
          roomCharges:Number(total),discountAmount:discAmt,
          totalAmount:Number(total),paidAmount:paid,balanceAmount:0,
          status:paySt===1?'paid':'open',paymentMethod:'cash',
          paidAt:paySt===1?co:null,
        }
      });
      stats.r++;
    } catch(e) { stats.errors.push('Booking '+bid+': '+e.message); }
  }
  console.log('  Created', stats.r, 'reservations with bills');

  // Step 6: Complaints -> Feedback
  console.log('Step 6: Importing complaints...');
  const catMap = {'Room Windows':'room','Air Conditioner':'room','Bad Smells':'cleanliness','Faulty Electronics':'amenities'};
  for (const c of COMPLAINTS) {
    try {
      const {f,l} = parseName(c.name);
      let g = await db.guest.findFirst({where:{AND:[{firstName:f},{lastName:l}]}});
      if (!g) {
        g = await db.guest.create({data:{firstName:f,lastName:l,phone:'0000000000',country:'Nigeria',createdAt:new Date(c.date)}});
        stats.g++;
      }
      await db.guestFeedback.create({data:{guestId:g.id,category:catMap[c.type]||'other',comment:c.text,rating:2,isResolved:c.resolved,createdAt:new Date(c.date)}});
      stats.fb++;
    } catch(e) { stats.errors.push('Complaint '+c.name+': '+e.message); }
  }
  console.log('  Created', stats.fb, 'feedbacks');

  // Step 7: Staff
  console.log('Step 7: Importing staff...');
  const staff = [{emp_id:15,name:'POLYCARP CHIKE',type_id:3,phone:'9133273608',salary:90000,date:'2025-12-08'}];
  const stTypes = {3:'Front Desk Receptionist'};
  for (const s of staff) {
    try {
      const {f,l} = parseName(s.name);
      const pos = stTypes[s.type_id]||'Staff';
      const email = f.toLowerCase()+'.'+l.toLowerCase()+'@royalloft.com';
      const pw = await bcrypt.hash('Staff@123',12);
      const u = await db.user.create({data:{email,password:pw,name:s.name,role:'staff',department:'front_desk',phone:s.phone,isActive:true}});
      await db.staffProfile.create({data:{userId:u.id,employeeId:'EMP-'+String(s.emp_id).padStart(4,'0'),department:'front_desk',position:pos,baseSalary:s.salary,startDate:new Date(s.date),status:'active'}});
      stats.st++;
    } catch(e) { stats.errors.push('Staff '+s.name+': '+e.message); }
  }
  console.log('  Created', stats.st, 'staff');

  // Ensure developer + admin users
  console.log('Step 8: Ensuring admin & developer users...');
  const devExists = await db.user.findUnique({where:{email:'developer@royalloft.com'}});
  if (!devExists) {
    const dpw = await bcrypt.hash('Dev@12345',12);
    await db.user.create({data:{email:'developer@royalloft.com',password:dpw,name:'System Developer',role:'developer',department:'management',isActive:true}});
  }
  const adminExists = await db.user.findUnique({where:{email:'admin@royalloft.com'}});
  if (!adminExists) {
    const apw = await bcrypt.hash('Admin@123',12);
    await db.user.create({data:{email:'admin@royalloft.com',password:apw,name:'Hotel Admin',role:'super_admin',department:'management',isActive:true}});
  }
  console.log('  Users ensured.');

  // Update room statuses
  console.log('Step 9: Updating room statuses...');
  await db.room.updateMany({where:{status:{not:'out_of_service'}},data:{status:'available'}});
  console.log('  Done.');

  // Summary
  console.log('\n==========================================');
  console.log('   MIGRATION COMPLETE!');
  console.log('==========================================');
  console.log('   Room Types:   ', stats.rt);
  console.log('   Rooms:        ', stats.rm);
  console.log('   Guests:       ', stats.g);
  console.log('   Reservations: ', stats.r);
  console.log('   Bills:        ', stats.r);
  console.log('   Feedbacks:    ', stats.fb);
  console.log('   Staff:        ', stats.st);
  console.log('   Errors:       ', stats.errors.length);
  if (stats.errors.length) console.log('   Error details:', stats.errors.slice(0,30));
  console.log('==========================================\n');

  await db.$disconnect();
}

migrate().catch(e => { console.error('FATAL:', e); process.exit(1); });
