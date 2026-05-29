// ===== File: src/components/MobileNavOverlay.jsx =====
//
// Backdrop shown behind the slide-in sidebar on mobile.
// Clicking it closes the sidebar.
//
// Uses the existing `.nav-overlay` styles already defined in both
// dashboard stylesheets — no new CSS introduced.

export default function MobileNavOverlay({ open, onClose }) {
    return (
        <div
            className={`nav-overlay${open ? " open visible" : ""}`}
            aria-hidden={!open}
            onClick={onClose}
        />
    );
}
