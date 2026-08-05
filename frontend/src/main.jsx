import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const PUBLIC_USER = {
  email: "janlynrustila01@gmail.com",
  name: "Janlyn Rustila",
  role: "Admin",
};

const categories = [
  "All",
  "Beauty",
  "Lifestyle",
  "Personal Care",
  "Skincare",
  "Haircare",
  "Cosmetics",
  "Wellness",
  "Self Care",
];

const states = ["All", "California", "Texas", "Florida", "New York", "Nevada", "Arizona", "Washington"];
const statuses = ["Saved", "Already Messaged", "Approved", "Not Approved", "Rejected"];
const tabs = [
  ["dashboard", "Dashboard"],
  ["available", "Available Creators"],
  ["tiktok", "TikTok Search"],
  ["saved", "Saved Creators"],
  ["skipped", "Skipped Creators"],
  ["settings", "Settings"],
];
const manualSearchKeywords = [
  "beauty creator",
  "skincare creator",
  "makeup creator",
  "haircare creator",
  "self care creator",
  "personal care creator",
  "lifestyle creator",
  "beauty products",
];

const starterCreators = [
  ["BL001", "Beauty Lifestyle Lead 01", "beautylifestylelead01", "18.4K", 18400, "612", 612, "132K", 132000, "Beauty", "beautylead01@example.com", "Los Angeles, CA", "California", "Beauty creator sharing skincare finds, daily routines, and lifestyle favorites.", "https://example.com/beautylead01", "https://instagram.com/beautylead01"],
  ["BL002", "Glow Routine Lead 02", "glowroutinelead02", "16.8K", 16800, "488", 488, "118K", 118000, "Skincare", "glowlead02@example.com", "Austin, TX", "Texas", "Daily skincare, sunscreen picks, gentle routines, and product reviews.", "", "https://instagram.com/glowroutinelead02"],
  ["BL003", "Makeup Finds Lead 03", "makeupfindslead03", "14.2K", 14200, "790", 790, "91K", 91000, "Cosmetics", "", "Miami, FL", "Florida", "Affordable makeup finds, quick GRWM clips, and new cosmetics try-ons.", "https://example.com/makeupfinds03", "https://instagram.com/makeupfindslead03"],
  ["BL004", "Self Care Lead 04", "selfcarelead04", "12.6K", 12600, "351", 351, "84K", 84000, "Self Care", "selfcarelead04@example.com", "New York, NY", "New York", "Self care, personal care routines, bath products, and simple lifestyle content.", "", ""],
  ["BL005", "Lifestyle Beauty Lead 05", "lifestylebeautylead05", "10.9K", 10900, "525", 525, "79K", 79000, "Lifestyle", "lifestylelead05@example.com", "Las Vegas, NV", "Nevada", "Beauty, errands, routines, and easy lifestyle recommendations.", "", "https://instagram.com/lifestylebeautylead05"],
  ["BL006", "Affordable Beauty Lead 06", "affordablebeautylead06", "9.7K", 9700, "284", 284, "56K", 56000, "Beauty", "", "Phoenix, AZ", "Arizona", "Drugstore beauty products, skincare under budget, and honest mini reviews.", "", ""],
  ["BL007", "GRWM Beauty Lead 07", "grwmbeautylead07", "8.1K", 8100, "432", 432, "49K", 49000, "Lifestyle", "grwmlead07@example.com", "Seattle, WA", "Washington", "GRWM, beauty lifestyle, hair routines, and everyday product recs.", "https://example.com/grwmlead07", "https://instagram.com/grwmbeautylead07"],
  ["BL008", "Skincare Finds Lead 08", "skincarefindslead08", "6.8K", 6800, "190", 190, "36K", 36000, "Skincare", "skincarelead08@example.com", "San Diego, CA", "California", "Skincare routine testing, cleanser reviews, and sensitive skin favorites.", "", "https://instagram.com/skincarefindslead08"],
  ["BL009", "Hair Care Lead 09", "haircarelead09", "5.3K", 5300, "270", 270, "29K", 29000, "Haircare", "", "Orlando, FL", "Florida", "Haircare wash days, styling creams, scalp care, and product demos.", "", "https://instagram.com/haircarelead09"],
  ["BL010", "Everyday Glow Lead 10", "everydayglowlead10", "4.4K", 4400, "301", 301, "21K", 21000, "Personal Care", "glowlead10@example.com", "Dallas, TX", "Texas", "Personal care routines, body care, beauty basics, and everyday glow tips.", "", ""],
  ["BL011", "New Beauty Lead 11", "newbeautylead11", "3.2K", 3200, "144", 144, "16K", 16000, "Cosmetics", "", "Reno, NV", "Nevada", "New beauty creator focused on makeup, cosmetics, and lifestyle clips.", "", ""],
  ["BL012", "Starter Lifestyle Lead 12", "starterlifestylelead12", "2.4K", 2400, "208", 208, "11K", 11000, "Wellness", "starterlead12@example.com", "Brooklyn, NY", "New York", "Wellness, self care, beauty lifestyle, and small creator product content.", "", "https://instagram.com/starterlifestylelead12"],
].map(([creatorId, name, username, followers, followerCount, following, followingCount, likes, likesCount, category, email, location, state, bio, website, instagram]) => ({
  creatorId,
  name,
  username,
  tiktokLink: `https://www.tiktok.com/@${username}`,
  followers,
  followerCount,
  following,
  followingCount,
  likes,
  likesCount,
  category,
  email,
  location,
  city: location.split(",")[0],
  state,
  country: "United States",
  bio,
  website,
  instagram,
  youtube: "",
  profilePicture: "",
  lastUpdated: "2026-08-06",
  confidence: 88 + Math.floor(Math.random() * 9),
}));

function canUseApi() {
  if (typeof window === "undefined") return true;
  const hosted = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
  const localApi = API_BASE.includes("localhost") || API_BASE.includes("127.0.0.1");
  return !(hosted && localApi);
}

function compactNumber(value) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function fullNumber(value) {
  return Intl.NumberFormat("en").format(value || 0);
}

function initials(name = "") {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function duplicateKey(creator) {
  return `${creator.username || ""}|${creator.tiktokLink || ""}`.toLowerCase();
}

function usernameFromManualText(text = "") {
  const urlMatch = String(text).match(/tiktok\.com\/@([a-zA-Z0-9._-]+)/i);
  if (urlMatch) return urlMatch[1].toLowerCase();
  const atMatch = String(text).match(/@([a-zA-Z0-9._-]+)/);
  if (atMatch) return atMatch[1].toLowerCase();
  const firstToken = String(text).split(/[,\t|]/)[0].trim().replace(/^@/, "");
  return /^[a-zA-Z0-9._-]{2,}$/.test(firstToken) ? firstToken.toLowerCase() : "";
}

function parseManualFollowers(text = "") {
  const match = String(text).match(/(\d+(?:\.\d+)?)\s*([kKmM])?/);
  if (!match) return 0;
  const value = Number(match[1]);
  const suffix = (match[2] || "").toLowerCase();
  if (suffix === "m") return Math.round(value * 1000000);
  if (suffix === "k") return Math.round(value * 1000);
  return Math.round(value);
}

function parseManualCreators(text = "") {
  return String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[,\t|]/).map((part) => part.trim()).filter(Boolean);
      const username = usernameFromManualText(line);
      const followerCount = parseManualFollowers(parts.find((part) => parseManualFollowers(part)) || line);
      if (!username) return null;
      return normalizeCreator({
        creatorId: `MANUAL-${username}`,
        name: username,
        username,
        tiktokLink: `https://www.tiktok.com/@${username}`,
        followers: followerCount ? compactNumber(followerCount) : "",
        followerCount,
        category: categories.includes(parts[2]) ? parts[2] : "Beauty",
        location: parts[3] || "",
        state: parts[3] || "",
        bio: parts.slice(2).join(" ") || line,
        email: line.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "",
        lastUpdated: new Date().toISOString().slice(0, 10),
      });
    })
    .filter(Boolean);
}

function dateLabel(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function tiktokSearchUrl(keyword) {
  return `https://www.tiktok.com/search/user?q=${encodeURIComponent(keyword || "beauty creator")}`;
}

function normalizeCreator(creator) {
  const username = String(creator.username || creator.tiktokUsername || "").replace(/^@/, "").toLowerCase();
  return {
    ...creator,
    name: creator.name || creator.creatorName || username || "Untitled Creator",
    username,
    tiktokLink: creator.tiktokLink || creator.tiktokProfileUrl || (username ? `https://www.tiktok.com/@${username}` : ""),
    followerCount: Number(creator.followerCount || String(creator.followers || "").replace(/[^0-9]/g, "")) || 0,
    likesCount: Number(creator.likesCount || String(creator.likes || "").replace(/[^0-9]/g, "")) || 0,
    country: "United States",
    status: creator.status || "Saved",
  };
}

function filterCreators(list, filters, saved, skipped) {
  const search = filters.search.trim().toLowerCase();
  const min = Number(filters.minFollowers || 0);
  const max = Number(filters.maxFollowers || 999999999);
  const savedKeys = new Set(saved.map(duplicateKey));
  const skippedKeys = new Set(skipped.map(duplicateKey));
  const rows = list.map(normalizeCreator).filter((creator) => {
    const haystack = [creator.name, creator.username, creator.location, creator.state, creator.category, creator.bio]
      .join(" ")
      .toLowerCase();
    return (
      creator.country === "United States" &&
      creator.followerCount >= min &&
      creator.followerCount <= max &&
      !savedKeys.has(duplicateKey(creator)) &&
      !skippedKeys.has(duplicateKey(creator)) &&
      (!search || haystack.includes(search)) &&
      (filters.category === "All" || creator.category === filters.category) &&
      (filters.state === "All" || creator.state === filters.state) &&
      (!filters.emailOnly || Boolean(creator.email))
    );
  });
  if (filters.sort === "lowest") rows.sort((a, b) => a.followerCount - b.followerCount);
  if (filters.sort === "highest") rows.sort((a, b) => b.followerCount - a.followerCount);
  if (filters.sort === "newest" || filters.sort === "updated") {
    rows.sort((a, b) => String(b.lastUpdated).localeCompare(String(a.lastUpdated)));
  }
  return rows;
}

function rowForExport(creator) {
  return {
    "Date Saved": creator.dateSaved || "",
    "Creator Name": creator.name,
    "TikTok Username": creator.username,
    "TikTok Profile URL": creator.tiktokLink,
    Followers: creator.followers || compactNumber(creator.followerCount),
    Following: creator.following || "",
    Likes: creator.likes || compactNumber(creator.likesCount),
    Category: creator.category,
    Email: creator.email || "",
    Location: creator.location || "",
    State: creator.state || "",
    Country: "United States",
    Bio: creator.bio || "",
    "Website Link": creator.website || "",
    Instagram: creator.instagram || "",
    YouTube: creator.youtube || "",
    Status: creator.status || "Saved",
    "Saved By": creator.savedBy || PUBLIC_USER.email,
    "Last Updated": creator.lastUpdated || "",
  };
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function exportCsv(rows) {
  const mapped = rows.map(rowForExport);
  const headers = Object.keys(mapped[0] || rowForExport({}));
  const csv = [
    headers.join(","),
    ...mapped.map((row) => headers.map((header) => `"${String(row[header] || "").replaceAll('"', '""')}"`).join(",")),
  ].join("\n");
  downloadFile("saved-creators.csv", csv, "text/csv;charset=utf-8");
}

function exportExcel(rows) {
  const mapped = rows.map(rowForExport);
  const headers = Object.keys(mapped[0] || rowForExport({}));
  const html = `<table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${mapped
    .map((row) => `<tr>${headers.map((header) => `<td>${String(row[header] || "")}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
  downloadFile("saved-creators.xls", html, "application/vnd.ms-excel");
}

function LoginScreen({ onLogin }) {
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !canUseApi()) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const result = await fetch(`${API_BASE}/api/auth/google`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential: response.credential }),
            });
            const data = await result.json();
            if (!result.ok) throw new Error(data.error || "Access Denied");
            localStorage.setItem("lgport_token", data.token);
            onLogin(data.user, data.token);
          } catch (error) {
            setNotice(error.message || "Access Denied");
          }
        },
      });
      window.google.accounts.id.renderButton(document.getElementById("google-login"), {
        theme: "outline",
        size: "large",
        width: 280,
      });
    };
    document.body.appendChild(script);
    return () => script.remove();
  }, [onLogin]);

  return (
    <main className="login-shell">
      <section className="login-panel">
        <p className="eyebrow">Admin Only</p>
        <h1>TikTok USA Creator Lead Finder</h1>
        <div id="google-login" className="google-slot" />
        {notice ? <div className="notice">{notice}</div> : null}
      </section>
    </main>
  );
}

function CreatorCard({ creator, onSave, onSkip, onRestore, mode }) {
  return (
    <article className="creator-card">
      <div className="creator-card-main">
        <div className="profile-avatar">{creator.profilePicture ? <img src={creator.profilePicture} alt="" /> : initials(creator.name)}</div>
        <div>
          <div className="creator-title">
            <h3>{creator.name}</h3>
            <span>{creator.confidence || 90}%</span>
          </div>
          <p>@{creator.username}</p>
        </div>
      </div>
      <div className="creator-stats">
        <span><strong>{creator.followers || compactNumber(creator.followerCount)}</strong> Followers</span>
        <span><strong>{creator.likes || compactNumber(creator.likesCount)}</strong> Likes</span>
        <span><strong>{creator.location}</strong> Location</span>
      </div>
      <p className="bio">{creator.bio}</p>
      <div className="chip-row">
        <span>{creator.category}</span>
        <span>{creator.country}</span>
        {creator.email ? <span>Email</span> : <span>No public email</span>}
      </div>
      <div className="link-grid">
        {creator.email ? <a href={`mailto:${creator.email}`}>{creator.email}</a> : <span />}
        {creator.website ? <a href={creator.website} target="_blank" rel="noreferrer">Website</a> : <span />}
        {creator.instagram ? <a href={creator.instagram} target="_blank" rel="noreferrer">Instagram</a> : <span />}
        <a href={creator.tiktokLink} target="_blank" rel="noreferrer">TikTok</a>
      </div>
      <div className="card-actions">
        {mode === "skipped" ? (
          <button onClick={() => onRestore(creator)} type="button">Restore</button>
        ) : (
          <>
            <button onClick={() => onSave(creator)} type="button">Save</button>
            <button className="secondary" onClick={() => onSkip(creator)} type="button">Skip</button>
            <a className="button-link" href={creator.tiktokLink} target="_blank" rel="noreferrer">View Profile</a>
          </>
        )}
      </div>
    </article>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("lgport_token") || "");
  const [user, setUser] = useState(canUseApi() && GOOGLE_CLIENT_ID ? null : PUBLIC_USER);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [allCreators, setAllCreators] = useState([]);
  const [saved, setSaved] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [importText, setImportText] = useState("");
  const [tiktokKeyword, setTiktokKeyword] = useState("beauty creator");
  const [filters, setFilters] = useState({
    search: "",
    minFollowers: "2000",
    maxFollowers: "20000",
    category: "All",
    state: "All",
    emailOnly: false,
    sort: "lowest",
  });

  async function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  }

  async function loadRemote() {
    if (!canUseApi() || !user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: filters.search,
        minFollowers: filters.minFollowers,
        maxFollowers: filters.maxFollowers,
        category: filters.category,
        state: filters.state,
        emailOnly: String(filters.emailOnly),
        sort: filters.sort,
      });
      const [creatorData, savedData, skippedData, adminData] = await Promise.all([
        api(`/api/creators?${params.toString()}`),
        api("/api/saved"),
        api("/api/skipped"),
        api("/api/admin"),
      ]);
      setAllCreators((creatorData.creators || []).map(normalizeCreator));
      setSaved((savedData.creators || []).map(normalizeCreator));
      setSkipped((skippedData.creators || []).map(normalizeCreator));
      setAdmin(adminData);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) loadRemote();
  }, [user]);

  const available = useMemo(
    () => filterCreators(allCreators, filters, saved, skipped),
    [allCreators, filters, saved, skipped],
  );

  const savedFiltered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return saved.filter((creator) =>
      [creator.name, creator.username, creator.location, creator.category, creator.email].join(" ").toLowerCase().includes(search),
    );
  }, [saved, filters.search]);

  const metrics = [
    ["Creators Found", fullNumber(available.length)],
    ["Creators Saved", fullNumber(saved.length)],
    ["Creators Skipped", fullNumber(skipped.length)],
    ["Google Sync", admin?.googleSyncSuccess ? "Ready" : canUseApi() ? "Check" : "Local"],
    ["Today's Saves", fullNumber(admin?.todaysSaves || saved.length)],
    ["Duplicate Removed", fullNumber(admin?.duplicateRemoved || 0)],
  ];

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  async function saveCreator(creator) {
    setNotice("");
    const row = { ...normalizeCreator(creator), status: "Saved", savedBy: user.email, dateSaved: new Date().toISOString().slice(0, 10) };
    if (saved.some((item) => duplicateKey(item) === duplicateKey(row))) {
      setNotice("Creator already saved.");
      return;
    }
    if (canUseApi()) {
      try {
        await api("/api/saved", { method: "POST", body: JSON.stringify(row) });
      } catch (error) {
        setNotice(error.message);
        return;
      }
    }
    setSaved((current) => [row, ...current]);
    setSkipped((current) => current.filter((item) => duplicateKey(item) !== duplicateKey(row)));
    setNotice(`Saved @${row.username}`);
  }

  async function skipCreator(creator) {
    const row = { ...normalizeCreator(creator), status: "Skipped", savedBy: user.email, dateSaved: new Date().toISOString().slice(0, 10) };
    if (canUseApi()) {
      try {
        await api("/api/skipped", { method: "POST", body: JSON.stringify(row) });
      } catch (error) {
        setNotice(error.message);
        return;
      }
    }
    setSkipped((current) => [row, ...current.filter((item) => duplicateKey(item) !== duplicateKey(row))]);
    setNotice(`Skipped @${row.username}`);
  }

  async function restoreCreator(creator) {
    if (canUseApi()) {
      try {
        await api("/api/skipped/restore", { method: "POST", body: JSON.stringify(creator) });
      } catch (error) {
        setNotice(error.message);
      }
    }
    setSkipped((current) => current.filter((item) => duplicateKey(item) !== duplicateKey(creator)));
  }

  async function deleteSaved(creator) {
    if (canUseApi()) {
      try {
        await api("/api/saved", { method: "DELETE", body: JSON.stringify(creator) });
      } catch (error) {
        setNotice(error.message);
      }
    }
    setSaved((current) => current.filter((item) => duplicateKey(item) !== duplicateKey(creator)));
  }

  async function syncSheets() {
    if (!canUseApi()) {
      setNotice("Add Render backend URL to VITE_API_BASE_URL for Google Sheets sync.");
      return;
    }
    try {
      const data = await api("/api/sheets/sync", { method: "POST" });
      setNotice(`Google Sheet tab ready: ${data.personalTab}`);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function refreshProvider() {
    if (!canUseApi()) {
      setNotice("Connect an approved creator data provider API key to enable auto refresh.");
      return;
    }
    try {
      const data = await api("/api/provider/refresh", { method: "POST" });
      setNotice(data.note || "Refresh started.");
      await loadRemote();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function importManualCreators() {
    setNotice("");
    const parsed = parseManualCreators(importText);
    if (!parsed.length) {
      setNotice("Paste one creator per line, like @username, 12K, skincare, California.");
      return;
    }
    if (canUseApi()) {
      try {
        const data = await api("/api/creators/import", {
          method: "POST",
          body: JSON.stringify({ text: importText }),
        });
        setNotice(data.note || `Imported ${data.importedCount || 0} creators.`);
        setImportText("");
        await loadRemote();
        return;
      } catch (error) {
        setNotice(error.message);
        return;
      }
    }
    setAllCreators((current) => {
      const existing = new Set(current.map(duplicateKey));
      const fresh = parsed.filter((creator) => !existing.has(duplicateKey(creator)));
      return [...fresh, ...current];
    });
    setImportText("");
    setNotice(`Imported ${parsed.length} creators locally. Connect backend URL to sync Google Sheets.`);
  }

  function logout() {
    localStorage.removeItem("lgport_token");
    setToken("");
    setUser(canUseApi() && GOOGLE_CLIENT_ID ? null : PUBLIC_USER);
  }

  function handleLogin(nextUser, nextToken) {
    setUser(nextUser);
    setToken(nextToken);
  }

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span>LG</span>
          <div>
            <strong>LGPORT</strong>
            <small>Creator Leads</small>
          </div>
        </div>
        <nav>
          {tabs.map(([id, label]) => (
            <button className={activeTab === id ? "active" : ""} key={id} onClick={() => setActiveTab(id)} type="button">
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="content-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">TikTok USA Creator Lead Finder</p>
            <h1>Admin Dashboard</h1>
          </div>
          <div className="account-pill">
            <span>{initials(user.name)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
            {GOOGLE_CLIENT_ID && canUseApi() ? <button className="ghost-button" onClick={logout} type="button">Logout</button> : null}
          </div>
        </header>

        <section className="metrics-grid">
          {metrics.map(([label, value]) => (
            <article className="metric" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </section>

        {notice ? <div className="notice">{notice}</div> : null}

        <section className="filter-bar">
          <label>
            Search
            <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Name, username, location" />
          </label>
          <label>
            Min
            <input value={filters.minFollowers} onChange={(event) => updateFilter("minFollowers", event.target.value)} />
          </label>
          <label>
            Max
            <input value={filters.maxFollowers} onChange={(event) => updateFilter("maxFollowers", event.target.value)} />
          </label>
          <label>
            Category
            <select value={filters.category} onChange={(event) => updateFilter("category", event.target.value)}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            State
            <select value={filters.state} onChange={(event) => updateFilter("state", event.target.value)}>
              {states.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Email
            <select value={filters.emailOnly ? "email" : "all"} onChange={(event) => updateFilter("emailOnly", event.target.value === "email")}>
              <option value="all">Show all</option>
              <option value="email">Public email only</option>
            </select>
          </label>
          <label>
            Sort
            <select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}>
              <option value="lowest">Lowest Followers</option>
              <option value="highest">Highest Followers</option>
              <option value="newest">Newest</option>
              <option value="updated">Recently Updated</option>
            </select>
          </label>
          <button onClick={loadRemote} type="button">{loading ? "Loading" : "Refresh"}</button>
        </section>

        {activeTab === "dashboard" || activeTab === "available" ? (
          available.length ? (
            <section className="card-grid">
              {available.map((creator) => (
                <CreatorCard creator={creator} key={duplicateKey(creator)} onSave={saveCreator} onSkip={skipCreator} />
              ))}
            </section>
          ) : (
            <section className="empty-panel">
              <h2>No real creators loaded yet</h2>
              <p>Use Settings to import real TikTok creators, or connect a backend data provider. Demo creator cards are hidden.</p>
              <button onClick={() => setActiveTab("settings")} type="button">Open Settings</button>
            </section>
          )
        ) : null}

        {activeTab === "tiktok" ? (
          <section className="tiktok-workspace">
            <article className="search-console">
              <div>
                <p className="eyebrow">Find Real TikTok Creators</p>
                <h2>Search TikTok, then import chosen accounts</h2>
              </div>
              <label>
                Keyword
                <input
                  onChange={(event) => setTiktokKeyword(event.target.value)}
                  placeholder="beauty creator"
                  value={tiktokKeyword}
                />
              </label>
              <a className="button-link" href={tiktokSearchUrl(tiktokKeyword)} rel="noreferrer" target="_blank">
                Open TikTok Search
              </a>
              <div className="search-link-row">
                {manualSearchKeywords.map((keyword) => (
                  <a
                    className="button-link secondary"
                    href={tiktokSearchUrl(keyword)}
                    key={keyword}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {keyword}
                  </a>
                ))}
              </div>
            </article>
            <article className="import-console">
              <h2>Import Selected Creators</h2>
              <p>Choose accounts on TikTok that show 2K-20K followers, then paste username or profile URL plus follower count.</p>
              <textarea
                className="import-box large"
                onChange={(event) => setImportText(event.target.value)}
                placeholder={"@realcreator, 12.4K, Skincare, California\nhttps://www.tiktok.com/@anotherreal, 8K, Beauty, Texas"}
                value={importText}
              />
              <button onClick={importManualCreators} type="button">Import To Creator List</button>
            </article>
          </section>
        ) : null}

        {activeTab === "saved" ? (
          <section className="table-panel">
            <div className="panel-header">
              <div>
                <h2>Saved Creators</h2>
                <p>{savedFiltered.length} records</p>
              </div>
              <div className="toolbar">
                <button onClick={() => exportCsv(savedFiltered)} type="button">Export CSV</button>
                <button onClick={() => exportExcel(savedFiltered)} type="button">Export Excel</button>
              </div>
            </div>
            {savedFiltered.map((creator) => (
              <div className="saved-row" key={duplicateKey(creator)}>
                <strong>@{creator.username}</strong>
                <span>{creator.name}</span>
                <span>{creator.followers || compactNumber(creator.followerCount)}</span>
                <span>{creator.category}</span>
                <span>{creator.email || "No email"}</span>
                <button className="ghost-button" onClick={() => deleteSaved(creator)} type="button">Delete</button>
              </div>
            ))}
          </section>
        ) : null}

        {activeTab === "skipped" ? (
          <section className="card-grid">
            {skipped.map((creator) => (
              <CreatorCard creator={creator} key={duplicateKey(creator)} mode="skipped" onRestore={restoreCreator} />
            ))}
          </section>
        ) : null}

        {activeTab === "settings" ? (
          <section className="settings-grid">
            <article>
              <h2>Google Sheet Settings</h2>
              <p>{canUseApi() ? "Backend connected" : "Frontend demo mode"}</p>
              <button onClick={syncSheets} type="button">Sync Google Sheets</button>
            </article>
            <article>
              <h2>Data Provider</h2>
              <p>KeyAPI key or approved TikTok Research API credentials required for latest account refresh.</p>
              <button onClick={refreshProvider} type="button">Run Refresh</button>
            </article>
            <article>
              <h2>Activity Logs</h2>
              {(admin?.logs || []).slice(0, 6).map((log) => (
                <span className="log-line" key={`${log.createdAt}-${log.action}`}>{log.action} - {dateLabel(log.createdAt)}</span>
              ))}
            </article>
            <article className="settings-wide">
              <h2>TikTok Manual Search</h2>
              <p>Open TikTok searches, copy matching creators with follower counts, then paste one per line.</p>
              <div className="search-link-row">
                {manualSearchKeywords.map((keyword) => (
                  <a
                    className="button-link secondary"
                    href={tiktokSearchUrl(keyword)}
                    key={keyword}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {keyword}
                  </a>
                ))}
              </div>
              <textarea
                className="import-box"
                onChange={(event) => setImportText(event.target.value)}
                placeholder={"@glowcreator, 12.4K, Skincare, California\nhttps://www.tiktok.com/@beautyname, 8K, Beauty, Texas"}
                value={importText}
              />
              <button onClick={importManualCreators} type="button">Import Pasted Creators</button>
            </article>
          </section>
        ) : null}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
