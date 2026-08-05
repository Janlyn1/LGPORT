import cors from "cors";
import crypto from "node:crypto";
import express from "express";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

const app = express();
const port = process.env.PORT || 4000;
const spreadsheetId =
  process.env.GOOGLE_SHEET_ID || "1hFkdzit1hxJnbh2DXT4lUn-uCKBpXw2yeAcYF6DOqzQ";
const jwtSecret = process.env.JWT_SECRET || "local-dev-secret-change-me";
const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

const savedStatuses = [
  "Saved",
  "Already Messaged",
  "Approved",
  "Not Approved",
  "Rejected",
];

const sampleAuthorizedUsers = [
  { gmail: "admin@example.com", name: "Admin User", role: "Admin", status: "Active" },
  { gmail: "maria@example.com", name: "Maria", role: "User", status: "Active" },
];

const sampleCreators = [
  {
    creatorId: "001",
    name: "Jane Doe",
    followers: "1.2M",
    followerCount: 1200000,
    tiktokLink: "https://www.tiktok.com/@janeskins",
    category: "Beauty & Skincare",
    country: "United States",
    lastUpdated: "2026-08-06",
  },
  {
    creatorId: "002",
    name: "Anna Smith",
    followers: "850K",
    followerCount: 850000,
    tiktokLink: "https://www.tiktok.com/@annaglowlab",
    category: "Beauty & Skincare",
    country: "United States",
    lastUpdated: "2026-08-06",
  },
  {
    creatorId: "003",
    name: "Sarah Lee",
    followers: "620K",
    followerCount: 620000,
    tiktokLink: "https://www.tiktok.com/@dermwithmia",
    category: "Dermatology",
    country: "United States",
    lastUpdated: "2026-08-06",
  },
];

const memory = {
  savedByEmail: new Map(),
};

app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin(origin, callback) {
      const allowed = process.env.FRONTEND_ORIGIN;
      if (!allowed || !origin || origin === allowed) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
  }),
);

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseFollowers(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value || "").trim().toUpperCase().replace(/,/g, "");
  const number = Number.parseFloat(text.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(number)) return 0;
  if (text.includes("M")) return Math.round(number * 1000000);
  if (text.includes("K")) return Math.round(number * 1000);
  return Math.round(number);
}

function slugFromEmail(email) {
  const [local, domain = "gmail"] = email.toLowerCase().split("@");
  const safeLocal = local.replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  const safeDomain = domain.split(".")[0].replace(/[^a-z0-9_]+/g, "_");
  return safeLocal || safeDomain || "user";
}

function savedSheetName(email) {
  return `Saved - ${slugFromEmail(email)}`.slice(0, 90);
}

function signSession(user) {
  const payload = {
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Date.now() + 1000 * 60 * 60 * 12,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", jwtSecret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function readSession(token) {
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature) return null;
  const expected = crypto.createHmac("sha256", jwtSecret).update(body).digest("base64url");
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (!payload.exp || payload.exp < Date.now()) return null;
  return payload;
}

function requireUser(request, response, next) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  const user = readSession(token);
  if (!user) {
    response.status(401).json({ error: "Login required." });
    return;
  }
  request.user = user;
  next();
}

function requireAdmin(request, response, next) {
  if (request.user?.role !== "Admin") {
    response.status(403).json({ error: "Admin access required." });
    return;
  }
  next();
}

function serviceAccountConfig() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }
  return null;
}

function sheetsEnabled() {
  return Boolean(serviceAccountConfig() && spreadsheetId);
}

async function sheetsClient() {
  const credentials = serviceAccountConfig();
  if (!credentials) return null;
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function getSheetMetadata() {
  const sheets = await sheetsClient();
  if (!sheets) return null;
  const response = await sheets.spreadsheets.get({ spreadsheetId });
  return response.data.sheets || [];
}

async function values(range) {
  const sheets = await sheetsClient();
  if (!sheets) return [];
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return response.data.values || [];
}

async function ensureSheet(title, headers) {
  const sheets = await sheetsClient();
  if (!sheets) return;
  const metadata = await getSheetMetadata();
  const exists = metadata?.some((sheet) => sheet.properties?.title === title);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title } } }],
      },
    });
  }
  const headerRows = await values(`'${title}'!A1:${String.fromCharCode(64 + headers.length)}1`);
  if (!headerRows.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${title}'!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [headers] },
    });
  }
}

async function appendRow(title, row) {
  const sheets = await sheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${title}'!A:Z`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}

async function updateRow(title, rowNumber, row) {
  const sheets = await sheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${title}'!A${rowNumber}:G${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}

function mapAllCreators(rows) {
  return rows.slice(1).filter((row) => row.some(Boolean)).map((row) => ({
    creatorId: clean(row[0]),
    name: clean(row[1]),
    followers: clean(row[2]),
    followerCount: parseFollowers(row[2]),
    tiktokLink: clean(row[3]),
    category: clean(row[4]),
    country: clean(row[5]),
    lastUpdated: clean(row[6]),
  }));
}

function mapSavedRows(rows, email) {
  return rows.slice(1).filter((row) => row.some(Boolean)).map((row, index) => ({
    rowNumber: index + 2,
    dateSaved: clean(row[0]),
    name: clean(row[1]),
    followers: clean(row[2]),
    followerCount: parseFollowers(row[2]),
    tiktokLink: clean(row[3]),
    status: clean(row[4]) || "Saved",
    notes: clean(row[5]),
    savedBy: clean(row[6]) || email,
  }));
}

async function authorizedUsers() {
  if (!sheetsEnabled()) return sampleAuthorizedUsers;
  const rows = await values("'Authorized Users'!A:D");
  return rows.slice(1).filter((row) => row.some(Boolean)).map((row) => ({
    gmail: clean(row[0]).toLowerCase(),
    name: clean(row[1]),
    role: clean(row[2]) || "User",
    status: clean(row[3]) || "Disabled",
  }));
}

async function authorizeEmail(email) {
  const users = await authorizedUsers();
  const user = users.find((item) => item.gmail === email.toLowerCase());
  if (!user || user.status !== "Active") return null;
  return {
    email: user.gmail,
    name: user.name || user.gmail,
    role: user.role === "Admin" ? "Admin" : "User",
  };
}

async function allCreators(query = {}) {
  const rows = sheetsEnabled()
    ? mapAllCreators(await values("'All Creators'!A:G"))
    : sampleCreators;
  const search = clean(query.search).toLowerCase();
  const minFollowers = parseFollowers(query.minFollowers);
  const category = clean(query.category);
  return rows.filter((creator) => {
    const matchesSearch =
      !search ||
      [creator.name, creator.category, creator.country, creator.tiktokLink]
        .join(" ")
        .toLowerCase()
        .includes(search);
    const matchesFollowers = !minFollowers || creator.followerCount >= minFollowers;
    const matchesCategory = !category || category === "All" || creator.category === category;
    return matchesSearch && matchesFollowers && matchesCategory;
  });
}

async function savedCreators(email) {
  const title = savedSheetName(email);
  if (!sheetsEnabled()) {
    return memory.savedByEmail.get(email) || [];
  }
  await ensureSheet(title, [
    "Date Saved",
    "Creator Name",
    "Followers",
    "TikTok Link",
    "Status",
    "Notes",
    "Saved By",
  ]);
  return mapSavedRows(await values(`'${title}'!A:G`), email);
}

async function teamDuplicateWarning(tiktokLink, email) {
  if (!sheetsEnabled()) return false;
  const metadata = await getSheetMetadata();
  const savedTabs =
    metadata
      ?.map((sheet) => sheet.properties?.title)
      .filter((title) => title?.startsWith("Saved -") && title !== savedSheetName(email)) || [];
  for (const tab of savedTabs) {
    const rows = await values(`'${tab}'!A:G`);
    if (mapSavedRows(rows, "").some((creator) => creator.tiktokLink === tiktokLink)) {
      return true;
    }
  }
  return false;
}

async function saveCreatorForUser(email, creator) {
  const existing = await savedCreators(email);
  const tiktokLink = clean(creator.tiktokLink);
  if (existing.some((item) => item.tiktokLink === tiktokLink)) {
    return { duplicate: true, message: "You already saved this creator." };
  }

  const row = {
    dateSaved: new Date().toISOString().slice(0, 10),
    name: clean(creator.name),
    followers: clean(creator.followers),
    followerCount: parseFollowers(creator.followers),
    tiktokLink,
    status: clean(creator.status) || "Saved",
    notes: clean(creator.notes),
    savedBy: email,
  };

  if (sheetsEnabled()) {
    const title = savedSheetName(email);
    await ensureSheet(title, [
      "Date Saved",
      "Creator Name",
      "Followers",
      "TikTok Link",
      "Status",
      "Notes",
      "Saved By",
    ]);
    await appendRow(title, [
      row.dateSaved,
      row.name,
      row.followers,
      row.tiktokLink,
      row.status,
      row.notes,
      row.savedBy,
    ]);
  } else {
    const rows = memory.savedByEmail.get(email) || [];
    rows.push({ ...row, rowNumber: rows.length + 2 });
    memory.savedByEmail.set(email, rows);
  }

  return {
    creator: row,
    teamDuplicateWarning: await teamDuplicateWarning(tiktokLink, email),
  };
}

async function updateSavedForUser(email, payload) {
  const rows = await savedCreators(email);
  const target = rows.find((row) => row.tiktokLink === clean(payload.tiktokLink));
  if (!target) return null;

  const next = {
    ...target,
    status: savedStatuses.includes(payload.status) ? payload.status : target.status,
    notes: payload.notes === undefined ? target.notes : clean(payload.notes),
  };

  if (sheetsEnabled()) {
    await updateRow(savedSheetName(email), target.rowNumber, [
      next.dateSaved,
      next.name,
      next.followers,
      next.tiktokLink,
      next.status,
      next.notes,
      next.savedBy,
    ]);
  } else {
    memory.savedByEmail.set(
      email,
      rows.map((row) => (row.tiktokLink === next.tiktokLink ? next : row)),
    );
  }

  return next;
}

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    storage: sheetsEnabled() ? "google-sheets" : "demo-memory",
    spreadsheetId,
    googleLoginConfigured: Boolean(googleClientId),
  });
});

app.post("/api/auth/google", async (request, response) => {
  try {
    if (!googleClient) {
      response.status(500).json({ error: "GOOGLE_CLIENT_ID is not configured." });
      return;
    }
    const ticket = await googleClient.verifyIdToken({
      idToken: request.body.credential,
      audience: googleClientId,
    });
    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();
    if (!email) {
      response.status(401).json({ error: "Google account email is unavailable." });
      return;
    }
    const user = await authorizeEmail(email);
    if (!user) {
      response.status(403).json({ error: "Access Denied. Your account is not authorized." });
      return;
    }
    response.json({ token: signSession(user), user });
  } catch (error) {
    response.status(401).json({ error: error.message });
  }
});

app.post("/api/auth/demo", async (_request, response) => {
  if (process.env.NODE_ENV === "production") {
    response.status(404).json({ error: "Demo login is disabled in production." });
    return;
  }
  const user = { email: "admin@example.com", name: "Admin User", role: "Admin" };
  response.json({ token: signSession(user), user });
});

app.get("/api/me", requireUser, (request, response) => {
  response.json({ user: request.user, statuses: savedStatuses });
});

app.get("/api/creators", requireUser, async (request, response) => {
  try {
    const creators = await allCreators(request.query);
    const categories = [...new Set((await allCreators()).map((creator) => creator.category).filter(Boolean))];
    response.json({ creators, categories, statuses: savedStatuses });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.get("/api/saved", requireUser, async (request, response) => {
  try {
    response.json({ creators: await savedCreators(request.user.email), statuses: savedStatuses });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.post("/api/saved", requireUser, async (request, response) => {
  try {
    const result = await saveCreatorForUser(request.user.email, request.body);
    response.status(result.duplicate ? 409 : 201).json(result);
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.patch("/api/saved", requireUser, async (request, response) => {
  try {
    const creator = await updateSavedForUser(request.user.email, request.body);
    if (!creator) {
      response.status(404).json({ error: "Saved creator not found." });
      return;
    }
    response.json({ creator });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.get("/api/admin", requireUser, requireAdmin, async (_request, response) => {
  try {
    const users = await authorizedUsers();
    const creators = await allCreators();
    const savedCounts = [];
    for (const user of users.filter((item) => item.status === "Active")) {
      savedCounts.push({
        gmail: user.gmail,
        name: user.name,
        count: (await savedCreators(user.gmail)).length,
      });
    }
    response.json({
      users,
      totalCreators: creators.length,
      savedCounts,
      activeUsers: users.filter((user) => user.status === "Active").length,
      disabledUsers: users.filter((user) => user.status !== "Active").length,
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.post("/api/sheets/sync", requireUser, async (_request, response) => {
  response.json({
    ok: true,
    spreadsheetId,
    personalTab: savedSheetName(_request.user.email),
    mode: sheetsEnabled() ? "google-sheets" : "demo-memory",
  });
});

app.listen(port, () => {
  console.log(`LGPORT creator backend running on port ${port}`);
});
