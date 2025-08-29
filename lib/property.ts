export const PROPERTY_CODES = [
  "APU",
  "HPU",
  "AUR",
  "VES",
  "ALH",
  "BEL",
  "DIA",
  "KRE",
  "HOR",
  "ZAGREB",
] as const;

export type PropertyCode = (typeof PROPERTY_CODES)[number];

export const DEFAULT_PROPERTY: PropertyCode = "ZAGREB";

// Mapping from property codes to full hotel names
export const PROPERTY_NAMES: Record<PropertyCode, string> = {
  APU: "Apartmani Punta",
  AUR: "Hotel Aurora",
  VES: "Family hotel Vespera",
  ALH: "Boutique hotel Alhambra",
  BEL: "Hotel Bellevue",
  DIA: "Diana B&B",
  KRE: "Kredo B&B",
  HOR: "Vila Hortensia",
  HPU: "Vitality Hotel Punta",
  ZAGREB: "Zagreb Property", // Add a name for Zagreb
} as const;

// Helper function to get full name from property code
export const getPropertyName = (code: PropertyCode): string => {
  return PROPERTY_NAMES[code];
};

// Helper function to get property code from full name
export const getPropertyCode = (name: string): PropertyCode | undefined => {
  return Object.entries(PROPERTY_NAMES).find(
    ([_, propertyName]) => propertyName === name
  )?.[0] as PropertyCode | undefined;
};
