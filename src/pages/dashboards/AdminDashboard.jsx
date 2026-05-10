// ===== File: AdminDashboard.jsx =====

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {useWebSocket} from "../../services/useWebSocket.js";
import {
    getUsersCount,
    getFieldsCount,
    getHybridModelStatus,
    loadAllUsers,
    loadAllFields,
    loadAdminActivityLog,
    addNewAdminUser,
    addNewAdminField,
    updateUserStatus,
    getUserDetails,
    populateAdminOwnersDropdown,
} from "../../services/admindashboard.js";
import "../../styles/admindashboard.css";

// ── SVGs ──────────────────────────────────────────────────────

const SproutIcon = ({ width = 36, height = 36 }) => (
    <svg viewBox="0 0 32 32" fill="none" width={width} height={height} aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#1a6b3c" />
        <path d="M16 24V14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 17C16 17 13 15 11 12C13.5 11 16 12.5 16 17Z" fill="#5bde8a" />
        <path d="M16 14C16 14 19 12 21 9C18.5 8 16 9.5 16 14Z" fill="#3ecf6e" />
    </svg>
);

const PlusIcon = () => (
    <svg viewBox="0 0 16 16" fill="none" width="14" height="14" aria-hidden="true">
        <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
);

const CloseIcon = () => (
    <svg viewBox="0 0 16 16" fill="none" width="15" height="15" aria-hidden="true">
        <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
);

const AlertCircleIcon = () => (
    <svg viewBox="0 0 16 16" fill="none" width="14" height="14" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 5V8.5M8 10.5V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

// ── Helper: format today's date ───────────────────────────────

function formatHeaderDate() {
    return new Date().toLocaleDateString("en-US", {
        weekday: "short", year: "numeric", month: "short", day: "numeric",
    });
}

// ── Helper: status → badge class ─────────────────────────────

function fieldStatusClass(status = "") {
    const s = status.toLowerCase();
    if (s === "irrigating" || s === "active")   return "badge--active";
    if (s === "offline"    || s === "warning")  return "badge--crit";
    if (s === "idle"       || s === "scheduled") return "badge--warn";
    return "badge--info";
}

function activityStatusClass(status = "") {
    const s = status.toLowerCase();
    if (s === "success" || s === "completed") return "badge--active";
    if (s === "failed"  || s === "error")     return "badge--crit";
    if (s === "pending")                      return "badge--warn";
    return "badge--info";
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
    const navigate = useNavigate();

    // ── Layout state ─────────────────────────────────────────
    const [activeView,        setActiveView]        = useState("dashboard");
    const [mobileNavOpen,     setMobileNavOpen]     = useState(false);
    const [topbarDropOpen,    setTopbarDropOpen]    = useState(false);

    // ── Dashboard data ────────────────────────────────────────
    const [totalUsers,  setTotalUsers]  = useState("0");
    const [totalFarms,  setTotalFarms]  = useState("—");
    const [farmsOnline, setFarmsOnline] = useState("—");
    const [waterUsage,  setWaterUsage]  = useState("—");
    const [waterPct,    setWaterPct]    = useState("0%");
    const [waterBarPct, setWaterBarPct] = useState(0);
    const [commands,    setCommands]    = useState([]);
    const [hybridStatus, setHybridStatus] = useState("ONLINE");
    const [wsIndicatorHtml, setWsIndicatorHtml] = useState(
        '<span class="live-dot" aria-hidden="true"></span>Disconnected'
    );
    const headerDate = formatHeaderDate();

    // ── Table data ────────────────────────────────────────────
    const [users,        setUsers]        = useState(null);
    const [fields,       setFields]       = useState(null);
    const [activityLogs, setActivityLogs] = useState(null);
    const [alerts,       setAlerts]       = useState(null);
    const [alertCounts,  setAlertCounts]  = useState({ info: 0, warn: 0, crit: 0 });
    const [owners,       setOwners]       = useState([]);

    // ── Modal — Add User ──────────────────────────────────────
    const [userModalOpen,  setUserModalOpen]  = useState(false);
    const [userModalLoading, setUserModalLoading] = useState(false);
    const [userModalApiError, setUserModalApiError] = useState("");
    const [userForm, setUserForm] = useState({ name: "", email: "", phone: "", role: "" });
    const [userFormErrors, setUserFormErrors] = useState({});

    // ── Modal — Add Field ─────────────────────────────────────
    const [fieldModalOpen,   setFieldModalOpen]   = useState(false);
    const [fieldModalLoading, setFieldModalLoading] = useState(false);
    const [fieldModalApiError, setFieldModalApiError] = useState("");
    const [fieldForm, setFieldForm] = useState({ farmName: "", size: "", location: "", ownerId: "" });
    const [fieldFormErrors, setFieldFormErrors] = useState({});

    const topbarDropRef  = useRef(null);
    const totalFarmsRef  = useRef(0);

    // Keep ref in sync with state (needed for WebSocket bridge)
    useEffect(() => { totalFarmsRef.current = Number(totalFarms) || 0; }, [totalFarms]);

    // ── WebSocket bridge ──────────────────────────────────────
    // Exposes imperative update functions to the external webSocket.js file
    useWebSocket({
        onWsStatus: (status) =>
            setWsIndicatorHtml(
                status === "Connected"
                    ? '<span class="live-dot" aria-hidden="true"></span>Connected'
                    : `<span class="live-dot" aria-hidden="true"></span>${status}`
            ),
        onDashboardStats: ({ farmsOnline: fo, waterUsed: wu }) => {
            setFarmsOnline(fo);
            setWaterUsage(wu + "L");
        },
        onIrrigationCommand: (command) => {
            if (!command) return;
            setCommands((prev) => [command, ...prev].slice(0, 20));
        },
        onAlerts: (incoming) => {
            setAlerts(incoming);
            const counts = { info: 0, warn: 0, crit: 0 };
            incoming.forEach((a) => {
                const sev = (a.severity || "").toLowerCase();
                if (sev === "info")                            counts.info++;
                else if (sev === "warning" || sev === "warn") counts.warn++;
                else if (sev === "critical" || sev === "crit") counts.crit++;
            });
            setAlertCounts(counts);
        },
    });

    // ── Click-outside: topbar dropdown ───────────────────────
    useEffect(() => {
        function handleClickOutside(e) {
            if (topbarDropRef.current && !topbarDropRef.current.contains(e.target)) {
                setTopbarDropOpen(false);
            }
        }
        function handleKeyDown(e) {
            if (e.key === "Escape") setTopbarDropOpen(false);
        }
        document.addEventListener("click", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("click", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    // ── Body overflow lock ────────────────────────────────────
    useEffect(() => {
        document.body.style.overflow =
            mobileNavOpen || userModalOpen || fieldModalOpen ? "hidden" : "";
    }, [mobileNavOpen, userModalOpen, fieldModalOpen]);

    // ── Init ──────────────────────────────────────────────────
    useEffect(() => {
        const stored = localStorage.getItem("username");
        if (stored) { /* userName is read from localStorage inline */ }
        fetchTotalUsers();
        fetchTotalFarms();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Data fetchers ─────────────────────────────────────────

    const fetchTotalUsers = async () => {
        try {
            const data = await getUsersCount();
            setTotalUsers(data.message ?? "0");
        } catch { setTotalUsers("0"); }
    };

    const fetchTotalFarms = async () => {
        try {
            const data = await getFieldsCount();
            setTotalFarms(data.totalFields ?? "—");
        } catch { setTotalFarms("0"); }
    };

    const loadUsers = useCallback(async () => {
        try {
            const data = await loadAllUsers();
            setUsers(data);
        } catch { setUsers([]); }
    }, []);

    const loadFields = useCallback(async () => {
        try {
            const data = await loadAllFields();
            setFields(data);
        } catch { setFields([]); }
    }, []);

    const loadActivityLog = useCallback(async () => {
        try {
            const data = await loadAdminActivityLog();
            setActivityLogs(data);
        } catch { setActivityLogs([]); }
    }, []);

    const handleFetchHybridStatus = async () => {
        try {
            const data = await getHybridModelStatus();
            setHybridStatus(data.status ?? "OFFLINE");
        } catch { setHybridStatus("OFFLINE"); }
    };

    // ── Navigation ────────────────────────────────────────────

    const showView = useCallback((viewId) => {
        setActiveView(viewId);
        setMobileNavOpen(false);
        if (viewId === "users")    loadUsers();
        if (viewId === "fields")   loadFields();
        if (viewId === "activity") loadActivityLog();
    }, [loadUsers, loadFields, loadActivityLog]);

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login-page");
    };

    // ── Mobile nav ────────────────────────────────────────────

    const openMobileNav  = () => setMobileNavOpen(true);
    const closeMobileNav = () => setMobileNavOpen(false);
    const toggleMobileNav = () => setMobileNavOpen((v) => !v);

    // ── Topbar dropdown ───────────────────────────────────────

    const toggleTopbarDrop = (e) => {
        e.stopPropagation();
        setTopbarDropOpen((v) => !v);
    };

    const topbarAddUserClick = () => {
        setTopbarDropOpen(false);
        openAddUserModal();
    };

    const topbarAddFieldClick = () => {
        setTopbarDropOpen(false);
        openAddFieldModal();
    };

    // ── User status toggle ────────────────────────────────────

    const handleToggleUserStatus = (emailAddress, currentStatus) => {
        const newStatus  = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

        updateUserStatus(emailAddress, newStatus)
            .then(() => loadUsers())
            .catch(() => {});
    };

    const handleViewUser = async (email) => {
        try { await getUserDetails(email); }
        catch {}
    };

    // ── Add User Modal ────────────────────────────────────────

    const openAddUserModal = () => {
        setUserForm({ name: "", email: "", phone: "", role: "" });
        setUserFormErrors({});
        setUserModalApiError("");
        setUserModalOpen(true);
    };

    const closeUserModal = () => {
        setUserModalOpen(false);
        setUserModalLoading(false);
    };

    const handleUserFormChange = (e) => {
        const { name, value } = e.target;
        setUserForm((prev) => ({ ...prev, [name]: value }));
        if (userFormErrors[name]) setUserFormErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const submitUserForm = async () => {
        const errors = {};
        if (!userForm.name.trim())  errors.name  = "Full name is required";
        if (!userForm.email.trim()) errors.email = "Email is required";
        if (!userForm.role)         errors.role  = "Please select a role";
        if (Object.keys(errors).length) { setUserFormErrors(errors); return; }

        setUserModalLoading(true);
        setUserModalApiError("");
        try {
            await addNewAdminUser(userForm.name, userForm.email, userForm.phone, userForm.role);
            closeUserModal();
            loadUsers();
        } catch (err) {
            setUserModalApiError(err.message || "Failed to create user.");
            setUserModalLoading(false);
        }
    };

    // ── Add Field Modal ───────────────────────────────────────

    const openAddFieldModal = useCallback(async () => {
        setFieldForm({ farmName: "", size: "", location: "", ownerId: "" });
        setFieldFormErrors({});
        setFieldModalApiError("");
        setFieldModalOpen(true);
        try {
            const data = await populateAdminOwnersDropdown();
            setOwners(data);
        } catch { setOwners([]); }
    }, []);

    const closeFieldModal = () => {
        setFieldModalOpen(false);
        setFieldModalLoading(false);
    };

    const handleFieldFormChange = (e) => {
        const { name, value } = e.target;
        setFieldForm((prev) => ({ ...prev, [name]: value }));
        if (fieldFormErrors[name]) setFieldFormErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const submitFieldForm = async () => {
        const errors = {};
        if (!fieldForm.farmName.trim()) errors.farmName = "Farm name is required";
        if (!fieldForm.size.trim())     errors.size     = "Field size is required";
        if (!fieldForm.location.trim()) errors.location = "Location is required";
        if (!fieldForm.ownerId)         errors.ownerId  = "Please select an owner";
        if (Object.keys(errors).length) { setFieldFormErrors(errors); return; }

        setFieldModalLoading(true);
        setFieldModalApiError("");
        try {
            await addNewAdminField(fieldForm.farmName, fieldForm.size, fieldForm.location, fieldForm.ownerId);
            closeFieldModal();
            loadFields();
        } catch (err) {
            setFieldModalApiError(err.message || "Failed to add field.");
            setFieldModalLoading(false);
        }
    };

    // ── Online ring calculation ───────────────────────────────

    const circumference   = 88;
    const totalFarmsNum   = Number(totalFarms) || 0;
    const farmsOnlineNum  = Number(farmsOnline) || 0;
    const ringFilled      = totalFarmsNum > 0
        ? (farmsOnlineNum / totalFarmsNum) * circumference
        : 0;

    const userName = localStorage.getItem("username") || "Admin User";

    // ─────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────

    return (
        <>
            {/* ── Mobile Topbar ── */}
            <header className="topbar" id="topbar" role="banner">
                <div className="topbar-left">
                    <button
                        className="hamburger"
                        aria-label="Open navigation menu"
                        aria-expanded={mobileNavOpen}
                        aria-controls="sidebar"
                        onClick={toggleMobileNav}
                    >
                        <span /><span /><span />
                    </button>
                    <div className="topbar-brand">
                        <SproutIcon width={26} height={26} />
                        <span>Smart Farming</span>
                    </div>
                </div>

                <div className="topbar-user" ref={topbarDropRef}>
                    <button
                        className="topbar-avatar-btn"
                        aria-label="Admin actions"
                        aria-haspopup="menu"
                        aria-expanded={topbarDropOpen}
                        aria-controls="topbarDropdown"
                        onClick={toggleTopbarDrop}
                    >
                        A
                        <svg
                            className="topbar-avatar-caret"
                            viewBox="0 0 10 10" fill="none" width="9" height="9" aria-hidden="true"
                        >
                            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5"
                                  strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>

                    {!topbarDropOpen ? null : (
                        <div className="topbar-dropdown" id="topbarDropdown"
                             role="menu" aria-label="Admin quick actions">
                            <button className="topbar-dropdown-item" role="menuitem"
                                    onClick={topbarAddFieldClick}>
                <span className="tdd-icon" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none" width="15" height="15">
                    <path d="M2 12L5 6L8 9L11 4L14 7" stroke="currentColor"
                          strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 14H14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </span>
                                Add Field
                            </button>
                            <button className="topbar-dropdown-item" role="menuitem"
                                    onClick={topbarAddUserClick}>
                <span className="tdd-icon" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none" width="15" height="15">
                    <path d="M8 7C9.657 7 11 5.657 11 4C11 2.343 9.657 1 8 1C6.343 1 5 2.343 5 4C5 5.657 6.343 7 8 7Z"
                          stroke="currentColor" strokeWidth="1.4" />
                    <path d="M14 14C14 11.239 11.314 9 8 9C4.686 9 2 11.239 2 14"
                          stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </span>
                                Add User
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Mobile overlay
            <div
                className={`nav-overlay ${mobileNavOpen ? "visible" : ""}`}
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setMobileNavOpen(false);
                    }
                }}
            />*/}

            {/* ── Sidebar ── */}
            <aside className={`sidebar${mobileNavOpen ? " sidebar--open" : ""}`}
                   id="sidebar"
                   aria-label="Main navigation"
                   onClick={(e) => e.stopPropagation()}
                   >

                <div className="sidebar-logo">
                    <SproutIcon />
                    <div className="sidebar-logo-text">
                        <span className="sidebar-brand">Smart Farming</span>
                    </div>
                </div>

                <div className="sidebar-divider" />

                <nav className="sidebar-nav" aria-label="Dashboard sections">
                    {[
                        {
                            id: "dashboard", label: "Dashboard",
                            icon: (
                                <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                                    <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                                    <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                                    <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                                    <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                                </svg>
                            ),
                        },
                        {
                            id: "users", label: "Users",
                            icon: (
                                <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                                    <path d="M10 9C11.933 9 13.5 7.433 13.5 5.5C13.5 3.567 11.933 2 10 2C8.067 2 6.5 3.567 6.5 5.5C6.5 7.433 8.067 9 10 9Z"
                                          stroke="currentColor" strokeWidth="1.5" />
                                    <path d="M17 17.5C17 14.462 13.866 12 10 12C6.134 12 3 14.462 3 17.5"
                                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
                            id: "alerts", label: "Alerts", badge: 3,
                            icon: (
                                <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                                    <path d="M10 2L11.8 7H17L12.9 10.1L14.6 15L10 12L5.4 15L7.1 10.1L3 7H8.2L10 2Z"
                                          stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                                </svg>
                            ),
                        },
                        {
                            id: "activity", label: "Activity Log",
                            icon: (
                                <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                                    <path d="M3 10H6L8 4L10 16L12 10H17" stroke="currentColor" strokeWidth="1.5"
                                          strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ),
                        },
                    ].map(({ id, label, icon, badge }) => (
                        <button
                            key={id}
                            className={`nav-item${activeView === id ? " nav-item--active" : ""}`}
                            data-view={id}
                            aria-current={activeView === id ? "page" : "false"}
                            onClick={() => showView(id)}
                        >
                            <span className="nav-icon" aria-hidden="true">{icon}</span>
                            <span className="nav-label">{label}</span>
                            {badge
                                ? <span className="nav-badge" aria-label={`${badge} active alerts`}>{badge}</span>
                                : <span className="nav-indicator" aria-hidden="true" />
                            }
                        </button>
                    ))}
                </nav>

                <div className="sidebar-admin-pill">
                    <span className="admin-avatar" aria-hidden="true">A</span>
                    <div className="admin-info">
                        <span className="admin-name">{userName}</span>
                        <span className="admin-role">System Administrator</span>
                    </div>
                    <span className="admin-status-dot" aria-label="Online" title="Online" />
                </div>

                <div className="sidebar-divider" style={{ margin: "8px 0" }} />

                <button className="nav-item nav-item--logout" onClick={handleLogout}>
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
            </aside>

            {/* ── Main Content ── */}
            <main className="main-content" id="mainContent" role="main">

                <div className="page-bg" aria-hidden="true">
                    <div className="bg-orb bg-orb--1" />
                    <div className="bg-orb bg-orb--2" />
                    <div className="bg-grid" />
                </div>

                {/* Floating Hybrid Model Status */}
                <div className="hybrid-card" role="status"
                     aria-label="Hybrid model system status" aria-live="polite">
                    <div className="hybrid-icon" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
                            <path d="M10 2L12.4 7.4H18L13.5 10.8L15.3 16L10 12.7L4.7 16L6.5 10.8L2 7.4H7.6L10 2Z"
                                  fill="currentColor" opacity=".8" />
                        </svg>
                    </div>
                    <div className="hybrid-info">
                        <span className="hybrid-label">Hybrid Model</span>
                        <span className={`hybrid-status hybrid-status--${hybridStatus === "ONLINE" ? "online" : "offline"}`}>
              <span className={`hybrid-dot hybrid-dot--${hybridStatus === "ONLINE" ? "online" : "offline"}`}
                    aria-hidden="true" />
              <span>{hybridStatus}</span>
            </span>
                    </div>
                    <button className="hybrid-toggle"
                            aria-label="Toggle hybrid model status"
                            title="Toggle status"
                            onClick={handleFetchHybridStatus}>
                        <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                            <path d="M8 1V4M8 12V15M1 8H4M12 8H15M3 3L5 5M11 11L13 13M13 3L11 5M5 11L3 13"
                                  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* ════════════════════════════════════════════
            VIEW: DASHBOARD
        ════════════════════════════════════════════ */}
                <section
                    className={`view${activeView !== "dashboard" ? " view--hidden" : ""}`}
                    aria-labelledby="dashTitle"
                >
                    <div className="view-header">
                        <div>
                            <h1 className="view-title" id="dashTitle">Dashboard</h1>
                            <p className="view-subtitle">System overview and live monitoring</p>
                        </div>
                        <div className="view-header-meta">
                            <span className="live-badge" dangerouslySetInnerHTML={{ __html: wsIndicatorHtml }} />
                            <span className="header-date">{headerDate}</span>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="summary-grid" role="list" aria-label="Key metrics">

                        <article className="summary-card" role="listitem" aria-label="Total users">
                            <div className="scard-icon scard-icon--blue" aria-hidden="true">
                                <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
                                    <path d="M10 9C11.933 9 13.5 7.433 13.5 5.5C13.5 3.567 11.933 2 10 2C8.067 2 6.5 3.567 6.5 5.5C6.5 7.433 8.067 9 10 9Z"
                                          stroke="currentColor" strokeWidth="1.5" />
                                    <path d="M17 17.5C17 14.462 13.866 12 10 12C6.134 12 3 14.462 3 17.5"
                                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                            </div>
                            <div className="scard-body">
                                <span className="scard-value">{totalUsers}</span>
                                <span className="scard-label">Total Users</span>
                            </div>
                        </article>

                        <article className="summary-card" role="listitem" aria-label="Active farms">
                            <div className="scard-icon scard-icon--green" aria-hidden="true">
                                <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
                                    <path d="M2 16L6 8L10 12L14 6L18 10" stroke="currentColor" strokeWidth="1.5"
                                          strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M2 18H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                            </div>
                            <div className="scard-body">
                                <span className="scard-value">{totalFarms}</span>
                                <span className="scard-label">Active Farms</span>
                            </div>
                            <div className="scard-trend scard-trend--up" aria-label="Up 4% this week">
                                <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
                                    <path d="M2 9L6 3L10 9" stroke="currentColor" strokeWidth="1.5"
                                          strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                4%
                            </div>
                        </article>

                        <article className="summary-card" role="listitem" aria-label="Farms online">
                            <div className="scard-icon scard-icon--teal" aria-hidden="true">
                                <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
                                    <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
                                    <path d="M6.5 10.5L8.5 12.5L13.5 7.5" stroke="currentColor" strokeWidth="1.5"
                                          strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div className="scard-body">
                                <span className="scard-value">{farmsOnline}</span>
                                <span className="scard-label">Farms Online</span>
                            </div>
                            <svg className="scard-ring" viewBox="0 0 36 36" aria-hidden="true">
                                <circle className="ring-track" cx="18" cy="18" r="14" fill="none" strokeWidth="3" />
                                <circle
                                    className="ring-fill"
                                    cx="18" cy="18" r="14" fill="none" strokeWidth="3"
                                    strokeDasharray={`${ringFilled} ${circumference - ringFilled}`}
                                    strokeDashoffset="22"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </article>

                        <article className="summary-card summary-card--water" role="listitem" aria-label="Water usage today">
                            <div className="scard-icon scard-icon--water" aria-hidden="true">
                                <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
                                    <path d="M10 3C10 3 4 9.5 4 13C4 16.314 6.686 19 10 19C13.314 19 16 16.314 16 13C16 9.5 10 3 10 3Z"
                                          stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                                    <path d="M7 14.5C7.5 15.5 8.667 16 10 16" stroke="currentColor" strokeWidth="1.4"
                                          strokeLinecap="round" />
                                </svg>
                            </div>
                            <div className="scard-body">
                                <span className="scard-value">{waterUsage}</span>
                                <span className="scard-label">Water Usage Today</span>
                            </div>
                            <div className="water-bar-wrap" aria-label={`Water usage: ${waterPct} of daily limit`}>
                                <div className="water-bar-track">
                                    <div className="water-bar-fill" style={{ width: `${waterBarPct}%` }} />
                                </div>
                                <span className="water-pct">{waterPct}</span>
                            </div>
                        </article>

                    </div>

                    {/* Recent Irrigation Commands */}
                    <div className="section-card">
                        <div className="section-card-header">
                            <div>
                                <h2 className="section-card-title">Recent Irrigation Commands</h2>
                                <p className="section-card-sub">Latest automated and manual irrigation actions</p>
                            </div>
                            {commands.length > 0 && (
                                <span className="table-count" aria-live="polite">
                  {commands.length} commands
                </span>
                            )}
                        </div>
                        <div className="table-scroll" role="region"
                             aria-label="Recent irrigation commands table" tabIndex={0}>
                            <table className="data-table">
                                <thead>
                                <tr>
                                    <th scope="col">Time</th>
                                    <th scope="col">Farm</th>
                                    <th scope="col">Command</th>
                                    <th scope="col">Trigger Source</th>
                                </tr>
                                </thead>
                                <tbody>
                                {commands.length === 0
                                    ? <tr><td colSpan={4} className="table-empty">No commands yet.</td></tr>
                                    : commands.map((cmd, i) => (
                                        <tr key={i}>
                                            <td className="cell-mono">{cmd.time}</td>
                                            <td className="cell-bold">{cmd.farm}</td>
                                            <td>{cmd.command}</td>
                                            <td>
                          <span className={`trigger-chip ${cmd.trigger === "Hybrid-model"
                              ? "trigger-chip--model" : "trigger-chip--schedule"}`}>
                            {cmd.trigger}
                          </span>
                                            </td>
                                        </tr>
                                    ))
                                }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* ════════════════════════════════════════════
            VIEW: USERS
        ════════════════════════════════════════════ */}
                <section
                    className={`view${activeView !== "users" ? " view--hidden" : ""}`}
                    aria-labelledby="usersTitle"
                >
                    <div className="view-header">
                        <div>
                            <h1 className="view-title" id="usersTitle">Users</h1>
                            <p className="view-subtitle">Manage system accounts and access levels</p>
                        </div>
                        <button className="btn btn--primary" id="addUserBtn"
                                aria-haspopup="dialog" onClick={openAddUserModal}>
                            <PlusIcon /> Add User
                        </button>
                    </div>

                    <div className="section-card">
                        <div className="table-scroll" role="region" aria-label="Users table" tabIndex={0}>
                            <table className="data-table">
                                <thead>
                                <tr>
                                    <th scope="col">Name</th>
                                    <th scope="col">Email</th>
                                    <th scope="col">Phone</th>
                                    <th scope="col">Role</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {!users
                                    ? <tr><td colSpan={6} className="table-empty">Loading…</td></tr>
                                    : users.length === 0
                                        ? <tr><td colSpan={6} className="table-empty">No users found.</td></tr>
                                        : users.map((user) => {
                                            const isActive   = user.status === "ACTIVE";
                                            const roleClass  = user.role === "ADMIN" ? "role-badge--admin" : "role-badge--manager";
                                            const statusClass = isActive ? "badge--active" : "badge--inactive";
                                            return (
                                                <tr key={user.id}>
                                                    <td><span className="cell-bold">{user.userName}</span></td>
                                                    <td>{user.emailAddress}</td>
                                                    <td><span className="cell-muted">{user.phoneNumber}</span></td>
                                                    <td><span className={`role-badge ${roleClass}`}>{user.role}</span></td>
                                                    <td>
                            <span className={`badge ${statusClass}`}>
                              <span className="badge-dot-sm" />
                                {isActive ? "Active" : "Inactive"}
                            </span>
                                                    </td>
                                                    <td>
                                                        <div className="action-btns">
                                                            <button className="tbl-btn tbl-btn--view"
                                                                    onClick={() => handleViewUser(user.emailAddress)}>View</button>
                                                            <button
                                                                className={`tbl-btn ${isActive ? "tbl-btn--disable" : "tbl-btn--enable"}`}
                                                                onClick={() => handleToggleUserStatus(user.emailAddress, user.status)}>
                                                                {isActive ? "Disable" : "Enable"}
                                                            </button>
                                                        </div>
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
            VIEW: FIELDS
        ════════════════════════════════════════════ */}
                <section
                    className={`view${activeView !== "fields" ? " view--hidden" : ""}`}
                    aria-labelledby="fieldsTitle"
                >
                    <div className="view-header">
                        <div>
                            <h1 className="view-title" id="fieldsTitle">Fields</h1>
                            <p className="view-subtitle">Farm zones and irrigation field status</p>
                        </div>
                        <button className="btn btn--primary" aria-haspopup="dialog"
                                onClick={openAddFieldModal}>
                            <PlusIcon /> Add Field
                        </button>
                    </div>

                    <div className="section-card">
                        <div className="table-scroll" role="region" aria-label="Fields table" tabIndex={0}>
                            <table className="data-table">
                                <thead>
                                <tr>
                                    <th scope="col">Field Id</th>
                                    <th scope="col">Field Name</th>
                                    <th scope="col">Location</th>
                                    <th scope="col">Status</th>
                                </tr>
                                </thead>
                                <tbody>
                                {!fields
                                    ? <tr><td colSpan={4} className="table-empty">Loading…</td></tr>
                                    : fields.length === 0
                                        ? <tr><td colSpan={4} className="table-empty">No fields registered.</td></tr>
                                        : fields.map((field, i) => (
                                            <tr key={i}>
                                                <td className="cell-mono">{field.fieldId} </td>
                                                <td><span className="cell-bold">{field.fieldName}</span></td>
                                                <td>{field.location}</td>
                                                <td>
                          <span className={`badge ${fieldStatusClass(field.status)}`}>
                            <span className="badge-dot-sm" />
                              {field.status}
                          </span>
                                                </td>
                                            </tr>
                                        ))
                                }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* ════════════════════════════════════════════
            VIEW: ALERTS
        ════════════════════════════════════════════ */}
                <section
                    className={`view${activeView !== "alerts" ? " view--hidden" : ""}`}
                    aria-labelledby="alertsTitle"
                >
                    <div className="view-header">
                        <div>
                            <h1 className="view-title" id="alertsTitle">Alerts</h1>
                            <p className="view-subtitle">System alerts and threshold notifications</p>
                        </div>
                        <div className="view-header-meta">
              <span className="live-badge live-badge--warn">
                <span className="live-dot live-dot--warn" aria-hidden="true" />
                Monitoring
              </span>
                        </div>
                    </div>

                    <div className="alert-summary" role="list" aria-label="Alert counts by severity">
                        <div className="alert-chip alert-chip--info" role="listitem">
                            <span className="alert-chip-value">{alertCounts.info}</span>
                            <span className="alert-chip-label">Info</span>
                        </div>
                        <div className="alert-chip alert-chip--warn" role="listitem">
                            <span className="alert-chip-value">{alertCounts.warn}</span>
                            <span className="alert-chip-label">Warning</span>
                        </div>
                        <div className="alert-chip alert-chip--crit" role="listitem">
                            <span className="alert-chip-value">{alertCounts.crit}</span>
                            <span className="alert-chip-label">Critical</span>
                        </div>
                    </div>

                    <div className="section-card">
                        <div className="table-scroll" role="region" aria-label="Alerts table" tabIndex={0}>
                            <table className="data-table">
                                <thead>
                                <tr>
                                    <th scope="col">Time</th>
                                    <th scope="col">Message</th>
                                    <th scope="col">Severity</th>
                                </tr>
                                </thead>
                                <tbody>
                                {!alerts
                                    ? <tr><td colSpan={3} className="table-empty">No alerts.</td></tr>
                                    : alerts.length === 0
                                        ? <tr><td colSpan={3} className="table-empty">No alerts.</td></tr>
                                        : alerts.map((alert, i) => (
                                            <tr key={i}>
                                                <td className="cell-mono">{alert.time}</td>
                                                <td>{alert.message}</td>
                                                <td>
                          <span className={`sev-badge sev-badge--${(alert.severity || "info").toLowerCase()}`}>
                            {alert.severity}
                          </span>
                                                </td>
                                            </tr>
                                        ))
                                }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* ════════════════════════════════════════════
            VIEW: ACTIVITY LOG
        ════════════════════════════════════════════ */}
                <section
                    className={`view${activeView !== "activity" ? " view--hidden" : ""}`}
                    aria-labelledby="activityTitle"
                >
                    <div className="view-header">
                        <div>
                            <h1 className="view-title" id="activityTitle">System Activity Log</h1>
                            <p className="view-subtitle">Audit trail of all system actions</p>
                        </div>
                        <div className="view-header-meta">
                            {activityLogs && (
                                <span className="table-count" aria-live="polite">
                  {activityLogs.length} entries
                </span>
                            )}
                        </div>
                    </div>

                    <div className="section-card">
                        <div className="table-scroll" role="region" aria-label="Activity log table" tabIndex={0}>
                            <table className="data-table">
                                <thead>
                                <tr>
                                    <th scope="col">Time</th>
                                    <th scope="col">Action</th>
                                    <th scope="col">Message</th>
                                    <th scope="col">Status</th>
                                </tr>
                                </thead>
                                <tbody>
                                {!activityLogs
                                    ? <tr><td colSpan={4} className="table-empty">Loading…</td></tr>
                                    : activityLogs.length === 0
                                        ? <tr><td colSpan={4} className="table-empty">No recent activity recorded.</td></tr>
                                        : activityLogs.map((log, i) => (
                                            <tr key={i}>
                                                <td className="cell-mono">{log.time}</td>
                                                <td><span className="cell-bold">{log.action}</span></td>
                                                <td className="cell-muted">{log.message}</td>
                                                <td>
                          <span className={`badge ${activityStatusClass(log.status)}`}>
                            <span className="badge-dot-sm" />
                              {log.status}
                          </span>
                                                </td>
                                            </tr>
                                        ))
                                }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

            </main>

            {/* ════════════════════════════════════════════
          MODAL: ADD USER
      ════════════════════════════════════════════ */}
            {userModalOpen && (
                <div className="modal-overlay" role="dialog" aria-modal="true"
                     aria-labelledby="modalTitle" aria-describedby="modalDesc">
                    <div className="modal-card" role="document">
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title" id="modalTitle">Add New User</h2>
                                <p className="modal-desc" id="modalDesc">
                                    Create a new system account. A setup email will be sent to the user.
                                </p>
                            </div>
                            <button className="modal-close" aria-label="Close add user dialog"
                                    onClick={closeUserModal}>
                                <CloseIcon />
                            </button>
                        </div>

                        {userModalApiError && (
                            <div className="api-error" role="alert" aria-live="assertive">
                                <AlertCircleIcon />
                                <span>{userModalApiError}</span>
                            </div>
                        )}

                        <form className="modal-form" noValidate aria-label="Add user form"
                              onSubmit={(e) => { e.preventDefault(); submitUserForm(); }}>

                            {/* Full Name */}
                            <div className={`field-group${userFormErrors.name ? " field-group--error" : ""}`}>
                                <label className="field-label" htmlFor="userFullName">Full Name</label>
                                <div className="field-input-wrap">
                  <span className="field-icon field-icon--left" aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none" width="17" height="17">
                      <path d="M10 9C11.933 9 13.5 7.433 13.5 5.5C13.5 3.567 11.933 2 10 2C8.067 2 6.5 3.567 6.5 5.5C6.5 7.433 8.067 9 10 9Z"
                            stroke="currentColor" strokeWidth="1.5" opacity=".6" />
                      <path d="M17 17.5C17 14.462 13.866 12 10 12C6.134 12 3 14.462 3 17.5"
                            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".6" />
                    </svg>
                  </span>
                                    <input id="userFullName" name="name" className="field-input" type="text"
                                           placeholder="e.g. Kwame Mensah"
                                           autoComplete="name" aria-required="true"
                                           aria-describedby="fnError"
                                           value={userForm.name}
                                           onChange={handleUserFormChange} />
                                </div>
                                <span className="field-error" id="fnError" role="alert" aria-live="polite">
                  {userFormErrors.name}
                </span>
                            </div>

                            {/* Email */}
                            <div className={`field-group${userFormErrors.email ? " field-group--error" : ""}`}>
                                <label className="field-label" htmlFor="userEmailAddress">Email Address</label>
                                <div className="field-input-wrap">
                  <span className="field-icon field-icon--left" aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none" width="17" height="17">
                      <rect x="2.5" y="4.5" width="15" height="11" rx="2"
                            stroke="currentColor" strokeWidth="1.5" opacity=".6" />
                      <path d="M2.5 7.5L10 12L17.5 7.5"
                            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".6" />
                    </svg>
                  </span>
                                    <input id="userEmailAddress" name="email" className="field-input" type="email"
                                           placeholder="user@example.com"
                                           autoComplete="email" aria-required="true"
                                           aria-describedby="emError"
                                           value={userForm.email}
                                           onChange={handleUserFormChange} />
                                </div>
                                <span className="field-error" id="emError" role="alert" aria-live="polite">
                  {userFormErrors.email}
                </span>
                            </div>

                            {/* Phone */}
                            <div className={`field-group${userFormErrors.phone ? " field-group--error" : ""}`}>
                                <label className="field-label" htmlFor="userPhoneNumber">Phone Number</label>
                                <div className="field-input-wrap">
                  <span className="field-icon field-icon--left" aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none" width="17" height="17">
                      <path d="M6.6 10.8C7.8 13.2 9.8 15.1 12.2 16.4L14.1 14.5C14.3 14.3 14.7 14.2 15 14.4C16 14.7 17.1 14.9 18.2 14.9C18.7 14.9 19.2 15.3 19.2 15.9V18.9C19.2 19.4 18.8 19.9 18.2 19.9C9.8 19.9 3 13.1 3 4.7C3 4.1 3.4 3.7 4 3.7H7C7.5 3.7 8 4.1 8 4.7C8 5.9 8.2 7 8.5 8C8.6 8.3 8.5 8.7 8.3 8.9L6.6 10.8Z"
                            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" opacity=".6" />
                    </svg>
                  </span>
                                    <input id="userPhoneNumber" name="phone" className="field-input" type="tel"
                                           placeholder="+233 00 000 0000"
                                           autoComplete="tel" aria-required="true"
                                           aria-describedby="phError"
                                           value={userForm.phone}
                                           onChange={handleUserFormChange} />
                                </div>
                                <span className="field-error" id="phError" role="alert" aria-live="polite">
                  {userFormErrors.phone}
                </span>
                            </div>

                            {/* Role */}
                            <div className={`field-group${userFormErrors.role ? " field-group--error" : ""}`}>
                                <label className="field-label" htmlFor="selectedRole">Role</label>
                                <div className="field-input-wrap">
                  <span className="field-icon field-icon--left" aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none" width="17" height="17">
                      <rect x="3" y="11" width="14" height="7" rx="2"
                            stroke="currentColor" strokeWidth="1.5" opacity=".6" />
                      <path d="M6.5 11V8C6.5 6.067 8.067 4.5 10 4.5C11.933 4.5 13.5 6.067 13.5 8V11"
                            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".6" />
                    </svg>
                  </span>
                                    <select id="selectedRole" name="role"
                                            className="field-input field-select" aria-required="true"
                                            aria-describedby="roleError"
                                            value={userForm.role}
                                            onChange={handleUserFormChange}>
                                        <option value="">Select a role…</option>
                                        <option value="ADMIN">ADMIN</option>
                                        <option value="FARMER">FARMER</option>
                                    </select>
                                    <span className="field-icon field-icon--right select-arrow" aria-hidden="true">
                    <svg viewBox="0 0 12 12" fill="none" width="11" height="11">
                      <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5"
                            strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                                </div>
                                <span className="field-error" id="roleError" role="alert" aria-live="polite">
                  {userFormErrors.role}
                </span>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn--ghost"
                                        onClick={closeUserModal}>Cancel</button>
                                <button type="submit" className="btn btn--primary"
                                        disabled={userModalLoading}>
                                    {userModalLoading ? (
                                        <span className="btn-inner" aria-label="Creating user…">
                      <span className="spinner" aria-hidden="true" />
                      Processing…
                    </span>
                                    ) : (
                                        <span className="btn-inner">
                      <PlusIcon /> Create User
                    </span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════
          MODAL: ADD FIELD
      ════════════════════════════════════════════ */}
            {fieldModalOpen && (
                <div className="modal-overlay" role="dialog" aria-modal="true"
                     aria-labelledby="fieldModalTitle" aria-describedby="fieldModalDesc">
                    <div className="modal-card" role="document">
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title" id="fieldModalTitle">Add New Field</h2>
                                <p className="modal-desc" id="fieldModalDesc">
                                    Register a new farm field and assign it to an existing user.
                                </p>
                            </div>
                            <button className="modal-close" aria-label="Close add field dialog"
                                    onClick={closeFieldModal}>
                                <CloseIcon />
                            </button>
                        </div>

                        {fieldModalApiError && (
                            <div className="api-error" role="alert" aria-live="assertive">
                                <AlertCircleIcon />
                                <span>{fieldModalApiError}</span>
                            </div>
                        )}

                        <form className="modal-form" noValidate aria-label="Add field form"
                              onSubmit={(e) => { e.preventDefault(); submitFieldForm(); }}>

                            {/* Farm Name */}
                            <div className={`field-group${fieldFormErrors.farmName ? " field-group--error" : ""}`}>
                                <label className="field-label" htmlFor="ffn">Farm Name</label>
                                <div className="field-input-wrap">
                  <span className="field-icon field-icon--left" aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none" width="17" height="17">
                      <path d="M2 16L6 8L10 12L14 6L18 10" stroke="currentColor" strokeWidth="1.5"
                            strokeLinecap="round" strokeLinejoin="round" opacity=".6" />
                      <path d="M2 18H18" stroke="currentColor" strokeWidth="1.5"
                            strokeLinecap="round" opacity=".6" />
                    </svg>
                  </span>
                                    <input id="ffn" name="farmName" className="field-input" type="text"
                                           placeholder="e.g. Sunrise Block A"
                                           autoComplete="off" aria-required="true"
                                           aria-describedby="ffnError"
                                           value={fieldForm.farmName}
                                           onChange={handleFieldFormChange} />
                                </div>
                                <span className="field-error" id="ffnError" role="alert" aria-live="polite">
                  {fieldFormErrors.farmName}
                </span>
                            </div>

                            {/* Field Size */}
                            <div className={`field-group${fieldFormErrors.size ? " field-group--error" : ""}`}>
                                <label className="field-label" htmlFor="fsz">Field Size</label>
                                <div className="field-input-wrap">
                  <span className="field-icon field-icon--left" aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none" width="17" height="17">
                      <rect x="2" y="2" width="16" height="16" rx="2"
                            stroke="currentColor" strokeWidth="1.5" opacity=".6" />
                      <path d="M6 10H14M10 6V14" stroke="currentColor" strokeWidth="1.4"
                            strokeLinecap="round" opacity=".6" />
                    </svg>
                  </span>
                                    <input id="fsz" name="size" className="field-input" type="text"
                                           placeholder="e.g. 4.2 ha"
                                           autoComplete="off" aria-required="true"
                                           aria-describedby="fszError"
                                           value={fieldForm.size}
                                           onChange={handleFieldFormChange} />
                                </div>
                                <span className="field-error" id="fszError" role="alert" aria-live="polite">
                  {fieldFormErrors.size}
                </span>
                            </div>

                            {/* Location */}
                            <div className={`field-group${fieldFormErrors.location ? " field-group--error" : ""}`}>
                                <label className="field-label" htmlFor="floc">Location</label>
                                <div className="field-input-wrap">
                  <span className="field-icon field-icon--left" aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none" width="17" height="17">
                      <path d="M10 2C7.239 2 5 4.239 5 7C5 10.5 10 18 10 18C10 18 15 10.5 15 7C15 4.239 12.761 2 10 2Z"
                            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" opacity=".6" />
                      <circle cx="10" cy="7" r="2" stroke="currentColor" strokeWidth="1.4" opacity=".6" />
                    </svg>
                  </span>
                                    <input id="floc" name="location" className="field-input" type="text"
                                           placeholder="e.g. Eastern Region, Ghana"
                                           autoComplete="off" aria-required="true"
                                           aria-describedby="flocError"
                                           value={fieldForm.location}
                                           onChange={handleFieldFormChange} />
                                </div>
                                <span className="field-error" id="flocError" role="alert" aria-live="polite">
                  {fieldFormErrors.location}
                </span>
                            </div>

                            {/* Owner */}
                            <div className={`field-group${fieldFormErrors.ownerId ? " field-group--error" : ""}`}>
                                <label className="field-label" htmlFor="fowner">Field Owner</label>
                                <div className="field-input-wrap">
                  <span className="field-icon field-icon--left" aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none" width="17" height="17">
                      <path d="M10 9C11.933 9 13.5 7.433 13.5 5.5C13.5 3.567 11.933 2 10 2C8.067 2 6.5 3.567 6.5 5.5C6.5 7.433 8.067 9 10 9Z"
                            stroke="currentColor" strokeWidth="1.5" opacity=".6" />
                      <path d="M17 17.5C17 14.462 13.866 12 10 12C6.134 12 3 14.462 3 17.5"
                            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".6" />
                    </svg>
                  </span>
                                    <select id="fowner" name="ownerId"
                                            className="field-input field-select" aria-required="true"
                                            aria-describedby="fownerError"
                                            value={fieldForm.ownerId}
                                            onChange={handleFieldFormChange}>
                                        <option value="">Select an owner…</option>
                                        {owners.map((o) => (
                                            <option key={o.id} value={o.id}>{o.name}</option>
                                        ))}
                                    </select>
                                    <span className="field-icon field-icon--right select-arrow" aria-hidden="true">
                    <svg viewBox="0 0 12 12" fill="none" width="11" height="11">
                      <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5"
                            strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                                </div>
                                <span className="field-error" id="fownerError" role="alert" aria-live="polite">
                  {fieldFormErrors.ownerId}
                </span>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn--ghost"
                                        onClick={closeFieldModal}>Cancel</button>
                                <button type="submit" className="btn btn--primary"
                                        disabled={fieldModalLoading}>
                                    {fieldModalLoading ? (
                                        <span className="btn-inner" aria-label="Adding field…">
                      <span className="spinner" aria-hidden="true" />
                      Processing…
                    </span>
                                    ) : (
                                        <span className="btn-inner">
                      <PlusIcon /> Add Field
                    </span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}