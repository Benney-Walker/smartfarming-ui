// ===== File: HomePage.jsx =====

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/homePage.css";

// ── Shared SVG components ─────────────────────────────────────

const SproutIcon = ({ width = 34, height = 34 }) => (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"
         width={width} height={height} aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#1a6b3c" />
        <path d="M16 24V14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 17C16 17 13 15 11 12C13.5 11 16 12.5 16 17Z" fill="#5bde8a" />
        <path d="M16 14C16 14 19 12 21 9C18.5 8 16 9.5 16 14Z" fill="#3ecf6e" />
    </svg>
);

const CheckIcon = () => (
    <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
        <path d="M3 8L6 11L13 4" stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const SmallCheckIcon = () => (
    <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5 7L6.5 8.5L9 5.5" stroke="currentColor" strokeWidth="1.2"
              strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// ── Nav sections config ───────────────────────────────────────

const SECTIONS = ["home", "features", "about", "support"];

const NAV_ITEMS = [
    {
        id: "home", label: "Home",
        icon: (
            <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                <path d="M3 9.5L10 3L17 9.5V17H13V13H7V17H3V9.5Z"
                      stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
        ),
    },
    {
        id: "about", label: "About",
        icon: (
            <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10 9V14M10 7V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        id: "features", label: "Features",
        icon: (
            <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <rect x="11.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <rect x="2.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <rect x="11.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
        ),
    },
    {
        id: "support", label: "Support",
        icon: (
            <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7.5 8C7.5 6.619 8.619 5.5 10 5.5C11.381 5.5 12.5 6.619 12.5 8C12.5 9.381 10 10.5 10 10.5V12"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="10" cy="14" r="0.75" fill="currentColor" />
            </svg>
        ),
    },
];

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function HomePage() {
    const navigate = useNavigate();

    const [activeSection, setActiveSection] = useState("home");
    const [mobileNavOpen,  setMobileNavOpen]  = useState(false);

    const mainRef = useRef(null);

    const currentYear = new Date().getFullYear();

    // ── Body scroll lock when mobile nav is open ──────────────

    useEffect(() => {
        document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    }, [mobileNavOpen]);

    // ── Active nav on scroll via IntersectionObserver ─────────

    useEffect(() => {
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActiveSection(entry.target.id);
                });
            },
            { threshold: 0.35 }
        );

        SECTIONS.forEach((id) => {
            const el = document.getElementById(id);
            if (el) io.observe(el);
        });

        return () => io.disconnect();
    }, []);

    // ── Entrance animations via IntersectionObserver ──────────

    useEffect(() => {
        const selector = [
            ".feature-card",
            ".support-card",
            ".about-content",
            ".about-visual",
            ".hero-content",
            ".hero-visual",
        ].join(", ");

        const els = document.querySelectorAll(selector);

        const animIO = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        animIO.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1 }
        );

        els.forEach((el) => animIO.observe(el));

        return () => animIO.disconnect();
    }, []);

    // ── Smooth scroll helper ──────────────────────────────────

    const scrollToSection = useCallback((id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
        setMobileNavOpen(false);
    }, []);

    const goToLogin = () => navigate("/login-page");

    // ─────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────

    return (
        <>
            {/* ── Sidebar ── */}
            <aside
                className={`sidebar${mobileNavOpen ? " sidebar--open" : ""}`}
                id="sidebar"
                role="region"
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

                <nav className="sidebar-nav">
                    {NAV_ITEMS.map(({ id, label, icon }) => (
                        <button
                            key={id}
                            className={`nav-link${activeSection === id ? " nav-link--active" : ""}`}
                            data-section={id}
                            onClick={() => scrollToSection(id)}
                            aria-current={activeSection === id ? "true" : undefined}
                        >
                            <span className="nav-icon" aria-hidden="true">{icon}</span>
                            <span className="nav-label">{label}</span>
                            <span className="nav-indicator" aria-hidden="true" />
                        </button>
                    ))}

                    {/* Login CTA */}
                    <button className="nav-link nav-link--cta" onClick={goToLogin}>
            <span className="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                <path d="M8 5H4.5A1.5 1.5 0 003 6.5v8A1.5 1.5 0 004.5 16H8"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M13 13L17 10M17 10L13 7M17 10H7"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
                        <span className="nav-label">Login</span>
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-status">
                        <span className="status-dot" />
                        <span className="status-text">System Online</span>
                    </div>
                </div>
            </aside>

            {/* ── Mobile Topbar ── */}
            <header className="topbar" id="topbar">
                <div className="topbar-logo">
                    <SproutIcon width={28} height={28} />
                    <span className="topbar-title">Smart Farming</span>
                </div>
                <button
                    className="hamburger"
                    id="hamburger"
                    aria-label="Toggle navigation"
                    aria-expanded={mobileNavOpen}
                    onClick={() => setMobileNavOpen((v) => !v)}
                >
                    <span /><span /><span />
                </button>
            </header>

            {/* Mobile nav overlay */}
            <div
                className={`mobile-overlay${mobileNavOpen ? " mobile-overlay--visible" : ""}`}
                id="mobileOverlay"
                aria-hidden={!mobileNavOpen}
                onClick={() => setMobileNavOpen(false)}
            />

            {/* ── Main Content ── */}
            <main className="main-content" id="mainContent" ref={mainRef}>

                {/* Shared background decoration */}
                <div className="page-bg" aria-hidden="true">
                    <div className="bg-orb bg-orb--1" />
                    <div className="bg-orb bg-orb--2" />
                    <div className="bg-orb bg-orb--3" />
                    <div className="bg-grid" />
                </div>

                {/* ════════════════════════════════════════════
            1. HERO SECTION
        ════════════════════════════════════════════ */}
                <section className="section hero-section" id="home" aria-labelledby="heroHeading">
                    <div className="hero-inner">

                        {/* Left: text */}
                        <div className="hero-content">
                            <div className="hero-badge">
                                <span className="badge-dot" />
                                Precision Agriculture Platform
                            </div>

                            <h1 className="hero-title" id="heroHeading">
                                Smart Farming<br />
                                <span className="hero-title--accent">Monitoring System</span>
                            </h1>

                            <p className="hero-lead">
                                Precision irrigation powered by intelligent data. Monitor soil
                                conditions, automate irrigation cycles, track crop analytics and
                                optimise water usage — all from a single unified dashboard.
                            </p>

                            <div className="hero-stats">
                                <div className="hstat">
                                    <span className="hstat-value">98%</span>
                                    <span className="hstat-label">Water Efficiency</span>
                                </div>
                                <div className="hstat-divider" />
                                <div className="hstat">
                                    <span className="hstat-value">24/7</span>
                                    <span className="hstat-label">Live Monitoring</span>
                                </div>
                            </div>

                            <div className="hero-actions">
                                <button className="btn btn--primary" onClick={goToLogin}>
                                    <svg viewBox="0 0 20 20" fill="none" width="17" height="17" aria-hidden="true">
                                        <path d="M8 5H4.5A1.5 1.5 0 003 6.5v8A1.5 1.5 0 004.5 16H8"
                                              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                        <path d="M13 13L17 10M17 10L13 7M17 10H7"
                                              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Login to Dashboard
                                </button>
                                <button className="btn btn--secondary" onClick={() => scrollToSection("about")}>
                                    Learn More
                                    <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
                                        <path d="M10 3V17M10 17L5 12M10 17L15 12"
                                              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Right: dashboard card mockup */}
                        <div className="hero-visual" aria-hidden="true">
                            <div className="dashboard-card">
                                <div className="dc-header">
                                    <div className="dc-dot dc-dot--green" />
                                    <div className="dc-dot dc-dot--yellow" />
                                    <div className="dc-dot dc-dot--red" />
                                    <span className="dc-title">Live Dashboard</span>
                                </div>

                                <div className="dc-body">
                                    <div className="dc-metric-group">
                                        <span className="dc-metric-label">Soil Moisture</span>
                                        <div className="dc-bars">
                                            <div className="dc-bar-row">
                                                <span className="dc-zone">Zone A</span>
                                                <div className="dc-bar-track">
                                                    <div className="dc-bar-fill" style={{ "--fill": "72%" }} />
                                                </div>
                                                <span className="dc-val">72%</span>
                                            </div>
                                            <div className="dc-bar-row">
                                                <span className="dc-zone">Zone B</span>
                                                <div className="dc-bar-track">
                                                    <div className="dc-bar-fill" style={{ "--fill": "58%" }} />
                                                </div>
                                                <span className="dc-val">58%</span>
                                            </div>
                                            <div className="dc-bar-row">
                                                <span className="dc-zone">Zone C</span>
                                                <div className="dc-bar-track">
                                                    <div className="dc-bar-fill dc-bar-fill--warn" style={{ "--fill": "31%" }} />
                                                </div>
                                                <span className="dc-val dc-val--warn">31%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="dc-divider" />

                                    <div className="dc-status-row">
                                        <div className="dc-pill dc-pill--on">
                                            <span className="dc-pill-dot" />Irrigation ON
                                        </div>
                                        <div className="dc-pill dc-pill--ok">
                                            <span className="dc-pill-dot" />Pump OK
                                        </div>
                                    </div>

                                    <div className="dc-chart">
                                        <svg viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%">
                                            <defs>
                                                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#27a35d" stopOpacity="0.3" />
                                                    <stop offset="100%" stopColor="#27a35d" stopOpacity="0" />
                                                </linearGradient>
                                            </defs>
                                            <path d="M0 50 C20 45 30 20 50 25 C70 30 80 10 100 15 C120 20 130 35 150 28 C170 21 180 8 200 12 L200 60 L0 60 Z"
                                                  fill="url(#chartGrad)" />
                                            <path d="M0 50 C20 45 30 20 50 25 C70 30 80 10 100 15 C120 20 130 35 150 28 C170 21 180 8 200 12"
                                                  stroke="#27a35d" strokeWidth="2" strokeLinecap="round" />
                                            <circle cx="200" cy="12" r="3.5" fill="#3ecf7a" />
                                        </svg>
                                        <div className="dc-chart-label">Water Usage — Last 7 days</div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating pills */}
                            <div className="float-pill float-pill--top">
                                <span className="float-dot" />
                                <span>Live Sensor Feed</span>
                            </div>
                            <div className="float-pill float-pill--bot">
                                <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                                    <path d="M8 2V14M2 8H14" stroke="#27a35d" strokeWidth="1.8" strokeLinecap="round" />
                                </svg>
                                <span>Auto-irrigation triggered</span>
                            </div>
                        </div>

                    </div>
                </section>

                {/* ════════════════════════════════════════════
            2. FEATURES SECTION
        ════════════════════════════════════════════ */}
                <section className="section features-section" id="features" aria-labelledby="featuresHeading">
                    <div className="section-inner">
                        <div className="section-header">
                            <span className="section-eyebrow">Platform Capabilities</span>
                            <h2 className="section-title" id="featuresHeading">
                                Everything you need to run<br />a smarter farm
                            </h2>
                            <p className="section-lead">
                                Integrated tools designed to give farmers real-time visibility,
                                automated control, and the data needed to make confident decisions.
                            </p>
                        </div>

                        <div className="features-grid">

                            <article className="feature-card" aria-label="Real-time Soil Monitoring">
                                <div className="feature-icon-wrap feature-icon-wrap--teal">
                                    <svg viewBox="0 0 24 24" fill="none" width="24" height="24" aria-hidden="true">
                                        <path d="M12 3C8 3 4 6 4 10C4 14 8 16 8 20H16C16 16 20 14 20 10C20 6 16 3 12 3Z"
                                              stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                                        <path d="M9 20H15M10 23H14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                        <circle cx="12" cy="10" r="2" fill="currentColor" opacity="0.5" />
                                        <path d="M12 8V6M12 14V12M8 10H6M18 10H16"
                                              stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                    </svg>
                                </div>
                                <h3 className="feature-title">Real-time Soil Monitoring</h3>
                                <p className="feature-desc">
                                    Continuously track moisture, temperature, pH, and nutrient levels across
                                    multiple field zones. Instant alerts notify you the moment conditions
                                    fall outside optimal ranges.
                                </p>
                                <div className="feature-tag">Sensor Network</div>
                            </article>

                            <article className="feature-card" aria-label="Smart Irrigation Automation">
                                <div className="feature-icon-wrap feature-icon-wrap--blue">
                                    <svg viewBox="0 0 24 24" fill="none" width="24" height="24" aria-hidden="true">
                                        <path d="M12 3L8 9H5L3 15H21L19 9H16L12 3Z"
                                              stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                                        <path d="M3 15V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V15"
                                              stroke="currentColor" strokeWidth="1.6" />
                                        <path d="M8 15V18M12 15V18M16 15V18"
                                              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                    </svg>
                                </div>
                                <h3 className="feature-title">Smart Irrigation Automation</h3>
                                <p className="feature-desc">
                                    Schedule and automate irrigation cycles based on live sensor data,
                                    weather forecasts, and crop requirements. Reduce manual intervention
                                    while ensuring fields receive exactly the right amount of water.
                                </p>
                                <div className="feature-tag">Automation</div>
                            </article>

                            <article className="feature-card" aria-label="Data Analytics Dashboard">
                                <div className="feature-icon-wrap feature-icon-wrap--green">
                                    <svg viewBox="0 0 24 24" fill="none" width="24" height="24" aria-hidden="true">
                                        <rect x="3" y="3" width="18" height="18" rx="3"
                                              stroke="currentColor" strokeWidth="1.6" />
                                        <path d="M7 17L10 12L13 14L17 8"
                                              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                        <circle cx="17" cy="8" r="1.5" fill="currentColor" opacity="0.6" />
                                    </svg>
                                </div>
                                <h3 className="feature-title">Data Analytics Dashboard</h3>
                                <p className="feature-desc">
                                    Visualise historical trends, compare field performance, and generate
                                    reports on water consumption and crop yield. Turn raw sensor data into
                                    clear, actionable insights.
                                </p>
                                <div className="feature-tag">Analytics</div>
                            </article>

                            <article className="feature-card" aria-label="Secure Access Control">
                                <div className="feature-icon-wrap feature-icon-wrap--amber">
                                    <svg viewBox="0 0 24 24" fill="none" width="24" height="24" aria-hidden="true">
                                        <rect x="5" y="11" width="14" height="10" rx="2"
                                              stroke="currentColor" strokeWidth="1.6" />
                                        <path d="M8 11V7C8 4.791 9.791 3 12 3C14.209 3 16 4.791 16 7V11"
                                              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                        <circle cx="12" cy="16" r="1.5" fill="currentColor" opacity="0.6" />
                                    </svg>
                                </div>
                                <h3 className="feature-title">Secure Access Control</h3>
                                <p className="feature-desc">
                                    Role-based authentication ensures each team member accesses only what
                                    they need. JWT-secured sessions, audit logs, and encrypted data
                                    transmission protect your operation at every level.
                                </p>
                                <div className="feature-tag">Security</div>
                            </article>

                        </div>
                    </div>
                </section>

                {/* ════════════════════════════════════════════
            3. ABOUT SECTION
        ════════════════════════════════════════════ */}
                <section className="section about-section" id="about" aria-labelledby="aboutHeading">
                    <div className="section-inner about-inner">

                        {/* Left: visual card */}
                        <div className="about-visual" aria-hidden="true">
                            <div className="about-card">
                                <div className="about-card-header">
                                    <div className="about-status">
                                        <span className="badge-dot" />
                                        Active Deployment
                                    </div>
                                </div>
                                <div className="about-metrics">
                                    <div className="am-row">
                                        <span className="am-label">Fields Monitored</span>
                                        <span className="am-value am-value--accent">12 Zones</span>
                                    </div>
                                    <div className="am-bar-wrap">
                                        <div className="am-bar" style={{ "--fill": "88%" }} />
                                    </div>
                                    <div className="am-row">
                                        <span className="am-label">Water Saved This Month</span>
                                        <span className="am-value am-value--accent">4,200 L</span>
                                    </div>
                                    <div className="am-bar-wrap">
                                        <div className="am-bar" style={{ "--fill": "72%" }} />
                                    </div>
                                    <div className="am-row">
                                        <span className="am-label">Irrigation Efficiency</span>
                                        <span className="am-value am-value--accent">98.4%</span>
                                    </div>
                                    <div className="am-bar-wrap">
                                        <div className="am-bar" style={{ "--fill": "98%" }} />
                                    </div>
                                </div>
                                <div className="about-card-footer">
                  <span className="acf-tag">
                    <SmallCheckIcon />
                    Sustainable Farming Certified
                  </span>
                                </div>
                            </div>
                            <div className="about-blob" aria-hidden="true" />
                        </div>

                        {/* Right: text */}
                        <div className="about-content">
                            <span className="section-eyebrow">About the Platform</span>
                            <h2 className="section-title" id="aboutHeading">
                                Built for the future<br />of agriculture
                            </h2>
                            <p className="about-body">
                                The Smart Farming Monitoring System is an intelligent precision-agriculture
                                platform designed to help farmers, agronomists, and land managers make better
                                decisions with less effort. By combining real-time sensor data with automated
                                control logic, the system eliminates guesswork from irrigation management.
                            </p>

                            <ul className="about-list" role="list">
                                {[
                                    "Improves irrigation efficiency and eliminates over-watering",
                                    "Reduces water waste through precision data-driven scheduling",
                                    "Helps farmers make confident, data-driven agronomic decisions",
                                    "Supports sustainable agriculture and long-term soil health",
                                    "Scales from single fields to large multi-zone farm operations",
                                ].map((item) => (
                                    <li key={item} className="about-item">
                    <span className="about-item-icon" aria-hidden="true">
                      <CheckIcon />
                    </span>
                                        {item}
                                    </li>
                                ))}
                            </ul>

                            <button className="btn btn--primary btn--sm" onClick={goToLogin}>
                                Get Started
                                <svg viewBox="0 0 16 16" fill="none" width="14" height="14" aria-hidden="true">
                                    <path d="M3 8H13M13 8L9 4M13 8L9 12"
                                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>

                    </div>
                </section>

                {/* ════════════════════════════════════════════
            4. SUPPORT SECTION
        ════════════════════════════════════════════ */}
                <section className="section support-section" id="support" aria-labelledby="supportHeading">
                    <div className="section-inner">
                        <div className="section-header">
                            <span className="section-eyebrow">Get Help</span>
                            <h2 className="section-title" id="supportHeading">
                                We're here when you need us
                            </h2>
                            <p className="section-lead">
                                Our support team is available to help you get the most from the platform.
                                Reach out through any of the channels below.
                            </p>
                        </div>

                        <div className="support-grid">

                            <div className="support-card">
                                <div className="support-icon-wrap">
                                    <svg viewBox="0 0 24 24" fill="none" width="24" height="24" aria-hidden="true">
                                        <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z"
                                              stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                                        <path d="M22 6L12 13L2 6"
                                              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                    </svg>
                                </div>
                                <h3 className="support-title">Email Support</h3>
                                <p className="support-desc">
                                    Send us a detailed message and we'll respond within one business day.
                                </p>
                                <a href="mailto:ce-bbbenney7122@st.umat.edu.gh" className="support-contact">
                                    ce-bbbenney7122@st.umat.edu.gh
                                </a>
                            </div>

                            <div className="support-card">
                                <div className="support-icon-wrap">
                                    <svg viewBox="0 0 24 24" fill="none" width="24" height="24" aria-hidden="true">
                                        <path d="M6.6 10.8C7.8 13.2 9.8 15.1 12.2 16.4L14.1 14.5C14.3 14.3 14.7 14.2 15 14.4C16 14.7 17.1 14.9 18.2 14.9C18.7 14.9 19.2 15.3 19.2 15.9V18.9C19.2 19.4 18.8 19.9 18.2 19.9C9.8 19.9 3 13.1 3 4.7C3 4.1 3.4 3.7 4 3.7H7C7.5 3.7 8 4.1 8 4.7C8 5.9 8.2 7 8.5 8C8.6 8.3 8.5 8.7 8.3 8.9L6.6 10.8Z"
                                              stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <h3 className="support-title">Phone Support</h3>
                                <p className="support-desc">
                                    Speak directly with a support specialist during active hours.
                                </p>
                                <a href="tel:+233595667189" className="support-contact">
                                    +233 595667189 · +233 241979615 · +233 202734675
                                </a>
                            </div>

                            <div className="support-card support-card--highlight">
                                <div className="support-icon-wrap">
                                    <svg viewBox="0 0 24 24" fill="none" width="24" height="24" aria-hidden="true">
                                        <path d="M3 9L12 2L21 9V20C21 21.1 20.1 22 19 22H5C3.9 22 3 21.1 3 20V9Z"
                                              stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                                        <path d="M9 22V12H15V22"
                                              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <h3 className="support-title">Organisation</h3>
                                <p className="support-desc">University of Mines and Technology</p>
                                <span className="support-contact support-contact--static">
                  Takoradi, SRID campus
                </span>
                            </div>

                        </div>
                    </div>
                </section>

                {/* ════════════════════════════════════════════
            5. FOOTER
        ════════════════════════════════════════════ */}
                <footer className="site-footer" role="contentinfo">
                    <div className="footer-inner">
                        <div className="footer-logo">
                            <SproutIcon width={26} height={26} />
                            <span className="footer-brand">Smart Farming System</span>
                        </div>
                        <p className="footer-copy">
                            &copy; {currentYear} Smart Farming Monitoring System. All rights reserved.
                        </p>
                        <nav className="footer-nav" aria-label="Footer navigation">
                            {["home", "features", "about", "support"].map((id) => (
                                <button key={id} className="footer-link" onClick={() => scrollToSection(id)}>
                                    {id.charAt(0).toUpperCase() + id.slice(1)}
                                </button>
                            ))}
                            <button className="footer-link" onClick={goToLogin}>Login</button>
                        </nav>
                    </div>
                </footer>

            </main>
        </>
    );
}