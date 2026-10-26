import { LOCATIONS } from "@shared/locations";
import type { Locale } from "./locale";

const hebrewLocations: Partial<Record<keyof typeof LOCATIONS, string>> = {
  ashkelon: "אשקלון",
  atlit: "עתלית",
  "bat-galim": "בת גלים (חיפה)",
  "bat-yam": "בת ים",
  "beit-yanai": "בית ינאי",
  bezet: "בצת (ראש הנקרה)",
  caesarea: "קיסריה",
  eilat: "אילת",
  hadera: "חדרה",
  herzliya: "הרצליה",
  "kiryat-yam": "קריית ים",
  "maagan-michael": "מעגן מיכאל",
  naharia: "נהריה",
  "sea-of-galilee": "כנרת",
  "shave-ziyyon": "שבי ציון",
  "tel-aviv": "תל אביב",
  zichron: "זכרון יעקב",
};

export function getLocationName(id: string, locale: Locale, fallback?: string): string {
  const location = LOCATIONS[id as keyof typeof LOCATIONS];
  if (locale === "he" && id in hebrewLocations) {
    return hebrewLocations[id as keyof typeof LOCATIONS]!;
  }
  return location?.label ?? fallback ?? id;
}
