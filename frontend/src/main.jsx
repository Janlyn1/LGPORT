import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
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

const defaultForm = {
  profileLink: "",
  username: "",
  displayName: "",
  followerCount: "",
  followingCount: "",
  totalLikes: "",
  niche: "Beauty / Skincare",
  country: "United States",
  email: "",
  bio: "",
  notes: "",
  assignedTo: "",
  savedByName: "Research Team",
  savedByEmail: "",
};

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

function dateLabel(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClass(status) {
  return `status status-${status.toLowerCase().replaceAll(" ", "-")}`;
}

function App() {
  const [creators, setCreators] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [activity, setActivity] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);

  async function api(path, options) {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || "Request failed");
      error.data = data;
      throw error;
    }
    return data;
  }

  async function loadCreators(selectId = selectedId) {
    const data = await api("/api/creators");
    setCreators(data.creators || []);
    setSelectedId(selectId || data.creators?.[0]?.id || "");
    setLoading(false);
  }

  async function loadSelected(id) {
    if (!id) return;
    const data = await api(`/api/creators/${id}`);
    setActivity(data.activity || []);
    if (data.creator) {
      setCreators((rows) => rows.map((row) => (row.id === data.creator.id ? data.creator : row)));
    }
  }

  useEffect(() => {
    loadCreators().catch((error) => {
      setNotice(error.message);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadSelected(selectedId).catch((error) => setNotice(error.message));
  }, [selectedId]);

  const selected = creators.find((creator) => creator.id === selectedId) || creators[0];
  const filteredCreators = useMemo(() => {
    const term = query.trim().toLowerCase();
    return creators.filter((creator) => {
      const statusMatch = statusFilter === "All" || creator.status === statusFilter;
      const text = [
        creator.displayName,
        creator.username,
        creator.country,
        creator.email,
        creator.niche,
        creator.assignedTo,
      ]
        .join(" ")
        .toLowerCase();
      return statusMatch && (!term || text.includes(term));
    });
  }, [creators, query, statusFilter]);

  const metrics = useMemo(() => {
    const totalFollowers = creators.reduce((sum, creator) => sum + creator.followerCount, 0);
    return [
      ["Creators", fullNumber(creators.length)],
      ["Audience", compactNumber(totalFollowers)],
      ["Approved pool", fullNumber(creators.filter((c) => ["Approved", "Ready to Contact", "Replied", "Negotiating"].includes(c.status)).length)],
      ["Need email", fullNumber(creators.filter((c) => !c.email).length)],
      ["Contacted", fullNumber(creators.filter((c) => ["Contacted", "Replied", "Negotiating", "Closed"].includes(c.status)).length)],
    ];
  }, [creators]);

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveCreator(event) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      const payload = {
        ...form,
        followerCount: Number(String(form.followerCount).replace(/[^0-9]/g, "")) || 0,
        followingCount: Number(String(form.followingCount).replace(/[^0-9]/g, "")) || 0,
        totalLikes: Number(String(form.totalLikes).replace(/[^0-9]/g, "")) || 0,
      };
      const data = await api("/api/creators", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setForm(defaultForm);
      setNotice(`Saved @${data.creator.username}`);
      await loadCreators(data.creator.id);
    } catch (error) {
      if (error.data?.duplicate) {
        setSelectedId(error.data.duplicate.id);
        setNotice(`Duplicate found: @${error.data.duplicate.username}`);
      } else {
        setNotice(error.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function updateSelected(payload) {
    if (!selected) return;
    try {
      const data = await api(`/api/creators/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...payload, savedByName: "Research Team" }),
      });
      setCreators((rows) => rows.map((row) => (row.id === data.creator.id ? data.creator : row)));
      setActivity(data.activity || []);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function syncSheets() {
    try {
      const data = await api("/api/sheets/sync", { method: "POST" });
      setNotice(`Sheets sync ready: ${data.rowsPrepared} rows prepared`);
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">TikTok Creator Management System</p>
          <h1>Creator Research Dashboard</h1>
        </div>
        <div className="account-pill">
          <span>RT</span>
          <div>
            <strong>Research Team</strong>
            <small>Vercel + Render build</small>
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

      {notice && <div className="notice">{notice}</div>}

      <section className="workspace-grid">
        <div className="list-panel">
          <div className="panel-header">
            <div>
              <h2>Creator List</h2>
              <p>{loading ? "Loading records" : `${filteredCreators.length} visible records`}</p>
            </div>
            <button className="icon-button" onClick={syncSheets} type="button">Sync</button>
          </div>

          <div className="controls-row">
            <input placeholder="Search name, niche, country" value={query} onChange={(event) => setQuery(event.target.value)} />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="All">All statuses</option>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>

          <div className="status-tabs">
            {["All", ...statuses].map((status) => (
              <button className={statusFilter === status ? "active" : ""} key={status} onClick={() => setStatusFilter(status)} type="button">
                {status}
              </button>
            ))}
          </div>

          <div className="creator-table">
            {filteredCreators.map((creator) => (
              <button className={creator.id === selected?.id ? "creator-row selected" : "creator-row"} key={creator.id} onClick={() => setSelectedId(creator.id)} type="button">
                <span className="avatar">{initials(creator.displayName)}</span>
                <span className="creator-main">
                  <strong>{creator.displayName}</strong>
                  <small>@{creator.username}</small>
                </span>
                <span className="creator-meta">
                  <strong>{compactNumber(creator.followerCount)}</strong>
                  <small>{creator.country || "Unverified"}</small>
                </span>
                <span className={statusClass(creator.status)}>{creator.status}</span>
              </button>
            ))}
          </div>
        </div>

        <aside className="detail-panel">
          {selected ? (
            <>
              <div className="profile-heading">
                <span className="avatar large">{initials(selected.displayName)}</span>
                <div>
                  <h2>{selected.displayName}</h2>
                  <a href={selected.profileLink} target="_blank" rel="noreferrer">@{selected.username}</a>
                </div>
              </div>
              <div className="profile-stats">
                <span><strong>{fullNumber(selected.followerCount)}</strong>Followers</span>
                <span><strong>{fullNumber(selected.followingCount)}</strong>Following</span>
                <span><strong>{compactNumber(selected.totalLikes)}</strong>Likes</span>
              </div>
              <div className="field-grid">
                <label>Status<select value={selected.status} onChange={(event) => updateSelected({ status: event.target.value })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
                <label>Assigned To<input value={selected.assignedTo || ""} onChange={(event) => updateSelected({ assignedTo: event.target.value })} /></label>
                <label>Email<input value={selected.email || ""} onChange={(event) => updateSelected({ email: event.target.value })} /></label>
                <label>Country<input value={selected.country || ""} onChange={(event) => updateSelected({ country: event.target.value })} /></label>
              </div>
              <label className="wide-label">Notes<textarea value={selected.notes || ""} onChange={(event) => updateSelected({ notes: event.target.value })} /></label>
              <div className="profile-copy">
                <p>{selected.bio || "No bio captured"}</p>
                <span className={statusClass(selected.status)}>{selected.status}</span>
              </div>
              <div className="history">
                <h3>Activity History</h3>
                {activity.map((item) => (
                  <div className="history-item" key={item.id}>
                    <span />
                    <div>
                      <strong>{item.action}</strong>
                      <p>{item.detail}</p>
                      <small>{dateLabel(item.createdAt)} by {item.actorName || "System"}</small>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="empty-state">No creator selected</div>}
        </aside>

        <form className="capture-panel" onSubmit={saveCreator}>
          <div className="panel-header">
            <div>
              <h2>Save Creator</h2>
              <p>Chrome extension capture form</p>
            </div>
            <button disabled={saving} type="submit">{saving ? "Saving" : "Save"}</button>
          </div>
          <label>TikTok Profile Link<input required value={form.profileLink} onChange={(event) => setField("profileLink", event.target.value)} placeholder="https://www.tiktok.com/@creator" /></label>
          <div className="form-grid">
            <label>Username<input value={form.username} onChange={(event) => setField("username", event.target.value)} placeholder="@creator" /></label>
            <label>Display Name<input required value={form.displayName} onChange={(event) => setField("displayName", event.target.value)} /></label>
            <label>Followers<input inputMode="numeric" value={form.followerCount} onChange={(event) => setField("followerCount", event.target.value)} /></label>
            <label>Total Likes<input inputMode="numeric" value={form.totalLikes} onChange={(event) => setField("totalLikes", event.target.value)} /></label>
            <label>Niche<input value={form.niche} onChange={(event) => setField("niche", event.target.value)} /></label>
            <label>Country<input value={form.country} onChange={(event) => setField("country", event.target.value)} /></label>
          </div>
          <label>Business Email<input type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} /></label>
          <label>Bio<textarea value={form.bio} onChange={(event) => setField("bio", event.target.value)} /></label>
          <label>Notes<textarea value={form.notes} onChange={(event) => setField("notes", event.target.value)} /></label>
        </form>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
