// src/components/ReportDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
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
 * ReportDashboard
 * ✅ Saves to collection: usersReports
 * ✅ Shows submitted reports list + details
 * ✅ NEW: If user has NO bookings / no owned plot => hide report inputs (form)
 */
export default function ReportDashboard({ user, onClose }) {
  // profile
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profile, setProfile] = useState(null);

  // form
  const [projectName, setProjectName] = useState("");
  const [category, setCategory] = useState("payment_related");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [bookingNo, setBookingNo] = useState("");

  // ui
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // reports list
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState(null);

  // selected report
  const [selectedReportId, setSelectedReportId] = useState(null);
  const selectedReport = useMemo(
    () => reports.find((r) => r.id === selectedReportId) || null,
    [reports, selectedReportId]
  );

  // load user doc (profile + bookings)
  useEffect(() => {
    if (!user?.uid) return;

    const load = async () => {
      setLoadingProfile(true);
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        setProfile(snap.exists() ? snap.data() : null);
      } catch (e) {
        console.error(e);
        setProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    };

    load();
  }, [user?.uid]);

  // ✅ compute whether user can submit report (must have at least one booking/payment/owned plot)
  const canSubmitReport = useMemo(() => {
    const bookings = Array.isArray(profile?.bookings) ? profile.bookings : [];

    // consider as "has history" if ANY booking exists
    if (bookings.length === 0) return false;

    // or stricter: only if has success or owned
    const ok = bookings.some((b) => {
      const status = String(b?.status || "").toLowerCase();
      const isSuccess = status.includes("success");
      const hasPaymentId = !!b?.paymentId;
      const hasPlot = !!b?.plotOwned;
      return isSuccess || hasPaymentId || hasPlot;
    });

    return ok;
  }, [profile]);

  // subscribe reports (no orderBy => avoids index issues)
  useEffect(() => {
    if (!user?.uid) return;

    setLoadingReports(true);
    setReportsError(null);

    const q = query(collection(db, "usersReports"), where("userId", "==", user.uid), limit(50));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => (Number(b.createdAtMs) || 0) - (Number(a.createdAtMs) || 0));
        setReports(rows);
        setLoadingReports(false);

        if ((!selectedReportId || !rows.some((r) => r.id === selectedReportId)) && rows.length > 0) {
          setSelectedReportId(rows[0].id);
        }
      },
      (err) => {
        console.error("usersReports snapshot error:", err);
        setReportsError(err?.message || "Failed to load reports.");
        setLoadingReports(false);
      }
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // header values
  const photoURL = user?.photoURL || "https://via.placeholder.com/80?text=U";
  const displayName = profile?.displayName || user?.displayName || "User";
  const email = user?.email || "—";
  const mobile = profile?.mobile || profile?.mobileNumber || "";
  const mobileDisplay = mobile ? `+91 ${mobile}` : "Not provided";

  const reportCountLabel = useMemo(() => `${reports.length} Submitted`, [reports.length]);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!user?.uid) return setError("User not logged in.");
    if (!canSubmitReport) return setError("Report option is available only after a booking/payment is made.");
    if (projectName.trim().length < 2) return setError("Please enter project name (min 2 characters).");
    if (subject.trim().length < 3) return setError("Please enter a subject (min 3 characters).");
    if (details.trim().length < 10) return setError("Please enter details (min 10 characters).");

    setSending(true);

    const nowMs = Date.now();
    const tempId = `local-${nowMs}`;

    const optimistic = {
      id: tempId,
      userId: user.uid,
      projectName: projectName.trim(),
      category,
      subject: subject.trim(),
      details: details.trim(),
      paymentId: (paymentId || "").trim(),
      bookingNo: (bookingNo || "").trim(),
      status: "open",
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
    };

    setReports((prev) => [optimistic, ...prev]);
    setSelectedReportId(tempId);

    try {
      const payload = {
        userId: user.uid,
        userSnapshot: { uid: user.uid, name: displayName, email, mobile: mobile || "" },

        projectName: projectName.trim(),
        category,
        subject: subject.trim(),
        details: details.trim(),
        paymentId: (paymentId || "").trim(),
        bookingNo: (bookingNo || "").trim(),

        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdAtMs: nowMs,
        updatedAtMs: nowMs,
        source: "webapp",
      };

      const ref = await addDoc(collection(db, "usersReports"), payload);

      setReports((prev) => prev.map((r) => (r.id === tempId ? { ...r, id: ref.id } : r)));
      setSelectedReportId(ref.id);

      setSuccess("Report submitted successfully.");

      setProjectName("");
      setCategory("payment_related");
      setSubject("");
      setDetails("");
      setPaymentId("");
      setBookingNo("");
    } catch (e) {
      console.error(e);
      setError("Failed to submit report. Please try again.");
      setReports((prev) => prev.filter((r) => r.id !== tempId));
      setSelectedReportId(null);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={overlayStyle} data-modal="true" onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button style={closeBtnStyle} onClick={onClose} aria-label="Close">
          ×
        </button>

        {/* Header same as before */}
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

        <div style={contentStyle}>
          <div style={titleRowStyle}>
            <h3 style={sectionTitleStyle}>Report an Issue</h3>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={pillStyle}>📝 Report</div>
              <div style={pillStyle}>{reportCountLabel}</div>
            </div>
          </div>

          {loadingProfile ? <div style={hintStyle}>Loading your details...</div> : null}
          {error ? <div style={messageErrorStyle}>⚠️ {error}</div> : null}
          {success ? <div style={messageSuccessStyle}>✅ {success}</div> : null}

          {/* Reports list + details (always ok to view) */}
          <div style={listTitleRow}>
            <div style={listTitle}>Submitted Reports</div>
            {loadingReports ? <div style={tinyMuted}>Loading...</div> : null}
          </div>

          {reportsError ? <div style={messageErrorStyle}>⚠️ {reportsError}</div> : null}

          {!loadingReports && reports.length === 0 ? (
            <div style={emptyBoxStyle}>
              <div style={{ fontWeight: 900, color: "#1a3c34", marginBottom: 6 }}>No reports yet</div>
              <div style={{ fontSize: 12, color: "#666", fontWeight: 600 }}>
                Your submitted reports will appear here.
              </div>
            </div>
          ) : (
            <div style={splitLayout}>
              <div style={leftCol}>
                <div style={{ display: "grid", gap: 10 }}>
                  {reports.map((r) => (
                    <ReportRow
                      key={r.id}
                      report={r}
                      active={r.id === selectedReportId}
                      onClick={() => setSelectedReportId(r.id)}
                    />
                  ))}
                </div>
              </div>
              <div style={rightCol}>
                {selectedReport ? <ReportDetails report={selectedReport} /> : <div style={detailsEmpty}>Select a report</div>}
              </div>
            </div>
          )}

          {/* ✅ Hide report inputs if user has no history */}
          {!canSubmitReport ? (
            <div style={gateBoxStyle}>
              <div style={{ fontWeight: 900, color: "#1a3c34", marginBottom: 6 }}>Report option disabled</div>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, lineHeight: 1.35 }}>
                You can submit a report only after you have a booking/payment history or an owned plot.
              </div>
            </div>
          ) : (
            <>
              <div style={divider} />

              <div style={formTitle}>Submit New Report</div>

              <Label>Project Name</Label>
              <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Eg: Raaga / Parva" />

              <Label>Category</Label>
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="payment_related">Payment Related</option>
                <option value="plot_related">Plot Related</option>
                <option value="legal_documents">Legal Documents</option>
                <option value="other">Other</option>
              </Select>

              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short title" />

              <div style={twoColRow}>
                <div>
                  <Label>Payment ID (optional)</Label>
                  <Input value={paymentId} onChange={(e) => setPaymentId(e.target.value)} placeholder="pay_XXXX" />
                </div>
                <div>
                  <Label>Booking No (optional)</Label>
                  <Input value={bookingNo} onChange={(e) => setBookingNo(e.target.value)} placeholder="BK-XXXX" />
                </div>
              </div>

              <Label>Details</Label>
              <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Explain clearly..." />

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button style={ghostBtn} onClick={onClose} type="button">
                  Close
                </button>
                <button style={primaryBtn} onClick={handleSubmit} disabled={sending} type="button">
                  {sending ? "Submitting…" : "Submit Report"}
                </button>
              </div>

              <div style={footerNote}>
                Tip: Adding <b>Payment ID</b> / <b>Booking No</b> helps us resolve faster.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- List row ---------------- */

function ReportRow({ report, active, onClick }) {
  const cat = categoryLabel(report?.category);
  const status = statusMetaFor(report?.status);
  const created = formatDateFlexible(report?.createdAt, report?.createdAtMs);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...rowBtn,
        borderColor: active ? "#1a3c34" : "#e5e7eb",
        background: active ? "#eef7f5" : "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0, textAlign: "left" }}>
          <div style={rowTitle}>
            {report?.projectName || "—"} <span style={mutedSmall}>• {cat}</span>
          </div>
          <div style={mutedSmall}>{created ? `Submitted: ${created}` : "Submitted: —"}</div>
          <div style={rowSubject}>{report?.subject || "—"}</div>
        </div>
        <span style={statusPillStyle(status)}>{status.text}</span>
      </div>
    </button>
  );
}

/* ---------------- Details panel ---------------- */

function ReportDetails({ report }) {
  const cat = categoryLabel(report?.category);
  const status = statusMetaFor(report?.status);
  const created = formatDateFlexible(report?.createdAt, report?.createdAtMs);

  return (
    <div style={detailsCard}>
      <div style={detailsTop}>
        <div style={{ minWidth: 0 }}>
          <div style={detailsTitle}>
            {report?.projectName || "—"} <span style={mutedSmall}>• {cat}</span>
          </div>
          <div style={mutedSmall}>{created ? `Submitted: ${created}` : "Submitted: —"}</div>
        </div>
        <span style={statusPillStyle(status)}>{status.text}</span>
      </div>

      <div style={detailsGrid}>
        <Field label="Payment ID" value={report?.paymentId || "—"} mono />
        <Field label="Booking No" value={report?.bookingNo || "—"} mono />
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={labelStyle}>Subject</div>
        <div style={valueStyle}>{report?.subject || "—"}</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={labelStyle}>Details</div>
        <div style={detailsText}>{report?.details || "—"}</div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={mono ? monoValueStyle : valueStyle} title={String(value || "")}>
        {value}
      </div>
    </div>
  );
}

/* ---------------- Helpers ---------------- */

function categoryLabel(v) {
  const s = String(v || "");
  if (s === "payment_related") return "Payment Related";
  if (s === "plot_related") return "Plot Related";
  if (s === "legal_documents") return "Legal Documents";
  return "Other";
}

function statusMetaFor(status) {
  const s = String(status || "open").toLowerCase();
  if (s.includes("resolved") || s.includes("closed")) return { tone: "success", text: "Resolved" };
  if (s.includes("progress")) return { tone: "pending", text: "In Progress" };
  return { tone: "neutral", text: "Open" };
}

function statusPillStyle(meta) {
  const map = {
    success: { bg: "#ecfdf3", color: "#2f855a", border: "#b7f7d1" },
    pending: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
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
    height: "fit-content",
  };
}

function formatDateFlexible(createdAt, createdAtMs) {
  if (createdAt?.toDate) {
    const d = createdAt.toDate();
    if (!Number.isNaN(d.getTime())) return toLabel(d);
  }
  if (createdAtMs) {
    const d = new Date(createdAtMs);
    if (!Number.isNaN(d.getTime())) return toLabel(d);
  }
  if (createdAt) {
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) return toLabel(d);
  }
  return "";
}

function toLabel(d) {
  return d.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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
      width: "95%",
      padding: "8px 12px",
      marginBottom: 14,
      border: "1px solid #d0d5dd",
      borderRadius: "8px",
      fontSize: "13px",
      outline: "none",
      ...props.style,
    }}
  />
);

const Textarea = (props) => (
  <textarea
    {...props}
    rows={5}
    style={{
      width: "95%",
      padding: "10px 12px",
      marginBottom: 14,
      border: "1px solid #d0d5dd",
      borderRadius: "8px",
      fontSize: "13px",
      outline: "none",
      resize: "vertical",
      lineHeight: 1.35,
      ...props.style,
    }}
  />
);

const Select = (props) => (
  <select
    {...props}
    style={{
      width: "100%",
      padding: "8px 12px",
      marginBottom: 14,
      border: "1px solid #d0d5dd",
      borderRadius: "8px",
      fontSize: "13px",
      outline: "none",
      background: "#fff",
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
  maxWidth: "900px",
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

const hintStyle = { fontSize: 13, color: "#555", padding: "10px 2px", fontWeight: 600 };

const titleRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 14,
  gap: 12,
};

const sectionTitleStyle = {
  margin: 0,
  fontSize: "1.05rem",
  color: "#1a3c34",
  fontWeight: 700,
};

const pillStyle = {
  padding: "6px 10px",
  borderRadius: 999,
  backgroundColor: "#eef7f5",
  border: "1px solid #d9efe9",
  color: "#1a3c34",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const splitLayout = {
  display: "grid",
  gridTemplateColumns: "1.1fr 0.9fr",
  gap: 12,
};

const leftCol = { minHeight: 0 };
const rightCol = { minHeight: 0 };

const rowBtn = {
  width: "100%",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
};

const rowTitle = {
  fontSize: 13,
  fontWeight: 900,
  color: "#1a3c34",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const rowSubject = {
  marginTop: 6,
  fontSize: 12,
  fontWeight: 800,
  color: "#111827",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const mutedSmall = {
  fontSize: 12,
  color: "#6b7280",
  fontWeight: 700,
};

const detailsCard = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  backgroundColor: "#fff",
  boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
};

const detailsTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
};

const detailsTitle = {
  fontSize: 13,
  fontWeight: 900,
  color: "#1a3c34",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const detailsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
  marginTop: 12,
};

const labelStyle = {
  fontSize: 11,
  color: "#6b7280",
  marginBottom: 4,
  fontWeight: 900,
};

const valueStyle = {
  fontSize: 12.5,
  color: "#111827",
  fontWeight: 800,
};

const monoValueStyle = {
  fontSize: 12,
  color: "#111827",
  fontWeight: 900,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const detailsText = {
  fontSize: 12.5,
  color: "#111827",
  fontWeight: 700,
  lineHeight: 1.45,
  whiteSpace: "pre-wrap",
};

const detailsEmpty = {
  border: "1px dashed #d0d5dd",
  borderRadius: 12,
  padding: 14,
  background: "#fafafa",
  color: "#6b7280",
  fontSize: 12,
  fontWeight: 700,
};

const listTitleRow = {
  marginTop: 4,
  marginBottom: 10,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
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

const gateBoxStyle = {
  marginTop: 14,
  border: "1px dashed #d0d5dd",
  borderRadius: 12,
  padding: 14,
  backgroundColor: "#fafafa",
};

const divider = {
  height: 1,
  background: "#e5e7eb",
  margin: "16px 0",
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

const ghostBtn = {
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#111827",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const primaryBtn = {
  border: "1px solid #1a3c34",
  background: "#1a3c34",
  color: "#fff",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  opacity: 1,
};

const messageErrorStyle = {
  color: "#c53030",
  backgroundColor: "#fff5f5",
  padding: "10px 12px",
  borderRadius: "10px",
  marginBottom: 12,
  fontSize: "13px",
  fontWeight: 700,
  border: "1px solid #fecaca",
};

const messageSuccessStyle = {
  color: "#2f855a",
  backgroundColor: "#f0fff4",
  padding: "10px 12px",
  borderRadius: "10px",
  marginBottom: 12,
  fontSize: "13px",
  fontWeight: 700,
  border: "1px solid #b7f7d1",
};

const footerNote = {
  marginTop: 14,
  fontSize: 12,
  color: "#6b7280",
  fontWeight: 600,
  borderTop: "1px solid #e5e7eb",
  paddingTop: 12,
};
