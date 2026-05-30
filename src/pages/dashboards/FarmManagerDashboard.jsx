// ===== File: FarmManagerDashboard.jsx =====
//
// Farm-manager dashboard. Reflects ONLY data coming from the backend
// (REST + STOMP/SockJS WebSocket). Every panel renders loading or "—"
// placeholders until data arrives — there are no hardcoded sample
// rows, no fabricated counts, no synthesized analytics.

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useWebSocket }      from "../../services/useWebSocket.js";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock.js";
import { WS_TOPICS, WS_STATUS } from "../../config/websocket.js";

import {
    getFarmerStats,
    getFarmerFields,
    getFarmerSensors,
    getRecentIrrigations,
    getIrrigationHistory,
    getFarmerAlerts,
    getSoilSnapshot,
} from "../../services/farmer.js";

import MobileNavOverlay from "../../components/MobileNavOverlay.jsx";

import "../../styles/farmmanagerdashboard.css";
import "../../styles/_dashboard-patches.css";

// ── Inline SVGs ───────────────────────────────────────────────

const SproutIcon = ({ width = 36, height = 36 }) => (
    <svg viewBox="0 0 32 32" fill="none" width={width} height={height} aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#1a6b3c" />
        <path d="M16 24V14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 17C16 17 13 15 11 12C13.5 11 16 12.5 16 17Z" fill="#5bde8a" />
        <path d="M16 14C16 14 19 12 21 9C18.5 8 16 9.5 16 14Z" fill="#3ecf6e" />
    </svg>
);

const FieldIcon = ({ width = 16, height = 16 }) => (
    <svg viewBox="0 0 20 20" fill="none" width={width} height={height}>
        <path d="M2 16L6 8L10 12L14 6L18 10" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 18H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

// ── Animated counter ─────────────────────────────────────────
// Re-runs whenever the target value changes — counters now reflect
// live backend data instead of hardcoded constants.

function useAnimatedCount(target, suffix = "") {
    const hasTarget = target != null && !Number.isNaN(Number(target));
    const [display, setDisplay] = useState("—");

    useEffect(() => {
        if (!hasTarget) {
            // Schedule (don't synchronously set) the placeholder so we
            // don't trigger a cascading render inside the effect body.
            const id = requestAnimationFrame(() => setDisplay("—"));
            return () => cancelAnimationFrame(id);
        }
        const dur = 600;
        const start = performance.now();
        let raf;
        function tick(now) {
            const p   = Math.min((now - start) / dur, 1);
            const val = Math.round(p * Number(target));
            setDisplay(val.toLocaleString() + suffix);
            if (p < 1) raf = requestAnimationFrame(tick);
        }
        raf = requestAnimationFrame(tick);
        return () => raf && cancelAnimationFrame(raf);
    }, [hasTarget, target, suffix]);

    return display;
}

// Friendly WS status label
function wsBadgeLabel(status) {
    switch (status) {
        case WS_STATUS.CONNECTED:    return "Live Data";
        case WS_STATUS.CONNECTING:   return "Connecting…";
        case WS_STATUS.RECONNECTING: return "Reconnecting…";
        case WS_STATUS.DISCONNECTED: return "Disconnected";
        default:                     return "Idle";
    }
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function FarmManagerDashboard() {
    const navigate = useNavigate();

    // ── Layout ────────────────────────────────────────────────
    const [activeView,    setActiveView]    = useState("dashboard");
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    // ── Connection state ──────────────────────────────────────
    const [wsStatus, setWsStatus] = useState(WS_STATUS.IDLE);

    // ── Live data (initial: null/empty until REST hydrates) ───
    const [fields,             setFields]             = useState(null);   // null = loading
    const [sensors,            setSensors]            = useState(null);
    const [irrigationHistory,  setIrrigationHistory]  = useState(null);
    const [recentIrrigations,  setRecentIrrigations]  = useState(null);
    const [alerts,             setAlerts]             = useState(null);
    const [soil,               setSoil]               = useState(null);   // { moisture, temperature, temperaturePct, humidity, updatedAt }
    const [stats,              setStats]              = useState(null);   // optional aggregate

    // ── Irrigation filter ─────────────────────────────────────
    const [fieldFilter, setFieldFilter] = useState("all");

    // ── Body scroll lock for mobile drawer ────────────────────
    useBodyScrollLock(mobileNavOpen);

    // ── Header date (presentational only) ─────────────────────
    const headerDate = new Date().toLocaleDateString("en-GB", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    // ── Derived counts (computed from live state) ─────────────
    const activeFieldsCount = useMemo(() => {
        if (stats?.activeFields != null) return Number(stats.activeFields);
        if (!Array.isArray(fields))      return null;
        return fields.filter(f => String(f.status).toLowerCase() === "active").length;
    }, [stats, fields]);

    const onlineSensorsCount = useMemo(() => {
        if (stats?.onlineSensors != null) return Number(stats.onlineSensors);
        if (!Array.isArray(sensors))      return null;
        return sensors.filter(s => String(s.status).toLowerCase() === "online").length;
    }, [stats, sensors]);

    const irrigationsTodayCount = useMemo(() => {
        if (stats?.irrigationsToday != null) return Number(stats.irrigationsToday);
        if (!Array.isArray(irrigationHistory)) return null;
        return irrigationHistory.length;
    }, [stats, irrigationHistory]);

    const avgMoisture = useMemo(() => {
        if (stats?.avgMoisture != null) return Number(stats.avgMoisture);
        if (!Array.isArray(sensors))    return null;
        const moistures = sensors
            .filter(s => String(s.type).toLowerCase().includes("moisture")
                && String(s.status).toLowerCase() === "online")
            .map(s => parseInt(String(s.reading).replace(/[^\d.-]/g, ""), 10))
            .filter(n => !Number.isNaN(n));
        if (moistures.length === 0) return null;
        return Math.round(moistures.reduce((a, b) => a + b, 0) / moistures.length);
    }, [stats, sensors]);

    // Animated counters — reflect live values, "—" until data arrives.
    const fieldsDisplay   = useAnimatedCount(activeFieldsCount,    "");
    const sensorsDisplay  = useAnimatedCount(onlineSensorsCount,   "");
    const irrigDisplay    = useAnimatedCount(irrigationsTodayCount,"");
    const moistureDisplay = useAnimatedCount(avgMoisture,          "%");

    // Moisture ring + soil bars (CSS transitions)
    const ringDash = useMemo(() => {
        const circ = 100.53;
        if (avgMoisture == null) return "0 100.53";
        const filled = ((Math.max(0, Math.min(100, avgMoisture)) / 100) * circ).toFixed(1);
        return `${filled} ${(circ - filled).toFixed(1)}`;
    }, [avgMoisture]);

    const soilBars = useMemo(() => ({
        moisture: soil?.moisture       ?? 0,
        temp:     soil?.temperaturePct ?? 0,
        humidity: soil?.humidity       ?? 0,
    }), [soil]);

    // Unique field names for the filter dropdown — from live data.
    const fieldNamesUnique = useMemo(() => {
        if (!Array.isArray(irrigationHistory)) return [];
        const set = new Set(irrigationHistory.map(r => r.field).filter(Boolean));
        return Array.from(set).sort();
    }, [irrigationHistory]);

    // Alert counts (badge + summary pills)
    const alertCounts = useMemo(() => {
        const c = { low: 0, med: 0, high: 0 };
        if (!Array.isArray(alerts)) return c;
        for (const a of alerts) {
            const s = String(a.severity || "").toLowerCase();
            if (s === "low")    c.low++;
            else if (s === "medium" || s === "med") c.med++;
            else if (s === "high")  c.high++;
        }
        return c;
    }, [alerts]);
    const alertNavCount = alertCounts.high + alertCounts.med;

    // Irrigation rows filtered by the dropdown
    const irrigRows = useMemo(() => {
        if (!Array.isArray(irrigationHistory)) return null;
        if (fieldFilter === "all") return irrigationHistory;
        return irrigationHistory.filter(r => r.field === fieldFilter);
    }, [irrigationHistory, fieldFilter]);

    // ── WebSocket: scoped to farmer topics ────────────────────
    useWebSocket({
        onStatus: setWsStatus,
        subscriptions: {
            [WS_TOPICS.farmer.alerts]: (payload) => {
                if (Array.isArray(payload)) setAlerts(payload);
                else setAlerts((prev) => [payload, ...(Array.isArray(prev) ? prev : [])]);
            },
            [WS_TOPICS.farmer.sensors]: (payload) => {
                if (Array.isArray(payload)) setSensors(payload);
                else setSensors((prev) => {
                    // Replace-by-name if we know this sensor, otherwise prepend.
                    if (!Array.isArray(prev)) return [payload];
                    const idx = prev.findIndex(s => s.name === payload.name);
                    if (idx === -1) return [payload, ...prev];
                    const next = prev.slice();
                    next[idx] = { ...next[idx], ...payload };
                    return next;
                });
            },
            [WS_TOPICS.farmer.soilData]: (payload) => {
                if (!payload || typeof payload !== "object") return;
                setSoil((prev) => ({ ...(prev || {}), ...payload }));
            },
            [WS_TOPICS.farmer.irrigation]: (payload) => {
                if (Array.isArray(payload)) {
                    setRecentIrrigations(payload);
                } else {
                    setRecentIrrigations((prev) => {
                        const list = Array.isArray(prev) ? prev : [];
                        return [payload, ...list].slice(0, 50);
                    });
                }
            },
            [WS_TOPICS.farmer.fieldStatus]: (payload) => {
                if (Array.isArray(payload)) {
                    setFields(payload);
                } else if (payload?.id != null || payload?.name) {
                    setFields((prev) => {
                        if (!Array.isArray(prev)) return [payload];
                        const idx = prev.findIndex(f =>
                            (f.id != null && f.id === payload.id) || f.name === payload.name);
                        if (idx === -1) return [payload, ...prev];
                        const next = prev.slice();
                        next[idx] = { ...next[idx], ...payload };
                        return next;
                    });
                }
            },
        },
    });

    // ── Initial REST hydration ────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        Promise.allSettled([
            getFarmerStats(),
            getFarmerFields(),
            getFarmerSensors(),
            getRecentIrrigations(),
            getIrrigationHistory(),
            getFarmerAlerts(),
            getSoilSnapshot(),
        ]).then(([statsR, fieldsR, sensorsR, recentR, historyR, alertsR, soilR]) => {
            if (cancelled) return;

            setStats(statsR.status === "fulfilled" ? (statsR.value || null) : null);
            setFields(fieldsR.status === "fulfilled" && Array.isArray(fieldsR.value) ? fieldsR.value : []);
            setSensors(sensorsR.status === "fulfilled" && Array.isArray(sensorsR.value) ? sensorsR.value : []);
            setRecentIrrigations(recentR.status === "fulfilled" && Array.isArray(recentR.value) ? recentR.value : []);
            setIrrigationHistory(historyR.status === "fulfilled" && Array.isArray(historyR.value) ? historyR.value : []);
            setAlerts(alertsR.status === "fulfilled" && Array.isArray(alertsR.value) ? alertsR.value : []);
            setSoil(soilR.status === "fulfilled" ? (soilR.value || null) : null);
        });

        return () => { cancelled = true; };
    }, []);

    // ── Navigation ────────────────────────────────────────────

    const showView = (viewId) => {
        setActiveView(viewId);
        setMobileNavOpen(false);
    };

    const closeMobileNav = () => setMobileNavOpen(false);

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to log out?")) {
            localStorage.clear();
            navigate("/login-page");
        }
    };

    // Escape closes the drawer (defensive — overlay click handles the rest)
    useEffect(() => {
        function onKey(e) { if (e.key === "Escape") setMobileNavOpen(false); }
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    // ── Nav items ─────────────────────────────────────────────

    const NAV = [
        {
            id: "dashboard", label: "Dashboard",
            icon: (
                <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                    <rect x="2"  y="2"  width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="11" y="2"  width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="2"  y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                </svg>
            ),
        },
        {
            id: "fields", label: "Fields",
            icon: (
                <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                    <path d="M2 16L6 8L10 12L14 6L18 10" stroke="currentColor" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 18H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            ),
        },
        {
            id: "sensors", label: "Sensors",
            icon: (
                <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                    <path d="M5 10C5 7.239 7.239 5 10 5C12.761 5 15 7.239 15 10"
                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M2.5 12.5C2.5 7.253 5.929 3 10 3C14.071 3 17.5 7.253 17.5 12.5"
                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="10" cy="13" r="1.5" fill="currentColor" />
                </svg>
            ),
        },
        {
            id: "irrigation", label: "Irrigation",
            icon: (
                <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                    <path d="M10 3C10 3 4 9 4 13C4 16.314 6.686 19 10 19C13.314 19 16 16.314 16 13C16 9 10 3 10 3Z"
                          stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M7 14.5C7.5 15.5 8.5 16 10 16" stroke="currentColor" strokeWidth="1.4"
                          strokeLinecap="round" />
                </svg>
            ),
        },
        {
            id: "alerts", label: "Alerts", badge: alertNavCount > 0 ? alertNavCount : null,
            icon: (
                <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                    <path d="M10 2.5C7 2.5 5 4.7 5 7.5V13.5L3 15.5H17L15 13.5V7.5C15 4.7 13 2.5 10 2.5Z"
                          stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M8 15.5C8 16.605 8.895 17.5 10 17.5C11.105 17.5 12 16.605 12 15.5"
                          stroke="currentColor" strokeWidth="1.5" />
                </svg>
            ),
        },
    ];

    // Avatar initials from email
    const email   = localStorage.getItem("email") || "";
    const initials = (email || "FM").trim().slice(0, 2).toUpperCase();

    // Loading state helpers
    const isLoading = (v) => v === null || v === undefined;

    // ─────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────

    return (
        <>
            {/* ── Mobile Topbar ── */}
            <header className="topbar" role="banner">
                <div className="topbar-left">
                    <button
                        className="hamburger"
                        id="hamburger"
                        aria-label="Toggle navigation"
                        aria-expanded={mobileNavOpen}
                        aria-controls="sidebar"
                        onClick={() => setMobileNavOpen(v => !v)}
                    >
                        <span /><span /><span />
                    </button>
                    <div className="topbar-brand">
                        <SproutIcon width={24} height={24} />
                        <span>Smart Farming</span>
                    </div>
                </div>
                <div className="topbar-actions">
                    <div className="topbar-user-pill">
                        <span className="user-avatar-sm" aria-hidden="true">{initials}</span>
                        <span className="user-name-sm">Farm Manager</span>
                    </div>
                </div>
            </header>

            {/* Mobile overlay — restored. */}
            <MobileNavOverlay open={mobileNavOpen} onClose={closeMobileNav} />

            {/* ── Sidebar ── */}
            <aside
                className={`sidebar${mobileNavOpen ? " sidebar--open" : ""}`}
                id="sidebar"
                role="navigation"
                aria-label="Main navigation"
            >
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">
                        <SproutIcon />
                    </div>
                    <div className="sidebar-logo-text">
                        <span className="sidebar-brand">Smart Farming</span>
                        <span className="sidebar-sub">System</span>
                    </div>
                </div>

                <div className="sidebar-divider" />

                <div className="sidebar-user-pill">
                    <span className="user-avatar" aria-hidden="true">{initials}</span>
                    <div className="user-info">
                        <span className="user-name">{email || "Farm Manager"}</span>
                        <span className="user-role">Field Operations</span>
                    </div>
                    <span className="user-online-dot" aria-label="Online" />
                </div>

                <div className="sidebar-divider" />

                <nav className="sidebar-nav" aria-label="Dashboard sections">
                    {NAV.map(({ id, label, icon, badge }) => (
                        <button
                            key={id}
                            className={`nav-item${activeView === id ? " nav-item--active" : ""}`}
                            data-view={id}
                            aria-current={activeView === id ? "page" : "false"}
                            onClick={() => showView(id)}
                        >
                            <span className="nav-icon" aria-hidden="true">{icon}</span>
                            <span className="nav-label">{label}</span>
                            {badge != null
                                ? <span className={`nav-badge${badge > 0 ? " visible" : ""}`}
                                        aria-label={`${badge} active alerts`}>{badge}</span>
                                : <span className="nav-bar" aria-hidden="true" />
                            }
                        </button>
                    ))}
                </nav>

                <div className="sidebar-spacer" />

                <div className="sidebar-sys-status">
                    <span className="sys-online-dot" />
                    <span className="sys-status-text">
                        {wsStatus === WS_STATUS.CONNECTED ? "Systems Nominal" : wsBadgeLabel(wsStatus)}
                    </span>
                </div>

                <div className="sidebar-logout-wrap">
                    <button className="nav-item nav-item--logout" aria-label="Logout"
                            onClick={handleLogout}>
            <span className="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                <path d="M8 5H4.5A1.5 1.5 0 003 6.5v8A1.5 1.5 0 004.5 16H8"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M13 13L17 10M17 10L13 7M17 10H7"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
                        <span className="nav-label">Logout</span>
                    </button>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className="main" id="mainContent" role="main">

                <div className="page-bg" aria-hidden="true">
                    <div className="bg-orb bg-orb--1" />
                    <div className="bg-orb bg-orb--2" />
                    <div className="bg-orb bg-orb--3" />
                    <div className="bg-grid" />
                </div>

                {/* ════════════════════════════════════════════
            VIEW 1: DASHBOARD
        ════════════════════════════════════════════ */}
                <section className={`view${activeView !== "dashboard" ? " view--hidden" : ""}`}
                         id="view-dashboard" aria-labelledby="dashTitle">

                    <div className="view-header">
                        <div className="view-header-left">
                            <h1 className="view-title" id="dashTitle">Dashboard</h1>
                            <p className="view-sub">Welcome back — here's your farm overview for today</p>
                        </div>
                        <div className="view-header-right">
              <span className="live-chip">
                <span className="live-dot" aria-hidden="true" />
                  {wsBadgeLabel(wsStatus)}
              </span>
                            <span className="date-chip">{headerDate}</span>
                        </div>
                    </div>

                    {/* Summary cards */}
                    <div className="summary-grid" role="list" aria-label="Key metrics">

                        <article className="scard" role="listitem">
                            <div className="scard-icon-wrap scard-icon--fields" aria-hidden="true">
                                <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
                                    <path d="M2 18L6 9L11 14L16 7L20 11" stroke="currentColor" strokeWidth="1.6"
                                          strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M2 20H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                </svg>
                            </div>
                            <div className="scard-content">
                                <span className="scard-value">{fieldsDisplay}</span>
                                <span className="scard-label">My Fields</span>
                            </div>
                            <div className="scard-glyph" aria-hidden="true">FIELDS</div>
                        </article>

                        <article className="scard" role="listitem">
                            <div className="scard-icon-wrap scard-icon--sensors" aria-hidden="true">
                                <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
                                    <path d="M5.5 11C5.5 7.962 8.134 5.5 11 5.5C13.866 5.5 16.5 7.962 16.5 11"
                                          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                    <path d="M2.5 13.5C2.5 7.701 6.477 3 11 3C15.523 3 19.5 7.701 19.5 13.5"
                                          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                    <circle cx="11" cy="14" r="1.8" fill="currentColor" />
                                </svg>
                            </div>
                            <div className="scard-content">
                                <span className="scard-value">{sensorsDisplay}</span>
                                <span className="scard-label">Active Sensors</span>
                            </div>
                            <div className="scard-glyph" aria-hidden="true">ONLINE</div>
                        </article>

                        <article className="scard" role="listitem">
                            <div className="scard-icon-wrap scard-icon--irrig" aria-hidden="true">
                                <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
                                    <path d="M11 3C11 3 4.5 10 4.5 14C4.5 17.59 7.41 20.5 11 20.5C14.59 20.5 17.5 17.59 17.5 14C17.5 10 11 3 11 3Z"
                                          stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                                    <path d="M7.5 16C8.2 17.2 9.4 17.8 11 17.8" stroke="currentColor" strokeWidth="1.4"
                                          strokeLinecap="round" />
                                </svg>
                            </div>
                            <div className="scard-content">
                                <span className="scard-value">{irrigDisplay}</span>
                                <span className="scard-label">Irrigations Today</span>
                            </div>
                            <div className="scard-glyph" aria-hidden="true">TODAY</div>
                        </article>

                        <article className="scard scard--moisture" role="listitem">
                            <div className="scard-icon-wrap scard-icon--moisture" aria-hidden="true">
                                <svg viewBox="0 0 22 22" fill="none" width="22" height="22">
                                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.6" />
                                    <path d="M6 14C6.8 15.4 8.4 16.5 11 16.5C13.6 16.5 15.2 15.4 16 14"
                                          stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                    <path d="M8 10.5C8 9.119 9.119 8 10.5 8C11.881 8 13 9.119 13 10.5"
                                          stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                </svg>
                            </div>
                            <div className="scard-content">
                                <span className="scard-value">{moistureDisplay}</span>
                                <span className="scard-label">Avg Soil Moisture</span>
                            </div>
                            <svg className="moisture-ring" viewBox="0 0 40 40" aria-hidden="true">
                                <circle className="ring-track" cx="20" cy="20" r="16" fill="none" strokeWidth="3.5" />
                                <circle className="ring-fill" cx="20" cy="20" r="16" fill="none"
                                        strokeWidth="3.5"
                                        strokeDasharray={ringDash}
                                        strokeDashoffset="25"
                                        strokeLinecap="round" />
                            </svg>
                        </article>

                    </div>

                    {/* Two-column panels */}
                    <div className="two-col-grid">

                        {/* Soil Data Snapshot */}
                        <div className="panel" aria-labelledby="soilSnapTitle">
                            <div className="panel-header">
                                <h2 className="panel-title" id="soilSnapTitle">Soil Data Snapshot</h2>
                                <span className="panel-badge">
                  <span className="pulse-dot" aria-hidden="true" />
                  Real-time
                </span>
                            </div>
                            <div className="soil-grid">

                                <div className="soil-metric">
                                    <div className="soil-metric-icon" aria-hidden="true">
                                        <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                                            <path d="M10 3C10 3 4 9.5 4 13C4 16.314 6.686 19 10 19C13.314 19 16 16.314 16 13C16 9.5 10 3 10 3Z"
                                                  fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="1.4"
                                                  strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <div className="soil-metric-data">
                                        <span className="soil-metric-value">
                                            {soil?.moisture != null ? `${soil.moisture}%` : "—"}
                                        </span>
                                        <span className="soil-metric-label">Soil Moisture</span>
                                        <div className="soil-metric-bar-wrap">
                                            <div className="soil-metric-bar"
                                                 style={{ width: `${soilBars.moisture}%` }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="soil-metric">
                                    <div className="soil-metric-icon soil-metric-icon--temp" aria-hidden="true">
                                        <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                                            <path d="M10 3V12.5M10 12.5C8.343 12.5 7 13.843 7 15.5C7 17.157 8.343 18.5 10 18.5C11.657 18.5 13 17.157 13 15.5C13 13.843 11.657 12.5 10 12.5Z"
                                                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                            <path d="M12.5 4.5H10M12.5 7H10" stroke="currentColor" strokeWidth="1.3"
                                                  strokeLinecap="round" />
                                        </svg>
                                    </div>
                                    <div className="soil-metric-data">
                                        <span className="soil-metric-value">
                                            {soil?.temperature ?? "—"}
                                        </span>
                                        <span className="soil-metric-label">Soil Temperature</span>
                                        <div className="soil-metric-bar-wrap">
                                            <div className="soil-metric-bar soil-metric-bar--temp"
                                                 style={{ width: `${soilBars.temp}%` }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="soil-metric">
                                    <div className="soil-metric-icon soil-metric-icon--hum" aria-hidden="true">
                                        <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                                            <path d="M3 10.5C3 7.467 5.467 5 8.5 5H11.5C14.533 5 17 7.467 17 10.5C17 13.533 14.533 16 11.5 16H8.5C5.467 16 3 13.533 3 10.5Z"
                                                  stroke="currentColor" strokeWidth="1.5" />
                                            <path d="M7 10.5H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                            <path d="M8.5 8L11.5 13" stroke="currentColor" strokeWidth="1.4"
                                                  strokeLinecap="round" />
                                        </svg>
                                    </div>
                                    <div className="soil-metric-data">
                                        <span className="soil-metric-value">
                                            {soil?.humidity != null ? `${soil.humidity}%` : "—"}
                                        </span>
                                        <span className="soil-metric-label">Humidity</span>
                                        <div className="soil-metric-bar-wrap">
                                            <div className="soil-metric-bar soil-metric-bar--hum"
                                                 style={{ width: `${soilBars.humidity}%` }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="soil-metric soil-metric--updated">
                                    <div className="soil-metric-icon soil-metric-icon--time" aria-hidden="true">
                                        <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                                            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
                                            <path d="M10 6.5V10.5L12.5 12" stroke="currentColor" strokeWidth="1.5"
                                                  strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <div className="soil-metric-data">
                                        <span className="soil-metric-value soil-metric-value--sm">
                                            {soil?.updatedAt ?? "—"}
                                        </span>
                                        <span className="soil-metric-label">Last Updated</span>
                                    </div>
                                    {wsStatus !== WS_STATUS.CONNECTED && (
                                        <div className="ws-spinner" title={wsBadgeLabel(wsStatus)}
                                             aria-label={wsBadgeLabel(wsStatus)} />
                                    )}
                                </div>

                            </div>
                        </div>

                        {/* Field Status mini list */}
                        <div className="panel" aria-labelledby="fieldStatusTitle">
                            <div className="panel-header">
                                <h2 className="panel-title" id="fieldStatusTitle">Field Status</h2>
                                <button className="panel-link" onClick={() => showView("fields")}>
                                    View All
                                </button>
                            </div>
                            <ul className="field-status-list" aria-label="Field status summary">
                                {isLoading(fields)
                                    ? <li className="fsl-item"><span className="cell-muted">Loading…</span></li>
                                    : fields.length === 0
                                        ? <li className="fsl-item"><span className="cell-muted">No fields registered yet.</span></li>
                                        : fields.slice(0, 6).map((field) => {
                                            const isActive = String(field.status).toLowerCase() === "active";
                                            return (
                                                <li key={field.id ?? field.name} className="fsl-item">
                                                    <div className={`fsl-icon${isActive ? "" : " fsl-icon--placeholder"}`}
                                                         aria-hidden="true">
                                                        <FieldIcon />
                                                    </div>
                                                    <div className="fsl-info">
                                                        <span className="fsl-name">{field.name ?? "—"}</span>
                                                        <span className="fsl-loc">
                                                            {field.location ?? "—"}
                                                            {field.size ? ` · ${field.size}` : ""}
                                                        </span>
                                                    </div>
                                                    <div className="fsl-status">
                                                        <span className={`badge ${isActive ? "badge--active" : "badge--inactive"}`}>
                                                            <span className="bdot" />
                                                            {isActive ? "Active" : "Inactive"}
                                                        </span>
                                                    </div>
                                                </li>
                                            );
                                        })
                                }
                            </ul>
                        </div>

                    </div>

                    {/* Recent Irrigation Activity */}
                    <div className="panel" aria-labelledby="recentIrrigTitle">
                        <div className="panel-header">
                            <div>
                                <h2 className="panel-title" id="recentIrrigTitle">Recent Irrigation Activity</h2>
                                <p className="panel-sub">Latest automated and manual irrigation events</p>
                            </div>
                            <button className="panel-link" onClick={() => showView("irrigation")}>
                                View All
                            </button>
                        </div>
                        <div className="table-scroll" role="region" aria-label="Recent irrigation table" tabIndex={0}>
                            <table className="data-table">
                                <thead>
                                <tr>
                                    <th scope="col">Time</th>
                                    <th scope="col">Field Name</th>
                                    <th scope="col">Action</th>
                                    <th scope="col">Trigger Type</th>
                                    <th scope="col">Status</th>
                                </tr>
                                </thead>
                                <tbody>
                                {isLoading(recentIrrigations)
                                    ? <tr><td colSpan={5} className="table-empty">Loading…</td></tr>
                                    : recentIrrigations.length === 0
                                        ? <tr><td colSpan={5} className="table-empty">No recent irrigation events.</td></tr>
                                        : recentIrrigations.map((row, i) => {
                                            const action  = row.action  ?? "—";
                                            const trigger = row.trigger ?? "—";
                                            const status  = row.status  ?? "—";
                                            return (
                                                <tr key={i}>
                                                    <td><span className="cell-mono">{row.time ?? "—"}</span></td>
                                                    <td><span className="cell-bold">{row.field ?? "—"}</span></td>
                                                    <td>
                            <span className={`badge ${action === "START" ? "badge--start" : "badge--stop"}`}>
                              <span className="bdot" />{action}
                            </span>
                                                    </td>
                                                    <td>
                            <span className={`trigger trigger--${String(trigger).toLowerCase()}`}>
                              {trigger}
                            </span>
                                                    </td>
                                                    <td>
                            <span className={`badge ${status === "SUCCESS" ? "badge--success" : "badge--failed"}`}>
                              <span className="bdot" />{status}
                            </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                }
                                </tbody>
                            </table>
                        </div>
                    </div>

                </section>

                {/* ════════════════════════════════════════════
            VIEW 2: FIELDS  (now a TABLE, not cards)
        ════════════════════════════════════════════ */}
                <section className={`view${activeView !== "fields" ? " view--hidden" : ""}`}
                         id="view-fields" aria-labelledby="fieldsTitle">

                    <div className="view-header">
                        <div className="view-header-left">
                            <h1 className="view-title" id="fieldsTitle">Fields</h1>
                            <p className="view-sub">Your registered farm zones and parcels</p>
                        </div>
                        <div className="view-header-right">
                            <span className="count-chip" aria-live="polite">
                                {isLoading(fields) ? "—" : `${fields.length} field${fields.length === 1 ? "" : "s"}`}
                            </span>
                        </div>
                    </div>

                    <div className="panel">
                        <div className="table-scroll" role="region" aria-label="Fields table" tabIndex={0}>
                            <table className="data-table">
                                <thead>
                                <tr>
                                    <th scope="col">Name</th>
                                    <th scope="col">Location</th>
                                    <th scope="col">Size</th>
                                    <th scope="col">Sensors</th>
                                    <th scope="col">Status</th>
                                </tr>
                                </thead>
                                <tbody>
                                {isLoading(fields)
                                    ? <tr><td colSpan={5} className="table-empty">Loading…</td></tr>
                                    : fields.length === 0
                                        ? <tr><td colSpan={5} className="table-empty">No fields registered yet.</td></tr>
                                        : fields.map((field) => {
                                            const isActive = String(field.status).toLowerCase() === "active";
                                            const sensorCount = Array.isArray(sensors)
                                                ? sensors.filter(s => s.field === field.name).length
                                                : 0;
                                            return (
                                                <tr key={field.id ?? field.name}>
                                                    <td><span className="cell-bold">{field.name ?? "—"}</span></td>
                                                    <td>{field.location ?? "—"}</td>
                                                    <td><span className="cell-muted">{field.size ?? "—"}</span></td>
                                                    <td><span className="cell-mono">{sensorCount}</span></td>
                                                    <td>
                                                        <span className={`badge ${isActive ? "badge--active" : "badge--inactive"}`}>
                                                            <span className="bdot" />
                                                            {isActive ? "Active" : "Inactive"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                }
                                </tbody>
                            </table>
                        </div>
                    </div>

                </section>

                {/* ════════════════════════════════════════════
            VIEW 3: SENSORS
        ════════════════════════════════════════════ */}
                <section className={`view${activeView !== "sensors" ? " view--hidden" : ""}`}
                         id="view-sensors" aria-labelledby="sensorsTitle">

                    <div className="view-header">
                        <div className="view-header-left">
                            <h1 className="view-title" id="sensorsTitle">Sensors</h1>
                            <p className="view-sub">Network sensor status and last readings</p>
                        </div>
                        <div className="view-header-right">
                            <div className="legend-row">
                <span className="legend-item">
                  <span className="legend-dot legend-dot--online" />Online
                </span>
                                <span className="legend-item">
                  <span className="legend-dot legend-dot--offline" />Offline
                </span>
                            </div>
                        </div>
                    </div>

                    <div className="panel">
                        <div className="sensor-summary-bar">
                            <div className="ssb-item">
                                <span className="ssb-val">
                                    {Array.isArray(sensors)
                                        ? sensors.filter(s => String(s.status).toLowerCase() === "online").length
                                        : "—"}
                                </span>
                                <span className="ssb-label">Online</span>
                            </div>
                            <div className="ssb-divider" />
                            <div className="ssb-item">
                                <span className="ssb-val ssb-val--off">
                                    {Array.isArray(sensors)
                                        ? sensors.filter(s => String(s.status).toLowerCase() === "offline").length
                                        : "—"}
                                </span>
                                <span className="ssb-label">Offline</span>
                            </div>
                            <div className="ssb-divider" />
                            <div className="ssb-item">
                                <span className="ssb-val">{Array.isArray(sensors) ? sensors.length : "—"}</span>
                                <span className="ssb-label">Total</span>
                            </div>
                            {wsStatus !== WS_STATUS.CONNECTED && (
                                <div className="ws-spinner ws-spinner--sm" style={{ marginLeft: "auto" }}
                                     title={wsBadgeLabel(wsStatus)} aria-label={wsBadgeLabel(wsStatus)} />
                            )}
                        </div>
                        <div className="table-scroll" role="region" aria-label="Sensors table" tabIndex={0}>
                            <table className="data-table">
                                <thead>
                                <tr>
                                    <th scope="col">Sensor Name</th>
                                    <th scope="col">Field</th>
                                    <th scope="col">Type</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Last Reading</th>
                                    <th scope="col">Last Updated</th>
                                </tr>
                                </thead>
                                <tbody>
                                {isLoading(sensors)
                                    ? <tr><td colSpan={6} className="table-empty">Loading…</td></tr>
                                    : sensors.length === 0
                                        ? <tr><td colSpan={6} className="table-empty">No sensors registered yet.</td></tr>
                                        : sensors.map((sensor) => {
                                            const isOnline = String(sensor.status).toLowerCase() === "online";
                                            return (
                                                <tr key={sensor.name}>
                                                    <td><span className="cell-bold">{sensor.name ?? "—"}</span></td>
                                                    <td>{sensor.field ?? "—"}</td>
                                                    <td><span className="cell-muted">{sensor.type ?? "—"}</span></td>
                                                    <td>
                                                        <span className={`badge ${isOnline ? "badge--online" : "badge--offline"}`}>
                                                            <span className="bdot" />{sensor.status ?? "—"}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {isOnline
                                                            ? <span className="cell-bold">{sensor.reading ?? "—"}</span>
                                                            : <span className="cell-muted">—</span>
                                                        }
                                                    </td>
                                                    <td><span className="cell-mono">{sensor.updated ?? "—"}</span></td>
                                                </tr>
                                            );
                                        })
                                }
                                </tbody>
                            </table>
                        </div>
                    </div>

                </section>

                {/* ════════════════════════════════════════════
            VIEW 4: IRRIGATION
        ════════════════════════════════════════════ */}
                <section className={`view${activeView !== "irrigation" ? " view--hidden" : ""}`}
                         id="view-irrigation" aria-labelledby="irrigTitle">

                    <div className="view-header">
                        <div className="view-header-left">
                            <h1 className="view-title" id="irrigTitle">Irrigation</h1>
                            <p className="view-sub">Full irrigation history and session logs</p>
                        </div>
                        <div className="view-header-right">
                            <div className="filter-wrap">
                                <label htmlFor="fieldFilter" className="filter-label">Filter by Field</label>
                                <div className="select-wrap">
                                    <select id="fieldFilter" className="filter-select"
                                            aria-label="Filter irrigation by field"
                                            value={fieldFilter}
                                            onChange={e => setFieldFilter(e.target.value)}>
                                        <option value="all">All Fields</option>
                                        {fieldNamesUnique.map(name => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                    </select>
                                    <svg className="select-caret" viewBox="0 0 12 12" fill="none"
                                         width="11" height="11" aria-hidden="true">
                                        <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5"
                                              strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="panel">
                        <div className="table-scroll" role="region" aria-label="Irrigation history table"
                             tabIndex={0}>
                            <table className="data-table">
                                <thead>
                                <tr>
                                    <th scope="col">Field</th>
                                    <th scope="col">Mode</th>
                                    <th scope="col">Start Time</th>
                                    <th scope="col">End Time</th>
                                    <th scope="col">Duration</th>
                                    <th scope="col">Feedback</th>
                                </tr>
                                </thead>
                                <tbody>
                                {isLoading(irrigRows)
                                    ? <tr><td colSpan={6} className="table-empty">Loading…</td></tr>
                                    : irrigRows.length === 0
                                        ? <tr><td colSpan={6} className="table-empty">
                                            No irrigation sessions match this filter.
                                        </td></tr>
                                        : irrigRows.map((row, i) => {
                                            const fb = row.feedback ?? "—";
                                            const fbClass = { SUCCESS: "fb--success", FAILED: "fb--failed", CANCELED: "fb--canceled" }[fb] || "fb--success";
                                            const mode = String(row.mode ?? "—");
                                            return (
                                                <tr key={i}>
                                                    <td><span className="cell-bold">{row.field ?? "—"}</span></td>
                                                    <td><span className={`mode mode--${mode.toLowerCase()}`}>{mode}</span></td>
                                                    <td><span className="cell-mono">{row.start ?? "—"}</span></td>
                                                    <td><span className="cell-mono">{row.end ?? "—"}</span></td>
                                                    <td><span className="cell-muted">{row.duration ?? "—"}</span></td>
                                                    <td><span className={`fb ${fbClass}`}>{fb}</span></td>
                                                </tr>
                                            );
                                        })
                                }
                                </tbody>
                            </table>
                        </div>
                    </div>

                </section>

                {/* ════════════════════════════════════════════
            VIEW 5: ALERTS
        ════════════════════════════════════════════ */}
                <section className={`view${activeView !== "alerts" ? " view--hidden" : ""}`}
                         id="view-alerts" aria-labelledby="alertsTitle">

                    <div className="view-header">
                        <div className="view-header-left">
                            <h1 className="view-title" id="alertsTitle">Alerts</h1>
                            <p className="view-sub">System alerts and threshold notifications</p>
                        </div>
                        <div className="view-header-right">
              <span className="live-chip live-chip--alert">
                <span className="live-dot live-dot--alert" aria-hidden="true" />
                Monitoring
              </span>
                        </div>
                    </div>

                    <div className="alert-summary-row" role="list" aria-label="Alert counts by severity">
                        <div className="alert-sev-pill alert-sev-pill--low" role="listitem">
                            <span className="alert-sev-count">{alertCounts.low}</span>
                            <span className="alert-sev-label">Low</span>
                        </div>
                        <div className="alert-sev-pill alert-sev-pill--med" role="listitem">
                            <span className="alert-sev-count">{alertCounts.med}</span>
                            <span className="alert-sev-label">Medium</span>
                        </div>
                        <div className="alert-sev-pill alert-sev-pill--high" role="listitem">
                            <span className="alert-sev-count">{alertCounts.high}</span>
                            <span className="alert-sev-label">High</span>
                        </div>
                    </div>

                    <div className="panel">
                        <div className="ws-bar" aria-live="polite">
                            <div className="ws-spinner ws-spinner--sm" aria-hidden="true" />
                            <span className="ws-bar-text">
                                {wsStatus === WS_STATUS.CONNECTED
                                    ? "Connected — receiving real-time alerts."
                                    : `${wsBadgeLabel(wsStatus)} — polling for new alerts.`}
                            </span>
                        </div>
                        <div className="table-scroll" role="region" aria-label="Alerts table" tabIndex={0}>
                            <table className="data-table">
                                <thead>
                                <tr>
                                    <th scope="col">Time</th>
                                    <th scope="col">Field</th>
                                    <th scope="col">Message</th>
                                    <th scope="col">Severity</th>
                                </tr>
                                </thead>
                                <tbody>
                                {isLoading(alerts)
                                    ? <tr><td colSpan={4} className="table-empty">Loading…</td></tr>
                                    : alerts.length === 0
                                        ? <tr><td colSpan={4} className="table-empty">No active alerts.</td></tr>
                                        : alerts.map((alert, i) => {
                                            const sev = String(alert.severity ?? "—");
                                            const sevClass = { Low: "sev--low", Medium: "sev--med", High: "sev--high" }[sev] || "sev--low";
                                            return (
                                                <tr key={i}>
                                                    <td><span className="cell-mono">{alert.time ?? "—"}</span></td>
                                                    <td><span className="cell-bold">{alert.field ?? "—"}</span></td>
                                                    <td>{alert.message ?? "—"}</td>
                                                    <td><span className={`sev ${sevClass}`}>{sev}</span></td>
                                                </tr>
                                            );
                                        })
                                }
                                </tbody>
                            </table>
                        </div>
                    </div>

                </section>

            </main>
        </>
    );
}
