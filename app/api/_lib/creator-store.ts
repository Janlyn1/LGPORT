import { getRawDb } from "@/db";

export type CreatorStatus =
  | "For Approval"
  | "Approved"
  | "Rejected"
  | "Ready to Contact"
  | "Contacted"
  | "Replied"
  | "Negotiating"
  | "Closed"
  | "Do Not Contact";

export type CreatorRow = {
  id: string;
  username: string;
  displayName: string;
  profileLink: string;
  followerCount: number;
  followingCount: number;
  totalLikes: number;
  country: string;
  email: string;
  niche: string;
  bio: string;
  profileImage: string;
  status: CreatorStatus;
  assignedTo: string;
  savedByName: string;
  savedByEmail: string;
  contactDate: string;
  responseStatus: string;
  notes: string;
  savedAt: string;
  updatedAt: string;
};

export type ActivityRow = {
  id: number;
  creatorId: string;
  action: string;
  actorName: string;
  actorEmail: string;
  detail: string;
  createdAt: string;
};

export type Actor = {
  name: string;
  email: string;
};

export type CreatorInput = Partial<
  Omit<CreatorRow, "id" | "savedAt" | "updatedAt" | "status">
> & {
  status?: CreatorStatus;
};

const VALID_STATUSES: CreatorStatus[] = [
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

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS creators (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    display_name TEXT NOT NULL,
    profile_link TEXT NOT NULL,
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
    saved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_creators_username_unique
    ON creators(username)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_creators_profile_link_unique
    ON creators(profile_link)`,
  `CREATE INDEX IF NOT EXISTS idx_creators_status
    ON creators(status)`,
  `CREATE INDEX IF NOT EXISTS idx_creators_updated_at
    ON creators(updated_at)`,
  `CREATE TABLE IF NOT EXISTS creator_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_name TEXT NOT NULL DEFAULT '',
    actor_email TEXT NOT NULL DEFAULT '',
    detail TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_creator_activity_creator_id
    ON creator_activity(creator_id)`,
  `CREATE INDEX IF NOT EXISTS idx_creator_activity_created_at
    ON creator_activity(created_at)`,
];

const seedCreators: CreatorInput[] = [
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

function now() {
  return new Date().toISOString();
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value !== "string") return 0;
  const parsed = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeProfileLink(value: unknown) {
  const link = clean(value);
  if (!link) return "";
  if (link.startsWith("http://") || link.startsWith("https://")) return link;
  return `https://${link}`;
}

function normalizeUsername(input: CreatorInput) {
  const manual = clean(input.username).replace(/^@/, "");
  if (manual) return manual.toLowerCase();

  const link = normalizeProfileLink(input.profileLink);
  const match = link.match(/tiktok\.com\/@([^/?#]+)/i);
  return match?.[1]?.toLowerCase() ?? "";
}

function normalizeStatus(status: unknown): CreatorStatus {
  return VALID_STATUSES.includes(status as CreatorStatus)
    ? (status as CreatorStatus)
    : "For Approval";
}

function mapCreator(row: Record<string, unknown>): CreatorRow {
  return {
    id: String(row.id),
    username: String(row.username),
    displayName: String(row.display_name),
    profileLink: String(row.profile_link),
    followerCount: Number(row.follower_count ?? 0),
    followingCount: Number(row.following_count ?? 0),
    totalLikes: Number(row.total_likes ?? 0),
    country: String(row.country ?? ""),
    email: String(row.email ?? ""),
    niche: String(row.niche ?? ""),
    bio: String(row.bio ?? ""),
    profileImage: String(row.profile_image ?? ""),
    status: normalizeStatus(row.status),
    assignedTo: String(row.assigned_to ?? ""),
    savedByName: String(row.saved_by_name ?? ""),
    savedByEmail: String(row.saved_by_email ?? ""),
    contactDate: String(row.contact_date ?? ""),
    responseStatus: String(row.response_status ?? ""),
    notes: String(row.notes ?? ""),
    savedAt: String(row.saved_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function mapActivity(row: Record<string, unknown>): ActivityRow {
  return {
    id: Number(row.id),
    creatorId: String(row.creator_id),
    action: String(row.action),
    actorName: String(row.actor_name ?? ""),
    actorEmail: String(row.actor_email ?? ""),
    detail: String(row.detail ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

export async function ensureCreatorSchema() {
  const db = getRawDb();
  await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
}

export async function ensureSeedData() {
  const db = getRawDb();
  const countResult = await db.prepare("SELECT COUNT(*) AS count FROM creators").first<{ count: number }>();
  if ((countResult?.count ?? 0) > 0) return;

  for (const creator of seedCreators) {
    const saved = await createCreator(creator, {
      name: creator.savedByName || "System",
      email: creator.savedByEmail || "",
    });
    await addActivity(saved.id, "Status changed", {
      name: creator.savedByName || "System",
      email: creator.savedByEmail || "",
    }, `Status set to ${saved.status}`);
  }
}

export async function listCreators() {
  await ensureCreatorSchema();
  await ensureSeedData();
  const db = getRawDb();
  const result = await db
    .prepare("SELECT * FROM creators ORDER BY updated_at DESC, saved_at DESC")
    .all<Record<string, unknown>>();
  return (result.results ?? []).map(mapCreator);
}

export async function getCreator(id: string) {
  await ensureCreatorSchema();
  const db = getRawDb();
  const creator = await db
    .prepare("SELECT * FROM creators WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();
  if (!creator) return null;
  return mapCreator(creator);
}

export async function getCreatorActivity(id: string) {
  await ensureCreatorSchema();
  const db = getRawDb();
  const result = await db
    .prepare(
      "SELECT * FROM creator_activity WHERE creator_id = ? ORDER BY created_at DESC, id DESC",
    )
    .bind(id)
    .all<Record<string, unknown>>();
  return (result.results ?? []).map(mapActivity);
}

export async function findDuplicate(input: CreatorInput) {
  await ensureCreatorSchema();
  const db = getRawDb();
  const username = normalizeUsername(input);
  const profileLink = normalizeProfileLink(input.profileLink);
  if (!username && !profileLink) return null;

  const row = await db
    .prepare("SELECT * FROM creators WHERE username = ? OR profile_link = ? LIMIT 1")
    .bind(username, profileLink)
    .first<Record<string, unknown>>();
  return row ? mapCreator(row) : null;
}

export async function createCreator(input: CreatorInput, actor: Actor) {
  await ensureCreatorSchema();
  const db = getRawDb();
  const username = normalizeUsername(input);
  const profileLink = normalizeProfileLink(input.profileLink);
  const displayName = clean(input.displayName) || username || "Untitled creator";
  const timestamp = now();

  if (!username) {
    throw new Error("Username or TikTok profile link is required.");
  }
  if (!profileLink) {
    throw new Error("TikTok profile link is required.");
  }

  const duplicate = await findDuplicate({ username, profileLink });
  if (duplicate) {
    const error = new Error("Creator already exists.");
    error.cause = duplicate;
    throw error;
  }

  const creator: CreatorRow = {
    id: crypto.randomUUID(),
    username,
    displayName,
    profileLink,
    followerCount: cleanNumber(input.followerCount),
    followingCount: cleanNumber(input.followingCount),
    totalLikes: cleanNumber(input.totalLikes),
    country: clean(input.country),
    email: clean(input.email),
    niche: clean(input.niche),
    bio: clean(input.bio),
    profileImage: clean(input.profileImage),
    status: normalizeStatus(input.status),
    assignedTo: clean(input.assignedTo),
    savedByName: actor.name || clean(input.savedByName) || "Research Team",
    savedByEmail: actor.email || clean(input.savedByEmail),
    contactDate: clean(input.contactDate),
    responseStatus: clean(input.responseStatus) || "Not contacted",
    notes: clean(input.notes),
    savedAt: timestamp,
    updatedAt: timestamp,
  };

  await db
    .prepare(
      `INSERT INTO creators (
        id, username, display_name, profile_link, follower_count, following_count,
        total_likes, country, email, niche, bio, profile_image, status,
        assigned_to, saved_by_name, saved_by_email, contact_date, response_status,
        notes, saved_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
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
    )
    .run();

  await addActivity(creator.id, "Creator saved", actor, `Saved @${creator.username}`);
  return creator;
}

export async function updateCreator(id: string, input: CreatorInput, actor: Actor) {
  await ensureCreatorSchema();
  const current = await getCreator(id);
  if (!current) return null;

  const db = getRawDb();
  const next: CreatorRow = {
    ...current,
    displayName: clean(input.displayName) || current.displayName,
    profileLink: normalizeProfileLink(input.profileLink) || current.profileLink,
    followerCount:
      input.followerCount === undefined ? current.followerCount : cleanNumber(input.followerCount),
    followingCount:
      input.followingCount === undefined ? current.followingCount : cleanNumber(input.followingCount),
    totalLikes: input.totalLikes === undefined ? current.totalLikes : cleanNumber(input.totalLikes),
    country: input.country === undefined ? current.country : clean(input.country),
    email: input.email === undefined ? current.email : clean(input.email),
    niche: input.niche === undefined ? current.niche : clean(input.niche),
    bio: input.bio === undefined ? current.bio : clean(input.bio),
    profileImage:
      input.profileImage === undefined ? current.profileImage : clean(input.profileImage),
    status: input.status === undefined ? current.status : normalizeStatus(input.status),
    assignedTo: input.assignedTo === undefined ? current.assignedTo : clean(input.assignedTo),
    contactDate: input.contactDate === undefined ? current.contactDate : clean(input.contactDate),
    responseStatus:
      input.responseStatus === undefined ? current.responseStatus : clean(input.responseStatus),
    notes: input.notes === undefined ? current.notes : clean(input.notes),
    updatedAt: now(),
  };

  await db
    .prepare(
      `UPDATE creators SET
        display_name = ?, profile_link = ?, follower_count = ?, following_count = ?,
        total_likes = ?, country = ?, email = ?, niche = ?, bio = ?,
        profile_image = ?, status = ?, assigned_to = ?, contact_date = ?,
        response_status = ?, notes = ?, updated_at = ?
      WHERE id = ?`,
    )
    .bind(
      next.displayName,
      next.profileLink,
      next.followerCount,
      next.followingCount,
      next.totalLikes,
      next.country,
      next.email,
      next.niche,
      next.bio,
      next.profileImage,
      next.status,
      next.assignedTo,
      next.contactDate,
      next.responseStatus,
      next.notes,
      next.updatedAt,
      id,
    )
    .run();

  const detail =
    current.status !== next.status
      ? `Status changed from ${current.status} to ${next.status}`
      : current.assignedTo !== next.assignedTo
        ? `Assigned to ${next.assignedTo || "Unassigned"}`
        : "Creator details updated";
  await addActivity(id, current.status !== next.status ? "Status changed" : "Creator updated", actor, detail);

  return next;
}

export async function addActivity(
  creatorId: string,
  action: string,
  actor: Actor,
  detail = "",
) {
  await ensureCreatorSchema();
  const db = getRawDb();
  await db
    .prepare(
      `INSERT INTO creator_activity (
        creator_id, action, actor_name, actor_email, detail, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(creatorId, action, actor.name, actor.email, detail, now())
    .run();
}

export function statusOptions() {
  return VALID_STATUSES;
}
