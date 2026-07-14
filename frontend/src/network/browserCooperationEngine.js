/**
 * BrowserCooperationEngine
 *
 * This module helps WebRTC work in our favor without fighting the browser.
 *
 * It NEVER:
 * - restarts ICE
 * - forces bitrate aggressively
 * - replaces tracks
 * - creates RTCPeerConnection
 *
 * It only:
 * - applies browser-friendly media hints
 * - verifies actual camera capture quality
 * - detects when browser downscaling is reasonable
 * - detects when browser appears stuck at low quality
 */

export class BrowserCooperationEngine {
    constructor(options = {}) {
        this.intent = options.intent || "scenery";
        this.lastCaptureDiagnostics = null;
        this.lowResolutionSince = null;
        this.lastHintApplied = null;
    }

    applyToStream(stream, intent = this.intent) {
        if (!stream) {
            return null;
        }

        this.intent = intent;

        const videoTrack = stream.getVideoTracks?.()[0];

        if (!videoTrack) {
            return null;
        }

        this.applyVideoHint(videoTrack, intent);

        this.lastCaptureDiagnostics = this.inspectVideoTrack(videoTrack);

        return this.lastCaptureDiagnostics;
    }

    applyVideoHint(videoTrack, intent = "scenery") {
        if (!videoTrack) {
            return;
        }

        const hint = this.getContentHint(intent);

        try {
            videoTrack.contentHint = hint;
            this.lastHintApplied = hint;
        } catch {
            this.lastHintApplied = null;
        }
    }

    getContentHint(intent) {
        if (intent === "talk") {
            return "motion";
        }

        if (intent === "walking") {
            return "motion";
        }

        if (intent === "scenery") {
            return "detail";
        }

        if (intent === "learn") {
            return "detail";
        }

        if (intent === "experience") {
            return "detail";
        }

        return "detail";
    }

    inspectVideoTrack(videoTrack) {
        const settings =
            typeof videoTrack.getSettings === "function"
                ? videoTrack.getSettings()
                : {};

        const capabilities =
            typeof videoTrack.getCapabilities === "function"
                ? videoTrack.getCapabilities()
                : {};

        const width = Number(settings.width || 0);
        const height = Number(settings.height || 0);
        const frameRate = Number(settings.frameRate || 0);

        return {
            readyState: videoTrack.readyState,
            enabled: videoTrack.enabled,
            muted: videoTrack.muted,

            contentHint: videoTrack.contentHint || "",

            width,
            height,
            frameRate,

            supports720p: width >= 1280 && height >= 720,
            isActuallyHd: width >= 1280 && height >= 720,

            settings,
            capabilities,

            inspectedAt: Date.now()
        };
    }

    update(telemetry = {}) {
        const encodedWidth =
            telemetry.encodedWidth ||
            telemetry.encodedFrameWidth ||
            telemetry.frameWidth ||
            0;

        const encodedHeight =
            telemetry.encodedHeight ||
            telemetry.encodedFrameHeight ||
            telemetry.frameHeight ||
            0;

        const captureWidth = telemetry.captureWidth || 0;
        const captureHeight = telemetry.captureHeight || 0;

        const browserLimited =
            telemetry.encoderLimitedByBandwidth ||
            telemetry.encoderLimitedByCpu ||
            telemetry.qualityLimitation === "bandwidth" ||
            telemetry.qualityLimitation === "cpu";

        const captureIsHd =
            captureWidth >= 1280 &&
            captureHeight >= 720;

        const encodedIsLow =
            encodedWidth > 0 &&
            encodedHeight > 0 &&
            encodedWidth < 960 &&
            encodedHeight < 540;

        const networkLooksHealthy =
            (telemetry.rtt || 0) < 0.35 &&
            (telemetry.packetLoss || 0) < 0.04 &&
            (telemetry.jitter || 0) < 0.06 &&
            (
                (telemetry.actualBitrate || 0) > 1800000 ||
                (telemetry.availableBitrate || 0) > 1800000
            );

        if (captureIsHd && encodedIsLow && networkLooksHealthy && !browserLimited) {
            if (!this.lowResolutionSince) {
                this.lowResolutionSince = Date.now();
            }
        } else {
            this.lowResolutionSince = null;
        }

        return {
            captureIsHd,
            encodedIsLow,
            browserLimited,
            networkLooksHealthy,
            browserAppearsStuckLow: this.isBrowserStuckLow(),
            lowResolutionDuration: this.getLowResolutionDuration(),
            recommendation: this.getRecommendation({
                captureIsHd,
                encodedIsLow,
                browserLimited,
                networkLooksHealthy
            })
        };
    }

    isBrowserStuckLow() {
        return this.getLowResolutionDuration() >= 12000;
    }

    getLowResolutionDuration() {
        if (!this.lowResolutionSince) {
            return 0;
        }

        return Date.now() - this.lowResolutionSince;
    }

    getRecommendation(state) {
        if (state.browserLimited) {
            return {
                action: "RESPECT_BROWSER_LIMIT",
                reason: "Browser reports CPU or bandwidth limitation"
            };
        }

        if (state.captureIsHd && state.encodedIsLow && state.networkLooksHealthy) {
            if (this.isBrowserStuckLow()) {
                return {
                    action: "GENTLE_REAPPLY_HIGH_PROFILE",
                    reason: "Browser appears stuck at low encoded resolution despite healthy conditions"
                };
            }

            return {
                action: "WAIT_FOR_BROWSER_RECOVERY",
                reason: "Browser may recover naturally"
            };
        }

        if (state.captureIsHd && state.networkLooksHealthy) {
            return {
                action: "PREFER_HD_STABILITY",
                reason: "Capture and network support HD"
            };
        }

        return {
            action: "OBSERVE",
            reason: "No browser cooperation action needed"
        };
    }

    getStartupIntentProfile(deviceProfile = {}) {
        if (deviceProfile.qualityHints?.canPrefer720p) {
            return "HIGH";
        }

        return "MEDIUM";
    }

    getDiagnostics() {
        return {
            intent: this.intent,
            lastHintApplied: this.lastHintApplied,
            lastCaptureDiagnostics: this.lastCaptureDiagnostics,
            lowResolutionSince: this.lowResolutionSince,
            lowResolutionDuration: this.getLowResolutionDuration(),
            browserAppearsStuckLow: this.isBrowserStuckLow()
        };
    }

    reset() {
        this.lowResolutionSince = null;
        this.lastCaptureDiagnostics = null;
        this.lastHintApplied = null;
    }
}