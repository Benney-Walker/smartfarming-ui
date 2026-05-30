// ===== File: src/services/dashboard.js =====
//
// Admin dashboard REST services. All requests:
//   • flow through apiFetch (auto-attaches Bearer token)
//   • use the centralized endpoint constants in /config/api.js
//   • throw an Error with the backend message on non-2xx responses

import { apiFetch }     from "./http.js";
import { ADMIN, AUTH }  from "../config/api.js";

// ── Admin — Stats ────────────────────────────────────────────────

export function getUsersCount()        { return apiFetch(ADMIN.totalUsers);   }
export function getFieldsCount()       { return apiFetch(ADMIN.totalFields);  }
export function getHybridModelStatus() { return apiFetch(ADMIN.modelStatus);  }

// Optional aggregate stats endpoint (placeholder). Returns whatever the
// backend exposes for the top dashboard cards — the consumer treats
// missing fields as "—".
export function getDashboardStats() {
    return apiFetch(ADMIN.dashboardStats);
}

// Recent irrigation commands (table on the admin dashboard home).
export function getRecentCommands() {
    return apiFetch(ADMIN.recentCommands);
}

// Water usage stat (top-right card).
export function getWaterUsage() {
    return apiFetch(ADMIN.waterUsage);
}

// Admin alerts (REST hydration; WS pushes updates).
export function getAdminAlerts() {
    return apiFetch(ADMIN.alerts);
}

// ── Admin — Users ────────────────────────────────────────────────

export function loadAllUsers() {
    return apiFetch(ADMIN.loadUsers);
}

export function addNewAdminUser(name, email, phone, role) {
    return apiFetch(AUTH.addNewUser, {
        method: "POST",
        body: {
            userName:     name,
            emailAddress: email,
            phoneNumber:  phone,
            role,
        },
    });
}

export function updateUserStatus(emailAddress, newStatus) {
    return apiFetch(ADMIN.userStatus, {
        method: "PUT",
        body:   { emailAddress, status: newStatus },
    });
}

export function getUserDetails(email) {
    return apiFetch(ADMIN.userDetails(email));
}

// ── Admin — Fields ───────────────────────────────────────────────

export function loadAllFields() {
    return apiFetch(ADMIN.loadAllFields);
}

export function addNewAdminField(farmName, size, location, ownerId) {
    return apiFetch(ADMIN.addField, {
        method: "POST",
        body:   { farmName, size, location, ownerId },
    });
}

export function populateAdminOwnersDropdown() {
    return apiFetch(ADMIN.ownersDropdown);
}

// ── Admin — Activity Log ─────────────────────────────────────────

export function loadAdminActivityLog() {
    return apiFetch(ADMIN.activityLog);
}
