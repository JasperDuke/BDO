# Artemis Platform

Monorepo with a **Next.js 14** (App Router) frontend and **Express + MongoDB** backend: JWT authentication, multi-file uploads with optional webhook notification, a dashboard with upload + **Artemis records** search (saved screening/case data), and a **hidden** internal page for Artemis CRUD (any signed-in user).

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

## Quick start

1. **Install dependencies**

   ```bash
   npm install
   npm install --prefix backend
   npm install --prefix frontend
   ```

2. **Environment files**

   - Copy `backend/.env.example` → `backend/.env` and set variables (see below).
   - Copy `frontend/.env.example` → `frontend/.env.local` and set `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`).

3. **Run MongoDB** and ensure `MONGODB_URI` in `backend/.env` points to your database.

4. **Seed default user + sample Artemis rows** (optional but recommended for demos):

   ```bash
   npm run seed --prefix backend
   ```

   Creates **`user@artemis.com`** / **`user123`** and two sample Artemis records (one individual, one corporate). Re-running replaces those rows if the same `caseId` values already exist.

5. **Start both apps** from the repository root:

   ```bash
   npm run dev
   ```

   - Frontend: [http://localhost:3000](http://localhost:3000)
   - API: [http://localhost:4000](http://localhost:4000)

### Run apps separately

```bash
npm run dev:backend
npm run dev:frontend
```

## Environment variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | API port (default `4000`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | JWT lifetime (e.g. `7d`) |
| `WEBHOOK_URL` | URL for POST webhook after file upload (optional; skipped if empty) |
| `CORS_ORIGIN` | Allowed browser origin (e.g. `http://localhost:3000`) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | API base URL without `/api` suffix (e.g. `http://localhost:4000`) |

## Features

### Authentication

- Register and login; passwords hashed with bcrypt.
- JWT stored in `localStorage` and sent as `Authorization: Bearer <token>`.
- Protected API routes use JWT middleware; the app redirects unauthenticated users to `/login`. Failed authenticated calls clear the session and return to login.

### User CRUD (API)

Protected endpoints under `/api/users` (requires JWT):

- `GET /api/users/me` — current user profile
- `GET /api/users` — list users
- `GET /api/users/:id` — get user
- `POST /api/users` — create user (with password)
- `PATCH /api/users/:id` — update user (optional `password` in body)
- `DELETE /api/users/:id` — delete user

### Dashboard (`/dashboard`)

Two tabs:

1. **File upload** — PDF and `.xlsx` only; drag-and-drop or browse. Users enter a **recipient email** (where the screening outcome should go); the API includes it in the upload payload and, if configured, in the optional `WEBHOOK_URL` POST. Multipart fields: `notificationEmail`, `files`. Files land under `backend/public/uploads/{userId}/`.

2. **Artemis viewer** — Debounced search across **the entire document**: every nested **key name** and **value** (metadata, entity blocks, risk JSON, approval lines, etc.) is flattened into `_searchText`. After upgrading, run `npm run reindex-search --prefix backend` once so existing rows pick up the new index. Sortable table with many columns, horizontal scroll, pagination; row click still opens the drawer for full JSON.

### Hidden Artemis CRUD (internal)

- **Frontend URL (not in navigation):** **`/internal/artemis-admin`**
- **API base path:** **`/api/internal/artemis`** — same JWT as the rest of the app (no separate admin secret).
- Endpoints: `GET /` (list), `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`.

Anyone who can sign in can open the hidden URL; “hidden” only means it is not linked in the UI.

### Artemis data model

Mongoose model matches the specified structure: metadata (including `entityType` **CORPORATE** | **INDIVIDUAL**), general entity details, **either** corporate-specific **or** individual-specific (the other block is stripped on create/update), screening summary + match details, risk assessment (five risk groups), approval history, modification details. `_searchText` is rebuilt on save for fast substring search.

## API summary

| Area | Base path | Auth |
|------|-----------|------|
| Auth | `/api/auth` | Public (register/login) |
| Users | `/api/users` | JWT |
| Upload | `/api/upload` | JWT |
| Artemis (read/search) | `/api/artemis` | JWT |
| Artemis (internal CRUD) | `/api/internal/artemis` | JWT |

## Production notes

- Set a strong `JWT_SECRET`.
- Serve the frontend (`next build` / `next start`) and API behind HTTPS.
- Restrict CORS to your real origin.
- Back up MongoDB and uploaded files under `public/uploads`.
