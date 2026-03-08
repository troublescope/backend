# 📺 Telegram Mini App Streaming Backend

Production-grade, modular backend for a Telegram Mini App streaming platform built with Node.js, TypeScript, and MongoDB.

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Language:** TypeScript
- **Framework:** Express
- **Database:** MongoDB + Mongoose
- **Auth:** JWT + `@tma.js/init-data-node`
- **Bot Framework:** grammY
- **Security:** `express-rate-limit`, `helmet`, `cors`, `dotenv`

---

## 📖 API Documentation

Interactive API documentation (Swagger UI) is available at:
- **Local:** `http://localhost:3000/docs`
- **Production:** `https://tmaback.vercel.app/docs`

You can use this interface to:
- **Explore** all available API endpoints.
- **Test** endpoints directly from your browser.
- **Authorize** requests using JWT tokens (Bearer Auth).

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (Running instance)
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Fill in the required environment variables in `.env`.

### Running the App

- **Development:**
  ```bash
  npm run dev
  ```
- **Production:**
  ```bash
  npm run build
  ```
  ```bash
  npm start
  ```

---

## ☁️ Serverless Telegram Webhook (grammY)

- The bot runs via `grammY` webhook handling inside the serverless Express function.
- Webhook endpoint: `POST /webhook`
- Do not use long polling (`bot.start()`) in production/serverless mode.
- The code initializes the bot once per warm instance and processes each Telegram update through `bot.handleUpdate(...)`.

### Set Telegram Webhook

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://<YOUR_DOMAIN>/webhook"
```


## 🔐 Authentication Flow

1. The Telegram Mini App client sends `initDataRaw` to the backend.
2. The backend validates the HMAC signature using the bot token.
3. If valid, the backend extracts user data and:
   - Checks if the user is in the `blocked` collection.
   - Creates a new user record if they don't exist.
   - Generates a **JWT token**.
4. The backend returns the JWT + User Profile.
5. All subsequent requests to private routes must include the header:
   `Authorization: Bearer <YOUR_JWT_TOKEN>`

---

## 📡 API Endpoints

### 1. Auth
| Method | Route | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/telegram` | Validate `initDataRaw` & return JWT | No |

**Request Body:**
```json
{ "initDataRaw": "..." }
```

---

### 2. Users
| Method | Route | Description | Auth Required |
|---|---|---|---|
| `GET` | `/users/me` | Return authenticated user + subscription | Yes |

---

### 3. Subscription
| Method | Route | Description | Auth Required |
|---|---|---|---|
| `GET` | `/subscription` | Get active subscription | Yes |
| `POST` | `/subscription/upgrade` | Upgrade plan to VIP (Placeholder) | Yes |

---

### 4. Watch & Logic
| Method | Route | Description | Auth Required |
|---|---|---|---|
| `POST` | `/watch/save` | Save or update watch progress | Yes |
| `GET` | `/watch/history` | Get full watch history | Yes |
| `POST` | `/watch/check` | Check episode access permission | Yes |

#### 🔒 Free Episode Limit Logic (`POST /watch/check`)
- **VIP Users:** All episodes allowed.
- **Free Users:**
  - On the first check for a `series_id`, a random `free_limit` (5–15) is generated and persisted.
  - Episodes within the `free_limit` are **allowed**.
  - Episodes beyond the limit are **denied**.

---

### 5. Favorites
| Method | Route | Description | Auth Required |
|---|---|---|---|
| `POST` | `/favorites` | Add series to favorites | Yes |
| `GET` | `/favorites` | Get all favorites | Yes |
| `DELETE` | `/favorites/:id` | Remove a favorite | Yes |

---

### 6. Payments
| Method | Route | Description | Auth Required |
|---|---|---|---|
| `POST` | `/payments/create` | Create a pending payment record | Yes |
| `GET` | `/payments` | List user payments | Yes |

---

### 7. Config
| Method | Route | Description | Auth Required |
|---|---|---|---|
| `GET` | `/config` | Return system configuration | No |

---

## 🛡️ Security

- **Rate Limiting:**
  - Auth: 10 requests per 15 minutes.
  - API: 100 requests per 15 minutes.
- **HMAC Validation:** Every auth request is verified against Telegram's official SDK spec.
- **JWT Protection:** Private routes are secured with HS256 JWT tokens.
- **Blocked Check:** User access is instantly revoked if they are added to the `blocked` collection.

---

## 🤖 Telegram Bot

The bot uses the **grammY** framework and primarily handles the `/start` command, providing an inline button to launch the Mini App.

```typescript
// /start command logic
const keyboard = new InlineKeyboard().webApp('📺 Open Streaming App', MINI_APP_URL);
ctx.reply('Welcome!', { reply_markup: keyboard });
```
