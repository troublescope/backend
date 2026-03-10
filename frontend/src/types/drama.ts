export interface Drama {
  id: string;
  title: string;
  cover: string;
  chapters: number;
  description: string;
  playCount: string;
  tags: string[];
}

export interface FeedCategory {
  id: string;
  name: string;
}

export interface FavoriteItem {
  series_id: string;
  created_at: string;
  title: string;
  cover: string;
  chapters: number;
}

export interface DramaDetail {
  id: string;
  title: string;
  description: string;
  cover: string;
  total_episodes: number;
  playCount?: string;
}

export interface Episode {
  id: string;
  index: number;
  title: string;
}

export interface StreamResponse {
  url: string;
}

export interface User {
  id: string;
  telegram_id: number;
  username: string;
  first_name: string;
  last_name: string;
  photo_url: string;
  language_code: string;
  is_premium: boolean;
  is_owner?: boolean;
  plan: string;
}

export interface Subscription {
  type: string;
  expires_at: string;
}
