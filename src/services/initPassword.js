// ===== File: login.js (updated — append setNewPassword to the existing file) =====

const BASE_URL = "https://smartfarming-backend-production.up.railway.app/api/auth";

/**
 * Sets a new password for a first-time user.
 * Throws with a human-readable message on failure.
 */
export async function setNewPassword(emailAddress, initialPassword) {
    const response = await fetch(`${BASE_URL}/set-new-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailAddress, initialPassword }),
    });

    let data = {};
    try {
        data = await response.json();
    } catch {
        /* empty or non-JSON body — ignore */
    }

    if (!response.ok) {
        throw new Error(
            data.message ||
            `Something went wrong (${response.status}). Please try again.`
        );
    }

    return data;
}