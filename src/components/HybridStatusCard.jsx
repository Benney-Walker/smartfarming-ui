// ===== File: src/components/HybridStatusCard.jsx =====
//
// Floating "Hybrid Model" status card used on the Admin dashboard.
//
// Replaces the previous dangerouslySetInnerHTML approach with proper
// React JSX. Reflects four distinct states:
//
//   ONLINE        — model reachable
//   OFFLINE       — model unreachable
//   RECONNECTING  — connection lost, retrying
//   UNKNOWN       — never received status yet
//
// Uses the existing `.hybrid-card`, `.hybrid-status--*` and
// `.hybrid-dot--*` classes from admindashboard.css. A small
// `.hybrid-dot--reconnecting / .hybrid-status--reconnecting` rule is
// added in src/styles/_dashboard-patches.css so the reconnecting state
// inherits the established design language.

const LABELS = {
    ONLINE:       "Online",
    OFFLINE:      "Offline",
    RECONNECTING: "Reconnecting…",
    UNKNOWN:      "—",
};

function normalizeStatus(s) {
    if (s == null) return "UNKNOWN";
    const v = String(s).toUpperCase();
    if (v === "ONLINE" || v === "CONNECTED")          return "ONLINE";
    if (v === "OFFLINE" || v === "DISCONNECTED")      return "OFFLINE";
    if (v === "RECONNECTING" || v === "CONNECTING")   return "RECONNECTING";
    return "UNKNOWN";
}

const ICON_HEX = (
    <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
        <path d="M10 2L12.4 7.4H18L13.5 10.8L15.3 16L10 12.7L4.7 16L6.5 10.8L2 7.4H7.6L10 2Z"
              fill="currentColor" opacity=".8" />
    </svg>
);

const ICON_REFRESH = (
    <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
        <path d="M8 1V4M8 12V15M1 8H4M12 8H15M3 3L5 5M11 11L13 13M13 3L11 5M5 11L3 13"
              stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
);

/**
 * @param {object} props
 * @param {string} props.status   Raw status from REST or WS. Accepts
 *                                ONLINE/OFFLINE/RECONNECTING/CONNECTING/
 *                                CONNECTED/DISCONNECTED — anything else
 *                                renders as "—".
 * @param {() => void} [props.onRefresh]   Manual refresh handler.
 * @param {boolean} [props.refreshing]     Disables the refresh button.
 */
export default function HybridStatusCard({ status, onRefresh, refreshing }) {
    const norm = normalizeStatus(status);
    const dotClass    = `hybrid-dot hybrid-dot--${norm.toLowerCase()}`;
    const statusClass = `hybrid-status hybrid-status--${norm.toLowerCase()}`;
    const label       = LABELS[norm];

    return (
        <div className="hybrid-card" role="status"
             aria-label="Hybrid model system status" aria-live="polite">
            <div className="hybrid-icon" aria-hidden="true">{ICON_HEX}</div>
            <div className="hybrid-info">
                <span className="hybrid-label">Hybrid Model</span>
                <span className={statusClass}>
                    <span className={dotClass} aria-hidden="true" />
                    <span>{label}</span>
                </span>
            </div>
            {onRefresh && (
                <button
                    className="hybrid-toggle"
                    aria-label="Refresh hybrid model status"
                    title="Refresh status"
                    onClick={onRefresh}
                    disabled={!!refreshing}
                >
                    {ICON_REFRESH}
                </button>
            )}
        </div>
    );
}
