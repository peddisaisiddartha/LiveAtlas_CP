/**
 * ResourceMonitor
 *
 * Responsible ONLY for observing browser and device resources.
 *
 * This module NEVER:
 * - modifies WebRTC
 * - changes encoder settings
 * - changes bitrate
 * - restarts ICE
 * - communicates with AdaptiveController
 *
 * It simply provides a snapshot of the current environment.
 */

class ResourceMonitor {
    constructor() {
    this.snapshot = null;

    this.handleVisibilityChange =
        this.handleVisibilityChange.bind(this);

    this.handleOnline =
        this.handleOnline.bind(this);

    this.handleOffline =
        this.handleOffline.bind(this);

    this.initialized = false;
}

    collect() {
        const nav = navigator;

        this.snapshot = {
            hardwareConcurrency: nav.hardwareConcurrency || null,
            deviceMemory: nav.deviceMemory || null,

            online: nav.onLine,

            visibilityState: document.visibilityState,
            hidden: document.hidden,

            pageFocused: document.hasFocus(),

            connection: {
                online: navigator.onLine,
                userAgent: navigator.userAgent,
                language: navigator.language,
            },

            timestamp: Date.now(),
        };

        return this.snapshot;
    }

    getSnapshot() {
        if (!this.snapshot) {
            return this.collect();
        }

        return this.snapshot;
    }

    refresh() {

    if (!this.initialized) {

        document.addEventListener(
            "visibilitychange",
            this.handleVisibilityChange
        );

        window.addEventListener(
            "online",
            this.handleOnline
        );

        window.addEventListener(
            "offline",
            this.handleOffline
        );

        this.initialized = true;
    }

    return this.collect();
}
handleVisibilityChange() {
    this.collect();
}

handleOnline() {
    this.collect();
}

handleOffline() {
    this.collect();
}

destroy() {
    document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange
    );

    window.removeEventListener(
        "online",
        this.handleOnline
    );

    window.removeEventListener(
        "offline",
        this.handleOffline
    );
}

    isPageVisible() {
        return !document.hidden;
    }

        isOnline() {
        return navigator.onLine;
    }

    isPageFocused() {
        return document.hasFocus();
    }

    getVisibilityState() {
        return document.visibilityState;
    }

    getConnectionInfo() {
        return this.snapshot?.connection ?? {};
    }
}

const resourceMonitor = new ResourceMonitor();

export default resourceMonitor;