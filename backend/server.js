import cors from "cors";
import crypto from "node:crypto";
import express from "express";
import pg from "pg";

const app = express();
const port = process.env.PORT || 4000;
const statuses = [
  "For Approval",
  "Approved",
  "Rejected",
  "Ready to Contact",
  "Contacted",
  "Replied",
  "Negotiating",
  "Closed",
  "Do Not Contact",
];

const seedCreators = [
  {
    username: "janeskins",
    displayName: "Jane Skins",
    profileLink: "https://www.tiktok.com/@janeskins",
    followerCount: 84500,
    followingCount: 418,
    totalLikes: 1400000,
    country: "United States",
    email: "jane@skinstudio.com",
    niche: "Beauty / Skincare",
    bio: "Acne-safe routines, product reviews, and affordable skin care.",
    status: "For Approval",
    assignedTo: "Maria",
    savedByName: "Maria",
    savedByEmail: "maria@example.com",
    responseStatus: "Not contacted",
    notes: "Strong recent engagement on acne-focused review videos.",
  },
  {
    username: "annaglowlab",
    displayName: "Anna Glow Lab",
    profileLink: "https://www.tiktok.com/@annaglowlab",
    followerCount: 120000,
    followingCount: 192,
    totalLikes: 2100000,
    country: "United States",
    email: "",
    niche: "Beauty / Skincare",
    bio: "Makeup reviews and skincare routines for sensitive skin.",
    status: "Approved",
    assignedTo: "John",
    savedByName: "John",
    savedByEmail: "john@example.com",
    responseStatus: "Email needed",
    notes: "Check public links for business contact before outreach.",
  },
  {
    username: "dermwithmia",
    displayName: "Derm With Mia",
    profileLink: "https://www.tiktok.com/@dermwithmia",
    followerCount: 56200,
    followingCount: 88,
    totalLikes: 980000,
    country: "United States",
    email: "hello@dermwithmia.com",
    niche: "Dermatology / Education",
    bio: "Licensed skin health educator sharing practical routines.",
    status: "Ready to Contact",
    assignedTo: "Lea",
    savedByName: "Maria",
    savedByEmail: "maria@example.com",
    responseStatus: "Ready",
    notes: "Good match for clinical credibility campaigns.",
  },
];

const memory = {
  creators: [],
  activity: [],
  ready: false,
};

const pool = process.env.DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    })
  : null;

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

function numberValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  const parsed = Number.parseInt(String(value ?? "").replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeProfileLink(value) {
  const link = clean(value);
  if (!link) return "";
  return link.startsWith("http://") || link.startsWith("https://") ? link : `https://${link}`;
}

function normalizeUsername(input) {
  const manual = clean(input.username).replace(/^@/, "");
  if (manual) return manual.toLowerCase();
  const match = normalizeProfileLink(input.profileLink).match(/tiktok\.com\/@([^/?#]+)/i);
  return match?.[1]?.toLowerCase() ?? "";
}

function normalizeStatus(status) {
  return statuses.includes(status) ? status : "For Approval";
}

function actorFromBody(body) {
  return {
    name: clean(body.savedByName) || "Research Team",
    email: clean(body.savedByEmail),
  };
}

function createRecord(input, actor) {
  const username = normalizeUsername(input);
  const profileLink = normalizeProfileLink(input.profileLink);
  if (!username) throw new Error("Username or TikTok profile link is required.");
  if (!profileLink) throw new Error("TikTok profile link is required.");

  const timestamp = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    username,
    displayName: clean(input.displayName) || username,
    profileLink,
    followerCount: numberValue(input.followerCount),
    followingCount: numberValue(input.followingCount),
    totalLikes: numberValue(input.totalLikes),
    country: clean(input.country),
    email: clean(input.email),
    niche: clean(input.niche),
    bio: clean(input.bio),
    profileImage: clean(input.profileImage),
    status: normalizeStatus(input.status),
    assignedTo: clean(input.assignedTo),
    savedByName: actor.name,
    savedByEmail: actor.email,
    contactDate: clean(input.contactDate),
    responseStatus: clean(input.responseStatus) || "Not contacted",
    notes: clean(input.notes),
    savedAt: timestamp,
    updatedAt: timestamp,
  };
}

function toCamel(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    profileLink: row.profile_link,
    followerCount: Number(row.follower_count ?? 0),
    followingCount: Number(row.following_count ?? 0),
    totalLikes: Number(row.total_likes ?? 0),
    country: row.country ?? "",
    email: row.email ?? "",
    niche: row.niche ?? "",
    bio: row.bio ?? "",
    profileImage: row.profile_image ?? "",
    status: row.status,
    assignedTo: row.assigned_to ?? "",
    savedByName: row.saved_by_name ?? "",
    savedByEmail: row.saved_by_email ?? "",
    contactDate: row.contact_date ?? "",
    responseStatus: row.response_status ?? "",
    notes: row.notes ?? "",
    savedAt: row.saved_at,
    updatedAt: row.updated_at,
  };
}

function activityToCamel(row) {
  return {
    id: Number(row.id),
    creatorId: row.creator_id,
    action: row.action,
    actorName: row.actor_name ?? "",
    actorEmail: row.actor_email ?? "",
    detail: row.detail ?? "",
    createdAt: row.created_at,
  };
}

async function initPostgres() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS creators (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      profile_link TEXT NOT NULL UNIQUE,
      follower_count INTEGER NOT NULL DEFAULT 0,
      following_count INTEGER NOT NULL DEFAULT 0,
      total_likes INTEGER NOT NULL DEFAULT 0,
      country TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      niche TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      profile_image TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'For Approval',
      assigned_to TEXT NOT NULL DEFAULT '',
      saved_by_name TEXT NOT NULL DEFAULT '',
      saved_by_email TEXT NOT NULL DEFAULT '',
      contact_date TEXT NOT NULL DEFAULT '',
      response_status TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      saved_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS creator_activity (
      id SERIAL PRIMARY KEY,
      creator_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor_name TEXT NOT NULL DEFAULT '',
      actor_email TEXT NOT NULL DEFAULT '',
      detail TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_creators_status ON creators(status);
    CREATE INDEX IF NOT EXISTS idx_creators_updated_at ON creators(updated_at);
    CREATE INDEX IF NOT EXISTS idx_creator_activity_creator_id ON creator_activity(creator_id);
  `);

  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM creators");
  if (rows[0]?.count > 0) return;
  for (const seed of seedCreators) {
    await insertCreator(seed, actorFromBody(seed));
  }
}

function initMemory() {
  if (memory.ready) return;
  for (const seed of seedCreators) {
    const creator = createRecord(seed, actorFromBody(seed));
    memory.creators.push(creator);
    memory.activity.push({
      id: memory.activity.length + 1,
      creatorId: creator.id,
      action: "Creator saved",
      actorName: creator.savedByName,
      actorEmail: creator.savedByEmail,
      detail: `Saved @${creator.username}`,
      createdAt: creator.savedAt,
    });
  }
  memory.ready = true;
}

async function listCreators() {
  if (!pool) {
    initMemory();
    return [...memory.creators].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  await initPostgres();
  const { rows } = await pool.query("SELECT * FROM creators ORDER BY updated_at DESC, saved_at DESC");
  return rows.map(toCamel);
}

async function findDuplicate(input) {
  const username = normalizeUsername(input);
  const profileLink = normalizeProfileLink(input.profileLink);
  if (!pool) {
    initMemory();
    return memory.creators.find((creator) => creator.username === username || creator.profileLink === profileLink);
  }
  await initPostgres();
  const { rows } = await pool.query(
    "SELECT * FROM creators WHERE username = $1 OR profile_link = $2 LIMIT 1",
    [username, profileLink],
  );
  return rows[0] ? toCamel(rows[0]) : null;
}

async function insertCreator(input, actor) {
  const duplicate = await findDuplicate(input);
  if (duplicate) return duplicate;

  const creator = createRecord(input, actor);
  if (!pool) {
    memory.creators.push(creator);
    memory.activity.push({
      id: memory.activity.length + 1,
      creatorId: creator.id,
      action: "Creator saved",
      actorName: actor.name,
      actorEmail: actor.email,
      detail: `Saved @${creator.username}`,
      createdAt: creator.savedAt,
    });
    return creator;
  }

  await pool.query(
    `INSERT INTO creators (
      id, username, display_name, profile_link, follower_count, following_count,
      total_likes, country, email, niche, bio, profile_image, status, assigned_to,
      saved_by_name, saved_by_email, contact_date, response_status, notes, saved_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
    [
      creator.id,
      creator.username,
      creator.displayName,
      creator.profileLink,
      creator.followerCount,
      creator.followingCount,
      creator.totalLikes,
      creator.country,
      creator.email,
      creator.niche,
      creator.bio,
      creator.profileImage,
      creator.status,
      creator.assignedTo,
      creator.savedByName,
      creator.savedByEmail,
      creator.contactDate,
      creator.responseStatus,
      creator.notes,
      creator.savedAt,
      creator.updatedAt,
    ],
  );
  await addActivity(creator.id, "Creator saved", actor, `Saved @${creator.username}`);
  return creator;
}

async function getCreator(id) {
  if (!pool) {
    initMemory();
    return memory.creators.find((creator) => creator.id === id) ?? null;
  }
  await initPostgres();
  const { rows } = await pool.query("SELECT * FROM creators WHERE id = $1", [id]);
  return rows[0] ? toCamel(rows[0]) : null;
}

async function getActivity(id) {
  if (!pool) {
    initMemory();
    return memory.activity
      .filter((item) => item.creatorId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  await initPostgres();
  const { rows } = await pool.query(
    "SELECT * FROM creator_activity WHERE creator_id = $1 ORDER BY created_at DESC, id DESC",
    [id],
  );
  return rows.map(activityToCamel);
}

async function addActivity(creatorId, action, actor, detail) {
  const createdAt = new Date().toISOString();
  if (!pool) {
    memory.activity.push({
      id: memory.activity.length + 1,
      creatorId,
      action,
      actorName: actor.name,
      actorEmail: actor.email,
      detail,
      createdAt,
    });
    return;
  }
  await pool.query(
    "INSERT INTO creator_activity (creator_id, action, actor_name, actor_email, detail, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
    [creatorId, action, actor.name, actor.email, detail, createdAt],
  );
}

async function updateCreator(id, input, actor) {
  const current = await getCreator(id);
  if (!current) return null;

  const next = {
    ...current,
    displayName: input.displayName === undefined ? current.displayName : clean(input.displayName),
    country: input.country === undefined ? current.country : clean(input.country),
    email: input.email === undefined ? current.email : clean(input.email),
    niche: input.niche === undefined ? current.niche : clean(input.niche),
    bio: input.bio === undefined ? current.bio : clean(input.bio),
    status: input.status === undefined ? current.status : normalizeStatus(input.status),
    assignedTo: input.assignedTo === undefined ? current.assignedTo : clean(input.assignedTo),
    notes: input.notes === undefined ? current.notes : clean(input.notes),
    responseStatus: input.responseStatus === undefined ? current.responseStatus : clean(input.responseStatus),
    updatedAt: new Date().toISOString(),
  };

  const detail =
    current.status !== next.status
      ? `Status changed from ${current.status} to ${next.status}`
      : "Creator details updated";

  if (!pool) {
    memory.creators = memory.creators.map((creator) => (creator.id === id ? next : creator));
    await addActivity(id, current.status !== next.status ? "Status changed" : "Creator updated", actor, detail);
    return next;
  }

  await pool.query(
    `UPDATE creators SET
      display_name = $1, country = $2, email = $3, niche = $4, bio = $5,
      status = $6, assigned_to = $7, notes = $8, response_status = $9, updated_at = $10
    WHERE id = $11`,
    [
      next.displayName,
      next.country,
      next.email,
      next.niche,
      next.bio,
      next.status,
      next.assignedTo,
      next.notes,
      next.responseStatus,
      next.updatedAt,
      id,
    ],
  );
  await addActivity(id, current.status !== next.status ? "Status changed" : "Creator updated", actor, detail);
  return next;
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, storage: pool ? "postgres" : "memory" });
});

app.get("/api/creators", async (_request, response) => {
  try {
    response.json({ creators: await listCreators(), statuses });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.post("/api/creators", async (request, response) => {
  try {
    const duplicate = await findDuplicate(request.body);
    if (duplicate) {
      response.status(409).json({ error: "Creator already exists.", duplicate });
      return;
    }
    const creator = await insertCreator(request.body, actorFromBody(request.body));
    response.status(201).json({ creator });
  } catch (error) {
    response.status(error.message.includes("required") ? 400 : 500).json({ error: error.message });
  }
});

app.get("/api/creators/:id", async (request, response) => {
  try {
    const creator = await getCreator(request.params.id);
    if (!creator) {
      response.status(404).json({ error: "Creator not found." });
      return;
    }
    response.json({ creator, activity: await getActivity(request.params.id) });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.patch("/api/creators/:id", async (request, response) => {
  try {
    const creator = await updateCreator(request.params.id, request.body, actorFromBody(request.body));
    if (!creator) {
      response.status(404).json({ error: "Creator not found." });
      return;
    }
    response.json({ creator, activity: await getActivity(request.params.id) });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.post("/api/sheets/sync", async (_request, response) => {
  const creators = await listCreators();
  response.json({
    ok: true,
    mode: "ready",
    rowsPrepared: creators.length,
    message:
      "Add Google service credentials and a spreadsheet ID to push rows with the Google Sheets API.",
  });
});

await initPostgres();
app.listen(port, () => {
  console.log(`LGPORT creator backend running on port ${port}`);
});
