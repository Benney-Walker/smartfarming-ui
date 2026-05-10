// ===== File: Login.jsx =====

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { checkUser, loginUser } from "../../services/login.js";
import "../../styles/login.css";

export default function Login() {
    const navigate = useNavigate();

    const [step, setStep] = useState("USERNAME"); // "USERNAME" | "PASSWORD"
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState("");

    const passwordInputRef = useRef(null);

    // ── Handlers ──────────────────────────────────────────────

    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError("");

        if (step === "USERNAME") {
            await handleCheckUser();
        } else {
            await handleLoginUser();
        }
    };

    const handleCheckUser = async () => {
        const email = username.trim();

        if (!email) {
            setApiError("Enter email");
            return;
        }

        setIsLoading(true);

        try {
            const data = await checkUser(email);

            if (data === null) {
                setApiError("User not found");
                setIsLoading(false);
                return;
            }

            if (data.status === "NEW_USER") {
                setIsLoading(false);
                navigate(`/initialize-password?email=${encodeURIComponent(email)}`);
                return;
            }

            if (data.status === "OLD_USER") {
                setStep("PASSWORD");
                setTimeout(() => passwordInputRef.current?.focus(), 0);
            }
        } catch (err) {
            setApiError(err.message || "Failed to check user");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoginUser = async () => {
        if (!password) {
            setApiError("Enter password");
            return;
        }

        setIsLoading(true);

        try {
            const data = await loginUser(username.trim(), password);

            localStorage.setItem("token", data.token);
            localStorage.setItem("username", data.username);
            localStorage.setItem("role", data.role);

            if (data.role === "ADMIN") {
                navigate("/admin-dashboard");
            } else if (data.role === "FARMER") {
                navigate("/farm-dashboard");
            } else {
                setApiError("You don't have access to this system.");
            }
        } catch {
            setApiError("Could not connect to the server, please try again");
        } finally {
            setIsLoading(false);
        }
    };

    const togglePassword = () => setShowPassword((prev) => !prev);

    // ── Render ─────────────────────────────────────────────────

    return (
        <div className="login-root">
            {/* Decorative background elements */}
            <div className="bg-orb bg-orb--1" />
            <div className="bg-orb bg-orb--2" />
            <div className="bg-orb bg-orb--3" />
            <div className="bg-grid" />

            <div className="login-wrapper">

                {/* ── Left Panel ── */}
                <aside className="login-panel">
                    <div className="panel-content">
                        <div className="panel-badge">
                            <span className="badge-dot" />
                            Live Monitoring Active
                        </div>
                        <h2 className="panel-headline">
                            Smarter Farms,<br />
                            <span className="panel-headline--accent">Greener Future</span>
                        </h2>
                        <div className="panel-stats">
                            <p className="panel-body">
                                Real-time irrigation control, soil intelligence, and crop
                                analytics — all in one place.
                            </p>
                            <div className="stat-divider" />
                            <div className="stat">
                                <span className="stat-value">98%</span>
                                <span className="stat-label">Water Efficiency</span>
                            </div>
                        </div>
                        <div className="panel-decoration">
                            <div className="deco-circle deco-circle--lg" />
                            <div className="deco-circle deco-circle--sm" />
                        </div>
                    </div>
                </aside>

                {/* ── Right Card ── */}
                <main className="login-card">
                    <div className="card-header">
                        <div className="brand">
                            {/* SproutIcon */}
                            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"
                                 width="38" height="38" aria-hidden="true">
                                <circle cx="16" cy="16" r="16" fill="#1a6b3c" />
                                <path d="M16 24V14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                                <path d="M16 17C16 17 13 15 11 12C13.5 11 16 12.5 16 17Z" fill="#5bde8a" />
                                <path d="M16 14C16 14 19 12 21 9C18.5 8 16 9.5 16 14Z" fill="#3ecf6e" />
                            </svg>
                            <div className="brand-text">
                                <span className="brand-name">Smart Farming</span>
                                <span className="brand-sub">System</span>
                            </div>
                        </div>
                        <h1 className="card-title">Welcome back</h1>
                        <p className="card-subtitle">Intelligent Irrigation Monitoring Platform</p>
                    </div>

                    <form className="login-form" onSubmit={handleSubmit} noValidate>

                        {/* ── Username ── */}
                        <div className="field-group">
                            <label className="field-label" htmlFor="username">Username</label>
                            <div className="field-input-wrap">
                <span className="field-icon field-icon--left" aria-hidden="true">
                  {/* UserIcon */}
                    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"
                         width="18" height="18">
                    <path d="M10 9C11.933 9 13.5 7.433 13.5 5.5C13.5 3.567 11.933 2 10 2C8.067 2 6.5 3.567 6.5 5.5C6.5 7.433 8.067 9 10 9Z"
                          fill="currentColor" opacity="0.6" />
                    <path d="M17 17.5C17 14.462 13.866 12 10 12C6.134 12 3 14.462 3 17.5"
                          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
                  </svg>
                </span>
                                <input
                                    id="username"
                                    className="field-input"
                                    type="text"
                                    placeholder="Enter your username"
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    aria-describedby="usernameError"
                                />
                            </div>
                            <span className="field-error" id="usernameError" role="alert" aria-live="polite" />
                        </div>

                        {/* ── Password (shown only after USERNAME step) ── */}
                        {step === "PASSWORD" && (
                            <div className="field-group">
                                <label className="field-label" htmlFor="password">Password</label>
                                <div className="field-input-wrap">
                  <span className="field-icon field-icon--left" aria-hidden="true">
                    {/* LockIcon */}
                      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"
                           width="18" height="18">
                      <rect x="4" y="9" width="12" height="9" rx="2"
                            fill="currentColor" opacity="0.6" />
                      <path d="M7 9V6.5C7 4.567 8.567 3 10.5 3C12.433 3 14 4.567 14 6.5V9"
                            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
                    </svg>
                  </span>
                                    <input
                                        id="password"
                                        ref={passwordInputRef}
                                        className="field-input"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        aria-describedby="passwordError"
                                    />
                                    <button
                                        type="button"
                                        className="field-icon field-icon--right field-toggle"
                                        onClick={togglePassword}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {/* EyeIcon — show */}
                                        <svg viewBox="0 0 20 20" fill="none" width="18" height="18"
                                             style={{ display: showPassword ? "block" : "none" }}>
                                            <path d="M2 10C2 10 5 4 10 4C15 4 18 10 18 10C18 10 15 16 10 16C5 16 2 10 2 10Z"
                                                  stroke="currentColor" strokeWidth="1.5" />
                                            <circle cx="10" cy="10" r="2.5" fill="currentColor" opacity="0.6" />
                                        </svg>
                                        {/* EyeIcon — hide */}
                                        <svg viewBox="0 0 20 20" fill="none" width="18" height="18"
                                             style={{ display: showPassword ? "none" : "block" }}>
                                            <path d="M3 3L17 17M8.5 8.7C8.19 9.04 8 9.5 8 10C8 11.1 8.9 12 10 12C10.5 12 10.96 11.81 11.3 11.5"
                                                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                            <path d="M5.2 5.4C3.6 6.6 2 10 2 10C2 10 5 16 10 16C11.7 16 13.2 15.4 14.4 14.6M8 4.2C8.6 4.1 9.3 4 10 4C15 4 18 10 18 10C18 10 17.2 11.6 15.8 13"
                                                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                        </svg>
                                    </button>
                                </div>
                                <span className="field-error" id="passwordError" role="alert" aria-live="polite" />
                            </div>
                        )}

                        {/* ── Options Row ── */}
                        <div className="form-options">
                            <label className="remember-me">
                                <input
                                    type="checkbox"
                                    className="remember-checkbox"
                                    id="rememberMe"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                <span className="remember-custom" />
                                <span className="remember-text">Keep me signed in</span>
                            </label>
                            <a href="#" className="forgot-link">Forgot password?</a>
                        </div>

                        {/* ── API Error Banner ── */}
                        {apiError && (
                            <div className="api-error" role="alert" aria-live="polite">
                                {apiError}
                            </div>
                        )}

                        {/* ── Submit Button ── */}
                        <button className="login-btn" type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <span className="btn-loading">
                  <span className="spinner" />
                  Signing In…
                </span>
                            ) : (
                                <span className="btn-content">
                  {step === "USERNAME" ? (
                      "Next"
                  ) : (
                      <>
                          {/* LeafIcon */}
                          <svg className="leaf-icon" viewBox="0 0 24 24" fill="none"
                               xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                              <path d="M12 2C6.5 2 2 6.5 2 12C2 14.4 2.9 16.6 4.4 18.3L2.3 20.4C2 20.7 2 21.2 2.3 21.5C2.6 21.8 3.1 21.8 3.4 21.5L5.5 19.4C7.2 20.9 9.5 21.8 12 21.8C17.5 21.8 22 17.3 22 11.8C22 6.5 17.5 2 12 2Z"
                                    fill="currentColor" />
                              <path d="M12 2C6.5 2 2 6.5 2 12C2 14.4 2.9 16.6 4.4 18.3C7.2 20.9 9.5 21.8 12 21.8C17.5 21.8 22 17.3 22 11.8C22 6.3 17.5 2 12 2Z"
                                    fill="currentColor" opacity="0.3" />
                          </svg>
                          Sign In to Dashboard
                      </>
                  )}
                </span>
                            )}
                        </button>

                    </form>

                    <p className="card-footer">
                        Don't have an account?&nbsp;
                        <a href="#" className="footer-link">Request access</a>
                    </p>
                </main>

            </div>
        </div>
    );
}