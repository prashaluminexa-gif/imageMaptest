// src/components/ProfileDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase'; // adjust path according to your project structure

export default function ProfileDashboard({ user, onClose, onUpdateMobile }) {
  const [selectedSection, setSelectedSection] = useState('personal');
  const [userData, setUserData] = useState({
    displayName: user.displayName || '',
    email: user.email || '',
    mobile: '',
    kycStatus: 'not_submitted',
    panNumber: '',
    aadhaarNumber: '',
    panUrl: '',
    aadhaarUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setUserData((prev) => ({
            ...prev,
            mobile: data.mobile || '',
            kycStatus: data.kycStatus || 'not_submitted',
            panNumber: data.panNumber || '',
            aadhaarNumber: data.aadhaarNumber || '',
            panUrl: data.panUrl || '',
            aadhaarUrl: data.aadhaarUrl || '',
          }));
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load profile data.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user.uid]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={{ padding: '60px 40px', textAlign: 'center' }}>
            Loading profile...
          </div>
        </div>
      </div>
    );
  }

  const photoURL = user.photoURL || 'https://via.placeholder.com/80?text=U';
  const displayName = userData.displayName || user.displayName || 'User';
  const email = user.email || '—';
  const mobileDisplay = userData.mobile ? `+91 ${userData.mobile}` : 'Not provided';

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button style={closeBtnStyle} onClick={onClose}>
          ×
        </button>

        {/* Header with profile picture and user details */}
        <div style={headerStyle}>
          <img
            src={photoURL}
            alt="Profile"
            style={profileImgStyle}
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/80?text=U';
            }}
          />
          <div style={userInfoStyle}>
            <h2 style={nameStyle}>{displayName}</h2>
            <p style={detailStyle}>{email}</p>
            <p style={detailStyle}>{mobileDisplay}</p>
          </div>
        </div>

        <div style={bodyStyle}>
          <div style={sidebarStyle}>
            <SidebarItem
              label="Personal Information"
              active={selectedSection === 'personal'}
              onClick={() => setSelectedSection('personal')}
            />
            <SidebarItem
              label="Change Password"
              active={selectedSection === 'password'}
              onClick={() => setSelectedSection('password')}
            />
            <SidebarItem
              label="KYC Update"
              active={selectedSection === 'kyc'}
              onClick={() => setSelectedSection('kyc')}
            />
          </div>

          <div style={contentStyle}>
            {error && <div style={messageErrorStyle}>{error}</div>}
            {success && <div style={messageSuccessStyle}>{success}</div>}

            {selectedSection === 'personal' && (
              <PersonalInfoSection
                userData={userData}
                handleInputChange={handleInputChange}
                user={user}
                setError={setError}
                setSuccess={setSuccess}
                onUpdateMobile={onUpdateMobile}
              />
            )}

            {selectedSection === 'password' && (
              <ChangePasswordSection
                user={user}
                setError={setError}
                setSuccess={setSuccess}
              />
            )}

            {selectedSection === 'kyc' && (
              <KYCSection
                userData={userData}
                handleInputChange={handleInputChange}
                user={user}
                setError={setError}
                setSuccess={setSuccess}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...sidebarItemBase,
        backgroundColor: active ? '#e8f0ef' : 'transparent',
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  );
}

function PersonalInfoSection({
  userData,
  handleInputChange,
  user,
  setError,
  setSuccess,
  onUpdateMobile,
}) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      await updateProfile(user, { displayName: userData.displayName.trim() });

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        mobile: userData.mobile.trim(),
      });

      onUpdateMobile(userData.mobile.trim());
      setSuccess('Profile updated successfully');
    } catch (err) {
      console.error(err);
      setError('Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionTitle>Personal Information</SectionTitle>

      <Label>Name</Label>
      <Input
        name="displayName"
        value={userData.displayName}
        onChange={handleInputChange}
      />

      <Label>Email (read-only)</Label>
      <Input value={userData.email} disabled style={{ backgroundColor: '#f5f5f5' }} />

      <Label>Mobile Number</Label>
      <Input name="mobile" value={userData.mobile} onChange={handleInputChange} />

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Changes'}
      </Button>
    </>
  );
}

function ChangePasswordSection({ user, setError, setSuccess }) {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    setError(null);
    setSuccess(null);

    if (newPass !== confirm) return setError('Passwords do not match');
    if (newPass.length < 6) return setError('Password must be at least 6 characters');

    setSaving(true);

    try {
      const cred = EmailAuthProvider.credential(user.email, current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPass);

      setSuccess('Password updated');
      setCurrent('');
      setNewPass('');
      setConfirm('');
    } catch (err) {
      if (err.code === 'auth/wrong-password') {
        setError('Current password is incorrect');
      } else if (err.code === 'auth/requires-recent-login') {
        setError('Please re-login to change password');
      } else {
        setError('Failed to update password');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionTitle>Change Password</SectionTitle>

      <Label>Current Password</Label>
      <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />

      <Label>New Password</Label>
      <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />

      <Label>Confirm New Password</Label>
      <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />

      <Button onClick={handleChangePassword} disabled={saving}>
        {saving ? 'Updating…' : 'Update Password'}
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

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        kycStatus: 'pending',
        panNumber: userData.panNumber.trim(),
        aadhaarNumber: userData.aadhaarNumber.trim(),
        panUrl,
        aadhaarUrl,
      });

      setSuccess('KYC details submitted (pending verification)');
    } catch (err) {
      console.error(err);
      setError('Failed to submit KYC documents');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionTitle>KYC Update</SectionTitle>
      <p style={{ margin: '0 0 24px', color: '#555' }}>
        Current status: <strong>{userData.kycStatus}</strong>
      </p>

      <Label>PAN Number</Label>
      <Input name="panNumber" value={userData.panNumber} onChange={handleInputChange} />

      <Label>Aadhaar Number</Label>
      <Input name="aadhaarNumber" value={userData.aadhaarNumber} onChange={handleInputChange} />

      <Label>Upload PAN Document</Label>
      <input
        type="file"
        accept="image/*,.pdf"
        onChange={(e) => setPanFile(e.target.files?.[0] ?? null)}
        style={{ marginBottom: 24, display: 'block' }}
      />

      <Label>Upload Aadhaar Document</Label>
      <input
        type="file"
        accept="image/*,.pdf"
        onChange={(e) => setAadhaarFile(e.target.files?.[0] ?? null)}
        style={{ marginBottom: 32, display: 'block' }}
      />

      <Button onClick={handleSaveKYC} disabled={saving}>
        {saving ? 'Submitting…' : 'Submit KYC'}
      </Button>
    </>
  );
}

// ────────────────────────────────────────────────
// Small styled components
// ────────────────────────────────────────────────

const SectionTitle = ({ children }) => (
  <h3 style={{ margin: '0 0 24px', fontSize: '1.25rem', color: '#1a3c34' }}>
    {children}
  </h3>
);

const Label = ({ children }) => (
  <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', color: '#555' }}>
    {children}
  </label>
);

const Input = (props) => (
  <input
    {...props}
    style={{
      width: '100%',
      padding: '10px 14px',
      marginBottom: 20,
      border: '1px solid #d0d5dd',
      borderRadius: '6px',
      fontSize: '14px',
      ...props.style,
    }}
  />
);

const Button = ({ children, ...props }) => (
  <button
    {...props}
    style={{
      padding: '11px 24px',
      backgroundColor: '#1a3c34',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      cursor: props.disabled ? 'not-allowed' : 'pointer',
      opacity: props.disabled ? 0.7 : 1,
    }}
  >
    {children}
  </button>
);

// ────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1800,
  padding: '20px',
};

const modalStyle = {
  position: 'relative',
  width: '100%',
  maxWidth: '760px',
  maxHeight: '90vh',
  backgroundColor: 'white',
  borderRadius: '12px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

const closeBtnStyle = {
  position: 'absolute',
  top: 16,
  right: 20,
  background: 'none',
  border: 'none',
  fontSize: '32px',
  color: '#777',
  cursor: 'pointer',
  zIndex: 10,
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '28px 32px',
  borderBottom: '1px solid #e5e7eb',
  backgroundColor: '#f9fafb',
  gap: '20px',
};

const profileImgStyle = {
  width: '80px',
  height: '80px',
  borderRadius: '50%',
  objectFit: 'cover',
  border: '3px solid white',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
};

const userInfoStyle = {
  flex: 1,
};

const nameStyle = {
  margin: '0 0 6px',
  fontSize: '1.5rem',
  fontWeight: 600,
  color: '#1a3c34',
};

const detailStyle = {
  margin: '4px 0 0',
  fontSize: '0.95rem',
  color: '#4b5563',
};

const bodyStyle = {
  display: 'flex',
  flex: 1,
  minHeight: 0,
};

const sidebarStyle = {
  width: '220px',
  backgroundColor: '#f8f9fa',
  borderRight: '1px solid #e5e7eb',
  padding: '16px 0',
};

const sidebarItemBase = {
  width: '100%',
  padding: '12px 24px',
  border: 'none',
  background: 'none',
  textAlign: 'left',
  fontSize: '14px',
  color: '#374151',
  cursor: 'pointer',
  transition: 'all 0.12s',
};

const contentStyle = {
  flex: 1,
  padding: '32px 40px',
  overflowY: 'auto',
};

const messageErrorStyle = {
  color: '#c53030',
  backgroundColor: '#fff5f5',
  padding: '12px 16px',
  borderRadius: '6px',
  marginBottom: 24,
};

const messageSuccessStyle = {
  color: '#2f855a',
  backgroundColor: '#f0fff4',
  padding: '12px 16px',
  borderRadius: '6px',
  marginBottom: 24,
};