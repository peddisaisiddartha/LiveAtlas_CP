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
 * It simply provides information about the current device so other modules can
 * make safer decisions.
 */

class DeviceCapabilityManager {
    constructor() {
        this.profile = null;
        this.lastDetection = null;
    }

    detect() {
        const nav = navigator;
        const screenInfo = this.getScreenInfo();
        const browser = this.detectBrowser();

        this.profile = {
            hardwareConcurrency: nav.hardwareConcurrency || null,
            deviceMemory: nav.deviceMemory || null,
            userAgent: nav.userAgent || "",
            platform: nav.platform || null,
            language: nav.language || null,
            languages: nav.languages || [],
            online: nav.onLine,

            screen: screenInfo,

            touchSupport: this.detectTouchSupport(),
            mobile: this.detectMobile(),
            desktop: !this.detectMobile(),

            timezone: this.detectTimezone(),
            browser,
            browserCapabilities: this.detectBrowserCapabilities(browser),

            media: this.detectMediaCapabilities(),
            webrtc: this.detectWebRTCCapabilities(),

            performance: this.detectPerformanceCapabilities(),

            qualityHints: this.getQualityHints({
                browser,
                screen: screenInfo,
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
                !!RTCRtpSender.prototype &&
                typeof RTCRtpSender.prototype.getParameters === "function" &&
                typeof RTCRtpSender.prototype.setParameters === "function",

            supportsReceiverStats:
                typeof RTCRtpReceiver !== "undefined" &&
                !!RTCRtpReceiver.prototype,

            supportsTransceiver:
                typeof RTCRtpTransceiver !== "undefined",

            supportsInsertableStreams:
                typeof RTCRtpScriptTransform !== "undefined" ||
                typeof window.RTCRtpScriptTransform !== "undefined",

            supportsWebCodecs:
                typeof VideoEncoder !== "undefined" &&
                typeof VideoDecoder !== "undefined",

            prefersStandardWebRTCStats:
                browser === "Chrome" || browser === "Edge" || browser === "Firefox",

            hasKnownAggressiveEncoderAdaptation:
                browser === "Chrome" || browser === "Edge"
        };
    }

    detectMediaCapabilities() {
        return {
            mediaDevices: !!navigator.mediaDevices,
            getUserMedia: !!navigator.mediaDevices?.getUserMedia,
            enumerateDevices: !!navigator.mediaDevices?.enumerateDevices,
            getDisplayMedia: !!navigator.mediaDevices?.getDisplayMedia,
            mediaCapabilities: !!navigator.mediaCapabilities,
            permissions: !!navigator.permissions
        };
    }

    detectWebRTCCapabilities() {
        return {
            peerConnection: typeof RTCPeerConnection !== "undefined",
            sessionDescription: typeof RTCSessionDescription !== "undefined",
            iceCandidate: typeof RTCIceCandidate !== "undefined",
            dataChannel:
                typeof RTCPeerConnection !== "undefined" &&
                typeof RTCPeerConnection.prototype.createDataChannel === "function",
            getStats:
                typeof RTCPeerConnection !== "undefined" &&
                typeof RTCPeerConnection.prototype.getStats === "function"
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
            memoryApi: !!performance?.memory,
            networkInformationApi: !!connection,
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
        return (
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
        const isMobile = this.detectMobile();

        const canPrefer720p =
            width >= 1280 &&
            height >= 720 &&
            (
                cpu >= 4 ||
                cpu === 0
            ) &&
            (
                memory >= 4 ||
                memory === 0
            );

        const shouldStartConservative =
            isMobile &&
            (
                (cpu > 0 && cpu <= 4) ||
                (memory > 0 && memory <= 3)
            );

        return {
            canPrefer720p,
            shouldStartConservative,
            preferredStartupProfile: canPrefer720p && !shouldStartConservative
                ? "HIGH"
                : "MEDIUM",
            reason: canPrefer720p
                ? "Device appears capable of HD startup"
                : "Device capability suggests MEDIUM startup"
        };
    }

    async detectCameraCapabilities() {
        if (!navigator.mediaDevices?.enumerateDevices) {
            return {
                available: false,
                cameras: [],
                supports720p: false,
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
                supports720p: cameras.length > 0,
                reason: cameras.length > 0
                    ? "Camera available; exact capture capability should be verified after getUserMedia"
                    : "No camera detected"
            };
        } catch (error) {
            return {
                available: false,
                cameras: [],
                supports720p: false,
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
        return this.profile?.mobile ?? this.detectMobile();
    }

    isDesktop() {
        return !this.isMobile();
    }

    supportsTouch() {
        return this.profile?.touchSupport ?? this.detectTouchSupport();
    }

    getBrowser() {
        return this.profile?.browser ?? this.detectBrowser();
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

    canPrefer720p() {
        return Boolean(this.getProfile().qualityHints?.canPrefer720p);
    }

    getPreferredStartupProfile() {
        return this.getProfile().qualityHints?.preferredStartupProfile || "MEDIUM";
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

    getLastDetectionTime() {
        return this.lastDetection;
    }

    getDiagnostics() {
        const profile = this.getProfile();

        return {
            browser: profile.browser,
            platform: profile.platform,
            mobile: profile.mobile,
            online: profile.online,
            hardwareConcurrency: profile.hardwareConcurrency,
            deviceMemory: profile.deviceMemory,
            screen: profile.screen,
            media: profile.media,
            webrtc: profile.webrtc,
            browserCapabilities: profile.browserCapabilities,
            qualityHints: profile.qualityHints,
            detectedAt: profile.detectedAt
        };
    }
}

const deviceCapabilityManager = new DeviceCapabilityManager();

export { DeviceCapabilityManager };
export default deviceCapabilityManager;