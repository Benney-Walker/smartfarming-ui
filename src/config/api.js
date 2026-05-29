// ===== File: src/config/api.js =====
//
// Centralized API configuration.
//
// Every endpoint path used by the app lives here. To point the frontend
// at a different backend, change BASE_URL. To rename a route, change a
// single constant — no other file needs to be edited.
//
// Conventions:
//   • All paths begin with "/"; BASE_URL has NO trailing slash.
//   • Endpoint names are grouped by domain: auth / admin / farmer.
//   • Endpoints that take a parameter export a function; static ones
//     are plain string constants.

export const BASE_URL =
    "https://smartfarming-backend-production.up.railway.app";

// ── Auth ─────────────────────────────────────────────────────────
export const AUTH = {
    checkUser:       (email) => `/api/auth/check-user?emailAddress=${encodeURIComponent(email)}`,
    login:           "/api/auth/login",
    setNewPassword:  "/api/auth/set-new-password",
    addNewUser:      "/api/auth/v1/add-new-user",
};

// ── Admin ────────────────────────────────────────────────────────
//
// NOTE: these paths reflect what the current backend exposes
// (`/api/admin/v1/...`). The spec's suggested paths (`/api/admin/...`)
// can be migrated to here by editing this object — no consumer needs
// to change.
export const ADMIN = {
    // Dashboard stats
    totalUsers:      "/api/admin/v1/total-users",
    totalFields:     "/api/admin/v1/total-fields",
    modelStatus:     "/api/admin/v1/model-status",
    dashboardStats:  "/api/admin/v1/dashboard-stats",     // placeholder
    hybridStatus:    "/api/admin/v1/model-status",
    recentCommands:  "/api/admin/v1/recent-commands",     // placeholder
    waterUsage:      "/api/admin/v1/water-usage",         // placeholder

    // Users
    loadUsers:       "/api/admin/v1/load-users",
    userStatus:      "/api/admin/v1/user-status",
    userDetails:     (email) => `/api/admin/v1/user-details/${encodeURIComponent(email)}`,
    ownersDropdown:  "/api/admin/v1/users?role=FARMER",

    // Fields
    loadAllFields:   "/api/admin/v1/load-all-fields",
    addField:        "/api/admin/v1/fields",

    // Logs / alerts
    activityLog:     "/api/admin/v1/activity",
    alerts:          "/api/admin/v1/alerts",              // placeholder
};

// ── Farmer ───────────────────────────────────────────────────────
//
// These follow the suggested paths in the spec. They are placeholders;
// the backend may expose different routes. Update here once decided.
export const FARMER = {
    dashboardStats:  "/api/farmer/dashboard/stats",
    fields:          "/api/farmer/fields",
    sensors:         "/api/farmer/sensors",
    irrigationRecent:"/api/farmer/irrigation/recent",
    irrigationHistory:"/api/farmer/irrigation/history",
    soilSnapshot:    "/api/farmer/soil/snapshot",
    alerts:          "/api/farmer/alerts",
};

// Convenience helper: build a full URL.
export function url(path) {
    return `${BASE_URL}${path}`;
}
