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
        this.previousSnapshot = null;
        this.initialized = false;

        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleOnline = this.handleOnline.bind(this);
        this.handleOffline = this.handleOffline.bind(this);
        this.handleFocus = this.handleFocus.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
    }

    collect() {
        const nav = navigator;
        const connection = this.getNetworkInformation();

        this.previousSnapshot = this.snapshot;

        this.snapshot = {
            hardwareConcurrency: nav.hardwareConcurrency || null,
            deviceMemory: nav.deviceMemory || null,

            online: nav.onLine,

            visibilityState: document.visibilityState,
            hidden: document.hidden,
            pageFocused: document.hasFocus(),

            viewport: {
                width: window.innerWidth || null,
                height: window.innerHeight || null,
                pixelRatio: window.devicePixelRatio || 1
            },

            screen: {
                width: window.screen?.width || null,
                height: window.screen?.height || null,
                availableWidth: window.screen?.availWidth || null,
                availableHeight: window.screen?.availHeight || null
            },

            connection,

            memory: this.getMemoryInfo(),
            performance: this.getPerformanceInfo(),

            pressure: this.calculateResourcePressure(connection),

            timestamp: Date.now()
        };

        return this.snapshot;
    }

    getNetworkInformation() {
        const connection =
            navigator.connection ||
            navigator.mozConnection ||
            navigator.webkitConnection ||
            null;

        return {
            online: navigator.onLine,
            userAgent: navigator.userAgent,
            language: navigator.language,

            effectiveType: connection?.effectiveType || null,
            downlink: connection?.downlink || null,
            rtt: connection?.rtt || null,
            saveData: Boolean(connection?.saveData),
            type: connection?.type || null
        };
    }

    getMemoryInfo() {
        const memory = performance?.memory;

        if (!memory) {
            return {
                supported: false,
                usedJSHeapSize: null,
                totalJSHeapSize: null,
                jsHeapSizeLimit: null,
                usageRatio: null
            };
        }

        return {
            supported: true,
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            usageRatio: memory.jsHeapSizeLimit
                ? memory.usedJSHeapSize / memory.jsHeapSizeLimit
                : null
        };
    }

    getPerformanceInfo() {
        if (typeof performance === "undefined") {
            return {
                supported: false,
                now: null,
                navigationType: null
            };
        }

        const navigation = performance.getEntriesByType?.("navigation")?.[0];

        return {
            supported: true,
            now: performance.now(),
            navigationType: navigation?.type || null,
            pageLoadDuration: navigation?.duration || null
        };
    }

    calculateResourcePressure(connection) {
        let score = 0;
        const reasons = [];

        if (document.hidden) {
            score += 20;
            reasons.push("page_hidden");
        }

        if (!document.hasFocus()) {
            score += 10;
            reasons.push("page_not_focused");
        }

        if (!navigator.onLine) {
            score += 60;
            reasons.push("offline");
        }

        if (connection?.saveData) {
            score += 20;
            reasons.push("save_data_enabled");
        }

        if (connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g") {
            score += 35;
            reasons.push("slow_network_type");
        }

        const memory = this.getMemoryInfo();

        if (memory.usageRatio !== null && memory.usageRatio > 0.85) {
            score += 25;
            reasons.push("high_memory_usage");
        }

        return {
            score: Math.max(0, Math.min(100, score)),
            level: this.getPressureLevel(score),
            reasons
        };
    }

    getPressureLevel(score) {
        if (score >= 70) return "HIGH";
        if (score >= 35) return "MEDIUM";
        if (score > 0) return "LOW";

        return "NONE";
    }

    getSnapshot() {
        if (!this.snapshot) {
            return this.collect();
        }

        return this.snapshot;
    }

    getState() {
        return this.getSnapshot();
    }

    refresh() {
        if (!this.initialized) {
            this.initialize();
        }

        return this.collect();
    }

    initialize() {
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

        window.addEventListener(
            "focus",
            this.handleFocus
        );

        window.addEventListener(
            "blur",
            this.handleBlur
        );

        this.initialized = true;
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

    handleFocus() {
        this.collect();
    }

    handleBlur() {
        this.collect();
    }

    destroy() {
        if (!this.initialized) {
            return;
        }

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

        window.removeEventListener(
            "focus",
            this.handleFocus
        );

        window.removeEventListener(
            "blur",
            this.handleBlur
        );

        this.initialized = false;
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
        return this.getSnapshot().connection ?? {};
    }

    getResourcePressure() {
        return this.getSnapshot().pressure;
    }

    getMemoryInfoSnapshot() {
        return this.getSnapshot().memory;
    }

    getDiagnostics() {
        const snapshot = this.getSnapshot();

        return {
            initialized: this.initialized,
            online: snapshot.online,
            visibilityState: snapshot.visibilityState,
            hidden: snapshot.hidden,
            pageFocused: snapshot.pageFocused,
            connection: snapshot.connection,
            memory: snapshot.memory,
            performance: snapshot.performance,
            pressure: snapshot.pressure,
            timestamp: snapshot.timestamp
        };
    }
}

const resourceMonitor = new ResourceMonitor();

export { ResourceMonitor };
export default resourceMonitor;