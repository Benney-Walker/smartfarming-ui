// ===== File: useWebSocket.js =====

import { useEffect, useRef } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

const WS_URL = "http://localhost:8080/ws";
const RECONNECT_DELAY = 5000;

export function useWebSocket({
                                 onWsStatus,
                                 onAlerts,
                                 onDashboardStats,
                                 onIrrigationCommand,
                             } = {}) {
    const stompRef = useRef(null);

    useEffect(() => {
        if (!onWsStatus) return;

        onWsStatus("Connecting…");

        const client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            reconnectDelay: RECONNECT_DELAY,
            debug: () => {},

            onConnect: () => {
                onWsStatus("Connected");

                // ✅ Alerts (if your backend supports it)
                if (onAlerts) {
                    client.subscribe("/topic/alerts", (msg) => {
                        try {
                            const data = JSON.parse(msg.body);
                            onAlerts(Array.isArray(data) ? data : [data]);
                        } catch (e) {
                            console.error("Alerts parse error:", e);
                        }
                    });
                }

                // ✅ Admin stats
                if (onDashboardStats) {
                    client.subscribe("/topic/admin/stats", (msg) => {
                        try {
                            onDashboardStats(JSON.parse(msg.body));
                        } catch {}
                    });
                }

                // ✅ Irrigation events
                if (onIrrigationCommand) {
                    client.subscribe("/topic/admin/irrigation", (msg) => {
                        try {
                            onIrrigationCommand(JSON.parse(msg.body));
                        } catch {}
                    });
                }
            },

            onDisconnect: () => {
                onWsStatus("Disconnected");
            },

            onStompError: (frame) => {
                console.error("STOMP error:", frame);
                onWsStatus("Disconnected");
            },

            onWebSocketError: (error) => {
                console.error("WebSocket error:", error);
                onWsStatus("Disconnected");
            },
        });

        try {
            client.activate();
            stompRef.current = client;
        } catch (e) {
            console.warn("WebSocket failed to start:", e);
            onWsStatus("Disconnected");
        }

        return () => {
            if (stompRef.current) {
                stompRef.current.deactivate();
            }
        };
    }, []); // run once
}