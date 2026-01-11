// src/components/UserProfile.jsx
import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase'; // your firebase config file

const UserProfile = ({ windowWidth }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  
  const dashboardRef = useRef(null);
  const triggerRef = useRef(null);

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Close dashboard when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dashboardRef.current &&
        !dashboardRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsDashboardOpen(false);
      }
    };

    if (isDashboardOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDashboardOpen]);

  const toggleDashboard = () => {
    setIsDashboardOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsDashboardOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1600,
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.3)',
        }}
      />
    );
  }

  // Guest mode (not logged in)
  if (!user) {
    return (
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          padding: '8px 14px',
          borderRadius: '50px',
          boxShadow: '0 3px 12px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: '#e0e0e0',
          }}
        />
        <span
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: windowWidth <= 768 ? '12px' : '12px',
            fontWeight: 500,
            color: '#555',
          }}
        >
          Guest
        </span>
      </div>
    );
  }

  // Logged in user
  const displayName = user.displayName || user.email?.split('@')[0] || 'User';
  const photoURL = user.photoURL || 'https://via.placeholder.com/44?text=U';


  return (
    <div style={{ position: 'relative' }}>
      {/* Profile trigger area */}
      <div
        ref={triggerRef}
        onClick={toggleDashboard}
        style={{
          position: 'fixed',
          top: '20px',
          right: '0px',
          zIndex: 1600,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          padding: '8px 14px',
          borderRadius: '50px 0 0 50px',
          boxShadow: '0 3px 12px rgba(0,0,0,0.25)',
          backdropFilter: 'blur(6px)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <img
          src={photoURL}
          alt="Profile"
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid #fff',
          }}
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/44?text=U';
          }}
        />
        <div
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: '600',
            color: '#1a3c34',
            fontSize: windowWidth <= 768 ? '13px' : '13px',
            maxWidth: '140px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {displayName}
        </div>
      </div>

      {/* Dashboard Popover */}
      {isDashboardOpen && (
        <div
          ref={dashboardRef}
          style={{
            position: 'fixed',
            top: '70px',
            right: '0px',
            zIndex: 1650,
            width: '280px',
            backgroundColor: 'white',
            borderRadius: '12px 0px 0px 12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            border: '1px solid #e0e0e0',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
            <p style={{ margin: 0, fontWeight: 600, color: '#1a3c34' }}>
              {displayName}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>
              {user.email}
            </p>
          </div>

          <div style={{ padding: '8px 0' }}>
            <DashboardItem label="Profile" onClick={() => alert('Open Profile Edit (to be implemented)')} />
            <DashboardItem label="My Investments" onClick={() => alert('My Investments (to be implemented)')} />
            <DashboardItem label="Payment History" onClick={() => alert('Payment History (to be implemented)')} />
            <DashboardItem
              label="Query / Report / Complaint"
              onClick={() => alert('Raise Query/Complaint (to be implemented)')}
            />
          </div>

          <div style={{ borderTop: '1px solid #f0f0f0', padding: '8px 0' }}>
            <DashboardItem
              label="Logout"
              onClick={handleLogout}
              style={{ color: '#d32f2f', fontWeight: 500 }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable menu item component
const DashboardItem = ({ label, onClick, style = {} }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%',
      padding: '12px 20px',
      border: 'none',
      background: 'none',
      textAlign: 'left',
      fontFamily: "'Montserrat', sans-serif",
      fontSize: '14px',
      color: '#333',
      cursor: 'pointer',
      transition: 'background-color 0.15s',
      ...style,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
  >
    {label}
  </button>
);

export default UserProfile;