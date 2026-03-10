export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "id", name: "Bahasa Indonesia" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "pt", name: "Português" },
  { code: "th", name: "ภาษาไทย" },
  { code: "ar", name: "العربية" },
  { code: "de", name: "Deutsch" },
  { code: "pl", name: "Polski" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "it", name: "Italiano" },
  { code: "tr", name: "Türkçe" },
  { code: "zh-TW", name: "繁體中文" },
  { code: "zh-CN", name: "简体中文" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

const translations: Record<string, Record<string, string>> = {
  id: {
    home: "Beranda",
    forYou: "Untuk Anda",
    vip: "Anggota",
    myList: "Daftarku",
    profile: "Profil",
    search: "Cari drama...",
    forYouTab: "Untukmu",
    latest: "Terbaru",
    ranking: "Daftar Peringkat",
    category: "Kategori",
    popular: "Terpopuler",
    following: "Sedang Diikuti",
    episodes: "Episode",
    description: "Deskripsi",
    bookmark: "Simpan",
    share: "Bagikan",
    more: "selengkapnya",
    locked: "Berlangganan untuk membuka",
    free: "Gratis",
    views: "tayangan",
    episode: "Episode",
    language: "Bahasa",
    theme: "Tema",
    darkMode: "Mode Gelap",
    lightMode: "Mode Terang",
    rating: "Rating",
  },
  en: {
    home: "Home",
    forYou: "For You",
    vip: "VIP",
    myList: "My List",
    profile: "Profile",
    search: "Search dramas...",
    forYouTab: "For You",
    latest: "Latest",
    ranking: "Ranking",
    category: "Category",
    popular: "Popular",
    following: "Following",
    episodes: "Episodes",
    description: "Description",
    bookmark: "Bookmark",
    share: "Share",
    more: "more",
    locked: "Subscribe to unlock",
    free: "Free",
    views: "views",
    episode: "Episode",
    language: "Language",
    theme: "Theme",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    rating: "Rating",
  },
};

export function getLang(): LangCode {
  return (localStorage.getItem("app-language") as LangCode) || "id";
}

export function setLang(code: LangCode) {
  localStorage.setItem("app-language", code);
  window.dispatchEvent(new Event("lang-change"));
}

export function t(key: string): string {
  const lang = getLang();
  return translations[lang]?.[key] || translations["en"]?.[key] || key;
}
