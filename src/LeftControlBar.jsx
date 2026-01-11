// src/components/LeftControlBar.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShareAlt,
  faCompass,
  faInfoCircle,
  faImages,
  faFire,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';

const LeftControlBar = ({ windowWidth }) => {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState(null);
  const [activeTab, setActiveTab] = useState('Trending Plots');

  // Responsive values
  const buttonSize = windowWidth <= 768 ? 35 : 40;
  const iconSize = windowWidth <= 768 ? 18 : 20;
  const gap = windowWidth <= 768 ? 10 : 10;
  const leftOffset = windowWidth <= 768 ? 20 : 20;

  const buttonStyle = {
    width: `${buttonSize}px`,
    height: `${buttonSize}px`,
    borderRadius: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.67)',
    border: 'none',
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.28s ease',
    backdropFilter: 'blur(8px)',
  };

  const socialButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    backgroundColor: '#f8f9fa',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    textDecoration: 'none',
  };

  // ── Dummy data ────────────────────────────────────────────────
  const dummyGalleryImages = [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
    'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800',
    'https://images.unsplash.com/photo-1625505826533-5c80aca7d157?w=800',
    'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800',
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800',
  ];

  const dummyTrendingPlots = [
    { id: 'P101', name: 'Plot A-12', views: 342, price: 2850000, size: '2400 sqft' },
    { id: 'P215', name: 'Plot B-08', views: 289, price: 4200000, size: '3600 sqft' },
    { id: 'P047', name: 'Plot C-03', views: 231, price: 1980000, size: '1800 sqft' },
    { id: 'P189', name: 'Plot A-21', views: 198, price: 5200000, size: '4500 sqft' },
    { id: 'P076', name: 'Plot D-15', views: 167, price: 3750000, size: '3200 sqft' },
  ];

  const dummyEvents = [
    {
      title: 'Farmers Meet & Guided Plot Walk',
      date: '25 Feb 2026',
      desc: 'Join us for a guided tour and Q&A with agriculture experts',
    },
    {
      title: 'Rainwater Harvesting Workshop',
      date: '12 Mar 2026',
      desc: 'Learn sustainable water management techniques for your farmland',
    },
    {
      title: 'Tree Plantation Drive',
      date: '22 Apr 2026',
      desc: 'World Earth Day celebration – plant native trees together',
    },
  ];

  const modalContent = {
    share: {
      title: 'Share Raaga Farmland Project',
      body: ({ currentUrl }) => (
        <>
          <p style={{ marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Help your friends and family discover premium farmland opportunities with Raaga by Hasiru Farms!
          </p>

          {/* Link + Copy */}
          <div
            style={{
              background: '#f1f3f5',
              padding: '14px 18px',
              borderRadius: '12px',
              margin: '1.4rem 0',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              fontSize: '0.96rem',
              position: 'relative',
              border: '1px solid #e0e0e0',
            }}
          >
            {currentUrl}
            <button
              onClick={() => {
                navigator.clipboard.writeText(currentUrl);
                alert('Link copied to clipboard!');
              }}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#024837',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 14px',
                fontSize: '0.86rem',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Copy
            </button>
          </div>

          <p style={{ margin: '2rem 0 1.2rem 0', fontWeight: 500, color: '#333' }}>
            Quick Share:
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Raaga Farmland Project by Hasiru Farms 🌱\nPremium farmland plots!\n${currentUrl}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              style={socialButtonStyle}
              title="WhatsApp"
            >
              <img src="https://img.icons8.com/color/48/whatsapp--v1.png" alt="WhatsApp" style={{ width: '34px' }} />
            </a>

            {/* Facebook */}
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={socialButtonStyle}
              title="Facebook"
            >
              <img src="https://img.icons8.com/fluency/48/facebook-new.png" alt="Facebook" style={{ width: '34px' }} />
            </a>

            {/* X / Twitter */}
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                'Discover Raaga Farmland Project by Hasiru Farms! 🌿'
              )}&url=${encodeURIComponent(currentUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={socialButtonStyle}
              title="X"
            >
              <img src="https://img.icons8.com/color/48/twitterx--v2.png" alt="X" style={{ width: '34px' }} />
            </a>

            {/* LinkedIn */}
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={socialButtonStyle}
              title="LinkedIn"
            >
              <img src="https://img.icons8.com/fluency/48/linkedin.png" alt="LinkedIn" style={{ width: '34px' }} />
            </a>

            {/* Telegram */}
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(
                'Raaga Farmland Project by Hasiru Farms - Premium farmland opportunity! 🌱'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              style={socialButtonStyle}
              title="Telegram"
            >
              <img src="https://img.icons8.com/color/48/telegram-app.png" alt="Telegram" style={{ width: '34px' }} />
            </a>
          </div>

          <small style={{ display: 'block', textAlign: 'center', color: '#555', marginTop: '1.5rem' }}>
            Thank you for spreading the word! 🌳
          </small>
        </>
      ),
    },

    explore: {
      title: 'Explore Features (Coming Soon)',
      body: (
        <>
          <p>We're building powerful tools to make your farmland search easier:</p>
          <ul style={{ paddingLeft: '1.5rem', margin: '1.4rem 0', lineHeight: 1.7 }}>
            <li>Advanced plot filters (size, price, facing, location)</li>
            <li>Real-time availability & booking status</li>
            <li>Interactive map layers & legend</li>
            <li>Smart search by plot number or keyword</li>
            <li>360° virtual view of selected plots</li>
            <li>Comparison tool for multiple plots</li>
          </ul>
          <p style={{ color: '#e67e22', fontWeight: 500, marginTop: '1.5rem', textAlign: 'center' }}>
            Development in progress — stay tuned!
          </p>
        </>
      ),
    },

    about: {
      title: 'About Raaga by Hasiru Farms',
      body: (
        <>
          <p>
            <strong>Raaga</strong> is a thoughtfully planned premium farmland project by{' '}
            <strong>Hasiru Farms</strong>, located in the green heart of Karnataka.
          </p>
          <p style={{ margin: '1.3rem 0' }}>
            Perfect for nature lovers, weekend farmers, and investors looking for:
          </p>
          <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.7 }}>
            <li>Clear title with B-khata land</li>
            <li>Well-developed layouts, roads & fencing</li>
            <li>Water & electricity infrastructure</li>
            <li>Proximity to growing tourism & infrastructure zones</li>
            <li>Sustainable & eco-friendly development focus</li>
          </ul>
          <p style={{ fontStyle: 'italic', color: '#444', marginTop: '1.6rem', textAlign: 'center' }}>
            "Your piece of paradise where farming dreams meet nature's beauty"
          </p>
        </>
      ),
    },

    gallery: {
      title: 'Raaga Gallery',
      body: (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '16px',
            marginTop: '1rem',
          }}
        >
          {dummyGalleryImages.map((url, i) => (
            <div
              key={i}
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              }}
            >
              <img
                src={url}
                alt="k"
                style={{ width: '100%', height: 'auto', display: 'block' }}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      ),
    },

    trending: {
      title: 'Trending & Insights',
      body: (
        <div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {['Trending Plots', 'Compare Plots', 'Events'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === tab ? '#024837' : '#f1f3f5',
                  color: activeTab === tab ? 'white' : '#333',
                  fontWeight: activeTab === tab ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Trending Plots */}
          {activeTab === 'Trending Plots' && (
            <div>
              <h3 style={{ margin: '0 0 1rem 0', color: '#024837' }}>Most Viewed & Premium Plots</h3>
              {dummyTrendingPlots
                .sort((a, b) => b.views - a.views)
                .map((plot) => (
                  <div
                    key={plot.id}
                    style={{
                      padding: '14px',
                      marginBottom: '10px',
                      background: '#f9fafb',
                      borderRadius: '10px',
                      borderLeft: plot.price >= 4000000 ? '4px solid #e67e22' : '4px solid #3498db',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{plot.name}</strong>
                        <div style={{ color: '#666', fontSize: '0.9rem' }}>{plot.size}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: '#e74c3c' }}>
                          ₹{(plot.price / 100000).toFixed(2)} L
                        </div>
                        <div style={{ color: '#777', fontSize: '0.85rem' }}>{plot.views} views</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Compare Plots */}
          {activeTab === 'Compare Plots' && (
            <div>
              <h3 style={{ margin: '0 0 1.2rem 0', color: '#024837' }}>Compare Two Plots</h3>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '2rem' }}>
                <select style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}>
                  <option>Select Plot 1</option>
                  {dummyTrendingPlots.map((p) => (
                    <option key={p.id}>{p.name} - {p.size}</option>
                  ))}
                </select>
                <select style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}>
                  <option>Select Plot 2</option>
                  {dummyTrendingPlots.map((p) => (
                    <option key={p.id}>{p.name} - {p.size}</option>
                  ))}
                </select>
              </div>
              <div style={{ textAlign: 'center', color: '#777', padding: '3rem 1rem', background: '#f8f9fa', borderRadius: '12px' }}>
                Comparison table will appear here once both plots are selected
              </div>
            </div>
          )}

          {/* Events */}
          {activeTab === 'Events' && (
            <div>
              <h3 style={{ margin: '0 0 1rem 0', color: '#024837' }}>Upcoming Events</h3>
              {dummyEvents.map((event, i) => (
                <div
                  key={i}
                  style={{
                    padding: '14px',
                    marginBottom: '12px',
                    background: '#f9fafb',
                    borderRadius: '10px',
                    borderLeft: '4px solid #27ae60',
                  }}
                >
                  <strong>{event.title}</strong>
                  <div style={{ color: '#e67e22', fontSize: '0.9rem', margin: '4px 0' }}>{event.date}</div>
                  <div style={{ color: '#555' }}>{event.desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
  };

  const handleShareClick = () => {
    const currentUrl = window.location.href;

    if (navigator.share) {
      navigator
        .share({
          title: 'Raaga Farmland Project',
          text: 'Explore premium farmland plots at Raaga by Hasiru Farms',
          url: currentUrl,
        })
        .catch(() => setActiveModal('share'));
    } else {
      setActiveModal('share');
    }
  };

  return (
    <>
      {/* Control Buttons */}
      <div
        style={{
          position: 'fixed',
          top: '55%',
          left: `${leftOffset}px`,
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: `${gap}px`,
          zIndex: 1600,
          pointerEvents: 'auto',
        }}
      >
        <button
          onClick={handleShareClick}
          title="Share"
          style={buttonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <FontAwesomeIcon icon={faShareAlt} style={{ fontSize: `${iconSize}px`, color: '#024837' }} />
        </button>

        <button
          onClick={() => setActiveModal('explore')}
          title="Explore"
          style={buttonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <FontAwesomeIcon icon={faCompass} style={{ fontSize: `${iconSize}px`, color: '#024837' }} />
        </button>

        <button
          onClick={() => setActiveModal('about')}
          title="About"
          style={buttonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <FontAwesomeIcon icon={faInfoCircle} style={{ fontSize: `${iconSize}px`, color: '#024837' }} />
        </button>

        <button
          onClick={() => setActiveModal('gallery')}
          title="Gallery"
          style={buttonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <FontAwesomeIcon icon={faImages} style={{ fontSize: `${iconSize}px`, color: '#024837' }} />
        </button>

        <button
          onClick={() => {
            setActiveTab('Trending Plots');
            setActiveModal('trending');
          }}
          title="Trending"
          style={buttonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <FontAwesomeIcon icon={faFire} style={{ fontSize: `${iconSize}px`, color: '#024837' }} />
        </button>
      </div>

      {/* Modal */}
      {activeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.68)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setActiveModal(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              maxWidth: activeModal === 'gallery' ? '820px' : '520px',
              width: '92%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: activeModal === 'gallery' ? '1.8rem' : '2.2rem',
              position: 'relative',
              boxShadow: '0 12px 50px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveModal(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '18px',
                background: 'none',
                border: 'none',
                fontSize: '1.8rem',
                color: '#777',
                cursor: 'pointer',
              }}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>

            <h2
              style={{
                margin: '0 0 1.4rem 0',
                color: '#024837',
                fontSize: '1.9rem',
                fontWeight: 700,
              }}
            >
              {modalContent[activeModal].title}
            </h2>

            <div style={{ lineHeight: 1.65, color: '#333' }}>
              {activeModal === 'share'
                ? modalContent[activeModal].body({ currentUrl: window.location.href })
                : modalContent[activeModal].body}
            </div>

            {activeModal === 'about' && (
              <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <button
                  onClick={() => {
                    setActiveModal(null);
                    navigate('/about');
                  }}
                  style={{
                    padding: '12px 32px',
                    backgroundColor: '#024837',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '1.05rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Learn More →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default LeftControlBar;