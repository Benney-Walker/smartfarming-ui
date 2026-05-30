
import { apiFetch } from "./http.js";
import { FARMER }   from "../config/api.js";

const opts = { withEmail: true };


export function getFarmerStats() {
    return apiFetch(FARMER.dashboardStats, opts);
}

// ── Lists ────────────────────────────────────────────────────────
// Each returns an array. Empty array on no data; never null.

// Field[]    : { id, name, location, size, status }
export function getFarmerFields() {
    return apiFetch(FARMER.fields, opts);
}

// Sensor[]   : { name, field, type, status, reading, updated }
export function getFarmerSensors() {
    return apiFetch(FARMER.sensors, opts);
}

// IrrigEvent[] : { time, field, action, trigger, status }
export function getRecentIrrigations() {
    return apiFetch(FARMER.irrigationRecent, opts);
}

// IrrigLog[]   : { field, mode, start, end, duration, feedback }
export function getIrrigationHistory() {
    return apiFetch(FARMER.irrigationHistory, opts);
}

// Alert[]    : { time, field, message, severity }
export function getFarmerAlerts() {
    return apiFetch(FARMER.alerts, opts);
}

// ── Single object ───────────────────────────────────────────────
// SoilSnapshot : { moisture, temperature, temperaturePct, humidity, updatedAt }
export function getSoilSnapshot() {
    return apiFetch(FARMER.soilSnapshot, opts);
}
