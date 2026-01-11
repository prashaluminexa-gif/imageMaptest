import React, { useState, useEffect } from "react";
import { useAuth } from "./App";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import Logo from "./assets/logo3.png";
import "./Login.css";

export default function LoginPage() {
  // Login states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Mobile prompt for new users
  const [showMobilePrompt, setShowMobilePrompt] = useState(false);
  const [mobile, setMobile] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [savingMobile, setSavingMobile] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // temp hold user

  // Lead modal states
  const [showContact, setShowContact] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadMobile, setLeadMobile] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadStatus, setLeadStatus] = useState("");
  const [leadMobileError, setLeadMobileError] = useState("");
  const [leadEmailError, setLeadEmailError] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/map";

  useEffect(() => {
    const submitted = localStorage.getItem("raaga_lead_submitted") === "true";
    setHasSubmitted(submitted);
  }, []);

  // Mobile validation (Indian numbers)
  const validateMobile = (value) => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) return "Mobile number is required.";
    if (cleaned.length !== 10 || !/^[6-9]/.test(cleaned)) {
      return "Enter a valid 10-digit Indian mobile number.";
    }
    return "";
  };

  const validateEmail = (value) => {
    if (!value) return "";
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(value) ? "" : "Enter a valid e-mail address.";
  };

  // Check if user is already a viewer AND has mobile
  const checkuserstatus = async (userEmail) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", userEmail.trim()));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const viewerData = snapshot.docs[0].data();
      return { exists: true, hasMobile: !!viewerData.mobile };
    }
    return { exists: false, hasMobile: false };
  };

  // Save mobile to viewer document
  const saveMobileToViewer = async () => {
    if (!currentUser) return;
    const mobErr = validateMobile(mobile);
    if (mobErr) {
      setMobileError(mobErr);
      return;
    }

    setSavingMobile(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", currentUser.email));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // Update existing
        const viewerDoc = snapshot.docs[0];
        await setDoc(viewerDoc.ref, { mobile: mobile.replace(/\D/g, "") }, { merge: true });
      } else {
        // Create new
        await addDoc(usersRef, {
          email: currentUser.email,
          name: currentUser.displayName || "User",
          photoURL: currentUser.photoURL || null,
          mobile: mobile.replace(/\D/g, ""),
          createdAt: serverTimestamp(),
          loginMethod: currentUser.providerData[0]?.providerId || "unknown",
        });
      }

      setTimeout(() => navigate(from, { replace: true }), 300);
    } catch (err) {
      setError("Failed to save mobile. Try again.");
    } finally {
      setSavingMobile(false);
    }
  };

  // Email/Password Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCred = await login(email, password);
      const { exists, hasMobile } = await checkuserstatus(email);

      if (!exists || !hasMobile) {
        setCurrentUser(userCred);
        setShowMobilePrompt(true);
        setLoading(false);
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
      if (!showMobilePrompt) setLoading(false);
    }
  };

  // Google Login
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");

    try {
      const userCred = await loginWithGoogle();
      const { exists, hasMobile } = await checkuserstatus(userCred.email);

      if (!exists || !hasMobile) {
        setCurrentUser(userCred);
        setShowMobilePrompt(true);
        setGoogleLoading(false);
        return;
      }

      setTimeout(() => navigate(from, { replace: true }), 300);
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user") {
        setError("Sign in cancelled.");
      } else if (err.code === "auth/popup-blocked") {
        setError("Popup blocked. Please allow popups.");
      } else {
        setError("Google sign in failed. Try again.");
      }
    } finally {
      if (!showMobilePrompt) setGoogleLoading(false);
    }
  };

  // Lead capture (unchanged)
  const handleLead = async (e) => {
    e.preventDefault();
    setLeadStatus("");
    setLeadMobileError("");
    setLeadEmailError("");

    if (hasSubmitted) {
      setLeadStatus("You have already submitted a request.");
      return;
    }

    const mobErr = validateMobile(leadMobile);
    const mailErr = validateEmail(leadEmail);

    if (mobErr || mailErr) {
      setLeadMobileError(mobErr);
      setLeadEmailError(mailErr);
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

      localStorage.setItem("raaga_lead_submitted", "true");
      setHasSubmitted(true);
      setLeadStatus("Thank you! We’ll get back to you shortly.");
      setTimeout(() => setShowContact(false), 2000);
    } catch {
      setLeadStatus("Submission failed. Try again.");
    }
  };

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

        <form onSubmit={handleLogin}>
          <div className="login-group">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder=" " />
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
            <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? "Signing in…" : "Enter Raaga"}
          </button>
        </form>

        <div className="google-btn-container">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="google-btn"
          >
            {googleLoading ? (
              "Signing in..."
            ) : (
              <>
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="google-icon"
                />
                Sign in with Google
              </>
            )}
          </button>
        </div>

        <div className="divider"><span>OR</span></div>

        <div className="support-section">
          <button
            className="contact-btn"
            onClick={() => setShowContact(true)}
            disabled={hasSubmitted}
            style={{ opacity: hasSubmitted ? 0.6 : 1 }}
          >
            {hasSubmitted ? "Request Sent" : "Need Support? Contact Us"}
          </button>

          <p className="fingertip-line">Book your farmland in a fingertip – Hassle-free!</p>
          <p className="footertext">Hasiru Farms Enterprises Pvt Ltd</p>
        </div>
      </div>

      {/* Mobile Number Prompt Modal */}
      {showMobilePrompt && (
        <div className="modal-overlay" onClick={() => {}}>
          <div className="modal-card small" onClick={(e) => e.stopPropagation()}>
            <h3>Almost there!</h3>
            <p>Please enter your mobile number to complete access.</p>

            <div className="input-wrapper">
              <input
                type="tel"
                placeholder="Mobile Number"
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value);
                  setMobileError("");
                }}
                required
              />
              {mobileError && <span className="field-error">{mobileError}</span>}
            </div>

            <button
              onClick={saveMobileToViewer}
              disabled={savingMobile}
              className="lead-submit"
            >
              {savingMobile ? "Saving..." : "Continue to Raaga"}
            </button>
          </div>
        </div>
      )}

      {/* Existing Contact Modal */}
      {showContact && (
        <div className="modal-overlay" onClick={() => setShowContact(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowContact(false)}>X</button>

            <h3>
              {hasSubmitted
                ? "We’ll get back to you shortly!"
                : "Request Access – We’ll Enable Your Login"}
            </h3>

            {!hasSubmitted ? (
              <form onSubmit={handleLead} className="lead-form">
                <input type="text" placeholder="Name" value={leadName} onChange={(e) => setLeadName(e.target.value)} required />

                <div className="input-wrapper">
                  <input
                    type="tel"
                    placeholder="Mobile"
                    value={leadMobile}
                    onChange={(e) => {
                      setLeadMobile(e.target.value);
                      setLeadMobileError("");
                    }}
                    required
                  />
                  {leadMobileError && <span className="field-error">{leadMobileError}</span>}
                </div>

                <div className="input-wrapper">
                  <input
                    type="email"
                    placeholder="Email"
                    value={leadEmail}
                    onChange={(e) => {
                      setLeadEmail(e.target.value);
                      setLeadEmailError("");
                    }}
                  />
                  {leadEmailError && <span className="field-error">{leadEmailError}</span>}
                </div>

                {leadStatus && <p className="lead-status">{leadStatus}</p>}

                <button type="submit" className="lead-submit">Submit</button>
              </form>
            ) : (
              <div className="thank-you-message">
                <p><strong>Thank you for your interest!</strong><br />
                Our team will contact you shortly to enable your access.</p>
              </div>
            )}

            <p className="lead-note">We value your time and ensure a quick response.</p>
          </div>
        </div>
      )}
    </div>
  );
}