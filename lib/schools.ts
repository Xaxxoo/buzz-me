import { UNIS } from './data/universities';
import type { Pattern, School } from './types';

export { UNIS };
export const COUNTRIES = Object.keys(UNIS);

/* Abbreviations students actually use. Everything else falls back to initials. */
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

export const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function shortOf(name: string) {
  if (SHORTS[name]) return SHORTS[name];
  const tagged = name.match(/\(([A-Z]{2,8})\)/);
  if (tagged) return tagged[1];
  const words = name.replace(/\(.*?\)/g, ' ').replace(/\b[dl]\u2019/gi, '').split(/[\s\-\u2013,\/.&]+/)
    .map(w => w.replace(/[^\p{L}\p{N}]/gu, '')).filter(w => w && !STOP.has(w.toLowerCase()));
  const ac = words.map(w => w[0]).join('').toUpperCase().slice(0, 5);
  return ac.length > 1 ? ac : (words[0] || name).slice(0, 4).toUpperCase();
}

/* A school's crest colours and pattern come from a hash of its name, so the same school always looks the same. */
const made = new Map<string, School>();
export function school(name: string, country: string): School {
  const id = country + '|' + name;
  const hit = made.get(id);
  if (hit) return hit;
  const h = hash(name);
  const look = LOOKS[name] || [...PALETTES[h % PALETTES.length], PATS[(h >>> 7) % PATS.length]] as [string, string, Pattern];
  const s: School = { id, name, country, short: shortOf(name), a: look[0], b: look[1], pat: look[2] };
  made.set(id, s);
  return s;
}

export interface Listing { name: string; country: string; key: string }
export const ALL: Listing[] = [];
for (const c of COUNTRIES) for (const n of UNIS[c]) ALL.push({ name: n, country: c, key: fold(n + ' ' + shortOf(n)) });

/* Rivals come from the player's own country when it has another school, otherwise from anywhere. */
export function pickRival(you: School): School {
  const home = (UNIS[you.country] || []).filter(n => n !== you.name);
  if (home.length) return school(home[Math.floor(Math.random() * home.length)], you.country);
  const rest = ALL.filter(u => u.name !== you.name);
  const u = rest[Math.floor(Math.random() * rest.length)];
  return school(u.name, u.country);
}
