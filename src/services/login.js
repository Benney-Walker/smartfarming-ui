// ===== File: login.js =====

const BASE_URL = "https://smartfarming-backend-production.up.railway.app/api/auth";

export async function checkUser(email) {
    const response = await fetch(
        `${BASE_URL}/check-user?emailAddress=${encodeURIComponent(email)}`,
        { method: "GET" }
    );

    if (response.status === 404) return null;

    if (!response.ok) {
        throw new Error(`Unexpected status: ${response.status}`);
    }

    return response.json();
}

/**
 * Logs the user in with the given credentials.
 * Returns the parsed JSON body ({ token, username, role }).
 * Throws on any non-OK response or network error.
 */
export async function loginUser(username, password) {
    const response = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
    }

    return response.json();
}