// ===== File: FarmManagerDashboard.jsx =====

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "../../services/useWebSocket.js";
import "../../styles/farmmanagerdashboard.css";

// ── Static mock data (replace with API calls when backend is ready) ──

const FIELDS = [
    { id: 1, name: "Sunrise Block A",  location: "Eastern Region",  size: "4.2 ha",  status: "Active"   },
    { id: 2, name: "Sunrise Block B",  location: "Eastern Region",  size: "3.8 ha",  status: "Active"   },
    { id: 3, name: "Northgate Zone 1", location: "Northern Region", size: "6.0 ha",  status: "Active"   },
    { id: 4, name: "Northgate Zone 2", location: "Northern Region", size: "5.5 ha",  status: "Inactive" },
    { id: 5, name: "Delta Farm A",     location: "Volta Region",    size: "8.3 ha",  status: "Active"   },
    { id: 6, name: "Delta Farm B",     location: "Volta Region",    size: "7.9 ha",  status: "Active"   },
    { id: 7, name: "Riverview Zone 1", location: "Western Region",  size: "3.0 ha",  status: "Active"   },
    { id: 8, name: "Greenacre Plot",   location: "Ashanti Region",  size: "10.5 ha", status: "Inactive" },
];

const SENSORS = [
    { name: "SM-101", field: "Sunrise Block A",  type: "Soil Moisture",    status: "Online",  reading: "72%",     updated: "2 min ago"  },
    { name: "ST-102", field: "Sunrise Block A",  type: "Soil Temperature", status: "Online",  reading: "23.4°C",  updated: "2 min ago"  },
    { name: "HM-103", field: "Sunrise Block B",  type: "Humidity",         status: "Online",  reading: "65%",     updated: "3 min ago"  },
    { name: "SM-201", field: "Northgate Zone 1", type: "Soil Moisture",    status: "Online",  reading: "58%",     updated: "4 min ago"  },
    { name: "ST-202", field: "Northgate Zone 1", type: "Soil Temperature", status: "Offline", reading: "—",       updated: "18 min ago" },
    { name: "SM-301", field: "Delta Farm A",     type: "Soil Moisture",    status: "Online",  reading: "81%",     updated: "1 min ago"  },
    { name: "FL-302", field: "Delta Farm A",     type: "Flow Rate",        status: "Online",  reading: "3.2 L/s", updated: "1 min ago"  },
    { name: "SM-401", field: "Delta Farm B",     type: "Soil Moisture",    status: "Online",  reading: "44%",     updated: "6 min ago"  },
    { name: "HM-402", field: "Delta Farm B",     type: "Humidity",         status: "Offline", reading: "—",       updated: "42 min ago" },
    { name: "SM-501", field: "Riverview Zone 1", type: "Soil Moisture",    status: "Online",  reading: "67%",     updated: "5 min ago"  },
    { name: "ST-601", field: "Greenacre Plot",   type: "Soil Temperature", status: "Online",  reading: "26.1°C",  updated: "3 min ago"  },
    { name: "SM-701", field: "Northgate Zone 2", type: "Soil Moisture",    status: "Offline", reading: "—",       updated: "2 hrs ago"  },
];

const IRRIGATION_LOGS = [
    { field: "Sunrise Block A",  mode: "AUTO",   start: "09:42 AM", end: "10:10 AM", duration: "28 min", feedback: "SUCCESS"  },
    { field: "Delta Farm A",     mode: "MANUAL", start: "09:05 AM", end: "09:45 AM", duration: "40 min", feedback: "SUCCESS"  },
    { field: "Northgate Zone 1", mode: "AUTO",   start: "08:30 AM", end: "09:00 AM", duration: "30 min", feedback: "SUCCESS"  },
    { field: "Delta Farm B",     mode: "AUTO",   start: "08:00 AM", end: "08:22 AM", duration: "22 min", feedback: "CANCELED" },
    { field: "Riverview Zone 1", mode: "MANUAL", start: "07:15 AM", end: "07:55 AM", duration: "40 min", feedback: "SUCCESS"  },
    { field: "Sunrise Block B",  mode: "AUTO",   start: "07:00 AM", end: "07:12 AM", duration: "12 min", feedback: "FAILED"   },
    { field: "Greenacre Plot",   mode: "MANUAL", start: "06:30 AM", end: "07:05 AM", duration: "35 min", feedback: "SUCCESS"  },
    { field: "Northgate Zone 1", mode: "AUTO",   start: "06:00 AM", end: "06:28 AM", duration: "28 min", feedback: "SUCCESS"  },
    { field: "Delta Farm A",     mode: "AUTO",   start: "05:30 AM", end: "06:05 AM", duration: "35 min", feedback: "SUCCESS"  },
    { field: "Sunrise Block A",  mode: "AUTO",   start: "05:00 AM", end: "05:18 AM", duration: "18 min", feedback: "FAILED"   },
];

const RECENT_IRRIGATIONS = [
    { time: "09:42 AM", field: "Sunrise Block A",  action: "START", trigger: "AUTO",   status: "SUCCESS" },
    { time: "09:05 AM", field: "Delta Farm A",     action: "START", trigger: "MANUAL", status: "SUCCESS" },
    { time: "08:30 AM", field: "Northgate Zone 1", action: "START", trigger: "AUTO",   status: "SUCCESS" },
    { time: "08:22 AM", field: "Delta Farm B",     action: "STOP",  trigger: "AUTO",   status: "SUCCESS" },
    { time: "08:00 AM", field: "Riverview Zone 1", action: "START", trigger: "MANUAL", status: "SUCCESS" },
    { time: "07:55 AM", field: "Sunrise Block B",  action: "STOP",  trigger: "HYBRID", status: "FAILED"  },
];

const INITIAL_ALERTS = [
    { time: "09:50 AM", field: "Delta Farm B",     message: "Soil moisture below 40% — irrigation recommended",     severity: "High"   },
    { time: "09:38 AM", field: "Northgate Zone 2", message: "Sensor ST-202 has gone offline",                      severity: "Medium" },
    { time: "09:22 AM", field: "All Zones",        message: "Daily water usage at 68% of allocated limit",         severity: "Low"    },
    { time: "08:45 AM", field: "Sunrise Block A",  message: "Scheduled irrigation completed successfully",          severity: "Low"    },
    { time: "07:55 AM", field: "Sunrise Block B",  message: "Irrigation failed — check valve connection",          severity: "High"   },
    { time: "07:40 AM", field: "Delta Farm A",     message: "Soil temperature spike detected (28°C threshold)",    severity: "Medium" },
    { time: "07:15 AM", field: "Northgate Zone 2", message: "Sensor HM-402 unresponsive for over 30 minutes",     severity: "High"   },
    { time: "06:58 AM", field: "Riverview Zone 1", message: "Humidity reading above normal range (78%)",           severity: "Low"    },
    { time: "06:30 AM", field: "Greenacre Plot",   message: "Flow rate drop detected during irrigation session",   severity: "Medium" },
];

const SOIL_SNAPSHOT = {
    moisture: 72, temperature: "23.4°C", temperaturePct: 47,
    humidity: 65, updatedAt: "09:52 AM",
};

// ── Derived stats ─────────────────────────────────────────────

const ACTIVE_FIELDS  = FIELDS.filter(f => f.status === "Active").length;
const ONLINE_SENSORS = SENSORS.filter(s => s.status === "Online").length;
const AVG_MOISTURE   = Math.round(
    SENSORS.filter(s => s.type === "Soil Moisture" && s.status === "Online")
        .reduce((sum, s) => sum + parseInt(s.reading), 0) /
    SENSORS.filter(s => s.type === "Soil Moisture" && s.status === "Online").length
);
const FIELD_NAMES_UNIQUE = [...new Set(IRRIGATION_LOGS.map(r => r.field))].sort();

// ── Animated counter hook ─────────────────────────────────────

function useAnimatedCount(target, suffix = "", delay = 0) {
    const [display, setDisplay] = useState("—");
    useEffect(() => {
        const tid = setTimeout(() => {
            const dur = 600;
            const t0  = performance.now();
            function tick(now) {
                const p   = Math.min((now - t0) / dur, 1);
                const val = Math.round(p * target);
                setDisplay(val.toLocaleString() + suffix);
                if (p < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
        }, delay);
        return () => clearTimeout(tid);
    }, [target, suffix, delay]);
    return display;
}

// ── Sprout SVG ────────────────────────────────────────────────

const SproutIcon = ({ width = 36, height = 36 }) => (
    <svg viewBox="0 0 32 32" fill="none" width={width} height={height} aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#1a6b3c" />
        <path d="M16 24V14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 17C16 17 13 15 11 12C13.5 11 16 12.5 16 17Z" fill="#5bde8a" />
        <path d="M16 14C16 14 19 12 21 9C18.5 8 16 9.5 16 14Z" fill="#3ecf6e" />
    </svg>
);

// ── Field icon SVG ────────────────────────────────────────────

const FieldIcon = ({ width = 16, height = 16 }) => (
    <svg viewBox="0 0 20 20" fill="none" width={width} height={height}>
        <path d="M2 16L6 8L10 12L14 6L18 10" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 18H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function FarmManagerDashboard() {
    const navigate = useNavigate();

    // ── Layout ────────────────────────────────────────────────
    const [activeView,    setActiveView]    = useState("dashboard");
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    // ── WebSocket state ───────────────────────────────────────
    const [wsStatus, setWsStatus] = useState("Disconnected");
    const [alerts,   setAlerts]   = useState(INITIAL_ALERTS);

    // ── Irrigation filter ─────────────────────────────────────
    const [fieldFilter, setFieldFilter] = useState("all");

    // ── Moisture ring (CSS transition driven) ─────────────────
    const [ringDash, setRingDash]     = useState("0 100.53");
    const [soilBars, setSoilBars]     = useState({ moisture: 0, temp: 0, humidity: 0 });
    const [countersReady, setCountersReady] = useState(false);

    // Animated summary card values
    const fieldsDisplay   = useAnimatedCount(ACTIVE_FIELDS,   "",  countersReady ? 0 : 9999);
    const sensorsDisplay  = useAnimatedCount(ONLINE_SENSORS,  "",  countersReady ? 0 : 9999);
    const irrigDisplay    = useAnimatedCount(IRRIGATION_LOGS.length, "", countersReady ? 0 : 9999);
    const moistureDisplay = useAnimatedCount(AVG_MOISTURE,    "%", countersReady ? 0 : 9999);

    // Header date
    const headerDate = new Date().toLocaleDateString("en-GB", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    // Alert counts
    const alertCounts = alerts.reduce(
        (acc, a) => {
            if (a.severity === "Low")    acc.low++;
            if (a.severity === "Medium") acc.med++;
            if (a.severity === "High")   acc.high++;
            return acc;
        },
        { low: 0, med: 0, high: 0 }
    );
    const alertNavCount = alertCounts.high + alertCounts.med;

    // ── WebSocket callbacks ───────────────────────────────────

    const handleWsStatus = useCallback((status) => setWsStatus(status), []);

    const handleAlerts = useCallback((incoming) => {
        setAlerts(incoming);
    }, []);

    try {
        useWebSocket({
            onWsStatus: handleWsStatus,
            onAlerts: handleAlerts,
        });
    } catch (e) {
        console.warn("WebSocket disabled:", e);
    }

    // ── Animations on mount ───────────────────────────────────

    useEffect(() => {
        setCountersReady(true);

        // Soil bars — delayed so CSS transition fires
        const t1 = setTimeout(() => {
            setSoilBars({
                moisture: SOIL_SNAPSHOT.moisture,
                temp:     SOIL_SNAPSHOT.temperaturePct,
                humidity: SOIL_SNAPSHOT.humidity,
            });
        }, 300);

        // Moisture ring
        const circ   = 100.53;
        const filled = ((AVG_MOISTURE / 100) * circ).toFixed(1);
        const t2 = setTimeout(() => {
            setRingDash(`${filled} ${(circ - filled).toFixed(1)}`);
        }, 250);

        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    // ── Body scroll lock ──────────────────────────────────────

    useEffect(() => {
        document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    }, [mobileNavOpen]);

    // ── Navigation ────────────────────────────────────────────

    const showView = (viewId) => {
        setActiveView(viewId);
        setMobileNavOpen(false);
    };

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to log out?")) {
            localStorage.clear();
            navigate("/");
        }
    };

    // ── Filtered irrigation rows ──────────────────────────────

    const irrigRows = fieldFilter === "all"
        ? IRRIGATION_LOGS
        : IRRIGATION_LOGS.filter(r => r.field === fieldFilter);

    // ─────────────────────────────────────────────────────────
    // NAV ITEMS CONFIG
    // ─────────────────────────────────────────────────────────

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
                        <span className="user-avatar-sm" aria-hidden="true">FM</span>
                        <span className="user-name-sm">Farm Manager</span>
                    </div>
                </div>
            </header>

            {/* Mobile overlay */}
            <div
                className={`nav-overlay${mobileNavOpen ? " open" : ""}`}
                id="navOverlay"
                aria-hidden={!mobileNavOpen}
                onClick={() => setMobileNavOpen(false)}
            />

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
                    <span className="user-avatar" aria-hidden="true">FM</span>
                    <div className="user-info">
                        <span className="user-name">Farm Manager</span>
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
                    <span className="sys-status-text">Systems Nominal</span>
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
                  {wsStatus === "Connected" ? "Live Data" : wsStatus}
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
                                        <span className="soil-metric-value">{SOIL_SNAPSHOT.moisture}%</span>
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
                                        <span className="soil-metric-value">{SOIL_SNAPSHOT.temperature}</span>
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
                                        <span className="soil-metric-value">{SOIL_SNAPSHOT.humidity}%</span>
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
                      {SOIL_SNAPSHOT.updatedAt}
                    </span>
                                        <span className="soil-metric-label">Last Updated</span>
                                    </div>
                                    <div className="ws-spinner" title="Awaiting WebSocket feed"
                                         aria-label="Awaiting live sensor data" />
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
                                {FIELDS.slice(0, 6).map((field) => {
                                    const isActive = field.status === "Active";
                                    return (
                                        <li key={field.id} className="fsl-item">
                                            <div className={`fsl-icon${isActive ? "" : " fsl-icon--placeholder"}`}
                                                 aria-hidden="true">
                                                <FieldIcon />
                                            </div>
                                            <div className="fsl-info">
                                                <span className="fsl-name">{field.name}</span>
                                                <span className="fsl-loc">{field.location} · {field.size}</span>
                                            </div>
                                            <div className="fsl-status">
                        <span className={`badge ${isActive ? "badge--active" : "badge--inactive"}`}>
                          <span className="bdot" />
                            {isActive ? "Active" : "Inactive"}
                        </span>
                                            </div>
                                        </li>
                                    );
                                })}
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
                                {RECENT_IRRIGATIONS.map((row, i) => (
                                    <tr key={i}>
                                        <td><span className="cell-mono">{row.time}</span></td>
                                        <td><span className="cell-bold">{row.field}</span></td>
                                        <td>
                        <span className={`badge ${row.action === "START" ? "badge--start" : "badge--stop"}`}>
                          <span className="bdot" />{row.action}
                        </span>
                                        </td>
                                        <td>
                        <span className={`trigger trigger--${row.trigger.toLowerCase()}`}>
                          {row.trigger}
                        </span>
                                        </td>
                                        <td>
                        <span className={`badge ${row.status === "SUCCESS" ? "badge--success" : "badge--failed"}`}>
                          <span className="bdot" />{row.status}
                        </span>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </section>

                {/* ════════════════════════════════════════════
            VIEW 2: FIELDS
        ════════════════════════════════════════════ */}
                <section className={`view${activeView !== "fields" ? " view--hidden" : ""}`}
                         id="view-fields" aria-labelledby="fieldsTitle">

                    <div className="view-header">
                        <div className="view-header-left">
                            <h1 className="view-title" id="fieldsTitle">Fields</h1>
                            <p className="view-sub">Your registered farm zones and parcels</p>
                        </div>
                        <div className="view-header-right">
                            <span className="count-chip" aria-live="polite">{FIELDS.length} fields</span>
                        </div>
                    </div>

                    <div className="field-cards-grid" role="list" aria-label="Farm fields">
                        {FIELDS.map((field) => {
                            const isActive    = field.status === "Active";
                            const sensorCount = SENSORS.filter(s => s.field === field.name).length;
                            return (
                                <article key={field.id} className="field-card" role="listitem"
                                         aria-label={`${field.name}, ${field.status}`}>
                                    <div className={`fc-strip${isActive ? "" : " fc-strip--offline"}`} />
                                    <div className="fc-body">
                                        <div className="fc-top">
                                            <div className={`fc-icon${isActive ? "" : " fc-icon--offline"}`}
                                                 aria-hidden="true">
                                                <FieldIcon width={18} height={18} />
                                            </div>
                                            <span className={`badge ${isActive ? "badge--active" : "badge--inactive"}`}>
                        <span className="bdot" />{field.status}
                      </span>
                                        </div>
                                        <div className="fc-name">{field.name}</div>
                                        <div className="fc-loc">{field.location}</div>
                                        <div className="fc-meta">
                                            <div className="fc-meta-item">
                                                <span className="fc-meta-val">{field.size}</span>
                                                <span className="fc-meta-label">Size</span>
                                            </div>
                                            <div className="fc-meta-item">
                                                <span className="fc-meta-val">{sensorCount}</span>
                                                <span className="fc-meta-label">Sensors</span>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
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
                                <span className="ssb-val">{SENSORS.filter(s => s.status === "Online").length}</span>
                                <span className="ssb-label">Online</span>
                            </div>
                            <div className="ssb-divider" />
                            <div className="ssb-item">
                <span className="ssb-val ssb-val--off">
                  {SENSORS.filter(s => s.status === "Offline").length}
                </span>
                                <span className="ssb-label">Offline</span>
                            </div>
                            <div className="ssb-divider" />
                            <div className="ssb-item">
                                <span className="ssb-val">{SENSORS.length}</span>
                                <span className="ssb-label">Total</span>
                            </div>
                            <div className="ws-spinner ws-spinner--sm" style={{ marginLeft: "auto" }}
                                 title="Awaiting live sensor feed" aria-label="Awaiting WebSocket data" />
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
                                {SENSORS.map((sensor) => {
                                    const isOnline = sensor.status === "Online";
                                    return (
                                        <tr key={sensor.name}>
                                            <td><span className="cell-bold">{sensor.name}</span></td>
                                            <td>{sensor.field}</td>
                                            <td><span className="cell-muted">{sensor.type}</span></td>
                                            <td>
                          <span className={`badge ${isOnline ? "badge--online" : "badge--offline"}`}>
                            <span className="bdot" />{sensor.status}
                          </span>
                                            </td>
                                            <td>
                                                {isOnline
                                                    ? <span className="cell-bold">{sensor.reading}</span>
                                                    : <span className="cell-muted">—</span>
                                                }
                                            </td>
                                            <td><span className="cell-mono">{sensor.updated}</span></td>
                                        </tr>
                                    );
                                })}
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
                                        {FIELD_NAMES_UNIQUE.map(name => (
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
                                {irrigRows.length === 0
                                    ? <tr><td colSpan={6} className="table-empty">
                                        No irrigation sessions match this filter.
                                    </td></tr>
                                    : irrigRows.map((row, i) => {
                                        const fbClass = { SUCCESS: "fb--success", FAILED: "fb--failed", CANCELED: "fb--canceled" }[row.feedback] || "fb--success";
                                        return (
                                            <tr key={i}>
                                                <td><span className="cell-bold">{row.field}</span></td>
                                                <td><span className={`mode mode--${row.mode.toLowerCase()}`}>{row.mode}</span></td>
                                                <td><span className="cell-mono">{row.start}</span></td>
                                                <td><span className="cell-mono">{row.end}</span></td>
                                                <td><span className="cell-muted">{row.duration}</span></td>
                                                <td><span className={`fb ${fbClass}`}>{row.feedback}</span></td>
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
                {wsStatus === "Connected"
                    ? "Connected — receiving real-time alerts."
                    : "Polling for new alerts… Real-time via WebSocket when connected."}
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
                                {alerts.length === 0
                                    ? <tr><td colSpan={4} className="table-empty">No active alerts.</td></tr>
                                    : alerts.map((alert, i) => {
                                        const sevClass = { Low: "sev--low", Medium: "sev--med", High: "sev--high" }[alert.severity] || "sev--low";
                                        return (
                                            <tr key={i}>
                                                <td><span className="cell-mono">{alert.time}</span></td>
                                                <td><span className="cell-bold">{alert.field}</span></td>
                                                <td>{alert.message}</td>
                                                <td><span className={`sev ${sevClass}`}>{alert.severity}</span></td>
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