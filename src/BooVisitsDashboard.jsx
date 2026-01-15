// src/BookVisitsDashboard.jsx
import React, { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * BookVisitsDashboard
 * ✅ Separate component
 * ✅ Two tabs: Site Visit | Clubhouse Access
 * ✅ Stores requests in separate collections:
 *    - siteVisitRequests
 *    - clubhouseAccessRequests
 * ✅ Shows submitted requests instantly using onSnapshot
 * ✅ Lint clean: no unused vars
 *
 * Usage:
 * {isBookVisitsOpen && <BookVisitsDashboard user={user} onClose={() => setIsBookVisitsOpen(false)} />}
 */
export default function BookVisitsDashboard({ user, onClose }) {
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const [tab, setTab] = useState("site"); // "site" | "clubhouse"

  const [siteReqs, setSiteReqs] = useState([]);
  const [clubReqs, setClubReqs] = useState([]);
  const [loadingSite, setLoadingSite] = useState(true);
  const [loadingClub, setLoadingClub] = useState(true);
  const [errSite, setErrSite] = useState(null);
  const [errClub, setErrClub] = useState(null);

  // Load profile (users/{uid})
  useEffect(() => {
    if (!user?.uid) return;

    const load = async () => {
      setProfileLoading(true);
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        setProfile(snap.exists() ? snap.data() : null);
      } catch (e) {
        console.error(e);
        setProfile(null);
      } finally {
        setProfileLoading(false);
      }
    };

    load();
  }, [user?.uid]);

  // Subscribe: Site visit requests
  useEffect(() => {
    if (!user?.uid) return;

    setLoadingSite(true);
    setErrSite(null);

    const qy = query(
      collection(db, "siteVisitRequests"),
      where("userId", "==", user.uid),
      limit(50)
    );

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => (Number(b.createdAtMs) || 0) - (Number(a.createdAtMs) || 0));
        setSiteReqs(rows);
        setLoadingSite(false);
      },
      (err) => {
        console.error(err);
        setErrSite(err?.message || "Failed to load site visit requests");
        setLoadingSite(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  // Subscribe: Clubhouse access requests
  useEffect(() => {
    if (!user?.uid) return;

    setLoadingClub(true);
    setErrClub(null);

    const qy = query(
      collection(db, "clubhouseAccessRequests"),
      where("userId", "==", user.uid),
      limit(50)
    );

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => (Number(b.createdAtMs) || 0) - (Number(a.createdAtMs) || 0));
        setClubReqs(rows);
        setLoadingClub(false);
      },
      (err) => {
        console.error(err);
        setErrClub(err?.message || "Failed to load clubhouse requests");
        setLoadingClub(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const photoURL = user?.photoURL || "https://via.placeholder.com/80?text=U";
  const displayName = profile?.displayName || user?.displayName || "User";
  const email = user?.email || "—";
  const mobile = profile?.mobile || profile?.mobileNumber || "";
  const mobileDisplay = mobile ? `+91 ${mobile}` : "Not provided";

  const activeList = tab === "site" ? siteReqs : clubReqs;
  const activeLoading = tab === "site" ? loadingSite : loadingClub;
  const activeErr = tab === "site" ? errSite : errClub;

  return (
    <div style={overlayStyle} data-modal="true" onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button style={closeBtnStyle} onClick={onClose} aria-label="Close">
          ×
        </button>

        {/* Header */}
        <div style={headerStyle}>
          <img
            src={photoURL}
            alt="Profile"
            style={profileImgStyle}
            onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/80?text=U")}
          />
          <div style={userInfoStyle}>
            <h2 style={nameStyle}>{displayName}</h2>
            <p style={detailStyle}>{email}</p>
            <p style={detailStyle}>{mobileDisplay}</p>
          </div>
        </div>

        {/* Small profile loading hint */}
        {profileLoading ? (
          <div style={{ padding: "10px 18px", fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
            Loading profile…
          </div>
        ) : null}

        <div style={contentStyle}>
          <div style={titleRowStyle}>
            <h3 style={sectionTitleStyle}>Book Visits</h3>
            <div style={pillStyle}>{activeList.length} Requests</div>
          </div>

          {/* Tabs */}
          <div style={tabsRow}>
            <button
              type="button"
              onClick={() => setTab("site")}
              style={{ ...tabBtn, ...(tab === "site" ? tabBtnActive : {}) }}
            >
              📍 Site Visit
            </button>
            <button
              type="button"
              onClick={() => setTab("clubhouse")}
              style={{ ...tabBtn, ...(tab === "clubhouse" ? tabBtnActive : {}) }}
            >
              🏛️ Clubhouse Access
            </button>
          </div>

          {/* Form */}
          <BookForm
            user={user}
            profile={{ displayName, email, mobile }}
            type={tab}
          />

          <div style={divider} />

          {/* List */}
          <div style={listTitleRow}>
            <div style={listTitle}>My Submitted Requests</div>
            {activeLoading ? <div style={tinyMuted}>Loading…</div> : null}
          </div>

          {activeErr ? <div style={messageErrorStyle}>⚠️ {activeErr}</div> : null}

          {!activeLoading && activeList.length === 0 ? (
            <div style={emptyBoxStyle}>
              <div style={{ fontWeight: 900, color: "#1a3c34", marginBottom: 6 }}>No requests yet</div>
              <div style={{ fontSize: 12, color: "#666", fontWeight: 600 }}>
                Submit a request above and it will appear here.
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {activeList.map((r) => (
                <RequestCard key={r.id} req={r} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Form ---------------- */

function BookForm({ user, profile, type }) {
  const [projectName, setProjectName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);

  const isSite = type === "site";
  const collectionName = isSite ? "siteVisitRequests" : "clubhouseAccessRequests";
  const label = isSite ? "Site Visit" : "Clubhouse Access";

  const submit = async () => {
    setErr(null);
    setOk(null);

    if (!user?.uid) return setErr("User not logged in.");
    if (projectName.trim().length < 2) return setErr("Enter project name.");
    if (!date) return setErr("Select date.");
    if (!time) return setErr("Select time.");

    setSaving(true);

    try {
      const nowMs = Date.now();

      await addDoc(collection(db, collectionName), {
        userId: user.uid,
        userSnapshot: {
          uid: user.uid,
          name: profile.displayName || "",
          email: profile.email || "",
          mobile: profile.mobile || "",
        },
        projectName: projectName.trim(),
        date,
        time,
        note: note.trim(),
        status: "requested",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdAtMs: nowMs,
        updatedAtMs: nowMs,
        type,
      });

      setOk(`${label} request submitted.`);
      setProjectName("");
      setDate("");
      setTime("");
      setNote("");
    } catch (e) {
      console.error(e);
      setErr("Failed to submit request.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={formCard}>
      <div style={formTitle}>
        <span style={{ marginRight: 6 }}>{isSite ? "📍" : "🏛️"}</span>
        Submit {label} Request
      </div>

      {err ? <div style={messageErrorStyle}>⚠️ {err}</div> : null}
      {ok ? <div style={messageSuccessStyle}>✅ {ok}</div> : null}

      <Label>Project Name</Label>
      <Input
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        placeholder="Eg: Raaga / Parva"
      />

      <div style={twoColRow}>
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label>Time</Label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>

      <Label>Note (optional)</Label>
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any message..." />

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button style={primaryBtn} type="button" onClick={submit} disabled={saving}>
          {saving ? "Submitting…" : "Submit Request"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Cards ---------------- */

function RequestCard({ req }) {
  const status = statusMetaFor(req?.status);
  const dt = `${req?.date || "—"} ${req?.time || ""}`.trim();

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={cardTitleStyle}>
            {req?.projectName || "—"} <span style={mutedSmallStyle}>• {dt || "—"}</span>
          </div>
          {req?.note ? (
            <div style={{ fontSize: 12, color: "#374151", fontWeight: 700, marginTop: 6 }}>
              {req.note}
            </div>
          ) : null}
        </div>

        <span style={statusPillStyle(status)}>{status.text}</span>
      </div>
    </div>
  );
}

/* ---------------- Helpers ---------------- */

function statusMetaFor(status) {
  const s = String(status || "requested").toLowerCase();
  if (s.includes("approved") || s.includes("confirmed")) return { tone: "success", text: "Confirmed" };
  if (s.includes("reject") || s.includes("cancel")) return { tone: "failed", text: "Rejected" };
  if (s.includes("progress")) return { tone: "pending", text: "In Review" };
  return { tone: "neutral", text: "Requested" };
}

function statusPillStyle(meta) {
  const map = {
    success: { bg: "#ecfdf3", color: "#2f855a", border: "#b7f7d1" },
    pending: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
    failed: { bg: "#fff5f5", color: "#c53030", border: "#fecaca" },
    neutral: { bg: "#f3f4f6", color: "#374151", border: "#e5e7eb" },
  };
  const t = map[meta.tone] || map.neutral;
  return {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    backgroundColor: t.bg,
    color: t.color,
    border: `1px solid ${t.border}`,
    whiteSpace: "nowrap",
  };
}

/* ---------------- Small components ---------------- */

const Label = ({ children }) => (
  <label style={{ display: "block", marginBottom: 6, fontSize: "0.8rem", color: "#555", fontWeight: 700 }}>
    {children}
  </label>
);

const Input = (props) => (
  <input
    {...props}
    style={{
      width: "85%",
      padding: "8px 12px",
      marginBottom: 12,
      border: "1px solid #d0d5dd",
      borderRadius: "8px",
      fontSize: "13px",
      outline: "none",
      ...props.style,
    }}
  />
);

/* ---------------- Styles ---------------- */

const overlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1800,
  padding: 12,
};

const modalStyle = {
  position: "relative",
  width: "100%",
  maxWidth: "760px",
  maxHeight: "86vh",
  backgroundColor: "white",
  borderRadius: "12px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const closeBtnStyle = {
  position: "absolute",
  top: 12,
  right: 14,
  background: "none",
  border: "none",
  fontSize: "30px",
  color: "#777",
  cursor: "pointer",
  zIndex: 10,
  lineHeight: 1,
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  padding: "20px 28px",
  borderBottom: "1px solid #e5e7eb",
  backgroundColor: "#f9fafb",
  gap: "16px",
};

const profileImgStyle = {
  width: "72px",
  height: "72px",
  borderRadius: "50%",
  objectFit: "cover",
  border: "3px solid white",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
};

const userInfoStyle = { flex: 1 };

const nameStyle = {
  margin: "0 0 4px",
  fontSize: "1.25rem",
  fontWeight: 600,
  color: "#1a3c34",
};

const detailStyle = {
  margin: "3px 0 0",
  fontSize: "0.88rem",
  color: "#4b5563",
};

const contentStyle = {
  padding: "16px 18px 18px",
  overflowY: "auto",
  overscrollBehavior: "contain",
};

const titleRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
  gap: 10,
};

const sectionTitleStyle = {
  margin: 0,
  fontSize: "1.05rem",
  color: "#1a3c34",
  fontWeight: 800,
};

const pillStyle = {
  padding: "6px 10px",
  borderRadius: 999,
  backgroundColor: "#eef7f5",
  border: "1px solid #d9efe9",
  color: "#1a3c34",
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const tabsRow = {
  display: "flex",
  gap: 8,
  marginBottom: 12,
};

const tabBtn = {
  flex: 1,
  border: "1px solid #e5e7eb",
  background: "#fff",
  padding: "10px 12px",
  borderRadius: 12,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 800,
  color: "#111827",
};

const tabBtnActive = {
  borderColor: "#1a3c34",
  background: "#eef7f5",
  color: "#1a3c34",
};

const formCard = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  background: "#fff",
  boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
};

const formTitle = {
  fontSize: 13,
  fontWeight: 900,
  color: "#1a3c34",
  marginBottom: 10,
};

const twoColRow = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const divider = {
  height: 1,
  background: "#e5e7eb",
  margin: "16px 0",
};

const listTitleRow = {
  marginBottom: 10,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const listTitle = {
  fontSize: 13,
  fontWeight: 900,
  color: "#1a3c34",
};

const tinyMuted = { fontSize: 12, color: "#6b7280", fontWeight: 700 };

const emptyBoxStyle = {
  border: "1px dashed #d0d5dd",
  borderRadius: 10,
  padding: 14,
  backgroundColor: "#fafafa",
};

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  backgroundColor: "white",
  boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
};

const cardTitleStyle = {
  fontSize: 13,
  fontWeight: 900,
  color: "#1a3c34",
};

const mutedSmallStyle = {
  fontSize: 12,
  color: "#6b7280",
  fontWeight: 800,
};

const messageErrorStyle = {
  color: "#c53030",
  backgroundColor: "#fff5f5",
  padding: "10px 12px",
  borderRadius: "10px",
  marginBottom: 10,
  fontSize: "13px",
  fontWeight: 800,
  border: "1px solid #fecaca",
};

const messageSuccessStyle = {
  color: "#2f855a",
  backgroundColor: "#f0fff4",
  padding: "10px 12px",
  borderRadius: "10px",
  marginBottom: 10,
  fontSize: "13px",
  fontWeight: 800,
  border: "1px solid #b7f7d1",
};

const primaryBtn = {
  border: "1px solid #1a3c34",
  background: "#1a3c34",
  color: "#fff",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
};
