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
    }

    collect() {
        const nav = navigator;

        this.snapshot = {
            hardwareConcurrency: nav.hardwareConcurrency || null,
            deviceMemory: nav.deviceMemory || null,

            online: nav.onLine,

            visibilityState: document.visibilityState,
            hidden: document.hidden,

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
        return this.collect();
    }

    isPageVisible() {
        return !document.hidden;
    }

    isOnline() {
        return navigator.onLine;
    }
}

const resourceMonitor = new ResourceMonitor();

export default resourceMonitor;