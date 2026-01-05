// src/LoginPage.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "./App";
import { useNavigate, useLocation } from "react-router-dom";
import {
  db,
} from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import Logo from "./assets/logo3.png";
import "./Login.css";

export default function LoginPage() {
  // ────── LOGIN STATES ──────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ────── CONTACT MODAL STATES ──────
  const [showContact, setShowContact] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadMobile, setLeadMobile] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadStatus, setLeadStatus] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // ────── HOOKS ──────
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/map";

  // ────── CHECK SUBMISSION STATUS FROM localStorage ──────
  useEffect(() => {
    const submitted = localStorage.getItem("raaga_lead_submitted") === "true";
    setHasSubmitted(submitted);
  }, []);

  // ────── VALIDATION HELPERS ──────
  const validateMobile = (value) => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) return "Mobile number is required.";
    if (!/^(?:\+91|0)?[6-9]\d{9}$/.test(cleaned)) {
      return "Enter a valid mobile number.";
    }
    return "";
  };

  const validateEmail = (value) => {
    if (!value) return "";
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(value) ? "" : "Enter a valid e-mail address.";
  };

  // ────── CHECK IF USER EXISTS IN viewers COLLECTION ──────
  const viewerExists = async (emailToCheck) => {
    const viewersRef = collection(db, "viewers");
    const q = query(viewersRef, where("email", "==", emailToCheck.trim()));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  // ────── LOGIN HANDLER ──────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      const exists = await viewerExists(email);
      if (!exists) {
        setError("Access denied – you are not a registered viewer.");
        return;
      }
      setTimeout(() => navigate(from, { replace: true }), 300);
    } catch (err) {
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Wrong email or password");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ────── LEAD CAPTURE HANDLER (ONE-TIME ONLY) ──────
  const handleLead = async (e) => {
    e.preventDefault();
    setLeadStatus("");
    setMobileError("");
    setEmailError("");

    if (hasSubmitted) {
      setLeadStatus("You have already submitted a request.");
      return;
    }

    const mobErr = validateMobile(leadMobile);
    const mailErr = validateEmail(leadEmail);

    if (mobErr || mailErr) {
      setMobileError(mobErr);
      setEmailError(mailErr);
      return;
    }

    try {
      await addDoc(collection(db, "leads"), {
        name: leadName.trim(),
        mobileNumber: leadMobile.replace(/\D/g, ""),
        email: leadEmail.trim(),
        projectName: "Raaga",
        timestamp: serverTimestamp(),
      });

      // Mark as submitted
      localStorage.setItem("raaga_lead_submitted", "true");
      setHasSubmitted(true);

      setLeadStatus("Thank you! We’ll get back to you shortly.");
      
      setTimeout(() => {
        setShowContact(false);
        // Do NOT reset form — keep thank you state
      }, 2000);
    } catch {
      setLeadStatus("Submission failed. Try again.");
    }
  };

  // ────── RENDER ──────
  return (
    <div className="login-container">
      <div className="login-card">
        <img src={Logo} alt="Hasiru" className="login-logo" />

        <div className="hero-text">
          <h1>Raaga - Interactive 3D Booking</h1>
         <p>
            Raaga is born from the need to pause, breathe, and reconnect. 
            Inspired by Ayurveda and Vedic living, where nature restores balance.
          </p>
        </div>

        {/* LOGIN FORM */}
        <form onSubmit={handleLogin}>
          <div className="login-group">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder=" "
            />
            <label>Email</label>
          </div>

          <div className="login-group">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder=" "
            />
            <label>Password</label>
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? "Signing in…" : "Enter Raaga"}
          </button>
        </form>

        {/* SUPPORT SECTION */}
        <div className="support-section">
          <button
            className="contact-btn"
            onClick={() => setShowContact(true)}
            disabled={hasSubmitted}
            style={{ opacity: hasSubmitted ? 0.6 : 1 }}
          >
            {hasSubmitted ? "Request Sent" : "Need Support? Contact Us"}
          </button>

          <p className="fingertip-line">
            Book your farmland in a fingertip – Hassle-free!
          </p>
          <p className="footertext">
            Hasiru Farms Enterprises Pvt Ltd 
          </p>
        </div>
      </div>

      {/* CONTACT MODAL */}
      {showContact && (
        <div className="modal-overlay" onClick={() => setShowContact(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowContact(false)}
            >
              X
            </button>

            <h3>
              {hasSubmitted
                ? "We’ll get back to you shortly!"
                : "Request Access – We’ll Enable Your Login"}
            </h3>

            {!hasSubmitted ? (
              <form onSubmit={handleLead} className="lead-form">
                <input
                  type="text"
                  placeholder="Name"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  required
                />

                <div className="input-wrapper">
                  <input
                    type="tel"
                    placeholder="Mobile"
                    value={leadMobile}
                    onChange={(e) => {
                      setLeadMobile(e.target.value);
                      setMobileError("");
                    }}
                    required
                  />
                  {mobileError && <span className="field-error">{mobileError}</span>}
                </div>

                <div className="input-wrapper">
                  <input
                    type="email"
                    placeholder="Email"
                    value={leadEmail}
                    onChange={(e) => {
                      setLeadEmail(e.target.value);
                      setEmailError("");
                    }}
                  />
                  {emailError && <span className="field-error">{emailError}</span>}
                </div>

                {leadStatus && <p className="lead-status">{leadStatus}</p>}

                <button type="submit" className="lead-submit">
                  Submit
                </button>
              </form>
            ) : (
              <div className="thank-you-message">
                <p>
                  <strong>Thank you for your interest!</strong><br />
                  Our team will contact you shortly to enable your access.
                </p>
              </div>
            )}

            <p className="lead-note">
              We value your time and ensure a quick response.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
