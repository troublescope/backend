const SHARE_BASE_URL = "https://t.me/share/url";

type TelegramWebApp = {
  openTelegramLink?: (url: string) => void;
  shareURL?: (url: string, text?: string) => void;
};

function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") {
    return null;
  }

  const scope = window as Window & {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  };

  return scope.Telegram?.WebApp || null;
}

export function buildDramaShareUrl(contentId: string, episode: number) {
  const url = new URL(`/watch/${contentId}/${episode}`, window.location.origin);
  url.searchParams.set("content_id", contentId);
  url.searchParams.set("episode", String(episode));
  return url.toString();
}

export function shareDrama(contentId: string, episode: number, title?: string) {
  const url = buildDramaShareUrl(contentId, episode);
  const text = title ? `Watch ${title}` : "Watch this drama";
  const webApp = getTelegramWebApp();

  if (webApp?.shareURL) {
    webApp.shareURL(url, text);
    return;
  }

  const shareUrl = `${SHARE_BASE_URL}?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;

  if (webApp?.openTelegramLink) {
    webApp.openTelegramLink(shareUrl);
    return;
  }

  if (navigator.share) {
    void navigator.share({ title: text, url });
    return;
  }

  window.open(shareUrl, "_blank", "noopener,noreferrer");
}
