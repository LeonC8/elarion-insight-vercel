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
