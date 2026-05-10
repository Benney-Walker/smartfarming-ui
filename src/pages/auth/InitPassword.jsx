// ===== File: InitializePassword.jsx =====

import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setNewPassword } from "../../services/initPassword.js";
import "../../styles/initPassword.css";

// ── SVG helpers for requirement checklist icons ──────────────

const IconCircle = () => (
    <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
);

const IconCheck = () => (
    <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
        <circle cx="6" cy="6" r="5" fill="currentColor" opacity=".15" />
        <path
            d="M3.5 6L5.2 7.7L8.5 4.3"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

// ── Password strength helpers ────────────────────────────────

function scorePassword(pw) {
    let score = 0;
    if (pw.length >= 8)       score++;
    if (/[a-zA-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw))    score++;
    return score;
}

function getStrength(pw) {
    if (!pw) return { level: "", label: "", hint: "" };
    const score = scorePassword(pw);
    if (score < 2)   return { level: "weak",   label: "Weak",   hint: "Password strength: Weak" };
    if (score === 2) return { level: "fair",   label: "Fair",   hint: "Password strength: Fair" };
    return           { level: "strong", label: "Strong", hint: "Password strength: Strong" };
}

// ── Eye-toggle sub-component ─────────────────────────────────

function EyeToggle({ visible, onToggle}) {
    return (
        <button
            type="button"
            className="field-icon field-icon--right field-toggle"
            onClick={onToggle}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
        >
            {/* Eye-off (password hidden) */}
            <svg
                viewBox="0 0 20 20"
                fill="none"
                width="18"
                height="18"
                style={{ display: visible ? "none" : "block" }}
            >
                <path
                    d="M3 3L17 17M8.5 8.7C8.19 9.04 8 9.5 8 10C8 11.1 8.9 12 10 12C10.5 12 10.96 11.81 11.3 11.5"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                />
                <path
                    d="M5.2 5.4C3.6 6.6 2 10 2 10C2 10 5 16 10 16C11.7 16 13.2 15.4 14.4 14.6M8 4.2C8.6 4.1 9.3 4 10 4C15 4 18 10 18 10C18 10 17.2 11.6 15.8 13"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                />
            </svg>
            {/* Eye-on (password visible) */}
            <svg
                viewBox="0 0 20 20"
                fill="none"
                width="18"
                height="18"
                style={{ display: visible ? "block" : "none" }}
            >
                <path
                    d="M2 10C2 10 5 4 10 4C15 4 18 10 18 10C18 10 15 16 10 16C5 16 2 10 2 10Z"
                    stroke="currentColor" strokeWidth="1.5"
                />
                <circle cx="10" cy="10" r="2.5" fill="currentColor" opacity=".6" />
            </svg>
        </button>
    );
}

// ── Requirement item ─────────────────────────────────────────

function ReqItem({ met, children }) {
    return (
        <li className={`req-item${met ? " req--met" : ""}`}>
      <span className="req-icon" aria-hidden="true">
        {met ? <IconCheck /> : <IconCircle />}
      </span>
            {children}
        </li>
    );
}

// ── Main component ───────────────────────────────────────────

export default function InitializePassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const emailValue = searchParams.get("email") || "";

    const [password, setPassword]       = useState("");
    const [confirm, setConfirm]         = useState("");
    const [showPw, setShowPw]           = useState(false);
    const [showCf, setShowCf]           = useState(false);
    const [isLoading, setIsLoading]     = useState(false);
    const [apiError, setApiError]       = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [confirmError, setConfirmError]   = useState("");

    const apiErrorRef = useRef(null);

    // Derived strength state
    const strength = getStrength(password);
    const showStrength = password.length > 0;

    const hasLength = password.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    // Clear field errors as user edits
    useEffect(() => {
        if (passwordError) setPasswordError("");
    }, [password]);                                    // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (confirmError) setConfirmError("");
    }, [confirm]);                                     // eslint-disable-line react-hooks/exhaustive-deps

    // Scroll api error into view when it appears
    useEffect(() => {
        if (apiError && apiErrorRef.current) {
            apiErrorRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [apiError]);

    // ── Validation ─────────────────────────────────────────────

    function validate() {
        let valid = true;

        if (!password) {
            setPasswordError("Password is required.");
            valid = false;
        } else if (password.length < 8) {
            setPasswordError("Password must be at least 8 characters.");
            valid = false;
        } else if (!/[a-zA-Z]/.test(password)) {
            setPasswordError("Password must contain at least one letter.");
            valid = false;
        } else if (!/[0-9]/.test(password)) {
            setPasswordError("Password must contain at least one number.");
            valid = false;
        }

        if (!confirm) {
            setConfirmError("Please confirm your password.");
            valid = false;
        } else if (confirm !== password) {
            setConfirmError("Passwords do not match.");
            valid = false;
        }

        if (!emailValue) {
            setApiError("No email address was found. Refresh the page.");
            valid = false;
        }

        return valid;
    }

    // ── Submit ──────────────────────────────────────────────────

    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError("");

        if (!validate()) return;

        setIsLoading(true);

        try {
            await setNewPassword(emailValue, password);
            setIsLoading(false);
            navigate("/login-page");
        } catch (err) {
            setApiError(
                err.message ||
                "Unable to reach the server. Please check your connection and try again."
            );
            setIsLoading(false);
        }
    };

    // ── Render ──────────────────────────────────────────────────

    return (
        <>
            {/* Background decoration */}
            <div className="bg-orb bg-orb--1" aria-hidden="true" />
            <div className="bg-orb bg-orb--2" aria-hidden="true" />
            <div className="bg-orb bg-orb--3" aria-hidden="true" />
            <div className="bg-grid"          aria-hidden="true" />

            <div className="page-root">
                <main className="card" role="main" aria-labelledby="cardTitle">

                    {/* ── Brand ── */}
                    <div className="brand">
                        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"
                             width="38" height="38" aria-hidden="true" focusable="false">
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

                    {/* ── Step indicator ── */}
                    <div className="steps" aria-label="Account setup progress, step 2 of 2">
                        <div className="step step--done" aria-label="Step 1 complete: Email verified">
                            <div className="step-circle" aria-hidden="true">
                                <svg viewBox="0 0 12 12" fill="none" width="11" height="11">
                                    <path d="M2 6L4.8 9L10 3" stroke="white" strokeWidth="1.7"
                                          strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <span className="step-label">Email verified</span>
                        </div>
                        <div className="step-connector" aria-hidden="true" />
                        <div className="step step--active" aria-current="step"
                             aria-label="Step 2 active: Set password">
                            <div className="step-circle" aria-hidden="true">2</div>
                            <span className="step-label">Set password</span>
                        </div>
                    </div>

                    {/* ── Card header ── */}
                    <div className="card-header">
                        <h1 className="card-title" id="cardTitle">Set your password</h1>
                        <p className="card-subtitle">
                            Create a secure password to activate your Smart Farming account.
                        </p>
                    </div>

                    {/* ── API error banner ── */}
                    {apiError && (
                        <div
                            ref={apiErrorRef}
                            className="api-error"
                            role="alert"
                            aria-live="assertive"
                            aria-atomic="true"
                        >
                            <svg viewBox="0 0 16 16" fill="none" width="15" height="15"
                                 aria-hidden="true" focusable="false" className="api-error__icon">
                                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                                <path d="M8 5V8.5M8 10.5V11" stroke="currentColor"
                                      strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            <span>{apiError}</span>
                        </div>
                    )}

                    {/* ── Form ── */}
                    <form className="form" id="initForm" noValidate
                          aria-label="Set password form" onSubmit={handleSubmit}>

                        {/* 1. Account email (read-only) */}
                        <div className="field-group">
                            <label className="field-label" htmlFor="emailDisplay">Account Email</label>
                            <div className="field-input-wrap">
                <span className="field-icon field-icon--left" aria-hidden="true">
                  <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                    <rect x="2.5" y="4.5" width="15" height="11" rx="2"
                          stroke="currentColor" strokeWidth="1.5" opacity=".6" />
                    <path d="M2.5 7.5L10 12L17.5 7.5"
                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".6" />
                  </svg>
                </span>
                                <input
                                    id="emailDisplay"
                                    className="field-input field-input--readonly"
                                    type="text"
                                    value={emailValue}
                                    placeholder={emailValue ? undefined : "No email provided in link"}
                                    readOnly
                                    aria-readonly="true"
                                    aria-describedby="emailHint"
                                />
                                <span className="field-icon field-icon--right readonly-badge" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                    <rect x="3" y="7.5" width="10" height="7" rx="1.5"
                          fill="currentColor" opacity=".3" />
                    <path
                        d="M5.5 7.5V5.5C5.5 3.843 6.567 2.5 8 2.5C9.433 2.5 10.5 3.843 10.5 5.5V7.5"
                        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity=".45" />
                  </svg>
                </span>
                            </div>
                            <span className="field-hint" id="emailHint">
                Pre-filled from your invitation link — cannot be changed.
              </span>
                        </div>

                        {/* 2. New password */}
                        <div className={`field-group${passwordError ? " field-group--error" : ""}`}>
                            <label className="field-label" htmlFor="password">New Password</label>
                            <div className="field-input-wrap">
                <span className="field-icon field-icon--left" aria-hidden="true">
                  <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                    <rect x="4" y="9" width="12" height="9" rx="2"
                          fill="currentColor" opacity=".6" />
                    <path d="M7 9V6.5C7 4.567 8.567 3 10.5 3C12.433 3 14 4.567 14 6.5V9"
                          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity=".6" />
                  </svg>
                </span>
                                <input
                                    id="password"
                                    className="field-input"
                                    type={showPw ? "text" : "password"}
                                    placeholder="Create a strong password"
                                    autoComplete="new-password"
                                    aria-required="true"
                                    aria-describedby="passwordError strengthHint"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <EyeToggle visible={showPw} onToggle={() => setShowPw((v) => !v)} />
                            </div>

                            {/* Strength meter */}
                            <div
                                className={`strength-wrap${showStrength ? " visible" : ""}`}
                                aria-hidden="true"
                            >
                                <div className="strength-track">
                                    <div className={`strength-bar${strength.level ? ` ${strength.level}` : ""}`} />
                                </div>
                                <span className={`strength-text${strength.level ? ` ${strength.level}` : ""}`}>
                  {strength.label}
                </span>
                            </div>

                            {/* SR-only live strength announcement */}
                            <span className="sr-only" id="strengthHint" aria-live="polite">
                {strength.hint}
              </span>

                            <span className="field-error" id="passwordError"
                                  role="alert" aria-live="polite">
                {passwordError}
              </span>
                        </div>

                        {/* 3. Confirm password */}
                        <div className={`field-group${confirmError ? " field-group--error" : ""}`}>
                            <label className="field-label" htmlFor="confirmPassword">Confirm Password</label>
                            <div className="field-input-wrap">
                <span className="field-icon field-icon--left" aria-hidden="true">
                  <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                    <path
                        d="M10 2L3.5 5V10C3.5 13.5 6.4 16.7 10 18C13.6 16.7 16.5 13.5 16.5 10V5L10 2Z"
                        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" opacity=".6" />
                    <path d="M7 10L9 12L13 8" stroke="currentColor" strokeWidth="1.4"
                          strokeLinecap="round" strokeLinejoin="round" opacity=".6" />
                  </svg>
                </span>
                                <input
                                    id="confirmPassword"
                                    className="field-input"
                                    type={showCf ? "text" : "password"}
                                    placeholder="Re-enter your password"
                                    autoComplete="new-password"
                                    aria-required="true"
                                    aria-describedby="confirmError"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                />
                                <EyeToggle visible={showCf} onToggle={() => setShowCf((v) => !v)} />
                            </div>
                            <span className="field-error" id="confirmError"
                                  role="alert" aria-live="polite">
                {confirmError}
              </span>
                        </div>

                        {/* Requirements checklist */}
                        <ul className="req-list" aria-label="Password requirements" aria-live="polite">
                            <ReqItem met={hasLength}>At least 8 characters</ReqItem>
                            <ReqItem met={hasLetter}>Contains a letter</ReqItem>
                            <ReqItem met={hasNumber}>Contains a number</ReqItem>
                        </ul>

                        {/* Submit button */}
                        <button className="submit-btn" type="submit" disabled={isLoading || !emailValue}>
                            {isLoading ? (
                                <span className="btn-inner" aria-label="Activating account, please wait">
                  <span className="spinner" aria-hidden="true" />
                  Activating…
                </span>
                            ) : (
                                <span className="btn-inner">
                  <svg className="leaf-icon" viewBox="0 0 24 24" fill="none"
                       xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path
                        d="M12 2C6.5 2 2 6.5 2 12C2 14.4 2.9 16.6 4.4 18.3L2.3 20.4C2 20.7 2 21.2 2.3 21.5C2.6 21.8 3.1 21.8 3.4 21.5L5.5 19.4C7.2 20.9 9.5 21.8 12 21.8C17.5 21.8 22 17.3 22 11.8C22 6.5 17.5 2 12 2Z"
                        fill="currentColor" />
                    <path
                        d="M12 2C6.5 2 2 6.5 2 12C2 14.4 2.9 16.6 4.4 18.3C7.2 20.9 9.5 21.8 12 21.8C17.5 21.8 22 17.3 22 11.8C22 6.3 17.5 2 12 2Z"
                        fill="currentColor" opacity=".3" />
                  </svg>
                  Activate Account
                </span>
                            )}
                        </button>

                    </form>

                    {/* Footer */}
                    <p className="card-footer">
                        Already set password?&nbsp;
                        <a href="/login" className="footer-link">Sign in instead</a>
                    </p>

                </main>
            </div>
        </>
    );
}