// src/components/ProfileDashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "./firebase"; // ✅ ensure auth is exported

export default function ProfileDashboard({ user, onClose, onUpdateMobile }) {
  const [selectedSection, setSelectedSection] = useState("personal");
  const [userData, setUserData] = useState({
    displayName: user?.displayName || "",
    email: user?.email || "",
    mobile: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    kycStatus: "not_submitted",
    panNumber: "",
    aadhaarNumber: "",
    panUrl: "",
    aadhaarUrl: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // ✅ measure content to auto-resize modal per tab
  const contentMeasureRef = useRef(null);
  const [modalHeight, setModalHeight] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchUserData = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data();
          setUserData((prev) => ({
            ...prev,
            displayName: data.displayName ?? prev.displayName,
            email: data.email ?? prev.email,
            mobile: data.mobile || "",
            addressLine1: data.addressLine1 || "",
            addressLine2: data.addressLine2 || "",
            city: data.city || "",
            state: data.state || "",
            pincode: data.pincode || "",
            kycStatus: data.kycStatus || "not_submitted",
            panNumber: data.panNumber || "",
            aadhaarNumber: data.aadhaarNumber || "",
            panUrl: data.panUrl || "",
            aadhaarUrl: data.aadhaarUrl || "",
          }));
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user?.uid]);

  // ✅ modal auto height per section
  useEffect(() => {
    const el = contentMeasureRef.current;
    if (!el) return;

    const HEADER_HEIGHT = 128;
    const MIN = 420;
    const MAX = Math.round(window.innerHeight * 0.86);

    const compute = () => {
      const contentHeight = el.scrollHeight;
      const next = Math.min(MAX, Math.max(MIN, contentHeight + HEADER_HEIGHT));
      setModalHeight(next);
    };

    compute();

    const ro = new ResizeObserver(() => compute());
    ro.observe(el);

    return () => ro.disconnect();
  }, [selectedSection, loading, error, success]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  if (!user) return null;

  if (loading) {
    return (
      <div style={overlayStyle}>
        <div style={{ ...modalStyle, height: "420px" }}>
          <div style={{ padding: "44px 28px", textAlign: "center" }}>Loading profile...</div>
        </div>
      </div>
    );
  }

  const photoURL = user.photoURL || "https://via.placeholder.com/80?text=U";
  const displayName = userData.displayName || user.displayName || "User";
  const email = user.email || "—";
  const mobileDisplay = userData.mobile ? `+91 ${userData.mobile}` : "Not provided";

  const kycMeta = getKycMeta(userData.kycStatus);

  // ✅ support footer (edit as per your app)
  const supportWhatsApp =
    "https://wa.me/919999999999?text=Hello%20Support,%20I%20need%20help%20with%20my%20profile%20and%20KYC.";
  const supportEmail = "support@yourdomain.com";

  return (
    <div
      style={overlayStyle}
      data-modal="true"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onClose}
    >
      <div
        style={{
          ...modalStyle,
          height: modalHeight ? `${modalHeight}px` : "auto",
          transition: "height 180ms ease",
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button style={closeBtnStyle} onClick={onClose} aria-label="Close">
          ×
        </button>

        {/* Header (with small details + icons) */}
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
  </div>
</div>

        <div style={bodyStyle}>
          {/* Sidebar (icons added) */}
          <div style={sidebarStyle}>
            <SidebarItem
              icon="👤"
              label="Personal Information"
              active={selectedSection === "personal"}
              onClick={() => setSelectedSection("personal")}
            />
            <SidebarItem
              icon="🔒"
              label="Change Password"
              active={selectedSection === "password"}
              onClick={() => setSelectedSection("password")}
            />
            <SidebarItem
              icon="🪪"
              label="KYC Update"
              active={selectedSection === "kyc"}
              onClick={() => setSelectedSection("kyc")}
              rightBadge={kycMeta.badgeText}
            />
          </div>

          <div style={contentStyle}>
            <div ref={contentMeasureRef}>
              {error && <div style={messageErrorStyle}>⚠️ {error}</div>}
              {success && <div style={messageSuccessStyle}>✅ {success}</div>}

              {selectedSection === "personal" && (
                <PersonalInfoSection
                  userData={userData}
                  handleInputChange={handleInputChange}
                  user={user}
                  setError={setError}
                  setSuccess={setSuccess}
                  onUpdateMobile={onUpdateMobile}
                />
              )}

              {selectedSection === "password" && (
                <ChangePasswordSection user={user} setError={setError} setSuccess={setSuccess} />
              )}

              {selectedSection === "kyc" && (
                <KYCSection
                  userData={userData}
                  handleInputChange={handleInputChange}
                  user={user}
                  setError={setError}
                  setSuccess={setSuccess}
                />
              )}

              {/* Footer support inside content (so it fits modal height nicely) */}
              <div style={supportBox}>
                <div style={{ fontWeight: 800, color: "#1a3c34", marginBottom: 6 }}>
                  Need help?
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 10 }}>
                  Contact support for profile/KYC updates.
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a href={`mailto:${supportEmail}`} style={supportBtn}>
                    ✉️ Email Support
                  </a>
                  <a href={supportWhatsApp} target="_blank" rel="noreferrer" style={supportBtnPrimary}>
                    💬 WhatsApp Support
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, rightBadge }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...sidebarItemBase,
        backgroundColor: active ? "#e8f0ef" : "transparent",
        fontWeight: active ? 700 : 600,
      }}
      type="button"
    >
      <span style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
        <span style={{ width: 22, textAlign: "center" }}>{icon}</span>
        <span style={{ flex: 1 }}>{label}</span>
        {rightBadge ? <span style={rightBadgeStyle}>{rightBadge}</span> : null}
      </span>
    </button>
  );
}

function PersonalInfoSection({ userData, handleInputChange, user, setError, setSuccess, onUpdateMobile }) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const nextName = (userData.displayName || "").trim();

      if (nextName) {
        await updateProfile(user, { displayName: nextName });
      }

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        displayName: nextName,
        mobile: (userData.mobile || "").trim(),
        addressLine1: (userData.addressLine1 || "").trim(),
        addressLine2: (userData.addressLine2 || "").trim(),
        city: (userData.city || "").trim(),
        state: (userData.state || "").trim(),
        pincode: (userData.pincode || "").trim(),
      });

      onUpdateMobile?.((userData.mobile || "").trim());
      setSuccess("Profile updated successfully");
    } catch (err) {
      console.error(err);
      setError("Could not save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionTitle icon="👤">Personal Information</SectionTitle>

      <Label>Name</Label>
      <Input name="displayName" value={userData.displayName} onChange={handleInputChange} />

      <Label>Email (read-only)</Label>
      <Input value={userData.email} disabled style={{ backgroundColor: "#f5f5f5" }} />

      <Label>Mobile Number</Label>
      <Input name="mobile" value={userData.mobile} onChange={handleInputChange} />

      <Label>Address Line 1</Label>
      <Input name="addressLine1" value={userData.addressLine1} onChange={handleInputChange} />

      <Label>Address Line 2</Label>
      <Input name="addressLine2" value={userData.addressLine2} onChange={handleInputChange} />

      <Label>City</Label>
      <Input name="city" value={userData.city} onChange={handleInputChange} />

      <Label>State</Label>
      <Input name="state" value={userData.state} onChange={handleInputChange} />

      <Label>Pincode</Label>
      <Input name="pincode" value={userData.pincode} onChange={handleInputChange} />

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save Changes"}
      </Button>
    </>
  );
}

/**
 * ✅ Change Password section:
 * - Email/password users: can change password + also reset link
 * - Google users: only reset link
 */
function ChangePasswordSection({ user, setError, setSuccess }) {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const providers = user?.providerData?.map((p) => p.providerId) || [];
  const isEmailPasswordUser = providers.includes("password");

  const handleChangePassword = async () => {
    setError(null);
    setSuccess(null);

    if (!isEmailPasswordUser) {
      setError("Signed in via Google. Use reset link to set/change password.");
      return;
    }

    if (!current) return setError("Please enter current password");
    if (newPass !== confirm) return setError("Passwords do not match");
    if (newPass.length < 6) return setError("Password must be at least 6 characters");

    setSaving(true);

    try {
      const cred = EmailAuthProvider.credential(user.email, current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPass);

      setSuccess("Password updated");
      setCurrent("");
      setNewPass("");
      setConfirm("");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/wrong-password") setError("Current password is incorrect");
      else if (err.code === "auth/too-many-requests") setError("Too many attempts. Try later.");
      else if (err.code === "auth/requires-recent-login") setError("Logout and login again to change password.");
      else setError("Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  const handleSendResetLink = async () => {
    setError(null);
    setSuccess(null);

    if (!user?.email) return setError("Email not found for this account.");

    setSending(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setSuccess(`Reset link sent to ${user.email}`);
    } catch (err) {
      console.error(err);
      if (err.code === "auth/too-many-requests") setError("Too many requests. Try later.");
      else setError("Failed to send reset email");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <SectionTitle icon="🔒">Change Password</SectionTitle>

      {!isEmailPasswordUser && (
        <div style={infoNote}>
          You’re signed in using <strong>Google</strong>. Use reset link to set/change password.
        </div>
      )}

      {isEmailPasswordUser && (
        <>
          <Label>Current Password</Label>
          <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />

          <Label>New Password</Label>
          <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />

          <Label>Confirm New Password</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />

          <Button onClick={handleChangePassword} disabled={saving}>
            {saving ? "Updating…" : "Update Password"}
          </Button>

          <div style={{ height: 10 }} />
        </>
      )}

      <Button onClick={handleSendResetLink} disabled={sending}>
        {sending ? "Sending…" : "Send Reset Link to Email"}
      </Button>
    </>
  );
}

function KYCSection({ userData, handleInputChange, user, setError, setSuccess }) {
  const [panFile, setPanFile] = useState(null);
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSaveKYC = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      let panUrl = userData.panUrl;
      let aadhaarUrl = userData.aadhaarUrl;

      if (panFile) {
        const path = `kyc/${user.uid}/pan_${Date.now()}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, panFile);
        panUrl = await getDownloadURL(storageRef);
      }

      if (aadhaarFile) {
        const path = `kyc/${user.uid}/aadhaar_${Date.now()}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, aadhaarFile);
        aadhaarUrl = await getDownloadURL(storageRef);
      }

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        kycStatus: "pending",
        panNumber: (userData.panNumber || "").trim(),
        aadhaarNumber: (userData.aadhaarNumber || "").trim(),
        panUrl,
        aadhaarUrl,
      });

      setSuccess("KYC details submitted (pending verification)");
    } catch (err) {
      console.error(err);
      setError("Failed to submit KYC documents");
    } finally {
      setSaving(false);
    }
  };

  const meta = getKycMeta(userData.kycStatus);

  return (
    <>
      <SectionTitle icon="🪪">KYC Update</SectionTitle>

      <div style={kycStatusRow}>
        <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 800 }}>Current status</div>
        <span style={kycPill(meta)}>
          {meta.icon} {meta.label}
        </span>
      </div>

      <Label>PAN Number</Label>
      <Input name="panNumber" value={userData.panNumber} onChange={handleInputChange} />

      <Label>Aadhaar Number</Label>
      <Input name="aadhaarNumber" value={userData.aadhaarNumber} onChange={handleInputChange} />

      <Label>Upload PAN Document</Label>
      <input
        type="file"
        accept="image/*,.pdf"
        onChange={(e) => setPanFile(e.target.files?.[0] ?? null)}
        style={fileInputStyle}
      />

      <Label>Upload Aadhaar Document</Label>
      <input
        type="file"
        accept="image/*,.pdf"
        onChange={(e) => setAadhaarFile(e.target.files?.[0] ?? null)}
        style={fileInputStyle}
      />

      <Button onClick={handleSaveKYC} disabled={saving}>
        {saving ? "Submitting…" : "Submit KYC"}
      </Button>
    </>
  );
}

// ────────────────────────────────────────────────
// Small styled components
// ────────────────────────────────────────────────

const SectionTitle = ({ children, icon }) => (
  <h3 style={{ margin: "0 0 16px", fontSize: "1.05rem", color: "#1a3c34", display: "flex", gap: 10 }}>
    <span style={{ width: 22, textAlign: "center" }}>{icon}</span>
    <span>{children}</span>
  </h3>
);

const Label = ({ children }) => (
  <label style={{ display: "block", marginBottom: 6, fontSize: "0.8rem", color: "#555", fontWeight: 700 }}>
    {children}
  </label>
);

const Input = (props) => (
  <input
    {...props}
    style={{
      width: "100%",
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

const Button = ({ children, ...props }) => (
  <button
    {...props}
    style={{
      padding: "10px 18px",
      backgroundColor: "#1a3c34",
      color: "white",
      border: "none",
      borderRadius: "10px",
      fontSize: "13px",
      fontWeight: 800,
      cursor: props.disabled ? "not-allowed" : "pointer",
      opacity: props.disabled ? 0.7 : 1,
    }}
    type="button"
  >
    {children}
  </button>
);

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────
function getKycMeta(status) {
  const s = String(status || "not_submitted").toLowerCase();
  if (s.includes("approved") || s.includes("verified")) {
    return { label: "Verified", icon: "✅", tone: "success", badgeText: "OK" };
  }
  if (s.includes("pending")) {
    return { label: "Pending", icon: "⏳", tone: "pending", badgeText: "WAIT" };
  }
  if (s.includes("rejected") || s.includes("failed")) {
    return { label: "Rejected", icon: "❌", tone: "fail", badgeText: "FIX" };
  }
  return { label: "Not Submitted", icon: "📝", tone: "neutral", badgeText: "NEW" };
}

function kycPill(meta) {
  const tone = meta?.tone || "neutral";
  const map = {
    success: { bg: "#ecfdf3", color: "#2f855a", border: "#b7f7d1" },
    pending: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
    fail: { bg: "#fff5f5", color: "#c53030", border: "#fecaca" },
    neutral: { bg: "#f3f4f6", color: "#374151", border: "#e5e7eb" },
  };
  const t = map[tone] || map.neutral;

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

// ────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────

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
  maxWidth: "820px",
  maxHeight: "90vh",
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
  padding: "16px 18px",
  borderBottom: "1px solid #e5e7eb",
  backgroundColor: "#f9fafb",
  gap: "14px",
};

const profileImgStyle = {
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  objectFit: "cover",
  border: "3px solid white",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
};

const userInfoStyle = { flex: 1, minWidth: 0 };

const nameStyle = {
  margin: 0,
  fontSize: "1.15rem",
  fontWeight: 900,
  color: "#1a3c34",
};

const detailStyle = {
  margin: "4px 0 0",
  fontSize: "0.86rem",
  color: "#4b5563",
};

const bodyStyle = {
  display: "flex",
  flex: 1,
  minHeight: 0,
};

const sidebarStyle = {
  width: "220px",
  backgroundColor: "#f8f9fa",
  borderRight: "1px solid #e5e7eb",
  padding: "10px 0",
};

const sidebarItemBase = {
  width: "100%",
  padding: "10px 16px",
  border: "none",
  background: "none",
  textAlign: "left",
  fontSize: "13px",
  color: "#374151",
  cursor: "pointer",
  transition: "all 0.12s",
};

const rightBadgeStyle = {
  fontSize: 11,
  fontWeight: 900,
  padding: "4px 8px",
  borderRadius: 999,
  background: "#eef7f5",
  border: "1px solid #d9efe9",
  color: "#1a3c34",
};

const contentStyle = {
  flex: 1,
  padding: "18px 18px",
  overflowY: "auto",
  overscrollBehavior: "contain",
};

const messageErrorStyle = {
  color: "#c53030",
  backgroundColor: "#fff5f5",
  padding: "10px 12px",
  borderRadius: "10px",
  marginBottom: 14,
  fontSize: "13px",
  fontWeight: 800,
  border: "1px solid #fecaca",
};

const messageSuccessStyle = {
  color: "#2f855a",
  backgroundColor: "#f0fff4",
  padding: "10px 12px",
  borderRadius: "10px",
  marginBottom: 14,
  fontSize: "13px",
  fontWeight: 800,
  border: "1px solid #b7f7d1",
};

const infoNote = {
  marginBottom: 14,
  fontSize: 13,
  color: "#555",
  background: "#fafafa",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "10px 12px",
};

const kycStatusRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fafafa",
  marginBottom: 14,
};

const fileInputStyle = {
  marginBottom: 16,
  display: "block",
  fontSize: "13px",
};

const supportBox = {
  marginTop: 18,
  borderTop: "1px solid #e5e7eb",
  paddingTop: 14,
};

const supportBtn = {
  textDecoration: "none",
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#111827",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 900,
};

const supportBtnPrimary = {
  textDecoration: "none",
  border: "1px solid #1a3c34",
  background: "#1a3c34",
  color: "#fff",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 900,
};
