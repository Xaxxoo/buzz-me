import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { University } from '../entities/university.entity';
import { Question } from '../entities/question.entity';
import { Category } from '../entities/category.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ---- Import frontend data ----

// We'll inline the hash/short/color logic from the frontend since
// the frontend code uses ES module syntax that can't be directly required.

const SHORTS: Record<string, string> = {
  'Ahmadu Bello University': 'ABU', 'University of Ibadan': 'UI', 'University of Lagos': 'UNILAG', 'University of Ghana': 'LEGON',
  'Makerere University': 'MAK', 'University of Nairobi': 'UoN', 'University of Dar es Salaam': 'UDSM', 'University of Zambia': 'UNZA',
  'Obafemi Awolowo University Ile-Ife': 'OAU', 'University of Nigeria': 'UNN', 'University of Ilorin': 'UNILORIN', 'University of Benin': 'UNIBEN',
  'University of Jos': 'UNIJOS', 'University of Calabar': 'UNICAL', 'University of Abuja': 'UNIABUJA', 'University of Uyo': 'UNIUYO',
  'University of Maiduguri': 'UNIMAID', 'University of Port Harcourt': 'UNIPORT', 'Bayero University Kano': 'BUK', 'Lagos State University': 'LASU',
  'Nnamdi Azikiwe University': 'UNIZIK', 'Federal University of Technology, Akure': 'FUTA', 'Federal University of Technology, Minna': 'FUTMINNA',
  'Federal University of Technology, Owerri': 'FUTO', 'Ladoke Akintola University of Technology': 'LAUTECH', 'Usmanu Danfodiyo University Sokoto': 'UDUS',
  'Kaduna State University': 'KASU', 'University of Agriculture Abeokuta': 'FUNAAB', 'Olabisi Onabanjo University': 'OOU', 'Ekiti State University': 'EKSU',
  'Yaba College of Technology': 'YABATECH', 'Nigerian Defence Academy': 'NDA', 'National Open University of Nigeria': 'NOUN',
  'Abubakar Tafawa Balewa University': 'ATBU', 'Michael Okpara University of Agriculture': 'MOUAU', 'Adekunle Ajasin University': 'AAUA',
  'Rivers State University of Science and Technology': 'RSUST', 'Enugu State University of Science and Technology': 'ESUT', 'Tai Solarin University of Education': 'TASUED',
  'Kwame Nkrumah University of Science and Technology': 'KNUST', 'University of Cape Coast': 'UCC', 'University for Development Studies': 'UDS',
  'University of Education, Winneba': 'UEW', 'Ashesi University': 'ASHESI', 'University of Cape Town': 'UCT', 'University of Witwatersrand': 'WITS',
  'University of Pretoria': 'TUKS', 'University of Stellenbosch': 'MATIES', 'University of Johannesburg': 'UJ', 'University of KwaZulu-Natal': 'UKZN',
  'University of South Africa': 'UNISA', 'Rhodes University': 'RHODES', 'Jomo Kenyatta University of Agriculture and Technology': 'JKUAT',
  'Kenyatta University': 'KU', 'Moi University': 'MOI', 'Strathmore University': 'STRATH', 'Egerton University': 'EGERTON', 'Maseno University': 'MASENO',
  'Addis Ababa University': 'AAU', 'University of Malawi': 'UNIMA', 'Mzuzu University': 'MZUNI', 'University of Zimbabwe': 'UZ', 'University of Botswana': 'UB',
  'University of Namibia': 'UNAM', 'Copperbelt University': 'CBU', 'Fourah Bay College, University of Sierra Leone': 'FBC', 'Njala University': 'NJALA',
  'Université Cheikh Anta Diop': 'UCAD', 'Kyambogo University': 'KYU', 'Sokoine University of Agriculture': 'SUA', 'American University in Cairo': 'AUC',
};

type Pattern = 'chief' | 'chevron' | 'bend' | 'sun' | 'bars' | 'split' | 'quarter' | 'cross';

const LOOKS: Record<string, [string, string, Pattern]> = {
  'Ahmadu Bello University': ['#0B8457', '#FFD23F', 'chief'], 'University of Ibadan': ['#1D2F7A', '#F2B705', 'chevron'],
  'University of Lagos': ['#8E1B3A', '#F5C518', 'bend'], 'University of Ghana': ['#1763B8', '#FFD23F', 'sun'],
  'Makerere University': ['#D7263D', '#1B1464', 'bars'], 'University of Nairobi': ['#6A2FB8', '#7FD1FF', 'split'],
  'University of Dar es Salaam': ['#0B7A7C', '#F4A300', 'quarter'], 'University of Zambia': ['#B4531A', '#1E6B3A', 'cross'],
};
const PALETTES: [string, string][] = [['#0B8457', '#FFD23F'], ['#1D2F7A', '#F2B705'], ['#8E1B3A', '#F5C518'], ['#1763B8', '#FFD23F'], ['#D7263D', '#1B1464'], ['#6A2FB8', '#7FD1FF'], ['#0B7A7C', '#F4A300'], ['#B4531A', '#1E6B3A'],
  ['#C2185B', '#FFE0A3'], ['#2E7D32', '#FFFDF4'], ['#3949AB', '#FF8A65'], ['#5D4037', '#FFC107'], ['#00695C', '#C6F56F'], ['#AD1457', '#80DEEA'], ['#283593', '#EF5350'], ['#BF360C', '#FFF59D']];
const PATS: Pattern[] = ['chief', 'chevron', 'bend', 'sun', 'bars', 'split', 'quarter', 'cross'];
const STOP = new Set(['of', 'the', 'and', 'for', 'in', 'at', 'de', 'du', 'des', 'la', 'le', 'les', 'el', 'do', 'da', 'dos', 'das', 'e', 'et', 'y', 'di', 'del', 'a', 'en']);

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function shortOf(name: string): string {
  if (SHORTS[name]) return SHORTS[name];
  const tagged = name.match(/\(([A-Z]{2,8})\)/);
  if (tagged) return tagged[1];
  const words = name.replace(/\(.*?\)/g, ' ').replace(/\b[dl]\u2019/gi, '').split(/[\s\-\u2013,\/.&]+/)
    .map(w => w.replace(/[^\p{L}\p{N}]/gu, '')).filter(w => w && !STOP.has(w.toLowerCase()));
  const ac = words.map(w => w[0]).join('').toUpperCase().slice(0, 5);
  return ac.length > 1 ? ac : (words[0] || name).slice(0, 4).toUpperCase();
}

function schoolLook(name: string): { a: string; b: string; pat: Pattern } {
  if (LOOKS[name]) return { a: LOOKS[name][0], b: LOOKS[name][1], pat: LOOKS[name][2] };
  const h = hash(name);
  const pal = PALETTES[h % PALETTES.length];
  return { a: pal[0], b: pal[1], pat: PATS[(h >>> 7) % PATS.length] };
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ---- Universities data (inline from frontend) ----
const UNIS: Record<string, string[]> = {
  "Algeria": ["Centre Universitaire de Jijel", "Centre Universitaire de Tebessa", "Centre Universitaire de Tiaret", "Centre Universitaire d'Oum El Bouaghi", "Université Abou Bekr Belkaid, Tlemcen", "Université Amar Telidji", "Université Badji Mokhtar", "Université de Batna", "Université de Biskra", "Université de Blida", "Université de Béjaia", "Université de Chlef", "Université de Guelma", "Université de Mostaganem", "Université de M'sila", "Université de Saida", "Université de Sidi-Bel-Abbès (Djillali Liabès)", "Université de Skikda", "Université de Sétif", "Université des Sciences et de la Technologie d'Oran", "Université des Sciences et de la Technologie Houari Boumediène", "Université des Sciences Islamiques de Constantine", "Université d'Alger", "Université d'Alger 3", "Université d'Oran Es-Senia", "Université Kasdi Merbah Ouargla", "Université Mentouri Constantine", "Université Mouloud Mammeri de Tizi Ouzou", "Université M'hamed Bouguerra de Boumerdes"],
  "Angola": ["Universidade Católica de Angola", "Universidade Gregorio Semedo", "Universidade Independente de Angola", "Universidade Lusíada de Angola", "Universidade Metodista de Angola", "Universidade Metropolitana de Angola", "Universidade Tecnica de Angola", "Univesidade Agostinho Neto"],
  "Benin": ["Espam Formation University", "Houdegbe North American University Benin", "Université d'Abomey-Calavi (UAC)"],
  "Botswana": ["ABM University College", "Botho University", "Botswana Accountancy College", "Botswana College of Agriculture", "Botswana International University of Science & Technology", "Botswana Open University", "Gaborone Universal College of Law", "New Era College of Arts, Science & Technology", "University of Botswana"],
  "Burkina Faso": ["Université de Ouagadougou"],
  "Burundi": ["Hope Africa University", "Université du Burundi", "Université Lumière de Bujumbura"],
  "Cabo Verde": ["Universidade Jean Piaget de Cabo Verde"],
  "Cameroon": ["Bamenda University of Science & Technology", "Fomic Polytechnic", "Université de Bamenda", "Université de Buéa", "Université de Douala", "Université de Dschang", "Université de Ngaoundéré", "Université de Yaoundé I", "Université de Yaoundé II", "Université des Montagnes"],
  "Central African Rep.": ["Université de Bangui"],
  "Chad": ["Université de N'Djamena"],
  "Congo": ["University Marien Ngouabi Brazzaville"],
  "Côte d'Ivoire": ["British International University", "Université de Bouaké", "Université de Cocody", "Université d'Abobo-Adjamé"],
  "DR Congo": ["Université Catholique de Bukavu", "Université Chrétienne Bilingue du Congo", "Université de Bandundu Ville", "Université de Kinshasa", "Université de Kisangani", "Université de Lubumbashi", "Université de Mbuji Mayi", "Université Kongo", "Université Protestante au Congo", "Université Shalom de Bunia"],
  "Djibouti": ["Université de Djibouti"],
  "Egypt": ["Ain Shams University", "Akhbar El Yom Academy", "Al Azhar University", "Alexandria University", "American University in Cairo", "Arab Academy for Science & Technology", "Arab Open University", "Assiut University", "Badr University in Cairo", "Benha University", "Beni Suef University", "Cairo University", "CIC - Canadian International College", "Damanhour University", "Damietta University", "Deraya University", "El Shorouk Academy", "Fayoum University", "Future University", "German University in Cairo", "Helwan University", "Higher Technological Institute", "Kafr El-Sheikh University", "Mansoura University", "Menoufia University", "Military Technical College", "Minia University", "Misr International University", "Misr University for Science and Technology", "Modern Academy", "Modern Sciences & Arts University", "Modern University For Technology and Information", "Nile University", "October 6 University", "Pharos International University", "Sadat Academy for Management Sciences", "Sinai University", "Sohag University", "South Valley University", "Suez Canal University", "Tanta University", "Université Française d'Égypte", "Université Senghor d'Alexandrie", "Zagazig University"],
  "Equatorial Guinea": ["Universidad Nacional de Guinea Ecuatorial"],
  "Eritrea": ["Eritrea Institute of Technology"],
  "Eswatini": ["University of Swaziland"],
  "Ethiopia": ["Adama Science and Technology University", "Addis Ababa Science & Technology University", "Addis Ababa University", "Adigrat University", "Aksum University", "Ambo University", "Arba Minch University", "Assosa University", "Bahir Dar University", "Bule Hora University", "Debre Birhan University", "Debre Markos University", "Dilla University", "Dire Dawa University", "Ethiopian Civil Service University", "Gondar University", "Haramaya University", "Hawassa University", "Jigjiga University", "Jimma University", "Madawalabu University", "Mekelle Institute of Technology", "Mekelle University", "Mizan Tepi University", "Semera University", "Unity University", "Wolaita Sodo University", "Wolkite University", "Wollega University", "Wollo University"],
  "Gabon": ["Université Omar Bongo"],
  "Gambia": ["American International University West Africa", "EUCLID University", "University of the Gambia"],
  "Ghana": ["Accra Technical University", "Akrofi-Christaller Institute of Theology, Mission and Culture", "All Nations University College", "Ashesi University", "Cape Coast Technical University", "Central University College", "Christ Apostolic University College", "Ghana Baptist University College", "Ghana Christian University College", "Ghana Institute of Management and Public Administration (GIMPA)", "Ghana Telecom University College", "Ho Technical University", "Islamic University College", "Kessben College", "Koforidua Technical University", "Kumasi Technical University", "Kwame Nkrumah University of Science and Technology", "Lancaster University", "Pan African Christian University College", "Presbyterian University College", "Regent University College of Science and Technology", "Sunyani Technical University", "Takoradi Technical University", "Trinity Theological Seminary", "University for Development Studies", "University of Cape Coast", "University of Education, Winneba", "University of Ghana", "Valley View University", "Zenith University College"],
  "Guinea": ["Université Gamal Abdel Nasser de Conakry", "Université Julius Nyerere Kankan", "Université Kofi Annan", "Université Thierno Amadou Diallo"],
  "Kenya": ["Adventist University of Africa", "Africa International University", "Africa Nazarene University", "Catholic University of Eastern Africa", "Chuka University", "Daystar University", "Dedan Kimathi University of Technology", "Egerton University", "Great Lakes University of Kisumu", "Gretsa University", "Inoorero University", "Jaramogi Oginga Odinga University of Science and Technology", "Jomo Kenyatta University of Agriculture and Technology", "Kabarak University", "Karatina University", "Kenya College of Accountancy", "Kenya Medical Training College", "Kenya Methodist University", "Kenyatta University", "Kiriri Womens University of Science and Technology", "Kisii University", "Laikipia University", "Maasai Mara University", "Maseno University", "Masinde Muliro University of Science and Technology", "Meru University of Science and Technology", "Moi University", "Mount Kenya University", "Multimedia University of Kenya", "Nairobi Institute of Business Studies", "Nairobi Technical Training Institute", "Pan Africa Christian University", "Pioneer International University", "Presbyterian University of East Africa", "Pwani University", "Riara University School of Business and Law", "Scott Christian University", "South Eastern Kenya University", "St. Pauls University", "Strathmore University", "Technical University of Kenya", "Technical University of Mombasa", "United States International University", "University of Eastern Africa, Baraton", "University of Eldoret", "University of Kabianga", "University of Nairobi", "Uzima University College", "Zetech College"],
  "Lesotho": ["National University of Lesotho"],
  "Liberia": ["University of Liberia"],
  "Libya": ["Al-Asmarya University for Islamic Studies", "Al-Jabal Al-Gharbi University", "Elmergib University", "Libya Open University", "Libyan International Medical University (LIMU)", "Omar Al-Mukhtar University", "Sebha University", "Sirte University", "University of Benghazi", "University of Tripoli", "Zawiya University"],
  "Madagascar": ["Université de Fianarantsoa", "Université de Mahajanga", "Université de Toamasina", "Université de Toliary", "Université d'Antananarivo", "Université d'Antsiranana"],
  "Malawi": ["Catholic University of Malawi", "Lilongwe University of Agriculture and Natural Resources", "Malawi University of Business and Applied Sciences", "Malawi University of Science and Technology", "Mzuzu University", "University of Livingstonia", "University of Malawi"],
  "Mali": ["Université de Bamako"],
  "Mauritania": ["Université de Nouakchott"],
  "Mauritius": ["University of Mauritius", "University of Technology"],
  "Morocco": ["Al Akhawayn University", "Ecole des Hautes Etudes Commerciales MAROC", "Ecole des Hautes Etudes en Gestion Informatique et Communication", "Ecole Hassania des Travaux Publics", "Ecole Mohammadia d'Ingénieurs", "Ecole National d'Agriculture de Meknes", "Ecole Nationale d'Architecture", "Ecole Superieure des Télécommunications", "Ecole Supérieure de Commerce et des Affaires", "Ecole Supérieure d'Informatique et de Management", "Institut des Hautes Etudes de Management", "Institut National des Postes et Télécommunications", "Institut Supérieur de Commerce et d'Administration des Entreprises", "Institut Supérieur de Management et de Technologie (MATCI)", "Institute of Management and Business Technology", "International Institute for Higher Education", "ISFORT - Institut de Formation en Technologie Alimentaire", "Université Abdelmalek Essadi", "Université Cadi Ayyad", "Université Chouaib Doukkali", "Université Hassan Ier - Settat", "Université Hassan II - Aïn Chock", "Université Hassan II - Mohammadia", "Université Ibn Toufail", "Université Ibn Zohr Agadir", "Université Internationale de Rabat", "Université Mohammed Ier", "Université Mohammed Premier Oujda", "Université Mohammed V - Agdal", "Université Mohammed V - Souissi", "Université Moulay Ismail Meknès", "Université Privée de Marrakech", "Université Sidi Mohammed Ben Abdellah"],
  "Mozambique": ["Instituto Superior de Ciênicas e Tecnologia de Moçambique", "Instituto Superior de Relações Internacionais (ISRI)", "Instituto Superior Politécnico e Universitário", "Universidade Católica de Moçambique", "Universidade Eduardo Mondlane", "Universidade Lúrio", "Universidade Pedagógica", "Universidade Zambeze"],
  "Namibia": ["Ilsa Independent College", "Institute of Information Technology", "International University of Management", "Polytechnic of Namibia", "University of Namibia"],
  "Niger": ["Université Abdou Moumouni de Niamey"],
  "Nigeria": ["Abia State Polytechnic", "Abia State University", "ABTI American University of Nigeria", "Abubakar Tafawa Balewa University", "Adamawa State University", "Adekunle Ajasin University", "Adeleke University", "Adeyemi College of Education", "Afe Babalola University", "African University of Science and Technology", "Ahmadu Bello University", "Ajayi Crowther University", "Akanu Ibiam Federal Polytechnic, Unwana", "Akwa Ibom State University of Technology", "Al-hikmah University", "Ambrose Alli University", "Anambra State University of Science and Technology", "Auchi Polytechnic", "Babcock University", "Bauchi State University, Gadau", "Bayero University Kano", "Baze University Abuja", "Bells University of Technology", "Benson Idahosa University", "Benue State University", "Bingham University", "Bowen University", "Caleb University", "Caritas University", "College of Education Ikere", "College of Education Oju", "Covenant University", "Crawford University", "Crescent University", "Cross River University of Science and Technology", "Ebonyi State University", "Ekiti State University", "Enugu State University of Science and Technology", "Federal College Of Education (Technical), Akoka", "Federal University of Petroleum Resources", "Federal University of Technology, Akure", "Federal University of Technology, Minna", "Federal University of Technology, Owerri", "Federal University of Technology, Yola", "Fountain University", "Godfrey Okoye University", "Gombe State University", "Ibrahim Babangida University", "Igbinedion University", "Imo State University", "Joseph Ayo Babalola University", "Kaduna State University", "Kano State University of Technology Wudil", "Katsina University", "Kebbi State University of Science and Technology", "Kogi State University", "Kwara State Polytechnic", "Kwara State University", "Kwararafa University", "Ladoke Akintola University of Technology", "Lagos City Polytechnic", "Lagos State Polytechnic", "Lagos State University", "Landmark University", "Lead City University of Ibadan", "Madonna University", "Michael Okpara University of Agriculture", "Miva Open University", "Nasarawa State University Keffi", "National Open University of Nigeria", "Niger Delta University", "Nigerian Defence Academy", "Nigerian Turkish Nile University", "Nnamdi Azikiwe University", "Novena University", "Obafemi Awolowo University Ile-Ife", "Obong University", "Oduduwa University", "Olabisi Onabanjo University", "Ondo State University of Science and Technology", "Osun State University", "Pan-African University", "Paul University", "Polytechnic Ibadan", "Redeemer's University", "Renaissance University", "Rivers State University of Science and Technology", "Salem University", "Sokoto State University", "Tai Solarin University of Education", "Tansian University", "Taraba State University", "The Achievers University", "The Federal Polytechnic Offa", "Umaru Musa Yar'Adua University", "University of Abuja", "University of Agriculture Abeokuta", "University of Agriculture Makurdi", "University of Benin", "University of Calabar", "University of Ibadan", "University of Ilorin", "University of Jos", "University of Lagos", "University of Maiduguri", "University of Mkar", "University of Nigeria", "University of Port Harcourt", "University of Uyo", "Usmanu Danfodiyo University Sokoto", "Veritas University", "Wellspring University", "Wesley University of Science and Technology", "Western Delta University", "Yaba College of Technology"],
  "Rwanda": ["Adventist University of Central Africa", "Higher Institute of Agriculture and Animal Husbandry", "Institut d'Agriculture, de Technologie et d'Education de Kibungo", "Kigali Health Institute", "Kigali Independent University", "Kigali Institute of Education", "Kigali Institute of Science & Technology", "National University of Rwanda", "School of Finance and Banking", "Umutara Polytechnic", "Université Catholique de Kabgayi"],
  "Réunion": ["Université de la Reunion"],
  "Senegal": ["L'Université de l'Entreprise", "Université Alioune Diop de Bambey", "Université Amadou Hampaté Ba", "Université Cheikh Anta Diop", "Université Dakar Bourguiba", "Université de Thiès", "Université de Ziguinchor", "Université du Sahel", "Université Euro-Afrique", "Université Gaston Berger Saint-Louis"],
  "Seychelles": ["University of Seychelles", "University of Seychelles - American Institute of Medicine"],
  "Sierra Leone": ["Fourah Bay College, University of Sierra Leone", "LICCSAL Business College", "Njala University", "University of Sierra Leone"],
  "Somalia": ["Amoud University", "Benadir University", "Bosaso College", "East Africa University Bosaso", "East Somalia University", "Eelo American University", "Gollis University", "Hiiraan University", "Maakhir University", "Mogadishu University", "Nugaal University", "Puntland State University", "Sanaag University of Science and Technology", "Somaliland University of Technology", "University of Burao", "University of Hargeisa", "University of Somalia"],
  "South Africa": ["Cape Peninsula University of Technology", "Central University of Technology", "Durban University of Technology", "Mangosuthu University of Technology", "Monash University South Africa", "Nelson Mandela University", "North-West University", "Rhodes University", "Sefako Makgatho Health Sciences University", "Sol Plaatje University", "Tshwane University of Technology", "University of Cape Town", "University of Fort Hare", "University of Johannesburg", "University of KwaZulu-Natal", "University of Limpopo", "University of Mpumalanga", "University of Pretoria", "University of South Africa", "University of Stellenbosch", "University of the Free State", "University of the Western Cape", "University of Venda", "University of Witwatersrand", "University of Zululand", "Vaal University of Technology", "Walter Sisulu University for Technology and Science"],
  "South Sudan": ["University of Juba", "University of Northern Bahr El-Ghazal"],
  "Sudan": ["Ahfad University for Women", "Al Fashir University", "Al-Zaiem Al-Azhari University", "Bakht Er-Ruda University", "Bayan College for Science & Technology", "Blue Nile University", "Canadian Sudanese College", "Dalanj University", "Elrazi College Of Medical & Technological Sciences", "Gezira College of Technology", "High Institute for Banking & Financial Studies", "International University of Africa (IUA)", "Kassala University", "National College for Medical and Technical Studies", "National Ribat University", "Neelain University", "Nile Valley University", "Omdurman Ahlia University", "Omdurman Islamic University", "Open University of Sudan (OUS)", "Red Sea University", "Shendi University", "Sinnar University", "Sudan Academy of Sciences", "Sudan University for Science and Technology", "University of Dongola", "University of El Imam El Mahdi University", "University of Gadarif", "University of Gezira", "University of Holy Quran and Islamic Siences", "University of Khartoum", "University of Kordofan", "University Of Medical Sciences & Technology (UMST)", "University of Science and Technology", "Upper Nile University"],
  "Tanzania": ["African Virtual University", "Dar es Salaam Institute of Technology", "Hubert Kairuki Memorial University", "Institute of Accountancy Arusha", "Institute of Finance Management", "Kilimanjaro Christian Medical College", "Moshi University College of Cooperative and Business Studies", "Mount Meru University", "Muhimbili University of Health and Allied Sciences (MUHAS)", "Mwalimu Nyerere Memorial Academy", "Mzumbe University (Chuo Kikuu Mzumbe)", "Open University of Tanzania", "Sebatian Kolowa University College", "Sokoine University of Agriculture", "St. Augustine University of Tanzania", "St. Joseph Group of Institutes", "Tumaini University - Iringa University College", "University of Dar es Salaam", "University of Dodoma"],
  "Togo": ["Université de Lomé"],
  "Tunisia": ["Institut Supérieur de Gestion de Tunis", "Instituts Supérieurs de Formation des Maîtres", "Instituts Supérieurs des Etudes Technologiques", "University of Aviation and Technology", "Université Centrale", "Université de 7 Novembre à Carthage", "Université de Gabès", "Université de Gafsa", "Université de Jendouba", "Université de Kairouan", "Université de la Manouba", "Université de Monastir", "Université de Sfax", "Université de Tunis", "Université de Tunis El Manar", "Université du Centre, Sousse", "Université Ez-Zitouna", "Université Libre de Tunis", "Université Virtuelle de Tunis"],
  "Uganda": ["Bugema University", "Busitema University", "Busoga University", "Central Buganda University", "Gulu University", "Islamic University in Uganda", "Kampala International University", "Kampala University", "Kyambogo University", "Makerere University", "Mbarara University of Science and Technology", "Mountains of the Moon University", "Mutesa 1 Royal University", "Ndejje University", "Nkumba University", "St. Augustine International University", "Uganda Christian University", "Uganda Martyr's University"],
  "Zambia": ["Cavendish University", "Copperbelt University", "Mulungushi University", "Rusangu University", "University of Lusaka", "University of Zambia", "Zambian Open University"],
  "Zimbabwe": ["Africa University", "Bindura University of Science Education", "Catholic University in Zimbabwe", "Chinhoyi University of Technology", "Great Zimbabwe University", "Harare Institute of Technology", "Lupane State University", "Midlands State University", "National University of Science and Technology Bulawayo", "Reformed Church University", "Solusi University", "University of Zimbabwe", "Women's University in Africa", "Zimbabwe Ezekiel Guti University", "Zimbabwe Open University"],
};

// ---- Questions data (inline structure) ----
interface QA { t: string; o: string[]; }
interface QuestionData extends QA { c: string; b: QA; }

const QUESTIONS_DATA: QuestionData[] = [
  { c: 'Geography', t: 'This river crosses the equator twice, drains the second-largest rainforest on Earth, and reaches the Atlantic between two capitals that face each other. Name this river that two countries are named after.', o: ['Congo', 'Niger', 'Zambezi', 'Nile'], b: { t: 'Which city faces Brazzaville across the Congo and is the capital of the DRC?', o: ['Kinshasa', 'Lubumbashi', 'Kisangani', 'Goma'] } },
  { c: 'History', t: 'He trained as a teacher at Achimota, studied at Lincoln University in the United States, and wrote the book Africa Must Unite. Name the leader who took Ghana to independence in 1957.', o: ['Kwame Nkrumah', 'Nnamdi Azikiwe', 'Julius Nyerere', 'Jomo Kenyatta'], b: { t: 'What was Ghana called under British rule?', o: ['Gold Coast', 'Slave Coast', 'Ivory Coast', 'Grain Coast'] } },
  { c: 'Literature', t: 'Its title comes from a poem by W. B. Yeats, its hero is a champion wrestler from Umuofia, and it was published in 1958. Name this novel by Chinua Achebe.', o: ['Things Fall Apart', 'Arrow of God', 'No Longer at Ease', 'A Man of the People'], b: { t: 'Which Nigerian writer won the Nobel Prize in Literature in 1986?', o: ['Wole Soyinka', 'Chinua Achebe', 'Ben Okri', 'Buchi Emecheta'] } },
  { c: 'Science', t: 'Its symbol comes from the Latin word aurum, its atomic number is 79, and the Witwatersrand basin has produced more of it than anywhere else on Earth. Name this metal.', o: ['Gold', 'Silver', 'Copper', 'Platinum'], b: { t: 'What is the chemical symbol for sodium?', o: ['Na', 'So', 'Sd', 'S'] } },
  { c: 'Geography', t: 'It stands in Tanzania close to the Kenyan border, has three volcanic cones called Kibo, Mawenzi and Shira, and rises to 5,895 metres. Name the highest mountain in Africa.', o: ['Kilimanjaro', 'Mount Kenya', 'Mount Stanley', 'Mount Meru'], b: { t: 'Which is the largest lake in Africa by surface area?', o: ['Lake Victoria', 'Lake Tanganyika', 'Lake Malawi', 'Lake Turkana'] } },
  { c: 'Institutions', t: 'Launched in 2002 to replace the Organisation of African Unity, this body of 55 member states has its headquarters in Addis Ababa. Name it.', o: ['African Union', 'ECOWAS', 'SADC', 'African Development Bank'], b: { t: 'In which year was the Organisation of African Unity founded?', o: ['1963', '1957', '1960', '1975'] } },
  { c: 'Medicine', t: 'Named after a river in what is now the DRC, where it was identified in 1976, this virus causes a haemorrhagic fever and drove the West African epidemic of 2014. Name it.', o: ['Ebola', 'Lassa', 'Marburg', 'Zika'], b: { t: 'Which insect passes malaria to humans?', o: ['Anopheles mosquito', 'Tsetse fly', 'Aedes mosquito', 'Sandfly'] } },
  { c: 'History', t: 'He spent 27 years in prison, 18 of them on Robben Island, shared the 1993 Nobel Peace Prize with F. W. de Klerk, and became president the next year. Name him.', o: ['Nelson Mandela', 'Oliver Tambo', 'Desmond Tutu', 'Thabo Mbeki'], b: { t: 'Which city is South Africa\u2019s legislative capital, where parliament sits?', o: ['Cape Town', 'Pretoria', 'Bloemfontein', 'Johannesburg'] } },
  { c: 'Sport', t: 'This team has won the Africa Cup of Nations a record seven times, including three in a row in 2006, 2008 and 2010. Name the country whose side is called the Pharaohs.', o: ['Egypt', 'Cameroon', 'Ghana', 'Nigeria'], b: { t: 'Which country was the first in Africa to host the FIFA World Cup, in 2010?', o: ['South Africa', 'Morocco', 'Egypt', 'Nigeria'] } },
  { c: 'Mathematics', t: 'It is the smallest perfect number, the number of faces on a cube, and the value of three factorial. Name this number.', o: ['6', '4', '8', '12'], b: { t: 'What is the square root of 144?', o: ['12', '11', '14', '16'] } },
  { c: 'Geography', t: 'It covers about nine million square kilometres, stretches from the Atlantic to the Red Sea, and is the largest hot desert on Earth. Name it.', o: ['Sahara', 'Kalahari', 'Namib', 'Arabian Desert'], b: { t: 'Which is the largest country in Africa by area?', o: ['Algeria', 'DR Congo', 'Sudan', 'Libya'] } },
  { c: 'Music', t: 'Born in Abeokuta in 1938, he studied music in London, set up a commune he called the Kalakuta Republic, and created Afrobeat. Name this Nigerian bandleader.', o: ['Fela Kuti', 'King Sunny Ad\u00e9', 'Hugh Masekela', 'Youssou N\u2019Dour'], b: { t: 'Miriam Makeba, known as Mama Africa, came from which country?', o: ['South Africa', 'Zimbabwe', 'Kenya', 'Senegal'] } },
  { c: 'Environment', t: 'She founded the Green Belt Movement in 1977, which went on to plant tens of millions of trees, and in 2004 became the first African woman to win the Nobel Peace Prize. Name this Kenyan.', o: ['Wangari Maathai', 'Ellen Johnson Sirleaf', 'Leymah Gbowee', 'Gra\u00e7a Machel'], b: { t: 'Which gas do plants take from the air for photosynthesis?', o: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Hydrogen'] } },
  { c: 'Geography', t: 'Its capital moved from a coastal city to a planned one in 1991, its film industry is known as Nollywood, and it has the largest population in Africa. Name this country.', o: ['Nigeria', 'Tanzania', 'C\u00f4te d\u2019Ivoire', 'Ethiopia'], b: { t: 'What is the capital of Nigeria?', o: ['Abuja', 'Lagos', 'Kano', 'Ibadan'] } },
  { c: 'History', t: 'Its ruler made a pilgrimage to Mecca in 1324 and gave away so much gold in Cairo that the price of gold there fell for years. Name the West African empire ruled by Mansa Musa.', o: ['Mali', 'Songhai', 'Ghana', 'Kanem-Bornu'], b: { t: 'Which city on the edge of the Sahara was home to the Sankore mosque and its scholars?', o: ['Timbuktu', 'Gao', 'Kano', 'Djenn\u00e9'] } },
  { c: 'Technology', t: 'Launched by Safaricom in 2007, this service let people send money with a basic phone and became the model for mobile money around the world. Name it.', o: ['M-Pesa', 'MoMo', 'EcoCash', 'Airtel Money'], b: { t: 'In which country did M-Pesa launch?', o: ['Kenya', 'Tanzania', 'Uganda', 'Ghana'] } },
  { c: 'Geography', t: 'Its White and Blue branches meet at Khartoum, its basin is shared by eleven countries, and it reaches the Mediterranean through a delta in Egypt. Name the longest river in Africa.', o: ['Nile', 'Niger', 'Senegal', 'Orange'], b: { t: 'Which dam, finished in 1970, created Lake Nasser?', o: ['Aswan High Dam', 'Kariba Dam', 'Akosombo Dam', 'Kainji Dam'] } },
  { c: 'Geography', t: 'On the Zambezi between Zambia and Zimbabwe, this waterfall is known locally as Mosi-oa-Tunya, the smoke that thunders. Name it.', o: ['Victoria Falls', 'Tugela Falls', 'Kalambo Falls', 'Murchison Falls'], b: { t: 'Which lake, made by a dam on the Zambezi, lies between Zambia and Zimbabwe?', o: ['Lake Kariba', 'Lake Volta', 'Lake Nasser', 'Lake Kivu'] } },
  { c: 'History', t: 'Its army defeated Italy at Adwa in 1896, and apart from a five-year occupation it was never colonised. Name this country whose emperors included Menelik II and Haile Selassie.', o: ['Ethiopia', 'Liberia', 'Egypt', 'Morocco'], b: { t: 'What is the capital of Ethiopia?', o: ['Addis Ababa', 'Asmara', 'Khartoum', 'Nairobi'] } },
  { c: 'Science', t: 'It carries its own DNA, is inherited from the mother, and makes most of a cell\u2019s ATP. Name this organelle, often called the powerhouse of the cell.', o: ['Mitochondrion', 'Nucleus', 'Ribosome', 'Chloroplast'], b: { t: 'Which blood cells carry oxygen around the body?', o: ['Red blood cells', 'White blood cells', 'Platelets', 'Plasma cells'] } },
  { c: 'Science', t: 'Its SI unit is the newton, and in Newton\u2019s second law it equals mass multiplied by acceleration. Name this quantity.', o: ['Force', 'Energy', 'Power', 'Momentum'], b: { t: 'What is the SI unit of electrical resistance?', o: ['Ohm', 'Volt', 'Ampere', 'Watt'] } },
  { c: 'Science', t: 'It has two small moons called Phobos and Deimos, gets its colour from iron oxide, and is the fourth planet from the Sun. Name it.', o: ['Mars', 'Venus', 'Jupiter', 'Mercury'], b: { t: 'Which is the largest planet in the Solar System?', o: ['Jupiter', 'Saturn', 'Neptune', 'Earth'] } },
  { c: 'Literature', t: 'He wrote Weep Not, Child and A Grain of Wheat in English, then turned to Gikuyu for novels such as Devil on the Cross. Name this Kenyan author.', o: ['Ng\u0169g\u0129 wa Thiong\u2019o', 'Chinua Achebe', 'Meja Mwangi', 'Okot p\u2019Bitek'], b: { t: 'Which Nigerian author wrote Half of a Yellow Sun?', o: ['Chimamanda Ngozi Adichie', 'Buchi Emecheta', 'Flora Nwapa', 'Sefi Atta'] } },
  { c: 'Literature', t: 'This 1979 novel takes the form of a long letter from the widow Ramatoulaye to her friend Aissatou. Name this book by Mariama B\u00e2.', o: ['So Long a Letter', 'Scarlet Song', 'The Joys of Motherhood', 'Nervous Conditions'], b: { t: 'Which country did Mariama B\u00e2 come from?', o: ['Senegal', 'Mali', 'Guinea', 'Cameroon'] } },
  { c: 'History', t: 'Known as Mwalimu, he set out his Ujamaa policy in the Arusha Declaration of 1967 after leading Tanganyika to independence in 1961. Name him.', o: ['Julius Nyerere', 'Kenneth Kaunda', 'Milton Obote', 'Jomo Kenyatta'], b: { t: 'Tanganyika joined with which island state in 1964 to form Tanzania?', o: ['Zanzibar', 'Comoros', 'Madagascar', 'Mauritius'] } },
  { c: 'History', t: 'Built between the 11th and 15th centuries by ancestors of the Shona, these stone ruins gave a modern country its name. Name the site.', o: ['Great Zimbabwe', 'Khami', 'Mapungubwe', 'Lalibela'], b: { t: 'What was Zimbabwe called before its independence in 1980?', o: ['Rhodesia', 'Nyasaland', 'Bechuanaland', 'Basutoland'] } },
  { c: 'Geography', t: 'It is the fourth-largest island in the world, lies in the Indian Ocean off Mozambique, and is the only place where lemurs live in the wild. Name it.', o: ['Madagascar', 'Zanzibar', 'Mauritius', 'Seychelles'], b: { t: 'What is the capital of Madagascar?', o: ['Antananarivo', 'Port Louis', 'Maputo', 'Moroni'] } },
  { c: 'Economics', t: 'It grows more cocoa than any other country, has Yamoussoukro as its political capital, and has Abidjan as its largest city. Name it.', o: ['C\u00f4te d\u2019Ivoire', 'Ghana', 'Cameroon', 'Togo'], b: { t: 'Which currency is shared by eight West African states, including Senegal and C\u00f4te d\u2019Ivoire?', o: ['CFA franc', 'Cedi', 'Naira', 'Dalasi'] } },
  { c: 'Economics', t: 'Diamonds from mines such as Jwaneng transformed its economy, its currency is the pula, and its capital is Gaborone. Name this country.', o: ['Botswana', 'Namibia', 'Lesotho', 'Zambia'], b: { t: 'Which desert covers much of Botswana?', o: ['Kalahari', 'Namib', 'Sahara', 'Karoo'] } },
  { c: 'Sport', t: 'He played for Monaco, Paris Saint-Germain and AC Milan, won the Ballon d\u2019Or in 1995, and later became president of Liberia. Name him.', o: ['George Weah', 'Didier Drogba', 'Samuel Eto\u2019o', 'Abedi Pele'], b: { t: 'Which country won the first Africa Cup of Nations in 1957?', o: ['Egypt', 'Sudan', 'Ethiopia', 'Ghana'] } },
  { c: 'Sport', t: 'He won the Olympic marathon in Rome in 1960 running barefoot, then won it again in Tokyo four years later. Name this Ethiopian runner.', o: ['Abebe Bikila', 'Haile Gebrselassie', 'Kenenisa Bekele', 'Mamo Wolde'], b: { t: 'How long is a marathon, to the nearest kilometre?', o: ['42', '26', '40', '50'] } },
  { c: 'Sport', t: 'He won Olympic marathon gold in 2016 and 2020, and in Vienna in 2019 became the first person to cover the distance in under two hours. Name this Kenyan.', o: ['Eliud Kipchoge', 'Kelvin Kiptum', 'Paul Tergat', 'David Rudisha'], b: { t: 'Which Nigerian city hosted the All-Africa Games in 2003?', o: ['Abuja', 'Lagos', 'Kaduna', 'Port Harcourt'] } },
  { c: 'Politics', t: 'A Harvard-trained economist who had worked at the World Bank, she won the 2005 election and became the first woman elected head of state in Africa. Name this Liberian president.', o: ['Ellen Johnson Sirleaf', 'Joyce Banda', 'Ngozi Okonjo-Iweala', 'Samia Suluhu Hassan'], b: { t: 'Who in 2021 became the first African to lead the World Trade Organization?', o: ['Ngozi Okonjo-Iweala', 'Amina Mohammed', 'Akinwumi Adesina', 'Kofi Annan'] } },
  { c: 'Politics', t: 'Born in Kumasi in 1938, he was Secretary-General of the United Nations from 1997 to 2006 and shared the 2001 Nobel Peace Prize with the organisation. Name him.', o: ['Kofi Annan', 'Boutros Boutros-Ghali', 'Ban Ki-moon', 'Jerry Rawlings'], b: { t: 'In which city is the United Nations headquarters?', o: ['New York', 'Geneva', 'Vienna', 'The Hague'] } },
  { c: 'Geography', t: 'It is the longest freshwater lake on Earth and the second deepest, and its shores are shared by Tanzania, DR Congo, Burundi and Zambia. Name it.', o: ['Lake Tanganyika', 'Lake Malawi', 'Lake Victoria', 'Lake Albert'], b: { t: 'Which river flows out of Lake Victoria at Jinja?', o: ['Nile', 'Kagera', 'Congo', 'Zambezi'] } },
  { c: 'Mathematics', t: 'It is an irrational number that begins 3.14159 and equals the ratio of a circle\u2019s circumference to its diameter. Name it.', o: ['Pi', 'Euler\u2019s number', 'The golden ratio', 'The square root of 2'], b: { t: 'What do the angles of a triangle add up to, in degrees?', o: ['180', '90', '270', '360'] } },
  { c: 'Mathematics', t: 'It is the base of the binary system, the smallest prime, and the only prime that is even. Name this number.', o: ['2', '1', '3', '10'], b: { t: 'What is 15 percent of 200?', o: ['30', '15', '20', '35'] } },
  { c: 'Technology', t: 'Created by Guido van Rossum and first released in 1991, this programming language is named after a British comedy troupe, not a snake. Name it.', o: ['Python', 'Java', 'Ruby', 'Perl'], b: { t: 'What does CPU stand for?', o: ['Central processing unit', 'Computer power unit', 'Core program utility', 'Central peripheral unit'] } },
  { c: 'Music', t: 'He made mbalax famous beyond Senegal, recorded 7 Seconds with Neneh Cherry in 1994, and later served as his country\u2019s tourism minister. Name this singer.', o: ['Youssou N\u2019Dour', 'Salif Keita', 'Baaba Maal', 'Ali Farka Tour\u00e9'], b: { t: 'Which 21-string instrument is played by West African griots?', o: ['Kora', 'Mbira', 'Djembe', 'Balafon'] } },
  { c: 'Environment', t: 'Also called the gnu, this antelope crosses the Mara River each year in a migration of more than a million animals between the Serengeti and the Maasai Mara. Name it.', o: ['Wildebeest', 'Springbok', 'Impala', 'Eland'], b: { t: 'In which country is Serengeti National Park?', o: ['Tanzania', 'Kenya', 'Uganda', 'Zambia'] } },
];


// ---- Main seed function ----

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'quad',
    entities: [University, Question, Category],
    synchronize: true,
  });

  await ds.initialize();
  console.log('Connected to database');

  const uniRepo = ds.getRepository(University);
  const catRepo = ds.getRepository(Category);
  const qRepo = ds.getRepository(Question);

  // 1. Seed categories
  const catNames = [...new Set(QUESTIONS_DATA.map((q) => q.c))];
  const categoryMap = new Map<string, Category>();

  for (const name of catNames) {
    const slug = slugify(name);
    let cat = await catRepo.findOneBy({ slug });
    if (!cat) {
      cat = catRepo.create({ name, slug, active: true });
      await catRepo.save(cat);
    }
    categoryMap.set(name, cat);
  }
  console.log(`Seeded ${categoryMap.size} categories`);

  // 2. Seed universities
  let uniCount = 0;
  for (const [country, names] of Object.entries(UNIS)) {
    for (const name of names) {
      const existing = await uniRepo.findOneBy({ name });
      if (existing) continue;

      const look = schoolLook(name);
      const uni = uniRepo.create({
        name,
        short_name: shortOf(name).slice(0, 10),
        country,
        color_a: look.a,
        color_b: look.b,
        pattern: look.pat,
        email_domains: [],
        points: 0,
      });
      await uniRepo.save(uni);
      uniCount++;
    }
  }
  console.log(`Seeded ${uniCount} universities`);

  // 3. Seed questions
  let qCount = 0;
  const existingQs = await qRepo.count();
  if (existingQs === 0) {
    for (const qd of QUESTIONS_DATA) {
      const cat = categoryMap.get(qd.c);
      if (!cat) continue;

      const q = qRepo.create({
        category_id: cat.id,
        text: qd.t,
        options: qd.o,
        correct_option_index: 0,
        bonus_text: qd.b.t,
        bonus_options: qd.b.o,
        difficulty: 'medium',
        active: true,
      });
      await qRepo.save(q);
      qCount++;
    }
  }
  console.log(`Seeded ${qCount} questions`);

  await ds.destroy();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
