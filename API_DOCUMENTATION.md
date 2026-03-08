# tmaback - API & System Documentation

This documentation covers the Dramabox integration, Telegram Bot, Authentication, and User Management systems.

## Base URL
`http://<host>:<port>`

---

## 🤖 Telegram Bot Integration

The system includes a Telegram Bot built with `grammy`.

#### 1. Start & Deep Linking
- **Command:** `/start`
- **Action:** Provides an Inline Keyboard button to launch the Mini App.
- **Deep Link Support:** Supports `/start <series_id>`. 
  - If a series ID is provided, the bot renders a specific "▶️ Watch Now" button.
  - The link automatically appends `?startapp=<id>` to the Mini App URL for direct in-app navigation.

#### 2. Inline Search
Search for dramas directly from the message bar in any chat.
- **Trigger:** `@YourBotUsername <query>`
- **Format:** Returns elegant HTML-formatted rich cards.
- **Card Content:** 
  - Series Poster
  - Title, Episode Count, and View Count.
  - Short Storyline description.
  - **Action:** Includes a `▶️ Watch Now` button that deep-links into the Mini App.

---

## 🔐 Authentication

Authentication is handled via Telegram Mini App initial data.

### 1. Telegram Auth
Exchange Telegram `initDataRaw` for a JWT token.

- **URL:** `/auth/telegram`
- **Method:** `POST`
- **Body:** `{ "initDataRaw": "string" }`
- **Process:** Validates data, checks for blocked users, creates/updates user, and issues a 7-day JWT.

---

## 👤 User & Stats API

#### 1. Profile Info
- **URL:** `/users/me`
- **Method:** `GET`
- **Auth:** Required
- **Returns:** User profile and current subscription details.

#### 2. Watch Stats & Recent (Continue Watching)
- **URL:** `/users/stats`
- **Method:** `GET`
- **Auth:** Required
- **Logic:** Groups watch history by series to show the **latest episode** and **progress** for each drama.
- **Returns:** 
  ```json
  {
    "stats": { "total_episodes", "total_series", "total_favorites", "plan" },
    "recent": [ { "series_id", "episode", "progress", "watched_at", "title", "cover" } ]
  }
  ```

---

## ❤️ Favorites API

#### 1. Toggle Favorite
- **URL:** `/favorites/toggle`
- **Method:** `POST`
- **Auth:** Required
- **Body:** `{ "series_id": "string" }`
- **Returns:** `{ "favorited": boolean }` (True if added, False if removed).

#### 2. List Favorites
- **URL:** `/favorites`
- **Method:** `GET`
- **Auth:** Required
- **Returns:** List of favorited dramas with metadata (title, cover, chapters).

---

## 💳 Subscription API

#### 1. Upgrade to VIP
- **URL:** `/subscription/upgrade`
- **Method:** `POST`
- **Auth:** Required
- **Body:** `{ "plan_type": "weekly" | "monthly" | "yearly" }`
- **Action:** Grants VIP access for 7, 30, or 365 days.

#### 2. Auto-Expiration
- **Logic:** `authMiddleware` automatically checks `expires_at` on every request. If expired, the user is downgraded to `free` plan instantly.

---

## 📺 Dramabox (Watch) API

Reflected from `go-v2` reference with randomized device profiles and Indonesian default.

### Base Path: `/watch`

#### 1. Home Data (`/home`)
Retrieves categorized series (For You, Trending, Newest).

#### 2. VIP Series (`/vip`)
Retrieves specialized VIP/Members-only content.

#### 3. Stream Link (`/stream/:id/:episode`) **[AUTH REQUIRED]**
- **Features:** 
  - **Official Unlock Bypass:** Server-side unlock for VIP episodes.
  - **Free Limits:** Probability-based lock (10-25% of total eps, clamped 5-30).
  - **Quality Lock:** Free users cannot access `1080p`.
  - **Caching:** 1-hour Redis/In-Memory cache for dynamic links.

---

## ⚙️ Infrastructure

- **MongoDB**: Persistent storage for Profiles, Metadata, History, and Favorites.
- **Redis (Upstash)**: 1-hour cache for dynamic stream links.
- **User-Agent Rotation**: Every request uses a randomized Android device profile (Pixel, Samsung, etc.).
