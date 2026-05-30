
import { BASE_URL } from "../config/api.js";

function buildHeaders({ withEmail = false, extra = {} } = {}) {
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("email");

    const headers = {
        "Content-Type": "application/json",
        ...extra,
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (withEmail && email) headers["email"] = email;
    return headers;
}

async function parseJsonSafe(res) {
    const text = await res.text();
    if (!text) return {};
    try { return JSON.parse(text); }
    catch { return { _raw: text }; }
}

/**
 * Authenticated fetch.
 *
 * @param {string} path        Path beginning with "/", e.g. "/api/admin/v1/total-users".
 * @param {object} [opts]
 * @param {string} [opts.method="GET"]
 * @param {object} [opts.body]              JSON-serializable payload.
 * @param {boolean}[opts.withEmail=false]   Attach `email` header.
 * @param {object} [opts.headers]           Extra headers to merge.
 * @param {AbortSignal} [opts.signal]       For cancellation.
 *
 * @returns {Promise<any>}  Parsed JSON response, or {} on empty body.
 * @throws  {Error} On non-2xx response. `.status` carries the HTTP code.
 */
export async function apiFetch(path, opts = {}) {
    const {
        method    = "GET",
        body      = null,
        withEmail = false,
        headers   = {},
        signal,
    } = opts;

    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: buildHeaders({ withEmail, extra: headers }),
        body: body == null ? undefined : JSON.stringify(body),
        signal,
    });

    const data = await parseJsonSafe(res);

    if (!res.ok) {
        const err = new Error(data.message || `HTTP ${res.status}`);
        err.status = res.status;
        err.body   = data;
        throw err;
    }
    return data;
}

// Convenience: 404 → null, anything else throws.
export async function apiFetchOrNull(path, opts = {}) {
    try {
        return await apiFetch(path, opts);
    } catch (e) {
        if (e.status === 404) return null;
        throw e;
    }
}
