// Country code mapping (Full Name -> ISO 3166-1 alpha-2 code)
// Expanded list
export const countryNameToCode: { [countryName: string]: string } = {
  "Afghanistan": "af",
  "Albania": "al",
  "Algeria": "dz",
  "Andorra": "ad",
  "Angola": "ao",
  "Argentina": "ar",
  "Armenia": "am",
  "Australia": "au",
  "Austria": "at",
  "Azerbaijan": "az",
  "Bahamas": "bs",
  "Bahrain": "bh",
  "Bangladesh": "bd",
  "Belarus": "by",
  "Belgium": "be",
  "Belize": "bz",
  "Benin": "bj",
  "Bhutan": "bt",
  "Bolivia": "bo",
  "Bosnia and Herzegovina": "ba",
  "Botswana": "bw",
  "Brazil": "br",
  "Brunei": "bn",
  "Bulgaria": "bg",
  "Burkina Faso": "bf",
  "Burundi": "bi",
  "Cambodia": "kh",
  "Cameroon": "cm",
  "Canada": "ca",
  "Central African Republic": "cf",
  "Chad": "td",
  "Chile": "cl",
  "China": "cn",
  "Colombia": "co",
  "Congo": "cg",
  "Costa Rica": "cr",
  "Croatia": "hr",
  "Cuba": "cu",
  "Cyprus": "cy",
  "Czech Republic": "cz",
  "Denmark": "dk",
  "Djibouti": "dj",
  "Dominican Republic": "do",
  "Ecuador": "ec",
  "Egypt": "eg",
  "El Salvador": "sv",
  "Equatorial Guinea": "gq",
  "Eritrea": "er",
  "Estonia": "ee",
  "Eswatini": "sz",
  "Ethiopia": "et",
  "Fiji": "fj",
  "Finland": "fi",
  "France": "fr",
  "Gabon": "ga",
  "Gambia": "gm",
  "Georgia": "ge",
  "Germany": "de",
  "Ghana": "gh",
  "Greece": "gr",
  "Guatemala": "gt",
  "Guinea": "gn",
  "Guyana": "gy",
  "Haiti": "ht",
  "Honduras": "hn",
  "Hungary": "hu",
  "Iceland": "is",
  "India": "in",
  "Indonesia": "id",
  "Iran": "ir",
  "Iraq": "iq",
  "Ireland": "ie",
  "Israel": "il",
  "Italy": "it",
  "Jamaica": "jm",
  "Japan": "jp",
  "Jordan": "jo",
  "Kazakhstan": "kz",
  "Kenya": "ke",
  "Kuwait": "kw",
  "Kyrgyzstan": "kg",
  "Laos": "la",
  "Latvia": "lv",
  "Lebanon": "lb",
  "Liberia": "lr",
  "Libya": "ly",
  "Liechtenstein": "li",
  "Lithuania": "lt",
  "Luxembourg": "lu",
  "Madagascar": "mg",
  "Malawi": "mw",
  "Malaysia": "my",
  "Maldives": "mv",
  "Mali": "ml",
  "Malta": "mt",
  "Mauritania": "mr",
  "Mauritius": "mu",
  "Mexico": "mx",
  "Moldova": "md",
  "Monaco": "mc",
  "Mongolia": "mn",
  "Montenegro": "me",
  "Morocco": "ma",
  "Mozambique": "mz",
  "Myanmar": "mm",
  "Namibia": "na",
  "Nepal": "np",
  "Netherlands": "nl",
  "New Zealand": "nz",
  "Nicaragua": "ni",
  "Niger": "ne",
  "Nigeria": "ng",
  "North Korea": "kp",
  "North Macedonia": "mk",
  "Norway": "no",
  "Oman": "om",
  "Pakistan": "pk",
  "Palestine": "ps",
  "Panama": "pa",
  "Paraguay": "py",
  "Peru": "pe",
  "Philippines": "ph",
  "Poland": "pl",
  "Portugal": "pt",
  "Qatar": "qa",
  "Romania": "ro",
  "Russia": "ru",
  "Rwanda": "rw",
  "Saudi Arabia": "sa",
  "Senegal": "sn",
  "Serbia": "rs",
  "Sierra Leone": "sl",
  "Singapore": "sg",
  "Slovakia": "sk",
  "Slovenia": "si",
  "Somalia": "so",
  "South Africa": "za",
  "South Korea": "kr",
  "South Sudan": "ss",
  "Spain": "es",
  "Sri Lanka": "lk",
  "Sudan": "sd",
  "Suriname": "sr",
  "Sweden": "se",
  "Switzerland": "ch",
  "Syria": "sy",
  "Taiwan": "tw",
  "Tajikistan": "tj",
  "Tanzania": "tz",
  "Thailand": "th",
  "Togo": "tg",
  "Trinidad and Tobago": "tt",
  "Tunisia": "tn",
  "Turkey": "tr",
  "Turkmenistan": "tm",
  "Uganda": "ug",
  "Ukraine": "ua",
  "United Arab Emirates": "ae",
  "United Kingdom": "gb",
  "United States": "us",
  "Uruguay": "uy",
  "Uzbekistan": "uz",
  "Venezuela": "ve",
  "Vietnam": "vn",
  "Yemen": "ye",
  "Zambia": "zm",
  "Zimbabwe": "zw",
  // Add more mappings as needed
};

// Reverse mapping (ISO 3166-1 alpha-2 code -> Full Name)
// Now includes specific mappings for codes seen in the screenshot and 'USA'
export const countryCodeToFullName: { [code: string]: string } = Object.entries(
  countryNameToCode
).reduce((acc, [name, code]) => {
  acc[code.toLowerCase()] = name; // Ensure code is lowercase for lookup consistency
  return acc;
}, {} as { [code: string]: string });

// Add specific overrides / common variations / seen codes
countryCodeToFullName['bg'] = "Bulgaria";
countryCodeToFullName['cz'] = "Czech Republic";
countryCodeToFullName['ro'] = "Romania";
countryCodeToFullName['af'] = "Afghanistan";
countryCodeToFullName['usa'] = "United States"; // Handle 'USA' specifically
countryCodeToFullName['gozo (mt)'] = "Malta (Gozo)"; // Map GOZO (MT) specifically

/**
 * Converts a two-letter country code (case-insensitive) or specific known strings
 * to its full name.
 * @param code - The country code or specific string (e.g., 'gb', 'US', 'USA', 'gozo (mt)').
 * @returns The full country name (e.g., 'United Kingdom', 'Malta (Gozo)') or the original code (uppercased) if not found.
 */
export function getFullNameFromCode(code: string): string {
  if (!code) return 'Unknown'; // Handle empty or null codes
  const lowerCaseCode = code.toLowerCase();
  // Check the extended map first
  return countryCodeToFullName[lowerCaseCode] || code.toUpperCase(); // Return original code (uppercased) if no match after checking map
}

/**
 * Converts a full country name to its two-letter code.
 * @param name - The full country name (e.g., 'United Kingdom', 'Malta (Gozo)').
 * @returns The two-letter country code (e.g., 'gb', 'mt') or a generated code if not found.
 */
export function getCodeFromFullName(name: string): string {
  if (!name) return 'unknown'; // Handle empty or null names

  // Handle the specific 'Malta (Gozo)' case
  if (name === 'Malta (Gozo)') {
      return 'mt';
  }

  // Standard lookup
  return countryNameToCode[name] || name.toString().toLowerCase().replace(/\s+/g, '_');
} 