/**
 * DeviceCapabilityManager
 *
 * Read-only device and browser capability detector.
 *
 * This module never:
 * - modifies WebRTC
 * - changes encoder settings
 * - changes bitrate
 * - restarts ICE
 * - communicates with AdaptiveController
 *
 * It only reports the current browser/device environment.
 */

class DeviceCapabilityManager {
    constructor() {
        this.profile = null;
        this.lastDetection = null;
    }

    detect() {
        const nav = navigator;
        const browser = this.detectBrowser();
        const screen = this.getScreenInfo();

        this.profile = {
            browser,
            userAgent: nav.userAgent || "",
            platform: nav.platform || null,
            language: nav.language || null,
            languages: nav.languages || [],
            online: nav.onLine,

            hardwareConcurrency: nav.hardwareConcurrency || null,
            deviceMemory: nav.deviceMemory || null,

            mobile: this.detectMobile(),
            desktop: !this.detectMobile(),
            touchSupport: this.detectTouchSupport(),

            screen,
            timezone: this.detectTimezone(),

            media: this.detectMediaCapabilities(),
            webrtc: this.detectWebRTCCapabilities(),
            browserCapabilities: this.detectBrowserCapabilities(browser),
            performance: this.detectPerformanceCapabilities(),

            qualityHints: this.getQualityHints({
                browser,
                screen,
                hardwareConcurrency: nav.hardwareConcurrency,
                deviceMemory: nav.deviceMemory
            }),

            detectedAt: Date.now()
        };

        this.lastDetection = this.profile.detectedAt;

        return this.profile;
    }

    detectBrowser() {
        const ua = navigator.userAgent || "";

        if (ua.includes("Edg/")) return "Edge";
        if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
        if (ua.includes("Firefox/")) return "Firefox";
        if (ua.includes("Chrome/") || ua.includes("CriOS/")) return "Chrome";
        if (ua.includes("Safari/") && !ua.includes("Chrome")) return "Safari";

        return "Unknown";
    }

    detectBrowserCapabilities(browser) {
        return {
            browser,

            supportsSenderParameters:
                typeof RTCRtpSender !== "undefined" &&
                typeof RTCRtpSender.prototype?.getParameters === "function" &&
                typeof RTCRtpSender.prototype?.setParameters === "function",

            supportsReceiverStats:
                typeof RTCRtpReceiver !== "undefined",

            supportsTransceiver:
                typeof RTCRtpTransceiver !== "undefined",

            supportsWebCodecs:
                typeof VideoEncoder !== "undefined" &&
                typeof VideoDecoder !== "undefined",

            prefersStandardWebRTCStats:
                ["Chrome", "Edge", "Firefox"].includes(browser),

            hasBrowserManagedCongestionControl:
                ["Chrome", "Edge", "Firefox", "Safari"].includes(browser),

            mayAdaptEncoderAggressively:
                ["Chrome", "Edge"].includes(browser)
        };
    }

    detectMediaCapabilities() {
        return {
            mediaDevices: Boolean(navigator.mediaDevices),
            getUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
            enumerateDevices: Boolean(navigator.mediaDevices?.enumerateDevices),
            getDisplayMedia: Boolean(navigator.mediaDevices?.getDisplayMedia),
            mediaCapabilities: Boolean(navigator.mediaCapabilities),
            permissions: Boolean(navigator.permissions)
        };
    }

    detectWebRTCCapabilities() {
        return {
            peerConnection: typeof RTCPeerConnection !== "undefined",
            sessionDescription: typeof RTCSessionDescription !== "undefined",
            iceCandidate: typeof RTCIceCandidate !== "undefined",
            getStats:
                typeof RTCPeerConnection !== "undefined" &&
                typeof RTCPeerConnection.prototype?.getStats === "function",
            dataChannel:
                typeof RTCPeerConnection !== "undefined" &&
                typeof RTCPeerConnection.prototype?.createDataChannel === "function"
        };
    }

    detectPerformanceCapabilities() {
        const connection =
            navigator.connection ||
            navigator.mozConnection ||
            navigator.webkitConnection ||
            null;

        return {
            performanceApi: typeof performance !== "undefined",
            memoryApi: Boolean(performance?.memory),
            networkInformationApi: Boolean(connection),
            effectiveType: connection?.effectiveType || null,
            downlink: connection?.downlink || null,
            rtt: connection?.rtt || null,
            saveData: Boolean(connection?.saveData)
        };
    }

    getScreenInfo() {
        return {
            width: window.screen?.width || null,
            height: window.screen?.height || null,
            availableWidth: window.screen?.availWidth || null,
            availableHeight: window.screen?.availHeight || null,
            viewportWidth: window.innerWidth || null,
            viewportHeight: window.innerHeight || null,
            pixelRatio: window.devicePixelRatio || 1,
            orientation: window.screen?.orientation?.type || null
        };
    }

    detectTouchSupport() {
        return Boolean(
            "ontouchstart" in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0
        );
    }

    detectMobile() {
        return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
    }

    detectTimezone() {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
            return null;
        }
    }

    getQualityHints(input = {}) {
        const cpu = Number(input.hardwareConcurrency || 0);
        const memory = Number(input.deviceMemory || 0);
        const width = Number(input.screen?.width || 0);
        const height = Number(input.screen?.height || 0);

        const displayCanShow720p =
            width >= 1280 &&
            height >= 720;

        const deviceLikelyHandles720p =
            (cpu >= 4 || cpu === 0) &&
            (memory >= 4 || memory === 0);

        const canPrefer720p =
            displayCanShow720p &&
            deviceLikelyHandles720p;

        return {
            canPrefer720p,
            displayCanShow720p,
            deviceLikelyHandles720p,
            preferredPresentationProfile: "HIGH",
            reason: canPrefer720p
                ? "Device appears suitable for 720p presentation mode"
                : "Presentation mode can still request HD; browser may adapt if needed"
        };
    }

    async detectCameraCapabilities() {
        if (!navigator.mediaDevices?.enumerateDevices) {
            return {
                available: false,
                cameras: [],
                cameraCount: 0,
                reason: "enumerateDevices unavailable"
            };
        }

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();

            const cameras = devices
                .filter((device) => device.kind === "videoinput")
                .map((device) => ({
                    deviceId: device.deviceId,
                    groupId: device.groupId,
                    label: device.label || "Camera"
                }));

            return {
                available: cameras.length > 0,
                cameras,
                cameraCount: cameras.length,
                reason: cameras.length > 0
                    ? "Camera available; exact capture resolution is verified after getUserMedia"
                    : "No camera detected"
            };
        } catch (error) {
            return {
                available: false,
                cameras: [],
                cameraCount: 0,
                reason: error?.message || "Camera detection failed"
            };
        }
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
        return this.getProfile().mobile;
    }

    isDesktop() {
        return this.getProfile().desktop;
    }

    supportsTouch() {
        return this.getProfile().touchSupport;
    }

    getBrowser() {
        return this.getProfile().browser;
    }

    supportsSenderParameters() {
        return Boolean(this.getProfile().browserCapabilities?.supportsSenderParameters);
    }

    supportsWebRTC() {
        const webrtc = this.getProfile().webrtc;

        return Boolean(
            webrtc.peerConnection &&
            webrtc.sessionDescription &&
            webrtc.iceCandidate &&
            webrtc.getStats
        );
    }

    canPrefer720p() {
        return Boolean(this.getProfile().qualityHints?.canPrefer720p);
    }

    getHardwareProfile() {
        const profile = this.getProfile();

        return {
            cpu: profile.hardwareConcurrency,
            memory: profile.deviceMemory,
            browser: profile.browser,
            mobile: profile.mobile,
            desktop: profile.desktop,
            screen: profile.screen,
            qualityHints: profile.qualityHints
        };
    }

    getQualityHintsSnapshot() {
        return this.getProfile().qualityHints;
    }

    getLastDetectionTime() {
        return this.lastDetection;
    }

    getDiagnostics() {
        const profile = this.getProfile();

        return {
            browser: profile.browser,
            platform: profile.platform,
            mobile: profile.mobile,
            desktop: profile.desktop,
            online: profile.online,
            hardwareConcurrency: profile.hardwareConcurrency,
            deviceMemory: profile.deviceMemory,
            screen: profile.screen,
            media: profile.media,
            webrtc: profile.webrtc,
            browserCapabilities: profile.browserCapabilities,
            performance: profile.performance,
            qualityHints: profile.qualityHints,
            detectedAt: profile.detectedAt
        };
    }
}

const deviceCapabilityManager = new DeviceCapabilityManager();

export { DeviceCapabilityManager };
export default deviceCapabilityManager;