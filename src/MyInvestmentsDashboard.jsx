// src/components/MyInvestmentsDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export default function MyInvestmentsDashboard({ user, onClose }) {
  const [loading, setLoading] = useState(true);
  const [userDoc, setUserDoc] = useState(null);
  const [error, setError] = useState(null);

  const [selectedBooking, setSelectedBooking] = useState(null);

  // Dummy news/updates (you can replace with Firestore later)
  const newsUpdates = useMemo(
    () => [
      {
        id: "n1",
        title: "Road work update",
        date: "2026-01-10T10:00:00Z",
        note: "Internal roads leveling completed for Phase-1. Next: paver blocks.",
      },
    ],
    []
  );

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
        setError("Failed to load investments.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.uid]);

  // ✅ ONLY purchased plots (hide failed/pending)
  const bookings = useMemo(() => {
    const arr = Array.isArray(userDoc?.bookings) ? userDoc.bookings : [];

    const isBought = (status) => {
      const s = String(status || "").toLowerCase();
      const bad = ["fail", "error", "cancel", "pending", "aborted"];
      if (bad.some((k) => s.includes(k))) return false;

      const good = ["success", "paid", "captured", "completed", "confirmed"];
      return good.some((k) => s.includes(k));
    };

    const normalizeDate = (t) => {
      if (!t) return new Date(0);
      if (typeof t === "string" || typeof t === "number") return new Date(t);
      if (t?.toDate) return t.toDate(); // Firestore Timestamp
      return new Date(String(t));
    };

    return [...arr]
      .filter((b) => isBought(b?.status))
      .sort((a, b) => {
        const ta = normalizeDate(a?.timestamp || a?.createdAt).getTime();
        const tb = normalizeDate(b?.timestamp || b?.createdAt).getTime();
        return tb - ta;
      });
  }, [userDoc]);

  const photoURL = user?.photoURL || "https://via.placeholder.com/80?text=U";
  const displayName = userDoc?.displayName || user?.displayName || "User";
  const email = user?.email || "—";
  const mobile = userDoc?.mobile || userDoc?.mobileNumber || "";
  const mobileDisplay = mobile ? `+91 ${mobile}` : "Mobile not provided";

  const addressLine1 = userDoc?.addressLine1 || "";
  const addressLine2 = userDoc?.addressLine2 || "";
  const city = userDoc?.city || "";
  const state = userDoc?.state || "";
  const pincode = userDoc?.pincode || "";

  const addressDisplay = [addressLine1, addressLine2, city, state, pincode]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      style={overlayStyle}
      data-modal="true"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onClose}
    >
      <div
        style={modalStyle}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button style={closeBtnStyle} onClick={onClose} aria-label="Close">
          ×
        </button>

        {/* Responsive CSS */}
        <style>{`
          .inv-grid{
            display:grid;
            gap:10px;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          @media (max-width: 900px){
            .inv-grid{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
          }
          @media (max-width: 560px){
            .inv-grid{ grid-template-columns: repeat(1, minmax(0, 1fr)); }
          }

          .details-2col{
            display:grid;
            grid-template-columns: 1.6fr 1fr;
            gap:12px;
          }
          @media (max-width: 860px){
            .details-2col{ grid-template-columns: 1fr; }
          }
        `}</style>

        {/* Header */}
        <div style={headerStyle}>
          <img
            src={photoURL}
            alt="Profile"
            style={profileImgStyle}
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/80?text=U";
            }}
          />
          <div style={userInfoStyle}>
            <h2 style={nameStyle}>{displayName}</h2>
            <p style={detailStyle}>{email}</p>
            <p style={detailStyle}>{mobileDisplay}</p>
            {addressDisplay ? <p style={detailStyle}>{addressDisplay}</p> : null}
          </div>
        </div>

        <div style={contentStyle}>
          {loading && <div style={hintStyle}>Loading investments...</div>}
          {!loading && error && <div style={messageErrorStyle}>{error}</div>}

          {!loading && !error && (
            <>
              <div style={titleRowStyle}>
                <h3 style={sectionTitleStyle}>My Investments</h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={pillStyle}>{bookings.length} Plots</div>

                  <button
                    style={primaryBtn}
                    onClick={() =>
                      alert("Design Layout: connect this to your layout page/route")
                    }
                  >
                    <span style={{ marginRight: 8 }}>🎨</span> Design Layout
                  </button>
                </div>
              </div>

              {/* News / Updates */}
              <div style={updatesWrap}>
                <div style={updatesHead}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={updatesIcon}>📰</div>
                    <div style={updatesTitle}>Project News & Updates</div>
                  </div>
                  <div style={updatesHint}>Latest announcements</div>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {newsUpdates.map((n) => (
                    <div key={n.id} style={updateItem}>
                      <div style={{ fontWeight: 900, color: "#111827" }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                        {formatDate(n.date)}
                      </div>
                      <div style={{ fontSize: 12, color: "#374151", marginTop: 6 }}>
                        {n.note}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {bookings.length === 0 ? (
                <div style={emptyBoxStyle}>
                  <div style={{ fontWeight: 700, color: "#1a3c34", marginBottom: 6 }}>
                    No purchased plots found
                  </div>
                  <div style={{ fontSize: 13, color: "#666" }}>
                    Only successful payments are shown here.
                  </div>
                </div>
              ) : (
                <div className="inv-grid">
                  {bookings.map((b, idx) => (
                    <InvestmentCard
                      key={b?.bookingNumber || b?.paymentId || idx}
                      booking={b}
                      newsSnippet={newsUpdates[idx % newsUpdates.length]}
                      onClick={() => setSelectedBooking(b)}
                      onDownloadReceipt={(e) => {
                        e.stopPropagation();
                        downloadReceiptHTML(b, userDoc, user);
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Plot Details Modal */}
        {selectedBooking && (
          <PlotDetailsModal
            booking={selectedBooking}
            userDoc={userDoc}
            user={user}
            onClose={() => setSelectedBooking(null)}
          />
        )}
      </div>
    </div>
  );
}

/** Plot card */
function InvestmentCard({ booking, onClick, onDownloadReceipt, newsSnippet }) {
  const status = (booking?.status || "—").toString();
  const plotOwned = booking?.plotOwned || "—";
  const communityName = booking?.communityName || "—";
  const bookingNumber = booking?.bookingNumber || "—";
  const paymentId = booking?.paymentId || "—";

  const advanceAmount = toINR(booking?.advanceAmount);
  const dealClosedAmount = toINR(booking?.dealClosedAmount);

  const ts = booking?.timestamp || booking?.createdAt;
  const dateLabel = ts ? formatDate(ts) : "—";

  return (
    <div style={{ ...cardStyle, cursor: "pointer" }} onClick={onClick}>
      <div style={cardTopRowStyle}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={cardTitleStyle}>
            <span style={{ marginRight: 6 }}>📍</span>
            {plotOwned} <span style={mutedSmallStyle}>• {communityName}</span>
          </div>

          <div style={mutedSmallStyle}>
            <span style={{ marginRight: 6 }}>🗓️</span> Booked on: {dateLabel}
          </div>

          <div style={mutedSmallStyle}>
            <span style={{ marginRight: 6 }}>🧾</span> Booking No:{" "}
            <b style={{ color: "#111827" }}>{bookingNumber}</b>
          </div>

          <div style={mutedSmallStyle}>
            <span style={{ marginRight: 6 }}>💳</span> Payment ID:{" "}
            <b style={{ color: "#111827" }}>{paymentId}</b>
          </div>
        </div>

        <StatusPill status={status} />
      </div>

      <div style={gridStyle}>
        <Info label="Advance" value={advanceAmount} />
        <Info label="Deal Closed" value={dealClosedAmount} />
      </div>

      {newsSnippet ? (
        <div style={miniUpdate}>
          <div style={{ fontWeight: 900, color: "#1a3c34", fontSize: 12 }}>
            📰 {newsSnippet.title}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{newsSnippet.note}</div>
        </div>
      ) : null}

      <div style={cardFooterRow}>
        <div style={{ fontSize: 12, color: "#1a3c34", fontWeight: 800 }}>
          View details →
        </div>

        <button style={ghostBtn} onClick={onDownloadReceipt}>
          <span style={{ marginRight: 6 }}>⬇️</span> Receipt
        </button>
      </div>
    </div>
  );
}

/**
 * PlotDetailsModal
 * LEFT: Payment, Payment Stages (Farmland), Trees, Events
 * RIGHT: ROI above Legal documents
 */
function PlotDetailsModal({ booking, userDoc, user, onClose }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);

  const projectId =
    booking?.projectId || booking?.communityId || booking?.projectRefId || null;

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) return;
      setLoading(true);
      try {
        const ref = doc(db, "projects", projectId);
        const snap = await getDoc(ref);
        setProject(snap.exists() ? snap.data() : null);
      } catch (e) {
        console.error(e);
        setProject(null);
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId]);

  // ROI
  const invested = Number(booking?.dealClosedAmount ?? booking?.advanceAmount ?? 0);
  const roiRate = Number(booking?.roiRate ?? project?.roiRate ?? 12);
  const years = 5;
  const roi = computeROI(invested, roiRate, years);

  // Trees / events / docs with dummy fallbacks
  const dummyTrees = useMemo(
    () => [
      { name: "Neem", count: 8, type: "Shade", age: "2 years" },
      { name: "Mango", count: 5, type: "Fruit", age: "1.5 years" },
      { name: "Teak", count: 12, type: "Timber", age: "3 years" },
    ],
    []
  );

  const treesRaw = Array.isArray(project?.trees) ? project.trees : [];
  const trees = treesRaw.length ? treesRaw : dummyTrees;

  const events = Array.isArray(project?.events)
    ? project.events
    : [
        {
          title: "Site Visit",
          date: "2026-02-02T10:00:00Z",
          location: "Main Gate",
          note: "Bring your booking receipt & ID proof.",
        },
        {
          title: "Document Verification Camp",
          date: "2026-02-15T11:30:00Z",
          location: "Club House",
          note: "Original Aadhar/PAN required.",
        },
      ];

  const documents = Array.isArray(project?.documents)
    ? project.documents
    : [
        {
          title: "Sale Deed Draft",
          type: "PDF",
          url: "",
          updatedAt: "2026-01-08T10:00:00Z",
        },
        {
          title: "Khata / RTC Copy",
          type: "PDF",
          url: "",
          updatedAt: "2026-01-05T10:00:00Z",
        },
      ];

  return (
    <div style={detailsOverlay} onClick={onClose}>
      <div style={detailsModal} onClick={(e) => e.stopPropagation()}>
        {/* Top bar */}
        <div style={detailsTop}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#1a3c34" }}>
              {booking?.plotOwned || "Plot"} • {booking?.communityName || "Project"}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              Booking No: {booking?.bookingNumber || "—"} • Payment ID:{" "}
              {booking?.paymentId || "—"}
            </div>
          </div>

          {/* top actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              style={ghostBtn}
              onClick={() => downloadReceiptHTML(booking, userDoc, user)}
            >
              <span style={{ marginRight: 6 }}>⬇️</span> Download Receipt
            </button>

            <button
              style={primaryBtn}
              onClick={() =>
                alert("Design Layout: connect this to your layout page/route")
              }
            >
              <span style={{ marginRight: 8 }}>🎨</span> Design Layout
            </button>

            <button style={detailsClose} onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </div>

        {/* 2-column layout */}
        <div style={detailsBody} className="details-2col">
          {/* LEFT */}
          <div style={{ display: "grid", gap: 12 }}>
            <SectionCard
              title="Payment Details"
              icon={<IconMoney />}
              right={<StatusPill status={String(booking?.status || "—")} />}
            >
              <div style={detailsGrid}>
                <KV
                  label="Booked On"
                  value={formatDate(booking?.timestamp || booking?.createdAt || "—")}
                />
                <KV label="Status" value={String(booking?.status || "—")} />
                <KV label="Advance Amount" value={toINR(booking?.advanceAmount)} />
                <KV label="Deal Closed Amount" value={toINR(booking?.dealClosedAmount)} />
              </div>
              <div style={thinNote}>
                <span style={{ marginRight: 6 }}>ℹ️</span>
                Tip: Use “Download Receipt” for sharing with the legal team.
              </div>
            </SectionCard>

            {/* ✅ NEW: Farmland Stages */}
            <SectionCard title="Payment Stages (Farmland)" icon={<IconMoney />}>
              <PaymentStagesFarmland booking={booking} />
            </SectionCard>

            <SectionCard title="Trees in the Project" icon={<IconTree />}>
              {loading && projectId ? (
                <div style={hintStyle}>Loading project data...</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {trees.map((t, i) => (
                    <div key={t?.id || i} style={rowBox}>
                      <div style={{ fontWeight: 900, color: "#111827" }}>
                        {t?.name || "Tree"}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        Count: {t?.count ?? "—"} • Type: {t?.type ?? "—"} • Age:{" "}
                        {t?.age ?? "—"}
                      </div>
                    </div>
                  ))}
                  {!treesRaw.length ? (
                    <div style={hintStyle}>
                      Showing sample trees (dummy). Add actual trees in Firestore
                      <b> projects/{projectId}.trees</b>.
                    </div>
                  ) : null}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Upcoming Events" icon={<IconCalendar />}>
              <div style={{ display: "grid", gap: 8 }}>
                {events
                  .slice()
                  .sort((a, b) => new Date(a?.date || 0) - new Date(b?.date || 0))
                  .map((ev, i) => (
                    <div key={ev?.id || i} style={rowBox}>
                      <div style={{ fontWeight: 900, color: "#111827" }}>
                        {ev?.title || "Event"}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {ev?.date ? formatDate(ev.date) : "Date: —"} •{" "}
                        {ev?.location || "Location: —"}
                      </div>
                      {ev?.note ? (
                        <div style={{ fontSize: 12, color: "#374151", marginTop: 4 }}>
                          {ev.note}
                        </div>
                      ) : null}
                    </div>
                  ))}
              </div>
            </SectionCard>
          </div>

          {/* RIGHT sidebar */}
          <div style={{ display: "grid", gap: 12, alignSelf: "start" }}>
            <SectionCard title="ROI (5 Years)" icon={<IconChart />}>
              {invested > 0 ? (
                <>
                  <div style={roiTopRow}>
                    <div style={roiBadge}>
                      <div style={roiBadgeLabel}>Annual</div>
                      <div style={roiBadgeValue}>{roiRate}%</div>
                    </div>

                    <div style={roiSummary}>
                      <div style={roiSummaryLine}>
                        <span style={roiKey}>Invested</span>
                        <span style={roiVal}>{toINR(invested)}</span>
                      </div>
                      <div style={roiSummaryLine}>
                        <span style={roiKey}>Projected (5Y)</span>
                        <span style={roiVal}>{toINR(roi.futureValue)}</span>
                      </div>
                      <div style={roiSummaryLine}>
                        <span style={roiKey}>Profit</span>
                        <span style={roiVal}>{toINR(roi.profit)}</span>
                      </div>
                      <div style={roiSummaryLine}>
                        <span style={roiKey}>ROI %</span>
                        <span style={roiVal}>{roi.roiPct.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <RoiMiniChart invested={invested} annualRatePct={roiRate} years={5} />
                  </div>

                  <div style={thinNote}>
                    <span style={{ marginRight: 6 }}>⚠️</span>
                    ROI is an estimate (dummy rate if not stored). Set `roiRate` in
                    booking or project for accuracy.
                  </div>
                </>
              ) : (
                <div style={hintStyle}>
                  ROI needs invested amount (dealClosedAmount or advanceAmount).
                </div>
              )}
            </SectionCard>

            <SectionCard title="Legal Documents" icon={<IconDoc />}>
              <div style={{ display: "grid", gap: 8 }}>
                {documents.map((d, i) => (
                  <a
                    key={d?.id || i}
                    href={d?.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    style={docLink}
                    onClick={(e) => {
                      if (!d?.url) e.preventDefault();
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{d?.title || "Document"}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      {d?.type || "—"}{" "}
                      {d?.updatedAt ? `• Updated: ${formatDate(d.updatedAt)}` : ""}
                      {!d?.url ? " • (Demo)" : ""}
                    </div>
                  </a>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Section Card */
function SectionCard({ title, icon, right, children }) {
  return (
    <div style={detailsCard}>
      <div style={sectionHeader}>
        <div style={sectionHeaderLeft}>
          <div style={iconWrap}>{icon}</div>
          <div style={detailsCardTitle}>{title}</div>
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      {children}
    </div>
  );
}

/** ✅ NEW: Farmland Stages */
function PaymentStagesFarmland({ booking }) {
  const total =
    Number(booking?.dealClosedAmount ?? booking?.totalAmount ?? booking?.advanceAmount ?? 0);

  // Optional: store per-stage data in Firestore
  // booking.paymentStages = [{ key:"booking", status:"paid", paidAt:..., amount:... }, ...]
  const stored = Array.isArray(booking?.paymentStages) ? booking.paymentStages : null;

  const defaultStages = [
    { key: "booking", label: "Booking Amount", pct: 10, hint: "Day 1 (Token/Booking)" },
    { key: "agreement", label: "Agreement Amount", pct: 20, hint: "Within 7–15 days" },
    { key: "development", label: "Development Work", pct: 30, hint: "1–6 months (roads, fencing, etc.)" },
    { key: "registration", label: "Before Registration", pct: 40, hint: "At registration / handover" },
  ];

  const stages = stored
    ? defaultStages.map((s) => {
        const match = stored.find((x) => String(x?.key) === s.key);
        const paid = String(match?.status || "").toLowerCase().includes("paid");
        const paidAt = match?.paidAt || match?.date || null;
        const amount = Number(match?.amount ?? Math.round((total * s.pct) / 100));
        return { ...s, paid, paidAt, amount };
      })
    : defaultStages.map((s, i) => ({
        ...s,
        paid: i === 0,
        paidAt: i === 0 ? (booking?.timestamp || booking?.createdAt || null) : null,
        amount: Math.round((total * s.pct) / 100),
      }));

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
        Total Considered: <span style={{ color: "#111827" }}>{toINR(total)}</span>
      </div>

      {stages.map((s) => (
        <div key={s.key} style={stageRow}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 900, color: "#111827" }}>
                {s.label}{" "}
                <span style={{ color: "#6b7280", fontWeight: 900 }}>({s.pct}%)</span>
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                {s.hint}
                {s.paidAt ? ` • Paid: ${formatDate(s.paidAt)}` : ""}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 900, color: "#111827" }}>{toINR(s.amount)}</div>
              <div style={s.paid ? paidPill : pendingPill}>
                {s.paid ? "PAID" : "PENDING"}
              </div>
            </div>
          </div>
        </div>
      ))}

      <div style={thinNote}>
        <span style={{ marginRight: 6 }}>ℹ️</span>
        For accurate Paid/Pending per stage, store <b>booking.paymentStages</b> in Firestore.
      </div>
    </div>
  );
}

/** ROI mini chart (SVG line) */
function RoiMiniChart({ invested, annualRatePct, years = 5 }) {
  const r = (Number(annualRatePct) || 0) / 100;
  const pts = [];
  for (let y = 0; y <= years; y++) {
    const v = invested * Math.pow(1 + r, y);
    pts.push({ y, v });
  }

  const maxV = Math.max(...pts.map((p) => p.v));
  const minV = Math.min(...pts.map((p) => p.v));

  const W = 320;
  const H = 140;
  const pad = 16;

  const x = (i) => pad + (i * (W - pad * 2)) / years;
  const yy = (v) => {
    const t = (v - minV) / (maxV - minV || 1);
    return H - pad - t * (H - pad * 2);
  };

  const d = pts
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${yy(p.v).toFixed(1)}`
    )
    .join(" ");

  return (
    <div style={roiChartWrap}>
      <div style={roiChartTitle}>📈 Growth trend (Year 0 → {years})</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={roiSvg}>
        <line x1="16" y1={H - 16} x2={W - 16} y2={H - 16} stroke="#e5e7eb" />
        <line x1="16" y1="16" x2={W - 16} y2="16" stroke="#f3f4f6" />
        <path d={d} fill="none" stroke="#1a3c34" strokeWidth="3" />
        {pts.map((p, i) => (
          <circle key={i} cx={x(i)} cy={yy(p.v)} r="3.5" fill="#1a3c34" />
        ))}
      </svg>
      <div style={roiChartFooter}>
        <span>0Y: {toINR(Math.round(pts[0].v))}</span>
        <span>
          {years}Y: {toINR(Math.round(pts[years].v))}
        </span>
      </div>
    </div>
  );
}

/** Status pill */
function StatusPill({ status }) {
  const s = String(status || "").toLowerCase();
  const isSuccess = s.includes("success") || s.includes("paid") || s.includes("captured");
  const isPending = s.includes("pending");
  const isFailed = s.includes("fail") || s.includes("error") || s.includes("cancel");

  const bg = isSuccess ? "#ecfdf3" : isPending ? "#fffbeb" : isFailed ? "#fff5f5" : "#f3f4f6";
  const color = isSuccess ? "#2f855a" : isPending ? "#b45309" : isFailed ? "#c53030" : "#374151";
  const border = isSuccess ? "#b7f7d1" : isPending ? "#fde68a" : isFailed ? "#fecaca" : "#e5e7eb";

  return (
    <div
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        whiteSpace: "nowrap",
      }}
    >
      {status || "—"}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{value}</div>
    </div>
  );
}
function KV({ label, value }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{value}</div>
    </div>
  );
}

// ---------- Receipt Download (simple HTML receipt) ----------
function downloadReceiptHTML(booking, userDoc, user) {
  const name = userDoc?.displayName || user?.displayName || "User";
  const email = user?.email || "—";
  const mobile = userDoc?.mobile || userDoc?.mobileNumber || "—";

  const receiptNo = booking?.bookingNumber || booking?.paymentId || `REC-${Date.now()}`;
  const date = formatDate(booking?.timestamp || booking?.createdAt || new Date().toISOString());

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${receiptNo}</title>
  <style>
    body{font-family:Arial, sans-serif;background:#f6f7fb;padding:18px;}
    .wrap{max-width:720px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;}
    .top{padding:18px;background:#f0faf7;border-bottom:1px solid #d9efe9;}
    .title{font-size:18px;font-weight:800;color:#1a3c34;}
    .sub{font-size:12px;color:#6b7280;margin-top:6px;}
    .sec{padding:16px;}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    .k{font-size:12px;color:#6b7280;font-weight:700;}
    .v{font-size:13px;color:#111827;font-weight:800;margin-top:3px;}
    .row{border:1px solid #e5e7eb;border-radius:10px;padding:10px;background:#fafafa;}
    .foot{padding:12px 16px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div class="title">Payment Receipt</div>
      <div class="sub">Receipt No: <b>${receiptNo}</b> • Date: <b>${date}</b></div>
    </div>

    <div class="sec">
      <div class="grid">
        <div class="row">
          <div class="k">Customer</div><div class="v">${name}</div>
          <div class="k" style="margin-top:8px;">Email</div><div class="v">${email}</div>
          <div class="k" style="margin-top:8px;">Mobile</div><div class="v">${mobile}</div>
        </div>
        <div class="row">
          <div class="k">Project</div><div class="v">${booking?.communityName || "—"}</div>
          <div class="k" style="margin-top:8px;">Plot</div><div class="v">${booking?.plotOwned || "—"}</div>
          <div class="k" style="margin-top:8px;">Status</div><div class="v">${booking?.status || "—"}</div>
        </div>
      </div>

      <div style="margin-top:12px;" class="row">
        <div class="grid">
          <div>
            <div class="k">Payment ID</div>
            <div class="v">${booking?.paymentId || "—"}</div>
          </div>
          <div>
            <div class="k">Booking Number</div>
            <div class="v">${booking?.bookingNumber || "—"}</div>
          </div>
          <div>
            <div class="k">Advance Amount</div>
            <div class="v">${toINR(booking?.advanceAmount)}</div>
          </div>
          <div>
            <div class="k">Deal Closed Amount</div>
            <div class="v">${toINR(booking?.dealClosedAmount)}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="foot">
      This receipt is system generated. Please keep it for your records.
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Receipt-${receiptNo}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- helpers ----------
function computeROI(invested, annualRatePct, years) {
  const r = (Number(annualRatePct) || 0) / 100;
  const fv = invested * Math.pow(1 + r, years);
  const profit = fv - invested;
  const roiPct = invested > 0 ? (profit / invested) * 100 : 0;
  return { futureValue: Math.round(fv), profit: Math.round(profit), roiPct };
}

function toINR(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  try {
    return n.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
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

// ---------- minimal icons ----------
function IconMoney() {
  return <span style={iconText}>₹</span>;
}
function IconTree() {
  return <span style={iconText}>🌳</span>;
}
function IconCalendar() {
  return <span style={iconText}>📅</span>;
}
function IconDoc() {
  return <span style={iconText}>📄</span>;
}
function IconChart() {
  return <span style={iconText}>📈</span>;
}

// ---------- styles (Dashboard / Cards) ----------
const overlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1800,
  padding: "20px",
};

const modalStyle = {
  position: "relative",
  width: "100%",
  maxWidth: "860px",
  maxHeight: "85vh",
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
  fontWeight: 800,
  color: "#1a3c34",
};

const detailStyle = {
  margin: "3px 0 0",
  fontSize: "0.88rem",
  color: "#4b5563",
};

const contentStyle = {
  padding: "18px 28px 22px",
  overflowY: "auto",
  overscrollBehavior: "contain",
};

const hintStyle = { fontSize: 13, color: "#555", padding: "10px 2px" };

const sectionTitleStyle = {
  margin: 0,
  fontSize: "1.05rem",
  color: "#1a3c34",
  fontWeight: 900,
};

const titleRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 14,
  gap: 12,
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

const emptyBoxStyle = {
  border: "1px dashed #d0d5dd",
  borderRadius: 10,
  padding: 16,
  backgroundColor: "#fafafa",
};

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 14,
  backgroundColor: "white",
  boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
};

const cardTopRowStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
};

const cardTitleStyle = {
  fontSize: 14,
  fontWeight: 900,
  color: "#1a3c34",
};

const mutedSmallStyle = {
  fontSize: 12,
  color: "#6b7280",
  fontWeight: 700,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const labelStyle = {
  fontSize: 12,
  color: "#6b7280",
  marginBottom: 4,
  fontWeight: 800,
};

const valueStyle = {
  fontSize: 13,
  color: "#111827",
  fontWeight: 900,
};

const messageErrorStyle = {
  color: "#c53030",
  backgroundColor: "#fff5f5",
  padding: "10px 12px",
  borderRadius: "6px",
  marginBottom: 12,
  fontSize: "13px",
};

// buttons
const primaryBtn = {
  border: "1px solid #1a3c34",
  background: "#1a3c34",
  color: "#fff",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const ghostBtn = {
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#111827",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const cardFooterRow = {
  marginTop: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const miniUpdate = {
  marginTop: 10,
  borderRadius: 10,
  border: "1px solid #d9efe9",
  background: "#eef7f5",
  padding: 10,
  display: "grid",
  gap: 4,
};

// News/updates UI
const updatesWrap = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#fff",
  padding: 14,
  marginBottom: 14,
  boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
};

const updatesHead = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 10,
};

const updatesIcon = {
  width: 34,
  height: 34,
  borderRadius: 10,
  background: "#eef7f5",
  border: "1px solid #d9efe9",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 16,
};

const updatesTitle = { fontWeight: 900, color: "#1a3c34" };
const updatesHint = { fontSize: 12, color: "#6b7280", fontWeight: 800 };

const updateItem = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 10,
  background: "#fafafa",
};

// ---------- styles (Details Modal) ----------
const detailsOverlay = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.55)",
  zIndex: 2000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const detailsModal = {
  width: "100%",
  maxWidth: 1040,
  maxHeight: "84vh",
  backgroundColor: "#fff",
  borderRadius: 14,
  boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const detailsTop = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 16px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
  gap: 12,
};

const detailsClose = {
  border: "none",
  background: "transparent",
  fontSize: 28,
  cursor: "pointer",
  lineHeight: 1,
  color: "#6b7280",
};

const detailsBody = {
  padding: 16,
  overflowY: "auto",
};

const detailsCard = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 14,
  background: "#fff",
};

const detailsCardTitle = {
  fontSize: 14,
  fontWeight: 900,
  color: "#1a3c34",
};

const detailsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const rowBox = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 10,
  background: "#fafafa",
};

const docLink = {
  textDecoration: "none",
  color: "#111827",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 10,
  background: "#fff",
  display: "block",
};

// ---------- section header + icons ----------
const sectionHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 10,
};

const sectionHeaderLeft = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const iconWrap = {
  width: 34,
  height: 34,
  borderRadius: 10,
  background: "#eef7f5",
  border: "1px solid #d9efe9",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const iconText = { fontSize: 16, lineHeight: 1 };

const thinNote = {
  marginTop: 10,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fafafa",
  padding: 10,
  fontSize: 12,
  color: "#374151",
  fontWeight: 700,
};

// ---------- styles (ROI) ----------
const roiTopRow = {
  display: "flex",
  gap: 12,
  alignItems: "stretch",
};

const roiBadge = {
  minWidth: 86,
  borderRadius: 12,
  background: "#eef7f5",
  border: "1px solid #d9efe9",
  padding: "10px 10px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const roiBadgeLabel = { fontSize: 11, color: "#6b7280", fontWeight: 900 };
const roiBadgeValue = {
  fontSize: 18,
  color: "#1a3c34",
  fontWeight: 900,
  marginTop: 2,
};

const roiSummary = {
  flex: 1,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fafafa",
  padding: 10,
  display: "grid",
  gap: 6,
};

const roiSummaryLine = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const roiKey = { fontSize: 12, color: "#6b7280", fontWeight: 900 };
const roiVal = { fontSize: 12, color: "#111827", fontWeight: 900 };

const roiChartWrap = {
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
  padding: 10,
};

const roiChartTitle = {
  fontSize: 12,
  color: "#374151",
  fontWeight: 900,
  marginBottom: 8,
};

const roiSvg = {
  display: "block",
  width: "100%",
  height: 150,
};

const roiChartFooter = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 8,
  fontSize: 12,
  color: "#6b7280",
  fontWeight: 900,
};

// ✅ NEW: payment stages styles
const stageRow = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 10,
  background: "#fafafa",
};

const paidPill = {
  marginTop: 6,
  display: "inline-block",
  padding: "4px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 900,
  background: "#ecfdf3",
  border: "1px solid #b7f7d1",
  color: "#2f855a",
};

const pendingPill = {
  marginTop: 6,
  display: "inline-block",
  padding: "4px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 900,
  background: "#fffbeb",
  border: "1px solid #fde68a",
  color: "#b45309",
};
