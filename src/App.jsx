import React, { useState, useEffect, createContext, useContext } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { db, auth } from "./firebase";
import Map from "./Map";
import ProjectDetails from "./ProjectDetails";
import LoginPage from "./LoginPage";
import "./App.css";
import Logo from "./assets/logo.png";

/* --------------------------------------------------------------
   1. Auth Context – Reliable persistence with Firebase
   -------------------------------------------------------------- */
const AuthContext = createContext();
const useAuth = () => useContext(AuthContext);

const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours
const LAST_LOGIN_KEY = "raaga_last_login";

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // Record login time for 24-hour forced expiry
    localStorage.setItem(LAST_LOGIN_KEY, Date.now().toString());
    setUser(cred.user);
    return cred.user;
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem(LAST_LOGIN_KEY);
    setUser(null);
  };

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Check if login is older than 24 hours
        const lastLogin = localStorage.getItem(LAST_LOGIN_KEY);
        const loginTime = lastLogin ? parseInt(lastLogin, 10) : Date.now();

        if (Date.now() - loginTime > ONE_DAY_MS) {
          // Force logout after 24 hours
          logout();
          setAuthLoading(false);
          return;
        }

        setUser(firebaseUser);
      } else {
        localStorage.removeItem(LAST_LOGIN_KEY);
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

/* --------------------------------------------------------------
   2. Protected Route
   -------------------------------------------------------------- */
function RequireAuth({ children }) {
  const { user, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-container">
          <img src={Logo} alt="Logo" className="loading-logo" />
          <div className="loader"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

/* --------------------------------------------------------------
   3. Logout Button
   -------------------------------------------------------------- */
function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <button onClick={handleLogout} className="logout-btn">
      Logout
    </button>
  );
}

/* --------------------------------------------------------------
   4. Main App
   -------------------------------------------------------------- */
function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [plots, setPlots] = useState([]);

  // Fetch plots from Firestore
  useEffect(() => {
    const fetchPlots = async () => {
      try {
        const snap = await getDocs(collection(db, "plots"));
        const data = snap.docs.map((d) => ({ projectId: d.id, ...d.data() }));
        setPlots(data);
      } catch (e) {
        console.error("Error fetching plots:", e);
        setPlots([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlots();
  }, []);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-container">
          <img src={Logo} alt="Logo" className="loading-logo" />
          <div className="loader"></div>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <div className="app-container">
        <Router>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Map plots={plots} logout={<LogoutButton />} />
                </RequireAuth>
              }
            />
            <Route
              path="/map"
              element={
                <RequireAuth>
                  <Map plots={plots} logout={<LogoutButton />} />
                </RequireAuth>
              }
            />
            <Route
              path="/project/:projectId"
              element={
                <RequireAuth>
                  <ProjectDetails logout={<LogoutButton />} />
                </RequireAuth>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/map" replace />} />
          </Routes>
        </Router>
      </div>
    </AuthProvider>
  );
}

export default App;

export { useAuth };