export const FILM_CATEGORIES = ["Խաղարկային", "Դոկումենտալ", "Անիմացիոն"];

export function normalizeFilmCategory(value = "") {
  const normalized = String(value).trim();
  if (!normalized) return "";

  if (normalized.includes("Խաղարկ")) return "Խաղարկային";
  if (normalized.includes("Դոկումենտ") || normalized.includes("Վավերագր")) return "Դոկումենտալ";
  if (normalized.includes("Անիմաց") || normalized.includes("Անիմացի")) return "Անիմացիոն";

  return "";
}

export function decodeFilmCategoryCookie(value = "") {
  if (!value) return "";

  try {
    return normalizeFilmCategory(decodeURIComponent(value));
  } catch {
    return "";
  }
}
