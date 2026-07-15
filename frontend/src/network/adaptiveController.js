/**
 * AdaptiveController
 *
 * Presentation-safe diagnostic controller.
 *
 * This module does NOT switch encoder profiles.
 *
 * It never:
 * - downgrades to LOW
 * - changes bitrate
 * - calls sender.setParameters()
 * - fights browser adaptation
 *
 * It only:
 * - reads telemetry
 * - classifies connection/encoder health
 * - explains whether the issue appears to be network, browser, or encoder
 */

export class AdaptiveController {
    constructor(options = {}) {
        this.history = [];
        this.maxHistory = options.maxHistory || 20;

        this.currentProfile = "HIGH";
        this.profileChanged = false;

        this.networkState = "OBSERVING";
        this.lastReason = "Diagnostics only";

        this.lastDecision = {
            profile: "HIGH",
            health: "OBSERVING",
            reason: "Diagnostics only",
            shouldApplyEncoder: false
        };

        this.profiles = {
            HIGH: {
                name: "HIGH",
                width: 1280,
                height: 720,
                fps: 30,
                bitrate: 3800000,
                degradationPreference: "maintain-resolution"
            }
        };
    }

    update(stats = {}) {
        this.profileChanged = false;

        const sample = this.normalizeStats(stats);

        this.history.push(sample);

        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        const average = this.getAverages();
        const decision = this.evaluate(average, sample);

        this.lastDecision = decision;
        this.networkState = decision.health;
        this.lastReason = decision.reason;
    }

    normalizeStats(stats) {
        return {
            timestamp: Date.now(),

            rtt: this.number(stats.rtt),
            packetLoss: this.number(stats.packetLoss),
            jitter: this.number(stats.jitter),
            fps: this.number(stats.fps),

            actualBitrate: this.number(stats.actualBitrate),
            availableBitrate: this.number(stats.availableBitrate),

            captureWidth: this.number(stats.captureWidth),
            captureHeight: this.number(stats.captureHeight),

            encodedWidth: this.number(
                stats.encodedWidth ||
                stats.encodedFrameWidth ||
                stats.frameWidth
            ),

            encodedHeight: this.number(
                stats.encodedHeight ||
                stats.encodedFrameHeight ||
                stats.frameHeight
            ),

            receivedWidth: this.number(
                stats.receivedWidth ||
                stats.receivedFrameWidth
            ),

            receivedHeight: this.number(
                stats.receivedHeight ||
                stats.receivedFrameHeight
            ),

            qualityLimitation: stats.qualityLimitation || "none",
            encoderLimitedByCpu: Boolean(stats.encoderLimitedByCpu),
            encoderLimitedByBandwidth: Boolean(stats.encoderLimitedByBandwidth),

            connectionState: stats.connectionState || "unknown",
            iceConnectionState: stats.iceConnectionState || "unknown"
        };
    }

    getAverages() {
        const count = Math.max(this.history.length, 1);

        const total = this.history.reduce((acc, sample) => {
            acc.rtt += sample.rtt;
            acc.packetLoss += sample.packetLoss;
            acc.jitter += sample.jitter;
            acc.fps += sample.fps;
            acc.actualBitrate += sample.actualBitrate;
            acc.availableBitrate += sample.availableBitrate;
            return acc;
        }, {
            rtt: 0,
            packetLoss: 0,
            jitter: 0,
            fps: 0,
            actualBitrate: 0,
            availableBitrate: 0
        });

        return {
            rtt: total.rtt / count,
            packetLoss: total.packetLoss / count,
            jitter: total.jitter / count,
            fps: total.fps / count,
            actualBitrate: total.actualBitrate / count,
            availableBitrate: total.availableBitrate / count,
            samples: count
        };
    }

    evaluate(avg, latest) {
        const captureIsHd =
            latest.captureWidth >= 1280 &&
            latest.captureHeight >= 720;

        const encodedIsHd =
            latest.encodedWidth >= 1280 &&
            latest.encodedHeight >= 720;

        const receivedIsHd =
            latest.receivedWidth >= 1280 &&
            latest.receivedHeight >= 720;

        const browserLimited =
            latest.encoderLimitedByCpu ||
            latest.encoderLimitedByBandwidth ||
            latest.qualityLimitation === "cpu" ||
            latest.qualityLimitation === "bandwidth";

        const networkBad =
            avg.packetLoss >= 0.08 ||
            avg.rtt >= 0.8 ||
            avg.jitter >= 0.12;

        const networkHealthy =
            avg.rtt < 0.45 &&
            avg.packetLoss < 0.04 &&
            avg.jitter < 0.08;

        const encoderLowerThanCapture =
            captureIsHd &&
            latest.encodedWidth > 0 &&
            latest.encodedHeight > 0 &&
            !encodedIsHd;

        if (browserLimited) {
            return {
                profile: "HIGH",
                health: "BROWSER_LIMITED",
                reason: "Browser reports encoder CPU or bandwidth limitation",
                shouldApplyEncoder: false,
                captureIsHd,
                encodedIsHd,
                receivedIsHd,
                networkHealthy,
                browserLimited
            };
        }

        if (networkBad) {
            return {
                profile: "HIGH",
                health: "NETWORK_LIMITED",
                reason: "Network metrics show real congestion",
                shouldApplyEncoder: false,
                captureIsHd,
                encodedIsHd,
                receivedIsHd,
                networkHealthy: false,
                browserLimited
            };
        }

        if (encoderLowerThanCapture && networkHealthy) {
            return {
                profile: "HIGH",
                health: "ENCODER_LOWER_THAN_CAPTURE",
                reason: "Capture is HD and network looks healthy, but encoded resolution is lower",
                shouldApplyEncoder: false,
                captureIsHd,
                encodedIsHd,
                receivedIsHd,
                networkHealthy,
                browserLimited
            };
        }

        if (captureIsHd && encodedIsHd) {
            return {
                profile: "HIGH",
                health: "HD_ALIGNED",
                reason: "Capture and encoded resolution are aligned at HD",
                shouldApplyEncoder: false,
                captureIsHd,
                encodedIsHd,
                receivedIsHd,
                networkHealthy,
                browserLimited
            };
        }

        return {
            profile: "HIGH",
            health: "OBSERVING",
            reason: "Collecting diagnostics",
            shouldApplyEncoder: false,
            captureIsHd,
            encodedIsHd,
            receivedIsHd,
            networkHealthy,
            browserLimited
        };
    }

    hasProfileChanged() {
        return false;
    }

    getCurrentProfile() {
        return this.profiles.HIGH;
    }

    getCurrentProfileName() {
        return "HIGH";
    }

    getNetworkState() {
        return this.networkState;
    }

    getLastReason() {
        return this.lastReason;
    }

    getLastDecision() {
        return this.lastDecision;
    }

    getDiagnostics() {
        return {
            mode: "DIAGNOSTIC_ONLY",
            currentProfile: "HIGH",
            networkState: this.networkState,
            lastReason: this.lastReason,
            lastDecision: this.lastDecision,
            historySize: this.history.length
        };
    }

    number(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
}

export default AdaptiveController;