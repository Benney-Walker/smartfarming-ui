
import { BASE_URL, AUTH } from "../config/api.js";

/**
 * Look up whether an email belongs to a known user.
 * Returns { status: "NEW_USER" | "OLD_USER", ... } on success,
 * or `null` when the backend responds with 404.
 * Throws on any other non-OK response.
 */
export async function checkUser(email) {
    const response = await fetch(`${BASE_URL}${AUTH.checkUser(email)}`, {
        method: "GET",
    });

    if (response.status === 404) return null;
    if (!response.ok) {
        throw new Error(`Unexpected status: ${response.status}`);
    }
    return response.json();
}

/**
 * Logs the user in with the given credentials.
 *
 * @returns {{ token: string, email: string, role: string }}
 * @throws  {Error} On any non-OK response or network error.
 */
export async function loginUser(emailOrUsername, password) {
    const response = await fetch(`${BASE_URL}${AUTH.login}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The backend still accepts the field name `username` for the
        // submitted identifier — the *response* shape is what changed.
        body: JSON.stringify({ username: emailOrUsername, password }),
    });

    if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
    }
    return response.json();
}
