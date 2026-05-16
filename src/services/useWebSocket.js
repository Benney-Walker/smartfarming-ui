// useWebSocket.js

import { useEffect } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

const WS_URL = "https://smartfarming-backend-production.up.railway.app/ws";

export function useWebSocket({
                                 onWsStatus,
                                 onAlerts,
                                 onLogs,
                                 onRecentCommands,
                             } = {}) {

    useEffect(() => {

        onWsStatus?.("Connecting...");

        const client = new Client({

            webSocketFactory: () => new SockJS(WS_URL),

            reconnectDelay: 5000,

            debug: () => {},

            onConnect: () => {

                console.log("WebSocket connected");

                onWsStatus?.("Connected");

                // 🚨 ALERTS
                if (onAlerts) {
                    client.subscribe("/topic/alerts", (message) => {
                        try {
                            const data = JSON.parse(message.body);
                            onAlerts(data);
                        } catch (e) {
                            console.error("Alerts parse error:", e);
                        }
                    });
                }

                // 📜 LOGS
                if (onLogs) {
                    client.subscribe("/topic/logs", (message) => {
                        try {
                            const data = JSON.parse(message.body);
                            onLogs(data);
                        } catch (e) {
                            console.error("Logs parse error:", e);
                        }
                    });
                }

                // 💧 RECENT COMMANDS
                if (onRecentCommands) {
                    client.subscribe("/topic/recent-commands", (message) => {
                        try {
                            const data = JSON.parse(message.body);
                            onRecentCommands(data);
                        } catch (e) {
                            console.error("Recent commands parse error:", e);
                        }
                    });
                }

            },

            onDisconnect: () => {
                console.log("WebSocket disconnected");
                onWsStatus?.("Disconnected");
            },

            onStompError: (frame) => {
                console.error("STOMP error:", frame);
                onWsStatus?.("Disconnected");
            },

            onWebSocketError: (error) => {
                console.error("WebSocket error:", error);
                onWsStatus?.("Disconnected");
            },
        });

        client.activate();

        return () => {
            client.deactivate();
        };

    }, []);
}