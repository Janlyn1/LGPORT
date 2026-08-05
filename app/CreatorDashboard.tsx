"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ActivityRow, CreatorRow, CreatorStatus } from "./api/_lib/creator-store";

type Props = {
  currentUser: {
    name: string;
    email: string;
  };
};

type CreatorPayload = Partial<CreatorRow> & {
  savedByName?: string;
  savedByEmail?: string;
};

const statusList: CreatorStatus[] = [
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
  location: "",
  bio: "",
  notes: "",
  assignedTo: "",
};

function compactNumber(value: number) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function fullNumber(value: number) {
  return Intl.NumberFormat("en").format(value);
}

function shortDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function statusClass(status: string) {
  return `status status-${status.toLowerCase().replaceAll(" ", "-")}`;
}

export function CreatorDashboard({ currentUser }: Props) {
  const [creators, setCreators] = useState<CreatorRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<CreatorStatus | "All">("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(defaultForm);

  async function loadCreators(selectId?: string) {
    setLoading(true);
    const response = await fetch("/api/creators", { cache: "no-store" });
    const data = (await response.json()) as { creators?: CreatorRow[]; error?: string };
    if (!response.ok) {
      setNotice(data.error ?? "Unable to load creators.");
      setLoading(false);
      return;
    }

    const rows = data.creators ?? [];
    setCreators(rows);
    const nextSelected = selectId || selectedId || rows[0]?.id || "";
    setSelectedId(nextSelected);
    setLoading(false);
  }

  useEffect(() => {
    fetch("/api/creators", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { creators?: CreatorRow[]; error?: string }) => {
        if (data.error) {
          setNotice(data.error);
          return;
        }

        const rows = data.creators ?? [];
        setCreators(rows);
        setSelectedId(rows[0]?.id || "");
      })
      .catch(() => setNotice("Unable to load creators."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/creators/${selectedId}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { creator?: CreatorRow; activity?: ActivityRow[]; error?: string }) => {
        if (data.error) {
          setNotice(data.error);
          return;
        }

        if (data.creator) {
          setCreators((current) =>
            current.map((creator) => (creator.id === data.creator?.id ? data.creator : creator)),
          );
        }
        setActivity(data.activity ?? []);
      })
      .catch(() => setNotice("Unable to load creator."));
  }, [selectedId]);

  const selected = creators.find((creator) => creator.id === selectedId) ?? creators[0];

  const filteredCreators = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return creators.filter((creator) => {
      const statusMatch = statusFilter === "All" || creator.status === statusFilter;
      const queryMatch =
        !normalizedQuery ||
        [
          creator.displayName,
          creator.username,
          creator.country,
          creator.email,
          creator.niche,
          creator.assignedTo,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return statusMatch && queryMatch;
    });
  }, [creators, query, statusFilter]);

  const metrics = useMemo(() => {
    const totalFollowers = creators.reduce((sum, creator) => sum + creator.followerCount, 0);
    const ready = creators.filter((creator) =>
      ["Approved", "Ready to Contact", "Replied", "Negotiating"].includes(creator.status),
    ).length;
    const missingEmail = creators.filter((creator) => !creator.email).length;
    const contacted = creators.filter((creator) =>
      ["Contacted", "Replied", "Negotiating", "Closed"].includes(creator.status),
    ).length;

    return [
      { label: "Creators", value: fullNumber(creators.length) },
      { label: "Audience", value: compactNumber(totalFollowers) },
      { label: "Approved pool", value: fullNumber(ready) },
      { label: "Need email", value: fullNumber(missingEmail) },
      { label: "Contacted", value: fullNumber(contacted) },
    ];
  }, [creators]);

  function setField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveCreator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice("");

    const payload: CreatorPayload = {
      profileLink: form.profileLink,
      username: form.username,
      displayName: form.displayName,
      followerCount: Number(form.followerCount.replace(/[^0-9]/g, "")) || 0,
      followingCount: Number(form.followingCount.replace(/[^0-9]/g, "")) || 0,
      totalLikes: Number(form.totalLikes.replace(/[^0-9]/g, "")) || 0,
      niche: form.niche,
      country: form.country || form.location,
      email: form.email,
      bio: form.bio,
      notes: form.notes,
      assignedTo: form.assignedTo,
      savedByName: currentUser.name,
      savedByEmail: currentUser.email,
    };

    const response = await fetch("/api/creators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as {
      creator?: CreatorRow;
      duplicate?: CreatorRow;
      error?: string;
    };

    if (response.status === 409 && data.duplicate) {
      setSelectedId(data.duplicate.id);
      setNotice(`Duplicate found: @${data.duplicate.username}`);
    } else if (response.ok && data.creator) {
      setForm(defaultForm);
      setNotice(`Saved @${data.creator.username}`);
      await loadCreators(data.creator.id);
    } else {
      setNotice(data.error ?? "Unable to save creator.");
    }

    setSaving(false);
  }

  async function updateSelected(payload: Partial<CreatorRow>) {
    if (!selected) return;
    setNotice("");
    const response = await fetch(`/api/creators/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as {
      creator?: CreatorRow;
      activity?: ActivityRow[];
      error?: string;
    };

    if (!response.ok || !data.creator) {
      setNotice(data.error ?? "Unable to update creator.");
      return;
    }

    setCreators((current) =>
      current.map((creator) => (creator.id === data.creator?.id ? data.creator : creator)),
    );
    setActivity(data.activity ?? []);
  }

  async function syncSheets() {
    setSyncing(true);
    setNotice("");
    const response = await fetch("/api/sheets/sync", { method: "POST" });
    const data = (await response.json()) as { rowsPrepared?: number; message?: string };
    setNotice(
      response.ok
        ? `Sheets sync ready: ${data.rowsPrepared ?? 0} rows prepared`
        : data.message ?? "Unable to prepare sheet sync.",
    );
    setSyncing(false);
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">TikTok Creator Management System</p>
          <h1>Creator Research Dashboard</h1>
        </div>
        <div className="account-pill">
          <span>{initials(currentUser.name)}</span>
          <div>
            <strong>{currentUser.name}</strong>
            <small>{currentUser.email || "Local session"}</small>
          </div>
        </div>
      </section>

      <section className="metrics-grid" aria-label="Creator summary">
        {metrics.map((metric) => (
          <article className="metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>

      {notice ? <div className="notice">{notice}</div> : null}

      <section className="workspace-grid">
        <div className="list-panel">
          <div className="panel-header">
            <div>
              <h2>Creator List</h2>
              <p>{loading ? "Loading records" : `${filteredCreators.length} visible records`}</p>
            </div>
            <button className="icon-button" onClick={syncSheets} type="button" aria-label="Sync Google Sheets">
              {syncing ? "..." : "Sync"}
            </button>
          </div>

          <div className="controls-row">
            <input
              aria-label="Search creators"
              placeholder="Search name, niche, country"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as CreatorStatus | "All")}
            >
              <option value="All">All statuses</option>
              {statusList.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="status-tabs" aria-label="Status filters">
            {(["All", ...statusList] as const).map((status) => (
              <button
                className={statusFilter === status ? "active" : ""}
                key={status}
                onClick={() => setStatusFilter(status)}
                type="button"
              >
                {status}
              </button>
            ))}
          </div>

          <div className="creator-table" role="list">
            {filteredCreators.map((creator) => (
              <button
                className={creator.id === selected?.id ? "creator-row selected" : "creator-row"}
                key={creator.id}
                onClick={() => setSelectedId(creator.id)}
                type="button"
              >
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
                  <a href={selected.profileLink} target="_blank" rel="noreferrer">
                    @{selected.username}
                  </a>
                </div>
              </div>

              <div className="profile-stats">
                <span>
                  <strong>{fullNumber(selected.followerCount)}</strong>
                  Followers
                </span>
                <span>
                  <strong>{fullNumber(selected.followingCount)}</strong>
                  Following
                </span>
                <span>
                  <strong>{compactNumber(selected.totalLikes)}</strong>
                  Likes
                </span>
              </div>

              <div className="field-grid">
                <label>
                  Status
                  <select
                    value={selected.status}
                    onChange={(event) =>
                      void updateSelected({ status: event.target.value as CreatorStatus })
                    }
                  >
                    {statusList.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Assigned To
                  <input
                    value={selected.assignedTo}
                    onChange={(event) => void updateSelected({ assignedTo: event.target.value })}
                  />
                </label>
                <label>
                  Email
                  <input
                    value={selected.email}
                    onChange={(event) => void updateSelected({ email: event.target.value })}
                  />
                </label>
                <label>
                  Country
                  <input
                    value={selected.country}
                    onChange={(event) => void updateSelected({ country: event.target.value })}
                  />
                </label>
              </div>

              <label className="wide-label">
                Notes
                <textarea
                  value={selected.notes}
                  onChange={(event) => void updateSelected({ notes: event.target.value })}
                />
              </label>

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
                      <small>
                        {shortDate(item.createdAt)} by {item.actorName || "System"}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">No creator selected</div>
          )}
        </aside>

        <form className="capture-panel" onSubmit={saveCreator}>
          <div className="panel-header">
            <div>
              <h2>Save Creator</h2>
              <p>Chrome extension capture form</p>
            </div>
            <button disabled={saving} type="submit">
              {saving ? "Saving" : "Save"}
            </button>
          </div>

          <label>
            TikTok Profile Link
            <input
              required
              value={form.profileLink}
              onChange={(event) => setField("profileLink", event.target.value)}
              placeholder="https://www.tiktok.com/@creator"
            />
          </label>
          <div className="form-grid">
            <label>
              Username
              <input
                value={form.username}
                onChange={(event) => setField("username", event.target.value)}
                placeholder="@creator"
              />
            </label>
            <label>
              Display Name
              <input
                required
                value={form.displayName}
                onChange={(event) => setField("displayName", event.target.value)}
              />
            </label>
            <label>
              Followers
              <input
                inputMode="numeric"
                value={form.followerCount}
                onChange={(event) => setField("followerCount", event.target.value)}
              />
            </label>
            <label>
              Total Likes
              <input
                inputMode="numeric"
                value={form.totalLikes}
                onChange={(event) => setField("totalLikes", event.target.value)}
              />
            </label>
            <label>
              Niche
              <input value={form.niche} onChange={(event) => setField("niche", event.target.value)} />
            </label>
            <label>
              Country
              <input
                value={form.country}
                onChange={(event) => setField("country", event.target.value)}
              />
            </label>
          </div>
          <label>
            Business Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
            />
          </label>
          <label>
            Bio
            <textarea value={form.bio} onChange={(event) => setField("bio", event.target.value)} />
          </label>
          <label>
            Notes
            <textarea value={form.notes} onChange={(event) => setField("notes", event.target.value)} />
          </label>
        </form>
      </section>
    </main>
  );
}
