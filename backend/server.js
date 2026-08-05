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
const defaultUserEmail = process.env.DEFAULT_USER_EMAIL || "janlynrustila01@gmail.com";
const publicAccess = process.env.PUBLIC_ACCESS !== "false";
const tiktokResearchClientKey =
  process.env.TIKTOK_RESEARCH_CLIENT_KEY || process.env.TIKTOK_CLIENT_KEY || "";
const tiktokResearchClientSecret =
  process.env.TIKTOK_RESEARCH_CLIENT_SECRET || process.env.TIKTOK_CLIENT_SECRET || "";
const tiktokResearchKeywords = (
  process.env.TIKTOK_RESEARCH_KEYWORDS ||
  "beauty,skincare,haircare,makeup,cosmetics,self care,personal care,lifestyle,wellness,grwm"
)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean)
  .slice(0, 20);
const tiktokResearchLookbackDays = Math.max(
  1,
  Math.min(Number(process.env.TIKTOK_RESEARCH_LOOKBACK_DAYS || 7), 30),
);
const tiktokResearchMaxTotal = Math.max(
  20,
  Math.min(Number(process.env.TIKTOK_RESEARCH_MAX_TOTAL || 300), 1000),
);
const tiktokResearchMaxUsers = Math.max(
  10,
  Math.min(Number(process.env.TIKTOK_RESEARCH_MAX_USERS || 100), 300),
);
const tiktokResearchMinFollowers = Math.max(
  0,
  Number(process.env.TIKTOK_RESEARCH_MIN_FOLLOWERS || 2000),
);
const tiktokResearchMaxFollowers = Math.max(
  tiktokResearchMinFollowers,
  Number(process.env.TIKTOK_RESEARCH_MAX_FOLLOWERS || 20000),
);
const keyApiBaseUrl = (process.env.KEYAPI_BASE_URL || "https://api.keyapi.ai").replace(/\/+$/, "");
const keyApiKey = process.env.KEYAPI_API_KEY || process.env.CREATOR_DATA_PROVIDER_API_KEY || "";
const keyApiKeywords = (
  process.env.KEYAPI_KEYWORDS ||
  "beauty,beauty creator,skincare,skin care,makeup,haircare,self care,personal care,lifestyle,beauty products,care products,grwm"
)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean)
  .slice(0, 20);
const keyApiMaxTotal = Math.max(
  20,
  Math.min(Number(process.env.KEYAPI_MAX_TOTAL || tiktokResearchMaxTotal), 1000),
);
const keyApiSuggestionCount = Math.max(
  5,
  Math.min(Number(process.env.KEYAPI_SUGGESTION_COUNT || 10), 50),
);
const keyApiVideoLookupLimit = Math.max(
  0,
  Math.min(Number(process.env.KEYAPI_VIDEO_LOOKUP_LIMIT || 30), 200),
);

const allowedCategories = [
  "Beauty",
  "Lifestyle",
  "Personal Care",
  "Skincare",
  "Haircare",
  "Cosmetics",
  "Wellness",
  "Self Care",
];

const savedStatuses = [
  "Saved",
  "Already Messaged",
  "Approved",
  "Not Approved",
  "Rejected",
];

const sheetHeaders = [
  "Date Saved",
  "Creator Name",
  "TikTok Username",
  "TikTok Profile URL",
  "Followers",
  "Following",
  "Likes",
  "Category",
  "Email",
  "Location",
  "State",
  "Country",
  "Bio",
  "Website Link",
  "Instagram",
  "YouTube",
  "Status",
  "Saved By",
  "Last Updated",
];

const creatorHeaders = [
  "Creator ID",
  "Creator Name",
  "TikTok Username",
  "TikTok Profile URL",
  "Followers",
  "Following",
  "Likes",
  "Category",
  "Email",
  "Location",
  "State",
  "Country",
  "Bio",
  "Website Link",
  "Instagram",
  "YouTube",
  "Profile Picture",
  "Last Updated",
];

const sampleAuthorizedUsers = [
  { gmail: "janlynrustila01@gmail.com", name: "Janlyn", role: "Admin", status: "Active" },
];

const sampleCreators = [
  {
    creatorId: "BL001",
    name: "Beauty Lifestyle Lead 01",
    username: "beautylifestylelead01",
    tiktokLink: "https://www.tiktok.com/search?q=beauty%20products%20lifestyle%20creator",
    followers: "18.4K",
    followerCount: 18400,
    following: "612",
    followingCount: 612,
    likes: "132K",
    likesCount: 132000,
    category: "Beauty",
    email: "beautylead01@example.com",
    location: "Los Angeles, CA",
    city: "Los Angeles",
    state: "California",
    country: "United States",
    bio: "Beauty creator sharing skincare finds, daily routines, and lifestyle favorites.",
    website: "https://example.com/beautylead01",
    instagram: "https://instagram.com/beautylead01",
    youtube: "",
    profilePicture: "",
    lastUpdated: "2026-08-06",
    confidence: 96,
  },
  {
    creatorId: "BL002",
    name: "Glow Routine Lead 02",
    username: "glowroutinelead02",
    tiktokLink: "https://www.tiktok.com/search?q=skincare%20routine%20creator",
    followers: "16.8K",
    followerCount: 16800,
    following: "488",
    followingCount: 488,
    likes: "118K",
    likesCount: 118000,
    category: "Skincare",
    email: "glowlead02@example.com",
    location: "Austin, TX",
    city: "Austin",
    state: "Texas",
    country: "United States",
    bio: "Daily skincare, sunscreen picks, gentle routines, and product reviews.",
    website: "",
    instagram: "https://instagram.com/glowroutinelead02",
    youtube: "",
    profilePicture: "",
    lastUpdated: "2026-08-06",
    confidence: 94,
  },
  {
    creatorId: "BL003",
    name: "Makeup Finds Lead 03",
    username: "makeupfindslead03",
    tiktokLink: "https://www.tiktok.com/search?q=makeup%20finds%20creator",
    followers: "14.2K",
    followerCount: 14200,
    following: "790",
    followingCount: 790,
    likes: "91K",
    likesCount: 91000,
    category: "Cosmetics",
    email: "",
    location: "Miami, FL",
    city: "Miami",
    state: "Florida",
    country: "United States",
    bio: "Affordable makeup finds, quick GRWM clips, and new cosmetics try-ons.",
    website: "https://example.com/makeupfinds03",
    instagram: "https://instagram.com/makeupfindslead03",
    youtube: "",
    profilePicture: "",
    lastUpdated: "2026-08-06",
    confidence: 91,
  },
  {
    creatorId: "BL004",
    name: "Self Care Lead 04",
    username: "selfcarelead04",
    tiktokLink: "https://www.tiktok.com/search?q=self%20care%20beauty%20creator",
    followers: "12.6K",
    followerCount: 12600,
    following: "351",
    followingCount: 351,
    likes: "84K",
    likesCount: 84000,
    category: "Self Care",
    email: "selfcarelead04@example.com",
    location: "New York, NY",
    city: "New York",
    state: "New York",
    country: "United States",
    bio: "Self care, personal care routines, bath products, and simple lifestyle content.",
    website: "",
    instagram: "",
    youtube: "",
    profilePicture: "",
    lastUpdated: "2026-08-06",
    confidence: 93,
  },
  {
    creatorId: "BL005",
    name: "Lifestyle Beauty Lead 05",
    username: "lifestylebeautylead05",
    tiktokLink: "https://www.tiktok.com/search?q=lifestyle%20beauty%20creator",
    followers: "10.9K",
    followerCount: 10900,
    following: "525",
    followingCount: 525,
    likes: "79K",
    likesCount: 79000,
    category: "Lifestyle",
    email: "lifestylelead05@example.com",
    location: "Las Vegas, NV",
    city: "Las Vegas",
    state: "Nevada",
    country: "United States",
    bio: "Beauty, errands, routines, and easy lifestyle recommendations.",
    website: "",
    instagram: "https://instagram.com/lifestylebeautylead05",
    youtube: "",
    profilePicture: "",
    lastUpdated: "2026-08-06",
    confidence: 88,
  },
  {
    creatorId: "BL006",
    name: "Affordable Beauty Lead 06",
    username: "affordablebeautylead06",
    tiktokLink: "https://www.tiktok.com/search?q=affordable%20beauty%20products%20creator",
    followers: "9.7K",
    followerCount: 9700,
    following: "284",
    followingCount: 284,
    likes: "56K",
    likesCount: 56000,
    category: "Beauty",
    email: "",
    location: "Phoenix, AZ",
    city: "Phoenix",
    state: "Arizona",
    country: "United States",
    bio: "Drugstore beauty products, skincare under budget, and honest mini reviews.",
    website: "",
    instagram: "",
    youtube: "",
    profilePicture: "",
    lastUpdated: "2026-08-06",
    confidence: 89,
  },
  {
    creatorId: "BL007",
    name: "GRWM Beauty Lead 07",
    username: "grwmbeautylead07",
    tiktokLink: "https://www.tiktok.com/search?q=grwm%20beauty%20creator",
    followers: "8.1K",
    followerCount: 8100,
    following: "432",
    followingCount: 432,
    likes: "49K",
    likesCount: 49000,
    category: "Lifestyle",
    email: "grwmlead07@example.com",
    location: "Seattle, WA",
    city: "Seattle",
    state: "Washington",
    country: "United States",
    bio: "GRWM, beauty lifestyle, hair routines, and everyday product recs.",
    website: "https://example.com/grwmlead07",
    instagram: "https://instagram.com/grwmbeautylead07",
    youtube: "",
    profilePicture: "",
    lastUpdated: "2026-08-06",
    confidence: 90,
  },
  {
    creatorId: "BL008",
    name: "Skincare Finds Lead 08",
    username: "skincarefindslead08",
    tiktokLink: "https://www.tiktok.com/search?q=skincare%20finds%20creator",
    followers: "6.8K",
    followerCount: 6800,
    following: "190",
    followingCount: 190,
    likes: "36K",
    likesCount: 36000,
    category: "Skincare",
    email: "skincarelead08@example.com",
    location: "San Diego, CA",
    city: "San Diego",
    state: "California",
    country: "United States",
    bio: "Skincare routine testing, cleanser reviews, and sensitive skin favorites.",
    website: "",
    instagram: "https://instagram.com/skincarefindslead08",
    youtube: "",
    profilePicture: "",
    lastUpdated: "2026-08-06",
    confidence: 95,
  },
  {
    creatorId: "BL009",
    name: "Hair Care Lead 09",
    username: "haircarelead09",
    tiktokLink: "https://www.tiktok.com/search?q=haircare%20creator%20usa",
    followers: "5.3K",
    followerCount: 5300,
    following: "270",
    followingCount: 270,
    likes: "29K",
    likesCount: 29000,
    category: "Haircare",
    email: "",
    location: "Orlando, FL",
    city: "Orlando",
    state: "Florida",
    country: "United States",
    bio: "Haircare wash days, styling creams, scalp care, and product demos.",
    website: "",
    instagram: "https://instagram.com/haircarelead09",
    youtube: "",
    profilePicture: "",
    lastUpdated: "2026-08-06",
    confidence: 92,
  },
  {
    creatorId: "BL010",
    name: "Everyday Glow Lead 10",
    username: "everydayglowlead10",
    tiktokLink: "https://www.tiktok.com/search?q=everyday%20beauty%20routine%20creator",
    followers: "4.4K",
    followerCount: 4400,
    following: "301",
    followingCount: 301,
    likes: "21K",
    likesCount: 21000,
    category: "Personal Care",
    email: "glowlead10@example.com",
    location: "Dallas, TX",
    city: "Dallas",
    state: "Texas",
    country: "United States",
    bio: "Personal care routines, body care, beauty basics, and everyday glow tips.",
    website: "",
    instagram: "",
    youtube: "",
    profilePicture: "",
    lastUpdated: "2026-08-06",
    confidence: 89,
  },
  {
    creatorId: "BL011",
    name: "New Beauty Lead 11",
    username: "newbeautylead11",
    tiktokLink: "https://www.tiktok.com/search?q=new%20beauty%20creator%20tiktok",
    followers: "3.2K",
    followerCount: 3200,
    following: "144",
    followingCount: 144,
    likes: "16K",
    likesCount: 16000,
    category: "Cosmetics",
    email: "",
    location: "Reno, NV",
    city: "Reno",
    state: "Nevada",
    country: "United States",
    bio: "New beauty creator focused on makeup, cosmetics, and lifestyle clips.",
    website: "",
    instagram: "",
    youtube: "",
    profilePicture: "",
    lastUpdated: "2026-08-06",
    confidence: 86,
  },
  {
    creatorId: "BL012",
    name: "Starter Lifestyle Lead 12",
    username: "starterlifestylelead12",
    tiktokLink: "https://www.tiktok.com/search?q=small%20lifestyle%20beauty%20creator",
    followers: "2.4K",
    followerCount: 2400,
    following: "208",
    followingCount: 208,
    likes: "11K",
    likesCount: 11000,
    category: "Wellness",
    email: "starterlead12@example.com",
    location: "Brooklyn, NY",
    city: "Brooklyn",
    state: "New York",
    country: "United States",
    bio: "Wellness, self care, beauty lifestyle, and small creator product content.",
    website: "",
    instagram: "https://instagram.com/starterlifestylelead12",
    youtube: "",
    profilePicture: "",
    lastUpdated: "2026-08-06",
    confidence: 87,
  },
];

const memory = {
  savedByEmail: new Map(),
  skippedByEmail: new Map(),
  logsByEmail: new Map(),
  manualCreators: [],
  providerCreators: [],
  providerVideosScanned: 0,
  providerUpdatedAt: "",
};

const tiktokTokenCache = {
  accessToken: "",
  expiresAt: 0,
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

function formatFollowers(value) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function slugFromEmail(email) {
  const [local, domain = "gmail"] = String(email || "").toLowerCase().split("@");
  const safeLocal = local.replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  const safeDomain = domain.split(".")[0].replace(/[^a-z0-9_]+/g, "_");
  return safeLocal || safeDomain || "user";
}

function savedSheetName(email) {
  return `Saved - ${slugFromEmail(email)}`.slice(0, 90);
}

function skippedSheetName(email) {
  return `Skipped - ${slugFromEmail(email)}`.slice(0, 90);
}

function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(value).toLowerCase());
}

function nameFromEmail(email) {
  return String(email || "")
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function publicUser() {
  return {
    email: defaultUserEmail.toLowerCase(),
    name: nameFromEmail(defaultUserEmail),
    role: "Admin",
  };
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
  try {
    const [body, signature] = String(token || "").split(".");
    if (!body || !signature) return null;
    const expected = crypto.createHmac("sha256", jwtSecret).update(body).digest("base64url");
    if (signature.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function requireUser(request, response, next) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  const user = token ? readSession(token) : publicAccess ? publicUser() : null;
  if (!user) {
    response.status(401).json({ error: "Login required." });
    return;
  }
  request.user = user;
  next();
}

function requireAdmin(request, response, next) {
  if (request.user?.role !== "Admin") {
    response.status(403).json({ error: "Access Denied" });
    return;
  }
  next();
}

function serviceAccountConfig() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (error) {
      console.error("GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON:", error.message);
      return null;
    }
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
  try {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    return response.data.values || [];
  } catch (error) {
    if (error.code === 400 || error.code === 404) return [];
    throw error;
  }
}

async function ensureSheet(title, headers) {
  const sheets = await sheetsClient();
  if (!sheets) return;
  const metadata = await getSheetMetadata();
  const exists = metadata?.some((sheet) => sheet.properties?.title === title);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    });
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${title}'!A1:${String.fromCharCode(64 + headers.length)}1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [headers] },
  });
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

function creatorToAllCreatorsRow(creator) {
  const row = normalizeCreator(creator);
  return [
    row.creatorId,
    row.name,
    row.username,
    row.tiktokLink,
    row.followers,
    row.following,
    row.likes,
    row.category,
    row.email,
    row.location,
    row.state,
    "United States",
    row.bio,
    row.website,
    row.instagram,
    row.youtube,
    row.profilePicture,
    row.lastUpdated,
  ];
}

async function replaceAllCreators(creators) {
  if (!sheetsEnabled() || !creators.length) return false;
  const sheets = await sheetsClient();
  await ensureSheet("All Creators", creatorHeaders);
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "'All Creators'!A2:R",
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "'All Creators'!A1:R",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [creatorHeaders, ...creators.map(creatorToAllCreatorsRow)] },
  });
  return true;
}

function normalizeCreator(input = {}) {
  const username = clean(input.username || input.tiktokUsername || input.handle)
    .replace(/^@/, "")
    .toLowerCase();
  const tiktokLink =
    clean(input.tiktokLink || input.tiktokProfileUrl || input.profileUrl) ||
    (username ? `https://www.tiktok.com/@${username}` : "");
  const followerCount = parseFollowers(input.followers ?? input.followerCount);
  const likesCount = parseFollowers(input.likes ?? input.likesCount);
  const followingCount = parseFollowers(input.following ?? input.followingCount);
  return {
    creatorId: clean(input.creatorId) || username || crypto.randomUUID(),
    name: clean(input.name || input.creatorName) || username || "Untitled Creator",
    username,
    tiktokLink,
    followers: clean(input.followers) || formatFollowers(followerCount),
    followerCount,
    following: clean(input.following) || String(followingCount || ""),
    followingCount,
    likes: clean(input.likes) || formatFollowers(likesCount),
    likesCount,
    category: clean(input.category) || detectCategory(input.bio || ""),
    email: clean(input.email),
    location: clean(input.location) || [clean(input.city), clean(input.state)].filter(Boolean).join(", "),
    city: clean(input.city),
    state: clean(input.state),
    country: "United States",
    bio: clean(input.bio),
    website: clean(input.website || input.websiteLink),
    instagram: clean(input.instagram),
    youtube: clean(input.youtube),
    profilePicture: clean(input.profilePicture || input.profileImage),
    status: clean(input.status) || "Saved",
    savedBy: clean(input.savedBy),
    lastUpdated: clean(input.lastUpdated) || new Date().toISOString().slice(0, 10),
    confidence: Number(input.confidence || 0),
  };
}

function detectCategory(text = "") {
  const value = String(text).toLowerCase();
  const rules = [
    ["Haircare", ["hair", "haircare", "hair care", "wash day", "scalp", "curls"]],
    ["Skincare", ["skin", "skincare", "skin care", "sunscreen", "cleanser", "serum"]],
    ["Cosmetics", ["makeup", "cosmetics", "lip", "foundation", "glam"]],
    ["Personal Care", ["body care", "bodycare", "personal care", "care products", "deodorant", "bath"]],
    ["Self Care", ["self care", "selfcare", "self-care", "wellness"]],
    ["Beauty", ["beauty", "glow", "routine", "beauty products"]],
    ["Lifestyle", ["lifestyle", "daily", "daily routine", "vlog", "grwm", "fashion"]],
  ];
  const match = rules.find(([, keywords]) => keywords.some((keyword) => value.includes(keyword)));
  return match?.[0] || "Beauty";
}

function tiktokResearchConfigured() {
  return Boolean(tiktokResearchClientKey && tiktokResearchClientSecret);
}

function keyApiConfigured() {
  return Boolean(keyApiKey);
}

function dateStamp(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function numberFromAny(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return parseFollowers(value);
}

const usStates = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

const usStateAbbreviations = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

function extractEmail(text = "") {
  const match = String(text).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] || "";
}

function extractBioLocation(text = "") {
  const value = String(text);
  const lower = value.toLowerCase();
  const state = usStates.find((item) => lower.includes(item.toLowerCase()));
  if (state) return { state, location: state, locationStatus: "Bio-stated location" };
  const abbreviationMatch = value.match(/\b([A-Z]{2})\b/g) || [];
  const abbreviation = abbreviationMatch.find((item) => usStateAbbreviations[item]);
  if (abbreviation) {
    return {
      state: usStateAbbreviations[abbreviation],
      location: usStateAbbreviations[abbreviation],
      locationStatus: "Bio-stated location",
    };
  }
  return { state: "", location: "", locationStatus: "Verified US region" };
}

function firstValue(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && clean(String(value))) return value;
  }
  return "";
}

function imageUrlFromAny(value) {
  if (!value) return "";
  if (typeof value === "string") return clean(value);
  if (Array.isArray(value)) return clean(value.find(Boolean));
  if (typeof value === "object") {
    if (Array.isArray(value.url_list)) return clean(value.url_list.find(Boolean));
    return clean(value.url || value.uri || "");
  }
  return "";
}

function keyApiRegionAllowed(region) {
  const normalized = clean(region).toUpperCase();
  return !normalized || normalized === "US" || normalized === "USA" || normalized === "UNITED STATES";
}

function keyApiPrivateAccount(input) {
  return [
    "is_private_account",
    "private_account",
    "secret",
    "is_secret",
  ].some((key) => input?.[key] === 1 || input?.[key] === true || input?.[key] === "1");
}

function keyApiVideoText(videos = []) {
  return videos
    .map((video) =>
      [
        video.video_desc,
        video.video_description,
        video.desc,
        video.title,
        Array.isArray(video.hashtag_names) ? video.hashtag_names.join(" ") : "",
      ].join(" "),
    )
    .join(" ");
}

function collectInfluencerLikeObjects(value, results = []) {
  if (!value || results.length >= keyApiMaxTotal * 3) return results;
  if (Array.isArray(value)) {
    for (const item of value) collectInfluencerLikeObjects(item, results);
    return results;
  }
  if (typeof value !== "object") return results;

  const source = value.user_info || value.user || value.author || value.influencer || value;
  const username = clean(
    firstValue(source, ["unique_id", "username", "handle", "sec_uid", "user_name"]),
  ).replace(/^@/, "");
  const followers = numberFromAny(
    firstValue(source, [
      "total_followers_cnt",
      "follower_count",
      "followers",
      "fans",
      "fan_count",
      "followerCount",
    ]),
  );
  const name = firstValue(source, ["nick_name", "nickname", "display_name", "name"]);
  if (username && (followers || name)) results.push(source);

  for (const item of Object.values(value)) {
    if (item && typeof item === "object") collectInfluencerLikeObjects(item, results);
  }
  return results;
}

async function keyApiGet(path, params = {}) {
  const url = new URL(`${keyApiBaseUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${keyApiKey}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || (Number(payload.code) && Number(payload.code) !== 0)) {
    throw new Error(tiktokErrorMessage(payload, payload.message || "KeyAPI request failed."));
  }
  return payload;
}

function keyApiSuggestedUsernames(payload) {
  const suggestions = payload?.data?.sug_list || payload?.sug_list || [];
  return suggestions
    .map((item) => clean(item.content || item.word_record?.words_content || item.unique_id || item.username))
    .map((item) => item.replace(/^@/, "").toLowerCase())
    .filter(Boolean);
}

async function keyApiInfluencerDetail(uniqueId) {
  const attempts = [
    ["/v1/tiktok/influencer/detail", { unique_id: uniqueId }],
    ["/v1/tiktok/influencer/detail/analytics", { unique_ids: uniqueId }],
  ];
  for (const [path, params] of attempts) {
    try {
      const payload = await keyApiGet(path, params);
      const data = payload.data?.user || payload.data?.influencer || payload.data;
      if (Array.isArray(data)) return data[0] || null;
      if (data && typeof data === "object") return data;
    } catch (error) {
      console.warn(`KeyAPI detail failed for @${uniqueId} via ${path}: ${error.message}`);
    }
  }
  return null;
}

async function keyApiInfluencerRegion(uniqueId) {
  try {
    const payload = await keyApiGet("/v1/tiktok/influencer/region", { unique_id: uniqueId });
    return clean(payload.data);
  } catch (error) {
    console.warn(`KeyAPI region failed for @${uniqueId}: ${error.message}`);
    return "";
  }
}

async function keyApiInfluencerVideos(uniqueId, userId = "") {
  const attempts = [
    ["/v1/tiktok/influencer/videos", { unique_id: uniqueId, offset: 0 }],
    ["/v1/tiktok/influencer/videos", { user_id: userId, offset: 0 }],
    ["/v1/tiktok/influencer/videos/analytics", { unique_id: uniqueId }],
    ["/v1/tiktok/influencer/videos/analytics", { handle: uniqueId }],
    ["/v1/tiktok/influencer/videos/analytics", { user_ids: userId }],
  ].filter(([, params]) => Object.values(params).some(Boolean));

  for (const [path, params] of attempts) {
    try {
      const payload = await keyApiGet(path, params);
      const data = payload.data?.videos || payload.data?.aweme_list || payload.data?.items || payload.data;
      if (Array.isArray(data)) return data.slice(0, 12);
    } catch (error) {
      console.warn(`KeyAPI videos failed for @${uniqueId} via ${path}: ${error.message}`);
    }
  }
  return [];
}

function creatorFromKeyApiInfluencer(input, videos = []) {
  const username = clean(
    firstValue(input, ["unique_id", "username", "handle", "sec_uid", "user_name"]),
  )
    .replace(/^@/, "")
    .toLowerCase();
  const followerCount = numberFromAny(
    firstValue(input, ["total_followers_cnt", "follower_count", "followers", "fans", "fan_count", "followerCount"]),
  );
  const followingCount = numberFromAny(
    firstValue(input, ["total_following_cnt", "following_count", "following", "followingCount"]),
  );
  const likesCount = numberFromAny(
    firstValue(input, ["total_likes_cnt", "total_digg_cnt", "likes_count", "digg_count", "likes", "likesCount"]),
  );
  const bio = clean(firstValue(input, ["signature", "bio", "bio_description", "description", "search_user_desc"]));
  const category = detectCategory([bio, keyApiVideoText(videos), firstValue(input, ["category", "most_category_product"])].join(" "));
  const region = clean(firstValue(input, ["region", "region_code", "country", "account_region"])).toUpperCase();
  const location = extractBioLocation(bio);
  const avatar = imageUrlFromAny(
    firstValue(input, ["avatar", "avatar_url", "profile_pic_url"]) ||
      input.avatar_larger ||
      input.avatar_medium ||
      input.avatar_thumb ||
      input.avatar_300x300,
  );

  return normalizeCreator({
    creatorId: clean(firstValue(input, ["user_id", "uid", "id"])) || `KEYAPI-${username}`,
    name: clean(firstValue(input, ["nick_name", "nickname", "display_name", "name"])) || username,
    username,
    tiktokLink: username ? `https://www.tiktok.com/@${username}` : "",
    followers: formatFollowers(followerCount),
    followerCount,
    following: followingCount ? formatFollowers(followingCount) : "",
    followingCount,
    likes: likesCount ? formatFollowers(likesCount) : "",
    likesCount,
    category,
    email: clean(firstValue(input, ["contact_email", "email", "public_email"])) || extractEmail(bio),
    location: clean(firstValue(input, ["location"])) || location.location,
    city: "",
    state: location.state,
    country: "United States",
    bio: location.locationStatus ? `${bio}`.trim() : bio,
    website: clean(firstValue(input, ["bio_url", "website", "url"])),
    instagram: "",
    youtube: "",
    profilePicture: avatar,
    lastUpdated: new Date().toISOString().slice(0, 10),
    confidence: 92,
  });
}

async function refreshKeyApiCreators() {
  if (!keyApiConfigured()) {
    throw new Error("KEYAPI_API_KEY is not configured.");
  }

  const creatorsByKey = new Map();
  const candidateUsernames = new Set();
  let searchedPages = 0;
  let suggestedPages = 0;
  let detailLookups = 0;
  let regionLookups = 0;
  let videoLookups = 0;

  async function considerInfluencer(object, options = {}) {
    if (keyApiPrivateAccount(object)) return;
    const region =
      clean(firstValue(object, ["region", "region_code", "country", "account_region"])) ||
      (object.unique_id || object.username ? await keyApiInfluencerRegion(object.unique_id || object.username) : "");
    if (!keyApiRegionAllowed(region)) return;
    const username = clean(firstValue(object, ["unique_id", "username", "handle", "user_name"])).replace(/^@/, "").toLowerCase();
    let videos = options.videos || [];
    if (!videos.length && username && videoLookups < keyApiVideoLookupLimit) {
      videoLookups += 1;
      videos = await keyApiInfluencerVideos(username, firstValue(object, ["user_id", "uid", "id"]));
    }
    const creator = creatorFromKeyApiInfluencer({ ...object, region, unique_id: username || object.unique_id }, videos);
    if (
      creator.username &&
      creator.followerCount >= tiktokResearchMinFollowers &&
      creator.followerCount <= tiktokResearchMaxFollowers &&
      allowedCategories.includes(creator.category)
    ) {
      creatorsByKey.set(duplicateKey(creator), creator);
    }
  }

  for (const keyword of keyApiKeywords) {
    let offset = 0;
    let page = 0;
    let keepGoing = true;
    while (keepGoing && page < 3 && creatorsByKey.size < keyApiMaxTotal) {
      page += 1;
      searchedPages += 1;
      const payload = await keyApiGet("/v1/tiktok/influencer/search", {
        keyword,
        region: "US",
        offset,
      });
      const objects = collectInfluencerLikeObjects(payload.data || payload);
      for (const object of objects) {
        const username = clean(firstValue(object, ["unique_id", "username", "handle", "user_name"])).replace(/^@/, "").toLowerCase();
        if (username) candidateUsernames.add(username);
        await considerInfluencer(object, { videos: [] });
      }
      const nextCursor = Number(payload.data?.cursor || payload.cursor || 0);
      keepGoing = nextCursor && nextCursor !== offset && objects.length > 0;
      offset = nextCursor || offset + objects.length;
    }

    try {
      suggestedPages += 1;
      const suggested = await keyApiGet("/v1/tiktok/suggested/users", {
        keyword,
        region: "US",
        count: keyApiSuggestionCount,
      });
      for (const username of keyApiSuggestedUsernames(suggested)) {
        candidateUsernames.add(username);
      }
    } catch (error) {
      console.warn(`KeyAPI suggested users failed for ${keyword}: ${error.message}`);
    }
  }

  for (const username of candidateUsernames) {
    if (creatorsByKey.size >= keyApiMaxTotal) break;
    if ([...creatorsByKey.values()].some((creator) => creator.username === username)) continue;
    detailLookups += 1;
    const detail = await keyApiInfluencerDetail(username);
    if (!detail) continue;
    let region = clean(firstValue(detail, ["region", "region_code", "country", "account_region"]));
    if (!region) {
      regionLookups += 1;
      region = await keyApiInfluencerRegion(username);
    }
    await considerInfluencer({ ...detail, region, unique_id: detail.unique_id || username });
  }

  memory.providerCreators = [...creatorsByKey.values()].slice(0, keyApiMaxTotal);
  memory.providerVideosScanned = searchedPages;
  memory.providerUpdatedAt = new Date().toISOString();
  const sheetSynced = await replaceAllCreators(memory.providerCreators);
  return {
    creators: memory.providerCreators,
    searchedPages,
    suggestedPages,
    detailLookups,
    regionLookups,
    videoLookups,
    updatedAt: memory.providerUpdatedAt,
    sheetSynced,
  };
}

function tiktokErrorMessage(payload, fallback) {
  if (!payload || typeof payload !== "object") return fallback;
  return (
    payload.error_description ||
    payload.error?.message ||
    payload.error?.code ||
    payload.message ||
    fallback
  );
}

async function tiktokClientAccessToken() {
  if (!tiktokResearchConfigured()) {
    throw new Error("TikTok Research API credentials are not configured.");
  }
  if (tiktokTokenCache.accessToken && tiktokTokenCache.expiresAt > Date.now() + 60000) {
    return tiktokTokenCache.accessToken;
  }

  const body = new URLSearchParams({
    client_key: tiktokResearchClientKey,
    client_secret: tiktokResearchClientSecret,
    grant_type: "client_credentials",
  });
  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(tiktokErrorMessage(payload, "Unable to get TikTok client access token."));
  }
  tiktokTokenCache.accessToken = payload.access_token;
  tiktokTokenCache.expiresAt = Date.now() + Math.max(60, Number(payload.expires_in || 7200) - 120) * 1000;
  return tiktokTokenCache.accessToken;
}

async function tiktokResearchPost(path, fields, body) {
  const token = await tiktokClientAccessToken();
  const url = `https://open.tiktokapis.com${path}?fields=${encodeURIComponent(fields)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || (payload.error?.code && payload.error.code !== "ok")) {
    throw new Error(tiktokErrorMessage(payload, "TikTok Research API request failed."));
  }
  return payload.data || payload;
}

function tiktokVideoQuery() {
  const keywordConditions = tiktokResearchKeywords.map((keyword) => ({
    operation: "EQ",
    field_name: "keyword",
    field_values: [keyword],
  }));

  return {
    and: [
      {
        operation: "IN",
        field_name: "region_code",
        field_values: ["US"],
      },
    ],
    or: keywordConditions,
  };
}

async function queryTikTokVideos() {
  const fields = [
    "id",
    "video_description",
    "create_time",
    "region_code",
    "share_count",
    "view_count",
    "like_count",
    "comment_count",
    "hashtag_names",
    "username",
  ].join(",");
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - tiktokResearchLookbackDays);
  const videos = [];
  let cursor = 0;
  let searchId = "";
  let hasMore = true;
  let page = 0;

  while (hasMore && videos.length < tiktokResearchMaxTotal && page < 10) {
    page += 1;
    const body = {
      query: tiktokVideoQuery(),
      max_count: Math.min(100, tiktokResearchMaxTotal - videos.length),
      cursor,
      start_date: dateStamp(start),
      end_date: dateStamp(end),
      is_random: false,
      ...(searchId ? { search_id: searchId } : {}),
    };
    const data = await tiktokResearchPost("/v2/research/video/query/", fields, body);
    const pageVideos = Array.isArray(data.videos) ? data.videos : [];
    videos.push(...pageVideos);
    cursor = Number(data.cursor || cursor + pageVideos.length);
    searchId = clean(data.search_id) || searchId;
    hasMore = Boolean(data.has_more) && pageVideos.length > 0;
  }

  return videos;
}

async function queryTikTokUser(username) {
  const fields = [
    "display_name",
    "bio_description",
    "avatar_url",
    "is_verified",
    "follower_count",
    "following_count",
    "likes_count",
    "video_count",
    "bio_url",
  ].join(",");
  const data = await tiktokResearchPost("/v2/research/user/info/", fields, { username });
  return data.user_info || data.user || data;
}

function tiktokCreatorFromUser(username, user, videos) {
  const relatedVideos = videos.filter((video) => clean(video.username).toLowerCase() === username);
  const hashtags = relatedVideos.flatMap((video) => (Array.isArray(video.hashtag_names) ? video.hashtag_names : []));
  const text = [
    user.bio_description,
    ...relatedVideos.map((video) => video.video_description),
    ...hashtags,
  ].join(" ");
  const followerCount = Number(user.follower_count || 0);
  const followingCount = Number(user.following_count || 0);
  const likesCount = Number(user.likes_count || 0);

  return normalizeCreator({
    creatorId: `TT-${username}`,
    name: clean(user.display_name) || username,
    username,
    tiktokLink: `https://www.tiktok.com/@${username}`,
    followers: formatFollowers(followerCount),
    followerCount,
    following: followingCount ? formatFollowers(followingCount) : "",
    followingCount,
    likes: likesCount ? formatFollowers(likesCount) : "",
    likesCount,
    category: detectCategory(text),
    email: "",
    location: "",
    city: "",
    state: "",
    country: "United States",
    bio: clean(user.bio_description),
    website: clean(user.bio_url),
    instagram: "",
    youtube: "",
    profilePicture: clean(user.avatar_url),
    lastUpdated: new Date().toISOString().slice(0, 10),
    confidence: user.is_verified ? 99 : 90,
  });
}

async function refreshTikTokResearchCreators() {
  if (!tiktokResearchConfigured()) {
    throw new Error("TikTok Research API credentials are not configured.");
  }

  const videos = await queryTikTokVideos();
  const usernames = [
    ...new Set(
      videos
        .map((video) => clean(video.username).replace(/^@/, "").toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, tiktokResearchMaxUsers);
  const creatorsByKey = new Map();

  for (const username of usernames) {
    try {
      const user = await queryTikTokUser(username);
      const creator = tiktokCreatorFromUser(username, user, videos);
      if (
        creator.followerCount >= tiktokResearchMinFollowers &&
        creator.followerCount <= tiktokResearchMaxFollowers &&
        allowedCategories.includes(creator.category)
      ) {
        creatorsByKey.set(duplicateKey(creator), creator);
      }
    } catch (error) {
      console.warn(`Unable to load TikTok user @${username}: ${error.message}`);
    }
  }

  memory.providerCreators = [...creatorsByKey.values()];
  memory.providerVideosScanned = videos.length;
  memory.providerUpdatedAt = new Date().toISOString();
  const sheetSynced = await replaceAllCreators(memory.providerCreators);
  return {
    creators: memory.providerCreators,
    videosScanned: videos.length,
    usernamesScanned: usernames.length,
    updatedAt: memory.providerUpdatedAt,
    sheetSynced,
  };
}

function creatorToSheetRow(creator, userEmail, status = "Saved") {
  const row = normalizeCreator(creator);
  return [
    new Date().toISOString().slice(0, 10),
    row.name,
    row.username,
    row.tiktokLink,
    row.followers,
    row.following,
    row.likes,
    row.category,
    row.email,
    row.location,
    row.state,
    "United States",
    row.bio,
    row.website,
    row.instagram,
    row.youtube,
    status,
    userEmail,
    row.lastUpdated,
  ];
}

function usernameFromManualText(text = "") {
  const value = String(text);
  const urlMatch = value.match(/tiktok\.com\/@([a-zA-Z0-9._-]+)/i);
  if (urlMatch) return urlMatch[1].toLowerCase();
  const atMatch = value.match(/@([a-zA-Z0-9._-]+)/);
  if (atMatch) return atMatch[1].toLowerCase();
  const firstToken = clean(value.split(/[,\t|]/)[0]).replace(/^@/, "");
  return /^[a-zA-Z0-9._-]{2,}$/.test(firstToken) ? firstToken.toLowerCase() : "";
}

function parseManualCreatorLine(line = "") {
  const raw = clean(line);
  if (!raw || raw.startsWith("#")) return null;
  const parts = raw.split(/[,\t|]/).map(clean).filter(Boolean);
  const username = usernameFromManualText(raw);
  if (!username) return null;
  const followerText = parts.find((part) => parseFollowers(part) > 0) || raw;
  const followerCount = parseFollowers(followerText);
  const bio = parts.slice(2).join(" ") || raw;
  const category = allowedCategories.includes(parts[2]) ? parts[2] : detectCategory(raw);
  const location = extractBioLocation(raw);
  const email = extractEmail(raw);
  return normalizeCreator({
    creatorId: `MANUAL-${username}`,
    name: username,
    username,
    tiktokLink: `https://www.tiktok.com/@${username}`,
    followers: followerCount ? formatFollowers(followerCount) : "",
    followerCount,
    category,
    email,
    location: location.location,
    state: location.state,
    country: "United States",
    bio,
    lastUpdated: new Date().toISOString().slice(0, 10),
    confidence: followerCount ? 80 : 45,
  });
}

function parseManualCreators(rawText = "") {
  const seen = new Set();
  const creators = [];
  for (const line of String(rawText).split(/\r?\n/)) {
    const creator = parseManualCreatorLine(line);
    if (!creator) continue;
    const key = duplicateKey(creator);
    if (seen.has(key)) continue;
    seen.add(key);
    creators.push(creator);
  }
  return creators;
}

async function appendAllCreators(creators) {
  if (!creators.length) return { imported: [], duplicates: 0, sheetSynced: false };
  const existing = await allRawCreators();
  const existingKeys = new Set(existing.map(duplicateKey));
  const imported = creators.filter((creator) => !existingKeys.has(duplicateKey(creator)));
  const duplicates = creators.length - imported.length;

  if (!imported.length) return { imported, duplicates, sheetSynced: sheetsEnabled() };
  if (sheetsEnabled()) {
    await ensureSheet("All Creators", creatorHeaders);
    const sheets = await sheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "'All Creators'!A:R",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: imported.map(creatorToAllCreatorsRow) },
    });
  } else {
    memory.manualCreators.push(...imported);
  }
  return { imported, duplicates, sheetSynced: sheetsEnabled() };
}

function mapSheetCreators(rows) {
  const headerIndex = rows.findIndex((row) => clean(row[0]).toLowerCase() === "creator id");
  const dataRows = rows.slice(headerIndex >= 0 ? headerIndex + 1 : 1);
  return dataRows
    .filter((row) => row.some(Boolean))
    .map((row) =>
      normalizeCreator({
        creatorId: row[0],
        name: row[1],
        username: row[2],
        tiktokLink: row[3],
        followers: row[4],
        following: row[5],
        likes: row[6],
        category: row[7],
        email: row[8],
        location: row[9],
        state: row[10],
        country: row[11],
        bio: row[12],
        website: row[13],
        instagram: row[14],
        youtube: row[15],
        profilePicture: row[16],
        lastUpdated: row[17],
      }),
    );
}

function mapSavedRows(rows, email) {
  return rows.slice(1).filter((row) => row.some(Boolean)).map((row, index) =>
    normalizeCreator({
      rowNumber: index + 2,
      dateSaved: row[0],
      name: row[1],
      username: row[2],
      tiktokLink: row[3],
      followers: row[4],
      following: row[5],
      likes: row[6],
      category: row[7],
      email: row[8],
      location: row[9],
      state: row[10],
      country: row[11],
      bio: row[12],
      website: row[13],
      instagram: row[14],
      youtube: row[15],
      status: row[16],
      savedBy: row[17] || email,
      lastUpdated: row[18],
    }),
  );
}

function duplicateKey(creator) {
  const row = normalizeCreator(creator);
  return `${row.username}|${row.tiktokLink}`.toLowerCase();
}

function logActivity(email, action, detail = "") {
  const logs = memory.logsByEmail.get(email) || [];
  logs.unshift({
    action,
    detail,
    actor: email,
    createdAt: new Date().toISOString(),
  });
  memory.logsByEmail.set(email, logs.slice(0, 100));
}

async function authorizedUsers() {
  if (!sheetsEnabled()) return sampleAuthorizedUsers;
  const usersByEmail = new Map();
  const adminRows = await values("'Admin'!A:C");
  for (const row of adminRows) {
    const gmail = clean(row[0]).toLowerCase();
    if (!looksLikeEmail(gmail)) continue;
    usersByEmail.set(gmail, {
      gmail,
      name: clean(row[1]) || nameFromEmail(gmail),
      role: "Admin",
      status: "Active",
    });
  }
  return [...usersByEmail.values()];
}

async function authorizeEmail(email) {
  const users = await authorizedUsers();
  const user = users.find((item) => item.gmail === email.toLowerCase());
  if (!user || user.status !== "Active" || user.role !== "Admin") return null;
  return { email: user.gmail, name: user.name || user.gmail, role: "Admin" };
}

async function allRawCreators() {
  if (memory.providerCreators.length) return [...memory.providerCreators, ...memory.manualCreators];
  if (!sheetsEnabled()) return [...sampleCreators, ...memory.manualCreators];
  const rows = await values("'All Creators'!A:R");
  const mapped = mapSheetCreators(rows);
  return mapped.length ? mapped : sampleCreators;
}

async function savedCreators(email) {
  if (!sheetsEnabled()) return memory.savedByEmail.get(email) || [];
  await ensureSheet(savedSheetName(email), sheetHeaders);
  return mapSavedRows(await values(`'${savedSheetName(email)}'!A:S`), email);
}

async function skippedCreators(email) {
  if (!sheetsEnabled()) return memory.skippedByEmail.get(email) || [];
  await ensureSheet(skippedSheetName(email), sheetHeaders);
  return mapSavedRows(await values(`'${skippedSheetName(email)}'!A:S`), email);
}

async function availableCreators(email, query = {}) {
  const rows = await allRawCreators();
  const savedKeys = new Set((await savedCreators(email)).map(duplicateKey));
  const skippedKeys = new Set((await skippedCreators(email)).map(duplicateKey));
  const search = clean(query.search).toLowerCase();
  const minFollowers = parseFollowers(query.minFollowers || 2000);
  const maxFollowers = parseFollowers(query.maxFollowers || 20000);
  const category = clean(query.category);
  const state = clean(query.state);
  const emailOnly = query.emailOnly === "true";
  const sort = clean(query.sort);

  const filtered = rows.filter((creator) => {
    const row = normalizeCreator(creator);
    const key = duplicateKey(row);
    const haystack = [row.name, row.username, row.location, row.state, row.category, row.bio]
      .join(" ")
      .toLowerCase();
    return (
      row.country === "United States" &&
      row.followerCount >= minFollowers &&
      row.followerCount <= maxFollowers &&
      allowedCategories.includes(row.category) &&
      !savedKeys.has(key) &&
      !skippedKeys.has(key) &&
      (!search || haystack.includes(search)) &&
      (!category || category === "All" || row.category === category) &&
      (!state || state === "All" || row.state === state) &&
      (!emailOnly || Boolean(row.email))
    );
  });

  if (sort === "lowest") filtered.sort((a, b) => a.followerCount - b.followerCount);
  if (sort === "highest") filtered.sort((a, b) => b.followerCount - a.followerCount);
  if (sort === "newest" || sort === "updated") {
    filtered.sort((a, b) => String(b.lastUpdated).localeCompare(String(a.lastUpdated)));
  }
  return filtered;
}

async function saveCreatorForUser(email, creator) {
  const row = normalizeCreator(creator);
  const existing = await savedCreators(email);
  if (existing.some((item) => duplicateKey(item) === duplicateKey(row))) {
    logActivity(email, "Duplicate Detection", `Duplicate skipped: @${row.username}`);
    return { duplicate: true, message: "Creator already saved." };
  }

  if (sheetsEnabled()) {
    await ensureSheet(savedSheetName(email), sheetHeaders);
    await appendRow(savedSheetName(email), creatorToSheetRow(row, email, row.status || "Saved"));
  } else {
    const rows = memory.savedByEmail.get(email) || [];
    rows.push({ ...row, status: row.status || "Saved", savedBy: email, dateSaved: new Date().toISOString().slice(0, 10) });
    memory.savedByEmail.set(email, rows);
  }
  logActivity(email, "Save Creator", `Saved @${row.username}`);
  return { creator: row };
}

async function skipCreatorForUser(email, creator) {
  const row = normalizeCreator({ ...creator, status: "Skipped" });
  const existing = await skippedCreators(email);
  if (existing.some((item) => duplicateKey(item) === duplicateKey(row))) {
    return { duplicate: true, message: "Creator already skipped." };
  }
  if (sheetsEnabled()) {
    await ensureSheet(skippedSheetName(email), sheetHeaders);
    await appendRow(skippedSheetName(email), creatorToSheetRow(row, email, "Skipped"));
  } else {
    const rows = memory.skippedByEmail.get(email) || [];
    rows.push({ ...row, status: "Skipped", savedBy: email, dateSaved: new Date().toISOString().slice(0, 10) });
    memory.skippedByEmail.set(email, rows);
  }
  logActivity(email, "Skip Creator", `Skipped @${row.username}`);
  return { creator: row };
}

function deleteFromMemory(map, email, key) {
  const rows = map.get(email) || [];
  map.set(
    email,
    rows.filter((row) => duplicateKey(row) !== key),
  );
}

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    storage: sheetsEnabled() ? "google-sheets" : "demo-memory",
    spreadsheetId,
    googleLoginConfigured: Boolean(googleClientId),
    publicAccess,
    providerConfigured: keyApiConfigured() || tiktokResearchConfigured(),
    provider: keyApiConfigured() ? "keyapi" : "tiktok-research-api",
    providerUpdatedAt: memory.providerUpdatedAt,
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
      response.status(403).json({ error: "Access Denied" });
      return;
    }
    response.json({ token: signSession(user), user });
  } catch (error) {
    response.status(401).json({ error: error.message });
  }
});

app.get("/api/me", requireUser, (request, response) => {
  response.json({ user: request.user, statuses: savedStatuses });
});

app.get("/api/creators", requireUser, requireAdmin, async (request, response) => {
  try {
    const creators = await availableCreators(request.user.email, request.query);
    const all = await allRawCreators();
    response.json({
      creators,
      categories: allowedCategories,
      states: [...new Set(all.map((creator) => creator.state).filter(Boolean))].sort(),
      statuses: savedStatuses,
      source: memory.providerCreators.length
        ? keyApiConfigured()
          ? "keyapi"
          : "tiktok-research-api"
        : keyApiConfigured()
          ? "keyapi-ready"
          : tiktokResearchConfigured()
            ? "tiktok-ready"
          : "starter-dataset",
      providerUpdatedAt: memory.providerUpdatedAt,
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.post("/api/creators/import", requireUser, requireAdmin, async (request, response) => {
  try {
    const creators = parseManualCreators(request.body?.text || "");
    if (!creators.length) {
      response.status(400).json({
        error: "Paste one creator per line, like @username, 12K, skincare, California.",
      });
      return;
    }
    const result = await appendAllCreators(creators);
    logActivity(
      request.user.email,
      "Manual TikTok Import",
      `Imported ${result.imported.length} creators, skipped ${result.duplicates} duplicates`,
    );
    response.json({
      ok: true,
      imported: result.imported,
      importedCount: result.imported.length,
      duplicateCount: result.duplicates,
      sheetSynced: result.sheetSynced,
      note: `Imported ${result.imported.length} creators. ${result.duplicates} duplicate(s) skipped.`,
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.get("/api/saved", requireUser, requireAdmin, async (request, response) => {
  try {
    response.json({ creators: await savedCreators(request.user.email), statuses: savedStatuses });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.post("/api/saved", requireUser, requireAdmin, async (request, response) => {
  try {
    const result = await saveCreatorForUser(request.user.email, request.body);
    response.status(result.duplicate ? 409 : 201).json(result);
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.delete("/api/saved", requireUser, requireAdmin, async (request, response) => {
  try {
    if (sheetsEnabled()) {
      response.status(501).json({ error: "Delete from Google Sheets is not enabled yet. Remove it in the sheet." });
      return;
    }
    deleteFromMemory(memory.savedByEmail, request.user.email, duplicateKey(request.body));
    logActivity(request.user.email, "Delete Creator", `Deleted ${request.body.username || request.body.tiktokLink}`);
    response.json({ ok: true });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.get("/api/skipped", requireUser, requireAdmin, async (request, response) => {
  try {
    response.json({ creators: await skippedCreators(request.user.email) });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.post("/api/skipped", requireUser, requireAdmin, async (request, response) => {
  try {
    const result = await skipCreatorForUser(request.user.email, request.body);
    response.status(result.duplicate ? 409 : 201).json(result);
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.post("/api/skipped/restore", requireUser, requireAdmin, async (request, response) => {
  try {
    if (!sheetsEnabled()) {
      deleteFromMemory(memory.skippedByEmail, request.user.email, duplicateKey(request.body));
    }
    logActivity(request.user.email, "Restore Skipped", `Restored ${request.body.username || request.body.tiktokLink}`);
    response.json({ ok: true });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.get("/api/admin", requireUser, requireAdmin, async (request, response) => {
  try {
    const users = await authorizedUsers();
    const creators = await availableCreators(request.user.email, {});
    const saved = await savedCreators(request.user.email);
    const skipped = await skippedCreators(request.user.email);
    response.json({
      users,
      creatorsFound: creators.length,
      creatorsSaved: saved.length,
      creatorsSkipped: skipped.length,
      googleSyncSuccess: sheetsEnabled(),
      duplicateRemoved: 0,
      todaysSaves: saved.filter((creator) => creator.dateSaved === new Date().toISOString().slice(0, 10)).length,
      logs: memory.logsByEmail.get(request.user.email) || [],
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.post("/api/provider/refresh", requireUser, requireAdmin, async (request, response) => {
  try {
    if (!keyApiConfigured() && !tiktokResearchConfigured()) {
      response.status(400).json({
        error:
          "Add KEYAPI_API_KEY in Render env, or add TIKTOK_RESEARCH_CLIENT_KEY and TIKTOK_RESEARCH_CLIENT_SECRET.",
        requiredEnv: ["KEYAPI_API_KEY"],
      });
      return;
    }
    const provider = keyApiConfigured() ? "keyapi" : "tiktok-research-api";
    const result = keyApiConfigured()
      ? await refreshKeyApiCreators()
      : await refreshTikTokResearchCreators();
    logActivity(
      request.user.email,
      provider === "keyapi" ? "KeyAPI Refresh" : "TikTok Refresh",
      provider === "keyapi"
        ? `Searched ${result.searchedPages} KeyAPI pages and loaded ${result.creators.length} creators`
        : `Scanned ${result.videosScanned} videos and loaded ${result.creators.length} creators`,
    );
    response.json({
      ok: true,
      mode: provider,
      creatorsImported: result.creators.length,
      videosScanned: result.videosScanned || 0,
      searchedPages: result.searchedPages || 0,
      suggestedPages: result.suggestedPages || 0,
      detailLookups: result.detailLookups || 0,
      regionLookups: result.regionLookups || 0,
      videoLookups: result.videoLookups || 0,
      usernamesScanned: result.usernamesScanned,
      updatedAt: result.updatedAt,
      sheetSynced: result.sheetSynced,
      note:
        provider === "keyapi"
          ? `KeyAPI refresh complete: ${result.creators.length} creators found.`
          : `TikTok refresh complete: ${result.creators.length} creators from ${result.videosScanned} recent US videos.`,
    });
  } catch (error) {
    response.status(502).json({ error: error.message });
  }
});

app.post("/api/sheets/sync", requireUser, requireAdmin, async (request, response) => {
  logActivity(request.user.email, "Google Sync", "Manual sync requested");
  response.json({
    ok: true,
    spreadsheetId,
    personalTab: savedSheetName(request.user.email),
    skippedTab: skippedSheetName(request.user.email),
    mode: sheetsEnabled() ? "google-sheets" : "demo-memory",
    columns: sheetHeaders,
  });
});

const server = app.listen(port, () => {
  console.log(`LGPORT creator backend running on port ${port}`);
});

export { app, server };
