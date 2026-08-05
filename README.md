# LGPORT TikTok Creator Internal Website

Private TikTok creator research website with:

- Google Login
- Google Sheets-based access control from the `Admin` tab
- searchable creator dashboard from `All Creators`
- one personal saved-creators tab per Gmail user
- status updates synced back to Google Sheets
- admin summary dashboard

Google Sheet:

```text
https://docs.google.com/spreadsheets/d/1hFkdzit1hxJnbh2DXT4lUn-uCKBpXw2yeAcYF6DOqzQ/edit
```

## Google Sheet Tabs

Create these tabs in the spreadsheet:

```text
Admin
Authorized Users
All Creators
```

`Admin` columns:

```text
Gmail | Name (optional) | Notes
```

This is the easiest access list. Put a Gmail in column A and that account can login as an admin after Google OAuth allows it.

Example:

```text
janlynrustila01@gmail.com | Janlyn | Main admin
assistant@gmail.com       |        | Can login
```

`Authorized Users` is still supported for older user/role control. Columns:

```text
Gmail | Name | Role | Status
```

Example:

```text
admin@gmail.com | Admin Name | Admin | Active
user@gmail.com  | Maria      | User  | Active
old@gmail.com   | Old User   | User  | Disabled
```

`All Creators` columns:

```text
Creator ID | Name | Followers | TikTok Link | Category | Country | Last Updated
```

When a user saves a creator, the backend creates a personal tab automatically:

```text
Saved - maria
Saved - john
```

Personal saved tab columns:

```text
Date Saved | Creator Name | Followers | TikTok Link | Status | Notes | Saved By
```

Status options:

```text
Saved
Already Messaged
Approved
Not Approved
Rejected
```

## Google Cloud Setup

1. Create a Google Cloud project.
2. Configure OAuth consent screen.
3. Create an OAuth Web Client ID.
4. Add your frontend domain to Authorized JavaScript origins.
5. Create a Service Account.
6. Create a JSON key for the Service Account.
7. Share the spreadsheet with the service account email as `Editor`.

The website never asks for or stores Gmail passwords. Google Login only provides the verified Gmail address.

## Oracle Cloud VPS Hosting

Use `backend/` for the API and `frontend/` for the web app.

Backend:

```bash
cd backend
npm install
npm start
```

Frontend:

```bash
cd frontend
npm install
npm run build
```

Serve `frontend/dist` with Nginx, Caddy, or any static web server.

Recommended production setup:

```text
User Browser
  -> Nginx HTTPS
  -> frontend/dist
  -> /api proxy to Node backend on port 4000
  -> Google Sheets
```

Optional private setup:

```text
User Browser
  -> Company VPN
  -> Oracle Cloud VPS
  -> Website
```

## Backend Environment Variables

Set these on Oracle Cloud or Render:

```text
PORT=4000
FRONTEND_ORIGIN=https://your-domain.com
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_SHEET_ID=1hFkdzit1hxJnbh2DXT4lUn-uCKBpXw2yeAcYF6DOqzQ
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
JWT_SECRET=use-a-long-random-secret
```

Alternative credential format:

```text
GOOGLE_SERVICE_ACCOUNT_JSON={"client_email":"...","private_key":"..."}
```

## Frontend Environment Variables

Set these on Vercel or before building on Oracle:

```text
VITE_API_BASE_URL=https://your-api-domain.com
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

For Oracle with the same domain and Nginx `/api` proxy, you may use:

```text
VITE_API_BASE_URL=
```

## Render Backend

1. Create a Render Web Service.
2. Root directory: `backend`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add the backend environment variables above.

## Vercel Frontend

1. Import this repo in Vercel.
2. Root directory: `frontend`
3. Framework preset: Vite
4. Add:

```text
VITE_API_BASE_URL=https://your-render-backend.onrender.com
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

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

Without Google credentials, the backend runs in demo-memory mode so the UI can still be checked locally.
