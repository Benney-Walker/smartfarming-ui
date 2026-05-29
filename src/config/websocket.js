// ===== File: src/config/websocket.js =====
//
// Centralized WebSocket / STOMP configuration.
//
// The application talks STOMP over SockJS. Topics are grouped by role
// so each dashboard only subscribes to what it needs.
//
// To swap a topic name later, change it here only.

import { BASE_URL } from "./api.js";

// SockJS endpoint exposed by the backend
export const WS_URL = `${BASE_URL}/ws`;

// Reconnect cadence (milliseconds)
export const WS_RECONNECT_DELAY = 5000;

// Subscription topics
export const WS_TOPICS = {
    admin: {
        stats:           "/topic/admin/stats",
        alerts:          "/topic/admin/alerts",
        logs:            "/topic/admin/logs",
        recentCommands:  "/topic/admin/recent-commands",
        hybridStatus:    "/topic/admin/hybrid-status",
    },
    farmer: {
        alerts:          "/topic/farmer/alerts",
        sensors:         "/topic/farmer/sensors",
        soilData:        "/topic/farmer/soil-data",
        irrigation:      "/topic/farmer/irrigation",
        fieldStatus:     "/topic/farmer/field-status",
    },
};

// Possible connection states surfaced to the UI.
// "RECONNECTING" is set whenever the client lost a previous connection
// and is currently re-attempting via STOMP's auto-reconnect.
export const WS_STATUS = Object.freeze({
    IDLE:          "IDLE",
    CONNECTING:    "CONNECTING",
    CONNECTED:     "CONNECTED",
    RECONNECTING:  "RECONNECTING",
    DISCONNECTED: "DISCONNECTED",
});
