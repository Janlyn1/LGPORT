# LGPORT TikTok Creator Dashboard

This repo contains the TikTok Creator Research and Management Dashboard.

There are two hosting-ready versions:

- `frontend/` - Vercel-ready React dashboard
- `backend/` - Render-ready Express API with PostgreSQL support

The original `app/` folder is the Cloudflare/Sites version that is already deployed from Codex.

## Render Backend

1. Create a new Render Web Service.
2. Use root directory: `backend`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables:

```text
DATABASE_URL=your_render_postgres_external_or_internal_url
FRONTEND_ORIGIN=https://your-vercel-app.vercel.app
```

If `DATABASE_URL` is missing, the backend uses temporary in-memory demo data. Use PostgreSQL for real saved records.

Health check:

```text
GET /api/health
```

Main API:

```text
GET /api/creators
POST /api/creators
GET /api/creators/:id
PATCH /api/creators/:id
POST /api/sheets/sync
```

## Vercel Frontend

1. Import this repo in Vercel.
2. Set root directory: `frontend`
3. Framework preset: Vite
4. Add environment variable:

```text
VITE_API_BASE_URL=https://your-render-backend.onrender.com
```

Then deploy.

## Local Development

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open the frontend URL printed by Vite. By default it calls `http://localhost:4000`.
