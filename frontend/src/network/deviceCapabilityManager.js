/**
 * DeviceCapabilityManager
 *
 * Responsible only for detecting device capabilities.
 *
 * This module NEVER:
 * - modifies WebRTC
 * - changes encoder settings
 * - changes bitrate
 * - restarts ICE
 * - communicates with AdaptiveController
 *
 * It simply provides information about the current device.
 */

class DeviceCapabilityManager {
    constructor() {
        this.profile = null;
    }

    detect() {
        const nav = navigator;

        this.profile = {
            hardwareConcurrency: nav.hardwareConcurrency || null,
            deviceMemory: nav.deviceMemory || null,
            userAgent: nav.userAgent,
            platform: nav.platform || null,
            language: nav.language,
            languages: nav.languages || [],
            online: nav.onLine,

            screen: {
                width: window.screen.width,
                height: window.screen.height,
                pixelRatio: window.devicePixelRatio || 1,
            },

            touchSupport:
                "ontouchstart" in window ||
                navigator.maxTouchPoints > 0,

            timezone:
                Intl.DateTimeFormat().resolvedOptions().timeZone,

            detectedAt: Date.now(),
        };

        return this.profile;
    }

    getProfile() {
        if (!this.profile) {
            return this.detect();
        }

        return this.profile;
    }

    refresh() {
        return this.detect();
    }
}

const deviceCapabilityManager = new DeviceCapabilityManager();

export default deviceCapabilityManager;