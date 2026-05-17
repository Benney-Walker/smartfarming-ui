// ===== File: login.js (full — replaces previous version) =====

const ADMIN_URL_V1   = "https://smartfarming-backend-production.up.railway.app/api/admin/v1";

function authHeaders() {
    return {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
    };
}

// ── Admin — Stats ─────────────────────────────────────────────

export async function getUsersCount() {
    const res = await fetch(`${ADMIN_URL_V1}/total-users`, {
        method: "GET", headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res.json(); // { totalUsers }
}

export async function getFieldsCount() {
    const res = await fetch(`${ADMIN_URL_V1}/total-fields`, {
        method: "GET", headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res.json(); // { totalFields }
}

export async function getHybridModelStatus() {
    const res = await fetch(`${ADMIN_URL_V1}/model-status`, {
        method: "GET", headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res.json(); // { status: "ONLINE" | "OFFLINE" }
}

// ── Admin — Users ─────────────────────────────────────────────

export async function loadAllUsers() {
    const res = await fetch(`${ADMIN_URL_V1}/load-users`, {
        method: "GET", headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res.json(); // User[]
}

export async function addNewAdminUser(name, email, phone, role) {
    const res = await fetch(`http://localhost:8080/api/auth/v1/add-new-user`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
            userName: name,
            emailAddress: email,
            phoneNumber: phone,
            role: role }),
    });
    let data = {};
    try { data = await res.json(); } catch { /* empty body */ }
    if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
    return data;
}

export async function updateUserStatus(emailAddress, newStatus) {
    const res = await fetch(`${ADMIN_URL_V1}/user-status`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
            emailAddress: emailAddress,
            status: newStatus,
        }),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res.json();
}

export async function getUserDetails(email) {
    const res = await fetch(`${ADMIN_URL_V1}/user-details/${email}`, {
        method: "GET", headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res.json();
}

// ── Admin — Fields ────────────────────────────────────────────

export async function loadAllFields() {
    const res = await fetch(`${ADMIN_URL_V1}/load-all-fields`, {
        method: "GET", headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res.json(); // Field[]
}

export async function addNewAdminField(farmName, size, location, ownerId) {
    const res = await fetch(`${ADMIN_URL_V1}/fields`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ farmName, size, location, ownerId }),
    });
    let data = {};
    try { data = await res.json(); } catch { /* empty body */ }
    if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
    return data;
}

export async function populateAdminOwnersDropdown() {
    // Returns a minimal list of users to populate the field-owner select
    const res = await fetch(`${ADMIN_URL_V1}/users?role=FARMER`, {
        method: "GET", headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res.json(); // [{ id, name }]
}

// ── Admin — Activity Log ──────────────────────────────────────

export async function loadAdminActivityLog() {
    const res = await fetch(`${ADMIN_URL_V1}/activity`, {
        method: "GET", headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res.json(); // ActivityLog[]
}