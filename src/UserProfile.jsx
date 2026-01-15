// src/components/UserProfile.jsx
import React, { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import {
  doc,
  getDoc,
  onSnapshot as onDocSnapshot,
  collection,
  onSnapshot,
  query,
  where,
  limit,
} from "firebase/firestore";

// Modals
import ProfileDashboard from "./ProfileDashboard";
import MyInvestmentsDashboard from "./MyInvestmentsDashboard";
import PaymentHistoryDashboard from "./PaymentHistoryDashboard";
import SupportDashboard from "./SupportDashboard";
import BookVisitsDashboard from "./BooVisitsDashboard";

export default function UserProfile({ windowWidth, onModalOpenChange }) {
  const [user, setUser] = useState(null);
  const [mobile, setMobile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isInvestmentsOpen, setIsInvestmentsOpen] = useState(false);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [isSupportDashboardOpen, setIsSupportDashboardOpen] = useState(false);
  const [isBookVisitsOpen, setIsBookVisitsOpen] = useState(false);

  // 🔔 Derived Activities
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activities, setActivities] = useState([]);
  const [readIds, setReadIds] = useState(() => new Set());

  const dashboardRef = useRef(null);
  const triggerRef = useRef(null);
  const notificationRef = useRef(null);
  const bellRef = useRef(null);

  const unreadCount = activities.filter((a) => !readIds.has(a.id)).length;

  // Auth state + mobile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setMobile(null);

      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            setMobile(data.mobile || null);
          }
        } catch (err) {
          console.error("Error fetching user mobile:", err);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ✅ Real-time derived activities from:
  // - users/{uid} bookings[]
  // - usersReports
  // - siteVisitRequests
  // - clubhouseAccessRequests
  useEffect(() => {
    if (!user?.uid) return;

    let bookings = [];
    let reports = [];
    let site = [];
    let club = [];

    const rebuild = () => {
      const all = [
        ...bookings.map(toActivityFromBooking).filter(Boolean),
        ...reports.map(toActivityFromReport).filter(Boolean),
        ...site.map((x) => toActivityFromVisit(x, "site")).filter(Boolean),
        ...club.map((x) => toActivityFromVisit(x, "clubhouse")).filter(Boolean),
      ]
        .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
        .slice(0, 20);

      setActivities(all);
    };

    const unsubUser = onDocSnapshot(doc(db, "users", user.uid), (snap) => {
      const data = snap.exists() ? snap.data() : {};
      bookings = Array.isArray(data?.bookings) ? data.bookings : [];
      rebuild();
    });

    const unsubReports = onSnapshot(
      query(collection(db, "usersReports"), where("userId", "==", user.uid), limit(50)),
      (snap) => {
        reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rebuild();
      },
      (err) => console.error("reports snapshot error:", err)
    );

    const unsubSite = onSnapshot(
      query(collection(db, "siteVisitRequests"), where("userId", "==", user.uid), limit(50)),
      (snap) => {
        site = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rebuild();
      },
      (err) => console.error("site snapshot error:", err)
    );

    const unsubClub = onSnapshot(
      query(collection(db, "clubhouseAccessRequests"), where("userId", "==", user.uid), limit(50)),
      (snap) => {
        club = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rebuild();
      },
      (err) => console.error("club snapshot error:", err)
    );

    return () => {
      unsubUser();
      unsubReports();
      unsubSite();
      unsubClub();
    };
  }, [user?.uid]);

  // Close popovers when clicking outside
  useEffect(() => {
    const handleOutside = (e) => {
      const inDash = dashboardRef.current && dashboardRef.current.contains(e.target);
      const inTrig = triggerRef.current && triggerRef.current.contains(e.target);
      if (!inDash && !inTrig) setIsDashboardOpen(false);

      const inNotif = notificationRef.current && notificationRef.current.contains(e.target);
      const inBell = bellRef.current && bellRef.current.contains(e.target);
      if (!inNotif && !inBell) setIsNotificationsOpen(false);
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const toggleDashboard = () => {
    setIsNotificationsOpen(false);
    setIsDashboardOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsDashboardOpen(false);
      setIsNotificationsOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const openProfileModal = () => {
    setIsDashboardOpen(false);
    setIsProfileModalOpen(true);
    onModalOpenChange?.(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    onModalOpenChange?.(false);
  };

  const getActivityBg = (a, isRead) => {
    if (isRead) return "#fff";
    if (a.type === "payment") return "#e3f2fd";
    if (a.type === "success") return "#e8f5e9";
    if (a.type === "warning") return "#fff8e1";
    return "#f5faff";
  };

  if (loading) {
    return (
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 1600,
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          backgroundColor: "rgba(255,255,255,0.3)",
        }}
      />
    );
  }

  // Guest view
  if (!user) {
    return (
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 1600,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          backgroundColor: "rgba(255, 255, 255, 0.85)",
          padding: "8px 14px",
          borderRadius: "50px",
          boxShadow: "0 3px 12px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            backgroundColor: "#e0e0e0",
          }}
        />
        <span
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: windowWidth <= 768 ? "12px" : "12px",
            fontWeight: 500,
            color: "#555",
          }}
        >
          Guest
        </span>
      </div>
    );
  }

  const displayName = user.displayName || user.email?.split("@")[0] || "User";
  const photoURL = user.photoURL || "https://via.placeholder.com/44?text=U";

  return (
    <div style={{ position: "relative" }}>
      {/* 🔔 Notification Bell */}
      <div
        ref={bellRef}
        onClick={() => {
          setIsDashboardOpen(false);
          setIsNotificationsOpen((prev) => !prev);
        }}
        style={{
          position: "fixed",
          top: "23px",
          right: "160px",
          zIndex: 1600,
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 4px 15px rgba(0,0,0,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          userSelect: "none",
        }}
        title="Recent Activities"
      >
        <span style={{ fontSize: "18px", color: "#024837" }}>
  <i className="fa-solid fa-bell"></i>
</span>


        {unreadCount > 0 && (
          <div
            style={{
              position: "absolute",
              top: "-6px",
              right: "-6px",
              background: "#ff3b30",
              color: "white",
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {unreadCount}
          </div>
        )}
      </div>

      {/* 🔔 Activities dropdown (GUARANTEED scroll fix) */}
      {isNotificationsOpen && (
        <div
          ref={notificationRef}
          style={{
            position: "fixed",
            top: "70px",
            right: "12px",
            zIndex: 1700,
            width: "320px",
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
            overflow: "hidden",
            border: "1px solid #eaeaea",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #eee",
              fontWeight: 800,
              color: "#1a3c34",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span>Recent Activities</span>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setReadIds(new Set(activities.map((a) => a.id)))}
                style={{
                  border: "none",
                  background: "#f5f5f5",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "#333",
                  fontWeight: 700,
                  padding: "6px 10px",
                  borderRadius: "10px",
                }}
                type="button"
              >
                Mark all read
              </button>

              <button
                onClick={() => setIsNotificationsOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "18px",
                  color: "#666",
                  lineHeight: 1,
                }}
                aria-label="Close activities"
                type="button"
              >
                ×
              </button>
            </div>
          </div>

          {activities.length === 0 ? (
            <div style={{ padding: "16px", color: "#777", fontSize: "13px" }}>
              No recent activities
            </div>
          ) : (
            <div
              data-allow-scroll="true"
              onWheelCapture={(e) => {
                // ✅ Fix: ensures wheel works even if some other script blocks it
                e.stopPropagation();
              }}
              onTouchMoveCapture={(e) => e.stopPropagation()}
              style={{
                maxHeight: "340px",
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                overscrollBehavior: "contain",
                touchAction: "pan-y",
              }}
            >
              {activities.map((a) => {
                const isRead = readIds.has(a.id);
                const bg = getActivityBg(a, isRead);

                return (
                  <div
                    key={a.id}
                    onClick={() => setReadIds((prev) => new Set([...prev, a.id]))}
                    style={{
                      padding: "12px 16px",
                      background: bg,
                      borderBottom: "1px solid #eee",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <strong style={{ fontSize: "13px", color: "#1a3c34" }}>
                        {a.title}
                      </strong>

                      <span style={{ fontSize: "12px", color: "#555" }}>
                        {a.description}
                      </span>

                      <span style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>
                        {a.timeLabel || ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ padding: "10px 16px", borderTop: "1px solid #eee" }}>
            <button
              onClick={() => setIsNotificationsOpen(false)}
              style={{
                width: "100%",
                padding: "10px",
                border: "none",
                borderRadius: "10px",
                background: "#f5f5f5",
                cursor: "pointer",
                fontWeight: 800,
                color: "#333",
              }}
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Profile pill */}
      <div
        ref={triggerRef}
        onClick={toggleDashboard}
        style={{
          position: "fixed",
          top: "20px",
          right: "0px",
          zIndex: 1600,
          display: "flex",
          alignItems: "center",
          gap: "12px",
          backgroundColor: "rgba(255, 255, 255, 0.85)",
          padding: "8px 14px",
          borderRadius: "50px 0 0 50px",
          boxShadow: "0 3px 12px rgba(0,0,0,0.25)",
          backdropFilter: "blur(6px)",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <img
          src={photoURL}
          alt="Profile"
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            objectFit: "cover",
            border: "2px solid #fff",
          }}
          onError={(e) => {
            e.target.src = "https://via.placeholder.com/44?text=U";
          }}
        />

        <div
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: "600",
            color: "#1a3c34",
            fontSize: windowWidth <= 768 ? "12px" : "12px",
            maxWidth: "140px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {displayName}
        </div>
      </div>

      {/* Mini dashboard popover */}
      {isDashboardOpen && (
        <div
          ref={dashboardRef}
          style={{
            position: "fixed",
            top: "70px",
            right: "0px",
            zIndex: 1650,
            width: "280px",
            backgroundColor: "white",
            borderRadius: "12px 0px 0px 12px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
            overflow: "hidden",
            border: "1px solid #e0e0e0",
            pointerEvents: "auto",
          }}
        >
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0" }}>
            <p style={{ margin: 0, fontWeight: 600, color: "#1a3c34" }}>{displayName}</p>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#666" }}>{user.email}</p>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#666" }}>
              {mobile ? `+91 ${mobile}` : "Mobile number not provided"}
            </p>
          </div>

          <div style={{ padding: "8px 0" }}>
            <DashboardItem label="Profile" onClick={openProfileModal} />
            <DashboardItem
              label="My Investments"
              onClick={() => {
                setIsDashboardOpen(false);
                setIsInvestmentsOpen(true);
                onModalOpenChange?.(true);
              }}
            />
            <DashboardItem
              label="Payment History"
              onClick={() => {
                setIsDashboardOpen(false);
                setIsPaymentHistoryOpen(true);
                onModalOpenChange?.(true);
              }}
            />
            <DashboardItem
              label="Report"
              onClick={() => {
                setIsDashboardOpen(false);
                setIsSupportDashboardOpen(true);
                onModalOpenChange?.(true);
              }}
            />
            <DashboardItem
              label="Book Visits"
              onClick={() => {
                setIsDashboardOpen(false);
                setIsBookVisitsOpen(true);
                onModalOpenChange?.(true);
              }}
            />
          </div>

          <div style={{ borderTop: "1px solid #f0f0f0", padding: "8px 0" }}>
            <DashboardItem
              label="Logout"
              onClick={handleLogout}
              style={{ color: "#d32f2f", fontWeight: 500 }}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      {isProfileModalOpen && (
        <ProfileDashboard
          user={user}
          onClose={closeProfileModal}
          onUpdateMobile={(newMobile) => setMobile(newMobile)}
        />
      )}

      {isInvestmentsOpen && (
        <MyInvestmentsDashboard
          user={user}
          onClose={() => {
            setIsInvestmentsOpen(false);
            onModalOpenChange?.(false);
          }}
        />
      )}

      {isPaymentHistoryOpen && (
        <PaymentHistoryDashboard
          user={user}
          onClose={() => {
            setIsPaymentHistoryOpen(false);
            onModalOpenChange?.(false);
          }}
        />
      )}

      {isSupportDashboardOpen && (
        <SupportDashboard
          user={user}
          onClose={() => {
            setIsSupportDashboardOpen(false);
            onModalOpenChange?.(false);
          }}
        />
      )}

      {isBookVisitsOpen && (
        <BookVisitsDashboard
          user={user}
          onClose={() => {
            setIsBookVisitsOpen(false);
            onModalOpenChange?.(false);
          }}
        />
      )}
    </div>
  );
}

const DashboardItem = ({ label, onClick, style = {} }) => (
  <button
    onClick={onClick}
    style={{
      width: "100%",
      padding: "12px 20px",
      border: "none",
      background: "none",
      textAlign: "left",
      fontFamily: "'Montserrat', sans-serif",
      fontSize: "13px",
      color: "#333",
      cursor: "pointer",
      transition: "background-color 0.15s",
      ...style,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    type="button"
  >
    {label}
  </button>
);

/* Helpers */

function normalizeMs(v) {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") return new Date(v).getTime() || 0;
  if (v?.toDate) return v.toDate().getTime();
  return 0;
}

function timeAgo(ms) {
  if (!ms) return "";
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function toActivityFromBooking(b) {
  const status = String(b?.status || "").toLowerCase();
  const isSuccess = status.includes("success");
  if (!isSuccess) return null;

  const amount = Number(b?.advanceAmount) || Number(b?.dealClosedAmount) || 0;
  const plot = b?.plotOwned || "Plot";
  const proj = b?.communityName || "Project";

  const createdAtMs =
    normalizeMs(b?.createdAtMs) ||
    normalizeMs(b?.timestamp) ||
    normalizeMs(b?.createdAt) ||
    Date.now();

  return {
    id: `booking_${b?.paymentId || b?.bookingNumber || createdAtMs}`,
    type: "payment",
    title: "Payment Received",
    description: `${plot} • ${proj}${amount ? ` • ₹${amount.toLocaleString("en-IN")}` : ""}`,
    createdAtMs,
    timeLabel: timeAgo(createdAtMs),
  };
}

function toActivityFromReport(r) {
  const createdAtMs = normalizeMs(r?.createdAtMs) || normalizeMs(r?.createdAt) || Date.now();
  const category = r?.category || "Report";
  const status = r?.status || "submitted";

  return {
    id: `report_${r?.id}`,
    type: "info",
    title: `Report: ${category}`,
    description: `Status: ${status}`,
    createdAtMs,
    timeLabel: timeAgo(createdAtMs),
  };
}

function toActivityFromVisit(v, kind) {
  const createdAtMs = normalizeMs(v?.createdAtMs) || normalizeMs(v?.createdAt) || Date.now();
  const project = v?.projectName || "Project";
  const status = v?.status || "requested";
  const when = `${v?.date || ""} ${v?.time || ""}`.trim();

  return {
    id: `${kind}_${v?.id}`,
    type: kind === "site" ? "success" : "info",
    title: kind === "site" ? "Site Visit" : "Clubhouse Access",
    description: `${project}${when ? ` • ${when}` : ""} • ${status}`,
    createdAtMs,
    timeLabel: timeAgo(createdAtMs),
  };
}
