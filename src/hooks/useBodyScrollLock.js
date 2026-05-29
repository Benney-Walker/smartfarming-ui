// ===== File: src/hooks/useBodyScrollLock.js =====
//
// Locks `document.body` scrolling while `locked` is true.
// Reference-counted so multiple consumers (e.g. mobile sidebar AND a
// modal) can lock concurrently; the body is only unlocked once every
// consumer has released its lock.

import { useEffect } from "react";

let lockCount = 0;
let previousOverflow = "";

function acquire() {
    if (lockCount === 0) {
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
    }
    lockCount += 1;
}

function release() {
    if (lockCount === 0) return;
    lockCount -= 1;
    if (lockCount === 0) {
        document.body.style.overflow = previousOverflow;
    }
}

/**
 * Locks body scroll while `locked` is true.
 *
 * @param {boolean} locked
 */
export function useBodyScrollLock(locked) {
    useEffect(() => {
        if (!locked) return undefined;
        acquire();
        return release;
    }, [locked]);
}
