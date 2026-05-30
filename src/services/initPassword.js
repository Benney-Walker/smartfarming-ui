// ===== File: src/services/initPassword.js =====
//
// Sets a first-time user's password.

import { BASE_URL, AUTH } from "../config/api.js";

/**
 * Sets a new password for a first-time user.
 * Throws with a human-readable message on failure.
 */
export async function setNewPassword(emailAddress, initialPassword) {
    const response = await fetch(`${BASE_URL}${AUTH.setNewPassword}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailAddress, initialPassword }),
    });

    let data = {};
    try { data = await response.json(); }
    catch { /* empty or non-JSON body — ignore */ }

    if (!response.ok) {
        throw new Error(
            data.message ||
            `Something went wrong (${response.status}). Please try again.`
        );
    }
    return data;
}
