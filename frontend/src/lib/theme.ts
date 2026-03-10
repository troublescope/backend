export type Theme = "light" | "dark";

export function getTheme(): Theme {
  const stored = localStorage.getItem("app-theme") as Theme | null;
  if (stored) return stored;
  
  // Try Telegram Mini App theme
  const telegramWindow = window as Window & {
    Telegram?: {
      WebApp?: {
        colorScheme?: Theme;
      };
    };
  };

  try {
    const tg = telegramWindow.Telegram?.WebApp;
    if (tg?.colorScheme) return tg.colorScheme as Theme;
  } catch {
    // Access to Telegram WebApp can fail outside the host app.
  }
  
  // System preference
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export function setTheme(theme: Theme) {
  localStorage.setItem("app-theme", theme);
  applyTheme(theme);
}

export function applyTheme(theme?: Theme) {
  const t = theme ?? getTheme();
  document.documentElement.classList.toggle("dark", t === "dark");
}
