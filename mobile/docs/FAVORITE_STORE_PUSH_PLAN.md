# Favorite store + push notifications – implementation plan

## Goal

- User can set **multiple favorite stores** (e.g. KIWI, Rema 1000, Meny).
- When someone submits a price from one of those stores, the user gets **one push notification** after a short wait (see below), e.g. *"Nye priser fra KIWI og Rema 1000 – sjekk i appen!"*
- When the user **taps the notification**, they are taken to a **Favorite store deals** page inside Community: a feed of submissions from their favorite stores only. They can open this page **anytime** from the Community screen (e.g. button "Tilbud fra favorittbutikker").

This is **possible** and fits your existing data (submissions already include `store_name`).

---

## 1. What you already have

- **Price submissions** include `store_name` (and `location`) and are stored in Supabase (`price_submissions`).
- **Stores list** exists in `result.tsx` (KIWI, Rema 1000, Meny, etc.) – can be shared for “favorite store” picker.
- **No push yet**: no `expo-notifications`, no device tokens, no backend push sending.

---

## 2. High-level flow

1. **App**: User picks favorite store(s) (e.g. on Community screen or Settings).
2. **App**: Store choices in AsyncStorage and send **Expo Push Token + favorite stores** to backend.
3. **Backend**: Save “this push token wants notifications for stores [KIWI, Rema 1000]”.
4. **Backend**: When a price is submitted (`POST /api/prices/submit`), after saving:
   - If submission has a `store_name`, find all push tokens that have that store in their favorites.
   - Send one push per token via **Expo Push API** (lock screen notification).
5. **App**: Handle notification tap (e.g. open Community tab).

**Important:** Without limits, a burst of submissions (e.g. 50 prices from KIWI in a few minutes) would trigger 50 notifications per user who has KIWI as favorite. See **§ Rate limiting & batching** below.

---

## Rate limiting & batching (avoid hundreds of notifications)

If many submissions arrive at once for the same store, you must **throttle or batch** so each user gets at most one (or a few) notifications, not one per submission.

### Option A – Rate limit per user per store (simplest)

- In `push_subscriptions` (or a small table), store **last_notified_at** per token and store (e.g. `last_push_sent: { "KIWI": "2025-02-20T10:00:00Z" }` or a separate row per token+store).
- When a submission comes in for store X: find tokens that have X in favorites and where **no push was sent for (token, X) in the last N minutes** (e.g. 30–60 min).
- Send **one** push for that store, then update `last_notified_at` for that token+store.
- **Effect:** Max 1 notification per user per store per hour (or whatever window you choose). Burst of 100 KIWI submissions → user gets 1 notification.

### Option B – Debounce / batch window (one notification per burst)

- Don’t send push immediately on each submit. Instead:
  - When the **first** submission for store X arrives, start a short **timer** (e.g. 2–5 minutes) for “store X”.
  - Any further submissions for X in that window only refresh the timer (or increment a counter).
  - When the timer fires, send **one** push to all tokens that have X in favorites: e.g. *"Nye priser fra KIWI – sjekk i appen!"* (optionally include count: *"5 nye priser fra KIWI"*).
- **Effect:** One notification per “burst” per store. Requires a small job queue or in-memory timer on the backend.

### Option C – Hybrid (recommended)

- **Rate limit per user:** Max 1 push per (token, store) per 30–60 minutes (Option A).
- **Optional batching:** If you implement a short debounce (Option B), you can send a single notification per store per window and include a count in the body. Still enforce the per-user rate limit so one user never gets more than one notification per store per hour.

### Implementation note

- **Option A** is enough to prevent spam: add `last_push_per_store` (JSON or columns) to `push_subscriptions`, and in the submit handler, before sending, check and update it. No queues or timers.
- **Option B** needs something that can “wait and then run” (e.g. a background job, or a simple in-memory debounce if you have a single backend process and can afford to lose batched sends on restart).

---

## 3. Mobile (Expo) – what to add

| Task | Details |
|------|--------|
| **Install** | `npx expo install expo-notifications expo-device` |
| **Config** | In `app.json`: `expo.notifications` (and iOS/Android push entitlements if needed). |
| **Permission** | Request notification permission when user enables “favorite store” or on first launch. |
| **Push token** | Get Expo push token with `expo-notifications`; send it to backend with favorite stores. |
| **Favorite store UI** | Reuse store list (e.g. from `result.tsx` or a shared `constants/stores.ts`). Let user pick one or more stores; save to AsyncStorage and sync to backend (token + store codes). |
| **Where to put it** | Community screen: e.g. “Favorittbutikk” section at top, or a settings/modal. Optional: filter feed by “only my favorite stores”. |
| **On notification tap** | Use `expo-notifications` listener; deep-link to Community (e.g. `router.push('/community')`). |

No user account is required: identity is “this device’s push token + favorite stores”.

---

## 4. Backend – what to add

| Task | Details |
|------|--------|
| **Storage** | New table (e.g. in Supabase): `push_subscriptions` or `device_favorite_stores`: `expo_push_token` (unique), `favorite_stores` (array or JSON: e.g. `["KIWI","REMA_1000"]`), `updated_at`. |
| **Register endpoint** | e.g. `POST /api/push/register` body: `{ expoPushToken: string, favoriteStores: string[] }`. Insert or update by token. |
| **On price submit** | In `POST /api/prices/submit`, after `submitPrice()` succeeds: read `store_name` from the submission, normalize (e.g. uppercase or map to store code). Query `push_subscriptions` where `favorite_stores` contains that store **and** rate limit allows (e.g. no push for this token+store in last 30–60 min). For each row, send one push, then update `last_push_per_store`. See **Rate limiting & batching** above. Call **Expo Push API** with that `expo_push_token` and a message like: “Billige priser i [KIWI]! Sjekk i appen.” |
| **Expo Push API** | `POST https://exp.host/--/api/v2/push/send` with body `{ to: expoPushToken, title: "...", body: "...", data: { screen: "community" } }`. Use `expo-server-sdk` on backend or plain `fetch`. |

Optional: “cheap” filter: e.g. only send when the new price is below the current min for that barcode (would require reading current stats before/after and comparing). Simpler: send for **any** new submission from a favorite store.

---

## 5. Store name matching

Submissions use `store_name` (free text or from your picker: “KIWI”, “Rema 1000”, etc.). When matching to “favorite stores”:

- **Option A**: Save favorite stores as display names and match with a simple `store_name.toLowerCase().includes(favoriteStore.toLowerCase())` (or normalize to codes and compare).
- **Option B**: In the app, favorite stores are stored as codes (e.g. `KIWI`, `REMA_1000`). When submitting, you already send a consistent name/code. Backend normalizes submitted `store_name` to the same set of codes (e.g. “Rema 1000” → `REMA_1000`) and matches against `favorite_stores` in DB.

Using the same store list and codes as in `result.tsx` keeps matching reliable.

---

## 6. Order of implementation (suggested)

1. **Backend**: Create `push_subscriptions` table and `POST /api/push/register`.
2. **Backend**: After submit, query by `store_name` and send one Expo push per token (start with a fixed message; no “cheap” logic).
3. **App**: Add `expo-notifications`, permission, get token, “Favorite store” UI (save to AsyncStorage + call `/api/push/register`).
4. **App**: Handle notification tap → open Community.
5. **Rate limiting**: Add per-user-per-store cooldown (e.g. max 1 push per store per 30–60 min) so bursts don't cause hundreds of notifications.
6. (Optional) Only send when new price is “cheap” (e.g. new min for barcode); or add rate limiting (e.g. max one push per user per store per hour).

---

## 7. Summary

- **Yes, it’s possible**: you have `store_name` on submissions and can add push tokens + favorite stores on the backend.
- **Lockscreen message** is the default behavior of Expo push when the app is in background or closed.
- **Chosen behavior**: Multiple favorite stores; 10-min wait; one notification per window (e.g. "Nye priser fra KIWI og Rema 1000"); Favorite store deals page (open anytime + deep link from notification); **4-hour cooldown** – no new notification to the same user within 4 hours after the last one. **Previous minimal version**: favorite store(s) in app → token + favorites stored in backend → on any submit with that store, send one push to matching tokens **with rate limiting** (e.g. max 1 per user per store per hour). No accounts, no “cheap” logic, simple to ship and iterate later.

---

## 8. 10-minute wait + Favorite store deals (chosen behavior)

- **Multiple favorite stores**: User selects one or more stores; all are stored and used for notifications and the Favorite store deals page.
- **10-minute debounce**: After a submission, the backend waits **10 minutes** before sending a push, so more submissions (possibly from other favorite stores) can be batched. When the 10 min is up, send **one** notification per user, e.g. *"Nye priser fra KIWI og Rema 1000 – sjekk i appen!"* (list all stores that had submissions in that window).
- **Favorite store deals page**: A dedicated screen (e.g. `/community/favorite-deals`) that shows only submissions from the user's favorite stores. User can open it **anytime** from the Community screen (e.g. button "Tilbud fra favorittbutikker"). When the user **taps the notification**, they are deep-linked to this page.
- **Backend**: Implement a pending batch per token (`stores_in_batch[]`, `send_after` = now + 10 min). On submit, add store to matching users' batches; when `send_after` is reached, send one push with deep link `data: { screen: "community/favorite-deals" }`.
- **4-hour cooldown**: After a user receives a notification, do **not** send them another one for **4 hours**. Store `last_push_sent_at` per token; when considering whether to add a user to a new batch or send a push, skip if `last_push_sent_at` is less than 4 hours ago. After sending, set `last_push_sent_at = now`.

If you want, next step can be: (1) shared `stores.ts` + multi-select favorite-store UI + Favorite store deals page, or (2) backend table + `POST /api/push/register` + 10-min batch logic + Expo push.
