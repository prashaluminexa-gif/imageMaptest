// src/components/PaymentHistoryDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * PaymentHistoryDashboard (MINIMAL)
 * ✅ Shows: Booking Date, Plot, PaymentId, Booking No, Advance Amount, Status
 * ✅ Shows totals: Total Advance + Total Investment
 * ✅ Footer: Contact Support button/link
 * ✅ Compact modal size (good for tablets)
 */
export default function PaymentHistoryDashboard({ user, onClose }) {
  const [loading, setLoading] = useState(true);
  const [userDoc, setUserDoc] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          setUserDoc(null);
          setError("No profile data found.");
          return;
        }

        setUserDoc(snap.data());
      } catch (e) {
        console.error(e);
        setError("Failed to load payment history.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.uid]);

  const payments = useMemo(() => {
    const arr = Array.isArray(userDoc?.bookings) ? userDoc.bookings : [];

    const normalizeDate = (t) => {
      if (!t) return new Date(0);
      if (typeof t === "string" || typeof t === "number") return new Date(t);
      if (t?.toDate) return t.toDate();
      return new Date(String(t));
    };

    return [...arr]
      .sort((a, b) => {
        const ta = normalizeDate(a?.timestamp || a?.createdAt).getTime();
        const tb = normalizeDate(b?.timestamp || b?.createdAt).getTime();
        return tb - ta;
      })
      .map((b) => ({
        date: b?.timestamp || b?.createdAt || "",
        plotOwned: b?.plotOwned || "—",
        paymentId: b?.paymentId || "—",
        bookingNumber: b?.bookingNumber || "—",
        advanceAmount: b?.advanceAmount,
        dealClosedAmount: b?.dealClosedAmount,
        status: b?.status || "—",
      }));
  }, [userDoc]);

  // ✅ totals (success only)
  const totals = useMemo(() => {
    const isSuccess = (status) => {
      const s = String(status || "").toLowerCase();
      return (
        s.includes("success") ||
        s.includes("paid") ||
        s.includes("captured") ||
        s.includes("completed")
      );
    };

    const success = payments.filter((p) => isSuccess(p.status));
    const totalAdvance = success.reduce((sum, p) => sum + (Number(p.advanceAmount) || 0), 0);
    const totalInvestment = success.reduce((sum, p) => sum + (Number(p.dealClosedAmount) || 0), 0);

    return { totalAdvance, totalInvestment, successCount: success.length, count: payments.length };
  }, [payments]);

  const photoURL = user?.photoURL || "https://via.placeholder.com/56?text=U";
  const displayName = userDoc?.displayName || user?.displayName || "User";
  const email = user?.email || "—";

  // ✅ footer support link (edit as per your company)
  const supportWhatsApp = "https://wa.me/919999999999?text=Hello%20Support,%20I%20need%20help%20with%20payment%20history.";
  const supportEmail = "support@yourdomain.com";

  return (
    <div style={overlayStyle} data-modal="true" onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button style={closeBtnStyle} onClick={onClose} aria-label="Close">
          ×
        </button>

        {/* Header (minimal) */}
        <div style={headerStyle}>
          <img
            src={photoURL}
            alt="Profile"
            style={profileImgStyle}
            onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/56?text=U")}
          />
          <div style={userInfoStyle}>
            <h2 style={nameStyle}>{displayName}</h2>
            <p style={detailStyle}>{email}</p>
          </div>
        </div>

        <div style={contentStyle}>
          {loading && <div style={hintStyle}>Loading payment history...</div>}
          {!loading && error && <div style={messageErrorStyle}>{error}</div>}

          {!loading && !error && (
            <>
              <div style={titleRowStyle}>
                <h3 style={sectionTitleStyle}>Payment History</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <div style={pillStyle}>{totals.count} Records</div>
                  <div style={pillStyle}>✅ {totals.successCount} Success</div>
                </div>
              </div>

              {/* ✅ totals (keep it small) */}
              <div style={totalsBar}>
                <div style={totalsItem}>
                  <div style={totalsLabel}>Total Advance (Success)</div>
                  <div style={totalsValue}>{toINR(totals.totalAdvance)}</div>
                </div>
                <div style={totalsItem}>
                  <div style={totalsLabel}>Total Investment (Success)</div>
                  <div style={totalsValue}>{toINR(totals.totalInvestment)}</div>
                </div>
              </div>

              {/* header row */}
              <div style={tableHeader}>
                <div style={th}>Booking Date</div>
                <div style={th}>Plot</div>
                <div style={th}>Payment ID</div>
                <div style={th}>Booking No</div>
                <div style={{ ...th, textAlign: "right" }}>Advance</div>
                <div style={{ ...th, textAlign: "right" }}>Status</div>
              </div>

              {payments.length === 0 ? (
                <div style={emptyBoxStyle}>
                  <div style={{ fontWeight: 900, color: "#1a3c34", marginBottom: 6 }}>
                    No payments found
                  </div>
                  <div style={{ fontSize: 12, color: "#666", fontWeight: 700 }}>
                    Payments will appear here after booking.
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {payments.map((p, idx) => (
                    <PaymentRow key={`${p.paymentId}-${idx}`} p={p} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ✅ Footer support bar */}
        <div style={footerStyle}>
          <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
            Need help?
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <a href={`mailto:${supportEmail}`} style={footerBtn}>
              ✉️ Email Support
            </a>
            <a href={supportWhatsApp} target="_blank" rel="noreferrer" style={footerBtnPrimary}>
              💬 WhatsApp Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentRow({ p }) {
  return (
    <div style={row}>
      <div style={td}>{p.date ? formatDate(p.date) : "—"}</div>
      <div style={td}>{p.plotOwned}</div>
      <div style={tdMono} title={p.paymentId}>
        {p.paymentId}
      </div>
      <div style={tdMono} title={p.bookingNumber}>
        {p.bookingNumber}
      </div>
      <div style={{ ...td, textAlign: "right", fontWeight: 900, color: "#1a3c34" }}>
        {toINR(p.advanceAmount)}
      </div>
      <div style={{ ...td, textAlign: "right" }}>
        <StatusPill status={p.status} />
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const s = String(status || "").toLowerCase();
  const isSuccess = s.includes("success") || s.includes("paid") || s.includes("captured") || s.includes("completed");
  const isPending = s.includes("pending");
  const isFailed = s.includes("fail") || s.includes("error") || s.includes("cancel");

  const bg = isSuccess ? "#ecfdf3" : isPending ? "#fffbeb" : isFailed ? "#fff5f5" : "#f3f4f6";
  const color = isSuccess ? "#2f855a" : isPending ? "#b45309" : isFailed ? "#c53030" : "#374151";
  const border = isSuccess ? "#b7f7d1" : isPending ? "#fde68a" : isFailed ? "#fecaca" : "#e5e7eb";

  return (
    <span
      style={{
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 900,
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        whiteSpace: "nowrap",
      }}
    >
      {status || "—"}
    </span>
  );
}

// ---------- helpers ----------
function toINR(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  try {
    return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  } catch {
    return `₹${n}`;
  }
}

function formatDate(v) {
  const d =
    typeof v === "string" || typeof v === "number"
      ? new Date(v)
      : v?.toDate
      ? v.toDate()
      : new Date(String(v));

  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------- styles ----------
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
  maxWidth: 760,
  maxHeight: "76vh",
  backgroundColor: "white",
  borderRadius: 12,
  boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const closeBtnStyle = {
  position: "absolute",
  top: 10,
  right: 12,
  background: "none",
  border: "none",
  fontSize: 28,
  color: "#777",
  cursor: "pointer",
  zIndex: 10,
  lineHeight: 1,
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  padding: "12px 14px",
  borderBottom: "1px solid #e5e7eb",
  backgroundColor: "#f9fafb",
  gap: 12,
};

const profileImgStyle = {
  width: 56,
  height: 56,
  borderRadius: "50%",
  objectFit: "cover",
  border: "2px solid white",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

const userInfoStyle = { flex: 1 };

const nameStyle = {
  margin: "0 0 4px",
  fontSize: "1.05rem",
  fontWeight: 900,
  color: "#1a3c34",
};

const detailStyle = {
  margin: "2px 0 0",
  fontSize: "0.82rem",
  color: "#4b5563",
  fontWeight: 700,
};

const contentStyle = {
  padding: "12px 14px",
  overflowY: "auto",
};

const hintStyle = { fontSize: 12, color: "#555", padding: "8px 2px", fontWeight: 700 };

const sectionTitleStyle = {
  margin: 0,
  fontSize: "1rem",
  color: "#1a3c34",
  fontWeight: 900,
};

const titleRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 10,
  gap: 10,
};

const pillStyle = {
  padding: "6px 10px",
  borderRadius: 999,
  backgroundColor: "#eef7f5",
  border: "1px solid #d9efe9",
  color: "#1a3c34",
  fontSize: 12,
  fontWeight: 900,
};

const totalsBar = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
  marginBottom: 10,
};

const totalsItem = {
  border: "1px solid #e5e7eb",
  background: "#fafafa",
  borderRadius: 12,
  padding: 10,
};

const totalsLabel = {
  fontSize: 11,
  color: "#6b7280",
  fontWeight: 900,
  marginBottom: 6,
};

const totalsValue = {
  fontSize: 13,
  color: "#1a3c34",
  fontWeight: 900,
};

const tableHeader = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr 1.4fr 1.1fr 0.9fr 0.9fr",
  gap: 8,
  padding: "10px 10px",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#f9fafb",
  marginBottom: 8,
};

const th = {
  fontSize: 11,
  color: "#6b7280",
  fontWeight: 900,
};

const row = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr 1.4fr 1.1fr 0.9fr 0.9fr",
  gap: 8,
  alignItems: "center",
  padding: "10px 10px",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#fff",
};

const td = {
  fontSize: 12,
  color: "#111827",
  fontWeight: 800,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const tdMono = {
  ...td,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontWeight: 900,
};

const emptyBoxStyle = {
  border: "1px dashed #d0d5dd",
  borderRadius: 10,
  padding: 14,
  backgroundColor: "#fafafa",
};

const messageErrorStyle = {
  color: "#c53030",
  backgroundColor: "#fff5f5",
  padding: "10px 12px",
  borderRadius: 6,
  marginBottom: 12,
  fontSize: 12,
  fontWeight: 800,
};

const footerStyle = {
  borderTop: "1px solid #e5e7eb",
  background: "#f9fafb",
  padding: "10px 14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const footerBtn = {
  textDecoration: "none",
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#111827",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 900,
};

const footerBtnPrimary = {
  textDecoration: "none",
  border: "1px solid #1a3c34",
  background: "#1a3c34",
  color: "#fff",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 900,
};
