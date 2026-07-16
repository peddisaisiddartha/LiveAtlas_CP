/**
 * BrowserController
 *
 * Browser-cooperative controller for LiveAtlas.
 *
 * This module does NOT fight the browser.
 *
 * It never:
 * - creates RTCPeerConnection
 * - restarts ICE
 * - changes bitrate
 * - calls sender.setParameters()
 * - replaces tracks
 * - downgrades quality
 *
 * It only:
 * - applies browser-friendly media hints
 * - verifies actual camera capture
 * - compares capture / encoded / received resolution
 * - identifies whether Chrome/WebRTC is naturally adapting
 * - reports diagnostics for the rest of the communication engine
 */

export class BrowserController {
    constructor(options = {}) {
        this.intent = options.intent || "scenery";

        this.lastCapture = null;
        this.lastTelemetryReview = null;

        this.lowEncodingSince = null;
        this.lastHintApplied = null;

        this.thresholds = {

            healthyRtt: 0.45,

            healthyPacketLoss: 0.04,

            healthyJitter: 0.08,

            healthyBitrate: 900000,

            recoveryDelay: 15000

        };
    }

    applyToStream(stream, intent = this.intent) {
        this.intent = intent;

        const videoTrack = stream?.getVideoTracks?.()[0];
        const audioTrack = stream?.getAudioTracks?.()[0];

        if (videoTrack) {
            this.applyVideoHint(videoTrack, intent);
            this.lastCapture = this.inspectVideoTrack(videoTrack);
        }

        if (audioTrack) {
            this.applyAudioHint(audioTrack);
        }

        return this.lastCapture;
    }

    applyVideoHint(videoTrack, intent = this.intent) {
        if (!videoTrack) {
            return;
        }

        const hint = this.getVideoHint(intent);

        try {
            videoTrack.contentHint = hint;
            this.lastHintApplied = hint;
        } catch {
            this.lastHintApplied = null;
        }
    }

    applyAudioHint(audioTrack) {
        if (!audioTrack) {
            return;
        }

        try {
            audioTrack.contentHint = "speech";
        } catch {
            // Some browsers may ignore contentHint.
        }
    }

    getVideoHint(intent) {
        if (intent === "talk") {
            return "motion";
        }

        if (intent === "walking") {
            return "motion";
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

            isHdCapture: width >= 1280 && height >= 720,
            isGoodFps: frameRate === 0 || frameRate >= 24,

            settings,
            capabilities,

            inspectedAt: Date.now()
        };
    }

    reviewTelemetry(telemetry = {}) {
        const captureWidth = this.number(telemetry.captureWidth);
        const captureHeight = this.number(telemetry.captureHeight);

        const encodedWidth = this.number(
            telemetry.encodedWidth ||
            telemetry.encodedFrameWidth ||
            telemetry.frameWidth
        );

        const encodedHeight = this.number(
            telemetry.encodedHeight ||
            telemetry.encodedFrameHeight ||
            telemetry.frameHeight
        );

        const receivedWidth = this.number(
            telemetry.receivedWidth ||
            telemetry.receivedFrameWidth
        );

        const receivedHeight = this.number(
            telemetry.receivedHeight ||
            telemetry.receivedFrameHeight
        );

        const rtt = this.number(telemetry.rtt);
        const packetLoss = this.number(telemetry.packetLoss);
        const jitter = this.number(telemetry.jitter);
        const actualBitrate = this.number(telemetry.actualBitrate);
        const fps = this.number(telemetry.fps);

        const browserLimited =
            telemetry.encoderLimitedByCpu ||
            telemetry.encoderLimitedByBandwidth ||
            telemetry.qualityLimitation === "cpu" ||
            telemetry.qualityLimitation === "bandwidth";

        const captureIsHd =
            captureWidth >= 1280 &&
            captureHeight >= 720;

        const encodedIsHd =
            encodedWidth >= 1280 &&
            encodedHeight >= 720;

        const receivedIsHd =
            receivedWidth >= 1280 &&
            receivedHeight >= 720;

        const networkLooksHealthy =
            rtt < this.thresholds.healthyRtt &&
            packetLoss < this.thresholds.healthyPacketLoss &&
            jitter < this.thresholds.healthyJitter &&
        (
            actualBitrate === 0 ||
            actualBitrate >= this.thresholds.healthyBitrate
        );

        const encodingLowerThanCapture =
            captureIsHd &&
            encodedWidth > 0 &&
            encodedHeight > 0 &&
            (
                encodedWidth < 1280 ||
                encodedHeight < 720
            );

        if (
            encodingLowerThanCapture &&
            networkLooksHealthy &&
            !browserLimited
        ) {
            if (!this.lowEncodingSince) {
                this.lowEncodingSince = Date.now();
            }
        } else {
            this.lowEncodingSince = null;
        }

        const lowEncodingDuration = this.lowEncodingSince
            ? Date.now() - this.lowEncodingSince
            : 0;

        const recommendation = this.getRecommendation({
            captureIsHd,
            encodedIsHd,
            receivedIsHd,
            networkLooksHealthy,
            browserLimited,
            encodingLowerThanCapture,
            lowEncodingDuration
        });

        this.lastTelemetryReview = {
            capture: {
                width: captureWidth,
                height: captureHeight,
                isHd: captureIsHd
            },

            encoded: {
                width: encodedWidth,
                height: encodedHeight,
                isHd: encodedIsHd
            },

            received: {
                width: receivedWidth,
                height: receivedHeight,
                isHd: receivedIsHd
            },

            network: {
                rtt,
                packetLoss,
                jitter,
                actualBitrate,
                fps,
                looksHealthy: networkLooksHealthy
            },

            browser: {
                limited: browserLimited,
                qualityLimitation: telemetry.qualityLimitation || "none",
                encoderLimitedByCpu: Boolean(telemetry.encoderLimitedByCpu),
                encoderLimitedByBandwidth: Boolean(telemetry.encoderLimitedByBandwidth)
            },

            encodingLowerThanCapture,
            lowEncodingDuration,
            recommendation,

            reviewedAt: Date.now()
        };

        return this.lastTelemetryReview;
    }

    getRecommendation(state) {
        if (state.browserLimited) {
            return {
                action: "RESPECT_BROWSER_LIMIT",
                reason: "Browser reports CPU or bandwidth limitation"
            };
        }

        if (
            state.encodingLowerThanCapture &&
            state.networkLooksHealthy
        ) {
            if (
                state.lowEncodingDuration >=
                this.thresholds.recoveryDelay
            ) {
                return {
                    action: "ENCODER_STUCK_LOW",
                    reason: "Capture is HD and network looks healthy, but encoded resolution remains low"
                };
            }

            return {
                action: "WAIT_FOR_BROWSER_RECOVERY",
                reason: "Browser may still be probing or warming up"
            };
        }

        if (state.captureIsHd && state.encodedIsHd) {
            return {
                action: "HOLD_STABLE",
                reason: "Capture and encoded resolution are aligned at HD"
            };
        }

        return {
            action: "OBSERVE",
            reason: "No browser cooperation action needed"
        };
    }

    getDiagnostics() {
        return {
            intent: this.intent,
            lastHintApplied: this.lastHintApplied,
            lastCapture: this.lastCapture,
            lastTelemetryReview: this.lastTelemetryReview,
            lowEncodingSince: this.lowEncodingSince
        };
    }

    reset() {
        this.lastCapture = null;
        this.lastTelemetryReview = null;
        this.lowEncodingSince = null;
        this.lastHintApplied = null;
    }

    number(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
}

export default BrowserController;