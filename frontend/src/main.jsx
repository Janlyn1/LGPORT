import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const PUBLIC_USER = {
  email: "janlynrustila01@gmail.com",
  name: "Janlyn Rustila",
  role: "Admin",
};
const savedStatuses = ["Saved", "Already Messaged", "Approved", "Not Approved", "Rejected"];

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

function statusClass(status) {
  return `status status-${status.toLowerCase().replaceAll(" ", "-")}`;
}

function dateLabel(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(value),
  );
}

function Dashboard({ user, token }) {
  const [creators, setCreators] = useState([]);
  const [savedCreators, setSavedCreators] = useState([]);
  const [categories, setCategories] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [search, setSearch] = useState("");
  const [minFollowers, setMinFollowers] = useState("2000");
  const [maxFollowers, setMaxFollowers] = useState("20000");
  const [category, setCategory] = useState("All");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  async function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  }

  async function loadCreators() {
    const params = new URLSearchParams({
      search,
      minFollowers,
      maxFollowers,
      category,
    });
    const data = await api(`/api/creators?${params.toString()}`);
    setCreators(data.creators || []);
    setCategories(["All", ...(data.categories || [])]);
  }

  async function loadSaved() {
    const data = await api("/api/saved");
    setSavedCreators(data.creators || []);
  }

  async function loadAdmin() {
    if (user.role !== "Admin") return;
    const data = await api("/api/admin");
    setAdmin(data);
  }

  async function refreshAll() {
    setLoading(true);
    setNotice("");
    try {
      await Promise.all([loadCreators(), loadSaved(), loadAdmin()]);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  const metrics = useMemo(() => {
    const approved = savedCreators.filter((creator) => creator.status === "Approved").length;
    const rejected = savedCreators.filter((creator) => creator.status === "Rejected").length;
    return [
      ["Results", fullNumber(creators.length)],
      ["My Saved", fullNumber(savedCreators.length)],
      ["Approved", fullNumber(approved)],
      ["Rejected", fullNumber(rejected)],
      ["Best Audience", compactNumber(Math.max(0, ...creators.map((creator) => creator.followerCount)))],
    ];
  }, [creators, savedCreators]);

  async function saveCreator(creator) {
    setNotice("");
    try {
      const data = await api("/api/saved", {
        method: "POST",
        body: JSON.stringify({
          name: creator.name,
          followers: creator.followers,
          tiktokLink: creator.tiktokLink,
          status: "Saved",
          notes: "",
        }),
      });
      setNotice(data.teamDuplicateWarning ? "Creator saved. Team warning: another member saved this creator too." : "Creator Saved");
      await loadSaved();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function updateSaved(creator, updates) {
    setNotice("");
    try {
      await api("/api/saved", {
        method: "PATCH",
        body: JSON.stringify({ tiktokLink: creator.tiktokLink, ...updates }),
      });
      await loadSaved();
      setNotice("Saved creator updated");
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">TikTok Creator Internal Website</p>
          <h1>TikTok Creator Dashboard</h1>
        </div>
        <div className="account-pill">
          <span>{initials(user.name)}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
        </div>
      </section>

      <section className="metrics-grid">
        {metrics.map(([label, value]) => (
          <article className="metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      {notice ? <div className="notice">{notice}</div> : null}

      <section className="search-band">
        <label>
          Search
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="beauty lifestyle" />
        </label>
        <label>
          Min Followers
          <input value={minFollowers} onChange={(event) => setMinFollowers(event.target.value)} placeholder="2000" />
        </label>
        <label>
          Max Followers
          <input value={maxFollowers} onChange={(event) => setMaxFollowers(event.target.value)} placeholder="20000" />
        </label>
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <button onClick={refreshAll} type="button">{loading ? "Searching" : "Search Creators"}</button>
      </section>

      <section className="workspace-grid two-col">
        <div className="list-panel">
          <div className="panel-header">
            <div>
              <h2>All Creators</h2>
              <p>Source: Google Sheet tab `All Creators`</p>
            </div>
          </div>
          <div className="creator-table">
            {creators.map((creator) => (
              <div className="creator-row" key={creator.creatorId || creator.tiktokLink}>
                <span className="avatar">{initials(creator.name)}</span>
                <span className="creator-main">
                  <strong>{creator.name}</strong>
                  <small>{creator.category} | {creator.country}</small>
                </span>
                <span className="creator-meta">
                  <strong>{creator.followers || compactNumber(creator.followerCount)}</strong>
                  <small>{dateLabel(creator.lastUpdated) || "Updated from sheet"}</small>
                </span>
                <span className="row-actions">
                  <a href={creator.tiktokLink} target="_blank" rel="noreferrer">Open TikTok</a>
                  <button onClick={() => saveCreator(creator)} type="button">Save</button>
                </span>
              </div>
            ))}
          </div>
        </div>

        <aside className="detail-panel">
          <div className="panel-title">
            <h2>My Saved Creators</h2>
            <p>Personal tab: Saved - {user.email.split("@")[0]}</p>
          </div>
          <div className="saved-list">
            {savedCreators.map((creator) => (
              <article className="saved-card" key={creator.tiktokLink}>
                <div>
                  <strong>{creator.name}</strong>
                  <a href={creator.tiktokLink} target="_blank" rel="noreferrer">View profile</a>
                </div>
                <span>{creator.followers}</span>
                <select value={creator.status} onChange={(event) => updateSaved(creator, { status: event.target.value })}>
                  {savedStatuses.map((status) => <option key={status}>{status}</option>)}
                </select>
                <textarea
                  value={creator.notes || ""}
                  onChange={(event) => updateSaved(creator, { notes: event.target.value })}
                  placeholder="Notes"
                />
              </article>
            ))}
          </div>
        </aside>
      </section>

      {user.role === "Admin" ? (
        <section className="admin-panel">
          <div>
            <h2>Admin Dashboard</h2>
            <p>Authorized users and team save summary</p>
          </div>
          {admin ? (
            <div className="admin-grid">
              <span>Active users <strong>{admin.activeUsers}</strong></span>
              <span>Disabled users <strong>{admin.disabledUsers}</strong></span>
              <span>Total creators <strong>{admin.totalCreators}</strong></span>
              <span>Tracked users <strong>{admin.savedCounts?.length || 0}</strong></span>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

function App() {
  return <Dashboard user={PUBLIC_USER} token="" />;
}

createRoot(document.getElementById("root")).render(<App />);
