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
        this.lastDetection = null;
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

            browser: this.detectBrowser(),

            media: {
                mediaDevices: !!navigator.mediaDevices,
                getUserMedia:
                    !!navigator.mediaDevices?.getUserMedia,
                enumerateDevices:
                    !!navigator.mediaDevices?.enumerateDevices,
            },

            detectedAt: Date.now(),
        };

        this.lastDetection = this.profile.detectedAt;

        return this.profile;
    }

    detectBrowser() {
        const ua = navigator.userAgent;

        if (ua.includes("Edg")) return "Edge";
        if (ua.includes("Chrome")) return "Chrome";
        if (ua.includes("Firefox")) return "Firefox";
        if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";

        return "Unknown";
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

    isMobile() {
        return /Android|iPhone|iPad|iPod|Mobile/i.test(
            navigator.userAgent
        );
    }

    isDesktop() {
        return !this.isMobile();
    }

    supportsTouch() {
        return this.profile?.touchSupport ?? false;
    }

    getBrowser() {
        return this.profile?.browser ?? "Unknown";
    }

    getHardwareProfile() {
        return {
            cpu: this.profile?.hardwareConcurrency,
            memory: this.profile?.deviceMemory,
            browser: this.profile?.browser,
            mobile: this.isMobile(),
        };
    }

    getLastDetectionTime() {
        return this.lastDetection;
    }
}

const deviceCapabilityManager = new DeviceCapabilityManager();

export default deviceCapabilityManager;