
import { useEffect, useRef } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

import {
    WS_URL,
    WS_RECONNECT_DELAY,
    WS_STATUS,
} from "../../../../smartfarming-ui/src/config/websocket.js";


export function useWebSocket({
                                 onStatus,
                                 subscriptions = {},
                                 enabled       = true,
                             } = {}) {

    // Hold callbacks in a ref so callers can pass new closures every
    // render without forcing the socket to reconnect. Refs are synced
    // inside an effect (never written during render).
    const subsRef   = useRef(subscriptions);
    const statusRef = useRef(onStatus);

    useEffect(() => {
        subsRef.current   = subscriptions;
        statusRef.current = onStatus;
    });

    // Key the effect on the *sorted list of topics* — handler identity
    // is irrelevant for socket lifecycle decisions.
    const topicsKey = Object.keys(subscriptions).sort().join("|");

    useEffect(() => {
        if (!enabled) return undefined;

        let stoppedByUnmount = false;
        let hasConnectedOnce = false;
        const subscriptionHandles = [];

        const emit = (s) => { try { statusRef.current?.(s); } catch { /* ignore */ } };

        emit(WS_STATUS.CONNECTING);

        const client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            reconnectDelay:   WS_RECONNECT_DELAY,
            debug:            () => { /* silent */ },

            onConnect: () => {
                hasConnectedOnce = true;
                emit(WS_STATUS.CONNECTED);

                // Wipe any prior handles (defensive — onConnect can fire
                // again after a reconnect).
                while (subscriptionHandles.length) {
                    try { subscriptionHandles.pop().unsubscribe(); }
                    catch { /* already gone */ }
                }

                for (const topic of Object.keys(subsRef.current)) {
                    const handle = client.subscribe(topic, (message) => {
                        const handler = subsRef.current[topic];
                        if (!handler) return;
                        let payload = message.body;
                        try { payload = JSON.parse(message.body); }
                        catch { /* leave as raw string */ }
                        try { handler(payload); }
                        catch (e) { console.error(`WS handler error for ${topic}:`, e); }
                    });
                    subscriptionHandles.push(handle);
                }
            },

            onWebSocketClose: () => {
                if (stoppedByUnmount) return;
                // STOMP will automatically retry; surface that state.
                emit(hasConnectedOnce ? WS_STATUS.RECONNECTING : WS_STATUS.DISCONNECTED);
            },

            onDisconnect: () => {
                if (stoppedByUnmount) return;
                emit(WS_STATUS.DISCONNECTED);
            },

            onStompError: (frame) => {
                console.error("STOMP broker error:", frame?.headers?.message || frame);
                emit(WS_STATUS.DISCONNECTED);
            },

            onWebSocketError: (e) => {
                console.error("WebSocket transport error:", e);
                emit(hasConnectedOnce ? WS_STATUS.RECONNECTING : WS_STATUS.DISCONNECTED);
            },
        });

        client.activate();

        return () => {
            stoppedByUnmount = true;
            while (subscriptionHandles.length) {
                try { subscriptionHandles.pop().unsubscribe(); }
                catch { /* already gone */ }
            }
            // deactivate() is async but safe to ignore — it tears down
            // the underlying socket and clears the reconnect timer.
            client.deactivate().catch(() => {});
            emit(WS_STATUS.IDLE);
        };
        // The effect intentionally re-runs only when:
        //   • the consumer toggles `enabled`
        //   • the set of topics changes (handler identity does not matter,
        //     since handlers are read through subsRef at call time)
    }, [enabled, topicsKey]);
}
