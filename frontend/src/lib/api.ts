import { Drama, DramaDetail, Episode, FavoriteItem, FeedCategory } from "@/types/drama";

export interface HomeResponse {
  forYou: Drama[];
  trending?: Drama[];
  newest?: Drama[];
  categories?: FeedCategory[];
  has_more?: boolean;
  page?: number;
  [key: string]: Drama[] | undefined;
}

export interface FeedResponse {
  items: Drama[];
  has_more: boolean;
  page: number;
}

export interface AuthResponse {
  token: string;
  user?: Record<string, unknown>;
}

export interface SubscriptionResponse {
  success: boolean;
  message: string;
  subscription?: Record<string, unknown> | null;
}

export interface PaymentResponse {
  _id?: string;
  amount: number;
  currency: string;
  provider: string;
  status?: string;
}

export interface FavoriteToggleResponse {
  favorited: boolean;
}

export type StreamQualityMode = "auto" | "high" | "med" | "low";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://tmaback.vercel.app").replace(/\/$/, "");
const DEFAULT_HEADERS: HeadersInit = { "Content-Type": "application/json" };

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function getLang(): string {
  return localStorage.getItem("app-language") || "id";
}

export function getToken(): string | null {
  return localStorage.getItem("auth-token");
}

export function setToken(token: string) {
  localStorage.setItem("auth-token", token);
}

export function clearToken() {
  localStorage.removeItem("auth-token");
}

function getHeaders(): HeadersInit {
  const h: HeadersInit = { ...DEFAULT_HEADERS };
  const token = getToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

async function fetchJSON<T>(
  path: string,
  options?: RequestInit & {
    params?: Record<string, string | number | undefined>;
  }
): Promise<T> {
  const res = await fetch(buildUrl(path, options?.params), {
    ...options,
    headers: { ...getHeaders(), ...options?.headers },
  });

  let payload: unknown = null;
  const isJson = res.headers.get("content-type")?.includes("application/json");
  if (isJson) {
    payload = await res.json();
  }

  if (res.status === 401) {
    clearToken();
  }

  if (!res.ok) {
    const message =
      typeof payload === "object" && payload && "error" in payload
        ? String((payload as { error: string }).error)
        : `API error: ${res.status}`;
    throw new ApiError(message, res.status, payload);
  }

  return payload as T;
}

// Auth
export async function authenticateTelegram(initData: string): Promise<AuthResponse> {
  const result = await fetchJSON<AuthResponse>(`/auth/telegram`, {
    method: "POST",
    body: JSON.stringify({ initData, initDataRaw: initData }),
  });
  
  if (result.token) {
    setToken(result.token);
  }
  
  return result;
}

// Home
export async function getHomeData(page = 1, limit = 20): Promise<HomeResponse> {
  return fetchJSON(`/watch/home`, { params: { lang: getLang(), page, limit } });
}

export async function getForYouFeed(page = 1, limit = 20): Promise<FeedResponse> {
  return fetchJSON(`/watch/foryou`, { params: { lang: getLang(), page, limit } });
}

export async function getTrendingFeed(page = 1, limit = 20): Promise<FeedResponse> {
  return fetchJSON(`/watch/trending`, { params: { lang: getLang(), page, limit } });
}

export async function getNewestFeed(page = 1, limit = 20): Promise<FeedResponse> {
  return fetchJSON(`/watch/newest`, { params: { lang: getLang(), page, limit } });
}

export async function getVipDramas(): Promise<Drama[]> {
  return fetchJSON(`/watch/vip`, { params: { lang: getLang() } });
}

export async function searchDramas(q: string): Promise<Drama[]> {
  return fetchJSON(`/watch/search`, { params: { lang: getLang(), q } });
}

export async function getDramaDetail(id: string): Promise<DramaDetail> {
  return fetchJSON(`/watch/detail/${id}`, { params: { lang: getLang() } });
}

export async function getEpisodes(id: string): Promise<Episode[]> {
  return fetchJSON(`/watch/episodes/${id}`, { params: { lang: getLang() } });
}

export async function getStreamUrl(
  id: string,
  episode: number,
  qualityMode: StreamQualityMode = "auto"
): Promise<{ url: string }> {
  return fetchJSON(`/watch/stream/${id}/${episode}`, { params: { lang: getLang(), quality: qualityMode } });
}

export async function checkAccess(seriesId: string, episode: number): Promise<{ accessible: boolean }> {
  return fetchJSON(`/watch/check`, {
    method: "POST",
    body: JSON.stringify({ series_id: seriesId, episode }),
  });
}

export async function saveProgress(seriesId: string, episode: number, progress: number): Promise<void> {
  await fetchJSON(`/watch/save`, {
    method: "POST",
    body: JSON.stringify({ series_id: seriesId, episode, progress }),
  });
}

export async function getWatchHistory(): Promise<Drama[]> {
  return fetchJSON(`/watch/history`, { params: { lang: getLang() } });
}

export async function getFavorites(): Promise<Drama[]> {
  return fetchJSON(`/favorites`, { params: { lang: getLang() } });
}

export async function getFavoriteItems(): Promise<FavoriteItem[]> {
  return fetchJSON(`/favorites`, { params: { lang: getLang() } });
}

export async function toggleFavorite(contentId: string): Promise<FavoriteToggleResponse> {
  return fetchJSON(`/favorites/toggle`, {
    method: "POST",
    body: JSON.stringify({ content_id: contentId }),
  });
}

export async function addFavorite(seriesId: string): Promise<void> {
  await toggleFavorite(seriesId);
}

export async function getUserProfile() {
  return fetchJSON(`/users/me`);
}

export async function getSubscription() {
  return fetchJSON(`/subscription`);
}

export async function getCategories(): Promise<FeedCategory[]> {
  return fetchJSON(`/watch/categories`, { params: { lang: getLang() } });
}

export async function getCategoryFeed(categoryId: string, page = 1, limit = 20): Promise<FeedResponse> {
  return fetchJSON(`/watch/category/${categoryId}`, {
    params: { lang: getLang(), page, limit },
  });
}

export async function upgradeSubscription(plan: string): Promise<SubscriptionResponse> {
  return fetchJSON(`/subscription/upgrade`, {
    method: "POST",
    body: JSON.stringify({ plan, plan_type: plan }),
  });
}

export async function createPayment(amount: number, plan: string): Promise<PaymentResponse> {
  return fetchJSON(`/payments/create`, {
    method: "POST",
    body: JSON.stringify({ amount, plan }),
  });
}

// Stream URL cache
const streamCache = new Map<string, { url: string; ts: number }>();
const streamRequestCache = new Map<string, Promise<string | null>>();
const CACHE_TTL = 30 * 1000; // 30s

function isExpiringStreamUrl(url: string): boolean {
  const normalized = url.toLowerCase();
  return (
    normalized.includes("token=") ||
    normalized.includes("auth=") ||
    normalized.includes("auth_key=") ||
    normalized.includes("signature=") ||
    normalized.includes("sig=") ||
    normalized.includes("expires=") ||
    normalized.includes("exp=") ||
    normalized.includes("x-amz-") ||
    normalized.includes("policy=")
  );
}

export async function getCachedStreamUrl(
  dramaId: string,
  episode: number,
  qualityMode: StreamQualityMode = "auto"
): Promise<string | null> {
  const key = `${dramaId}-${episode}-${qualityMode}`;
  const cached = streamCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.url;
  }

  const pendingRequest = streamRequestCache.get(key);
  if (pendingRequest) {
    return pendingRequest;
  }

  const request = (async () => {
    try {
      const res = await getStreamUrl(dramaId, episode, qualityMode);
      if (res.url) {
        if (!isExpiringStreamUrl(res.url)) {
          streamCache.set(key, { url: res.url, ts: Date.now() });
        } else {
          streamCache.delete(key);
        }
        return res.url;
      }
    } catch {
      // Auth required or error - return null
    } finally {
      streamRequestCache.delete(key);
    }

    return null;
  })();

  streamRequestCache.set(key, request);

  try {
    return await request;
  } finally {
    streamRequestCache.delete(key);
  }
}

export function invalidateCachedStreamUrl(
  dramaId: string,
  episode: number,
  qualityMode?: StreamQualityMode
) {
  const modes: StreamQualityMode[] = qualityMode ? [qualityMode] : ["auto", "high", "med", "low"];
  modes.forEach((mode) => {
    const key = `${dramaId}-${episode}-${mode}`;
    streamCache.delete(key);
    streamRequestCache.delete(key);
  });
}

// Preload helper
export function preloadStreamUrls(dramas: Drama[], currentIndex: number) {
  const indices = [currentIndex - 1, currentIndex, currentIndex + 1].filter(
    (i) => i >= 0 && i < dramas.length
  );
  indices.forEach((i) => {
    getCachedStreamUrl(dramas[i].id, 1); // fire-and-forget
  });
}
