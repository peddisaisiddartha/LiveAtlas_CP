export class AdaptiveController {
    constructor(options = {}) {
        this.history = [];

        this.currentProfile = options.initialProfile || "HIGH";
        this.profileChanged = false;

        this.startedAt = Date.now();
        this.lastSwitch = Date.now();

        this.startupGracePeriodMs = options.startupGracePeriodMs || 25000;
        this.minimumSwitchIntervalMs = options.minimumSwitchIntervalMs || 12000;
        this.recoverySwitchIntervalMs = options.recoverySwitchIntervalMs || 5000;

        this.goodSamples = 0;
        this.badSamples = 0;
        this.severeBadSamples = 0;

        this.initialEvaluationComplete = false;
        this.networkState = "STARTUP";
        this.lastReason = "Initial";

        this.profiles = {
            LOW: {
                name: "LOW",
                width: 640,
                height: 360,
                fps: 20,
                bitrate: 800000,
                degradationPreference: "maintain-framerate"
            },

            MEDIUM: {
                name: "MEDIUM",
                width: 960,
                height: 540,
                fps: 24,
                bitrate: 1800000,
                degradationPreference: "balanced"
            },

            HIGH: {
                name: "HIGH",
                width: 1280,
                height: 720,
                fps: 30,
                bitrate: 3800000,
                degradationPreference: "maintain-resolution"
            }
        };

        this.lastDecision = {
            profile: this.currentProfile,
            health: "STARTUP",
            reason: "Initial",
            score: 100,
            shouldApplyEncoder: false
        };
    }

    update(stats = {}) {
        this.profileChanged = false;

        const sample = this.normalizeStats(stats);
        this.history.push(sample);

        if (this.history.length > 15) {
            this.history.shift();
        }

        const avg = this.getAverages();
        const decision = this.evaluate(avg, sample);

        this.lastDecision = decision;
        this.networkState = decision.health;
        this.lastReason = decision.reason;

        if (!this.initialEvaluationComplete && this.history.length >= 4) {
            this.initialEvaluationComplete = true;
        }

        if (this.isInStartupGracePeriod()) {
            this.handleStartupGracePeriod(decision);
            return;
        }

        this.applyDecision(decision);
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

            encodedWidth: this.number(stats.encodedWidth || stats.encodedFrameWidth || stats.frameWidth),
            encodedHeight: this.number(stats.encodedHeight || stats.encodedFrameHeight || stats.frameHeight),

            receivedWidth: this.number(stats.receivedWidth || stats.receivedFrameWidth),
            receivedHeight: this.number(stats.receivedHeight || stats.receivedFrameHeight),

            encoderLimitedByCpu: Boolean(stats.encoderLimitedByCpu),
            encoderLimitedByBandwidth: Boolean(stats.encoderLimitedByBandwidth),

            qualityLimitation: stats.qualityLimitation || "none",

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
        const score = this.calculateHealthScore(avg, latest);

        const captureIsHd =
            latest.captureWidth >= 1280 &&
            latest.captureHeight >= 720;

        const encodedIsHd =
            latest.encodedWidth >= 1280 &&
            latest.encodedHeight >= 720;

        const browserLimited =
            latest.encoderLimitedByCpu ||
            latest.encoderLimitedByBandwidth ||
            latest.qualityLimitation === "cpu" ||
            latest.qualityLimitation === "bandwidth";

        const severeCongestion =
            avg.packetLoss >= 0.14 ||
            avg.rtt >= 1.1 ||
            avg.jitter >= 0.18 ||
            latest.encoderLimitedByBandwidth;

        const realCongestion =
            avg.packetLoss >= 0.08 ||
            avg.rtt >= 0.75 ||
            avg.jitter >= 0.12 ||
            (
                avg.actualBitrate > 0 &&
                avg.actualBitrate < 600000 &&
                avg.packetLoss > 0.04
            );

        const healthy =
            avg.rtt < 0.45 &&
            avg.packetLoss < 0.04 &&
            avg.jitter < 0.07 &&
            !browserLimited &&
            (
                avg.actualBitrate >= 1200000 ||
                avg.availableBitrate >= 1200000 ||
                avg.availableBitrate === 0
            );

        if (severeCongestion) {
            return {
                profile: "LOW",
                health: "SEVERE_CONGESTION",
                reason: this.getCongestionReason(avg, latest),
                score,
                captureIsHd,
                encodedIsHd,
                browserLimited,
                shouldApplyEncoder: this.currentProfile !== "LOW"
            };
        }

        if (realCongestion) {
            return {
                profile: this.currentProfile === "HIGH" ? "MEDIUM" : this.currentProfile,
                health: "CONGESTED",
                reason: this.getCongestionReason(avg, latest),
                score,
                captureIsHd,
                encodedIsHd,
                browserLimited,
                shouldApplyEncoder: this.currentProfile === "HIGH"
            };
        }

        if (healthy) {
            return {
                profile: "HIGH",
                health: "HEALTHY",
                reason: "Healthy conditions",
                score,
                captureIsHd,
                encodedIsHd,
                browserLimited,
                shouldApplyEncoder: this.currentProfile !== "HIGH"
            };
        }

        return {
            profile: this.currentProfile,
            health: "STABLE",
            reason: "Observing",
            score,
            captureIsHd,
            encodedIsHd,
            browserLimited,
            shouldApplyEncoder: false
        };
    }

    handleStartupGracePeriod(decision) {
        if (
            decision.health === "SEVERE_CONGESTION" &&
            decision.reason !== "Low FPS"
        ) {
            this.severeBadSamples += 1;
        } else {
            this.severeBadSamples = 0;
        }

        if (this.severeBadSamples >= 4) {
            this.applyDecision(decision);
            return;
        }

        if (this.currentProfile !== "HIGH") {
            this.setProfile("HIGH", "Startup prefers HD");
            return;
        }

        this.networkState = "WARMING_UP";
        this.lastReason = "Startup grace period";
        this.profileChanged = false;
    }

    applyDecision(decision) {
        const now = Date.now();

        if (decision.health === "HEALTHY") {
            this.goodSamples += 1;
            this.badSamples = 0;
            this.severeBadSamples = 0;
        } else if (
            decision.health === "CONGESTED" ||
            decision.health === "SEVERE_CONGESTION"
        ) {
            this.badSamples += 1;

            if (decision.health === "SEVERE_CONGESTION") {
                this.severeBadSamples += 1;
            }

            this.goodSamples = 0;
        } else {
            this.goodSamples = 0;
            this.badSamples = 0;
            this.severeBadSamples = 0;
        }

        const recoveryMode = this.currentProfile !== "HIGH" && decision.profile === "HIGH";
        const switchInterval = recoveryMode
            ? this.recoverySwitchIntervalMs
            : this.minimumSwitchIntervalMs;

        if (now - this.lastSwitch < switchInterval) {
            return;
        }

        if (decision.profile === this.currentProfile) {
            return;
        }

        if (decision.profile === "LOW") {
            if (this.severeBadSamples >= 3) {
                this.setProfile("LOW", decision.reason);
            }

            return;
        }

        if (decision.profile === "MEDIUM") {
            if (this.badSamples >= 4) {
                this.setProfile("MEDIUM", decision.reason);
            }

            return;
        }

        if (decision.profile === "HIGH") {
            if (this.goodSamples >= 2) {
                this.setProfile("HIGH", "Recovered to healthy HD conditions");
            }
        }
    }

    calculateHealthScore(avg, latest) {
        let score = 100;

        score -= this.clamp(avg.rtt * 45, 0, 35);
        score -= this.clamp(avg.packetLoss * 220, 0, 40);
        score -= this.clamp(avg.jitter * 130, 0, 25);

        if (latest.encoderLimitedByCpu) score -= 20;
        if (latest.encoderLimitedByBandwidth) score -= 25;

        return Math.round(this.clamp(score, 0, 100));
    }

    getCongestionReason(avg, latest) {
        if (latest.encoderLimitedByCpu || latest.qualityLimitation === "cpu") {
            return "Browser CPU limited";
        }

        if (latest.encoderLimitedByBandwidth || latest.qualityLimitation === "bandwidth") {
            return "Browser bandwidth limited";
        }

        if (avg.packetLoss >= 0.14) return "Severe packet loss";
        if (avg.rtt >= 1.1) return "Severe RTT";
        if (avg.jitter >= 0.18) return "Severe jitter";
        if (avg.packetLoss >= 0.08) return "Packet loss";
        if (avg.rtt >= 0.75) return "High RTT";
        if (avg.jitter >= 0.12) return "High jitter";

        return "Network congestion";
    }

    setProfile(profileName, reason) {
        if (!this.profiles[profileName]) {
            return;
        }

        if (this.currentProfile === profileName) {
            this.profileChanged = false;
            this.lastReason = reason;
            return;
        }

        this.currentProfile = profileName;
        this.profileChanged = true;
        this.lastSwitch = Date.now();
        this.lastReason = reason;

        this.goodSamples = 0;
        this.badSamples = 0;
        this.severeBadSamples = 0;
    }

    increase() {
        if (this.currentProfile === "LOW") {
            this.setProfile("MEDIUM", "Manual increase");
        } else if (this.currentProfile === "MEDIUM") {
            this.setProfile("HIGH", "Manual increase");
        }
    }

    decrease() {
        if (this.currentProfile === "HIGH") {
            this.setProfile("MEDIUM", "Manual decrease");
        } else if (this.currentProfile === "MEDIUM") {
            this.setProfile("LOW", "Manual decrease");
        }
    }

    isInStartupGracePeriod() {
        return Date.now() - this.startedAt < this.startupGracePeriodMs;
    }

    hasProfileChanged() {
        return this.profileChanged;
    }

    getCurrentProfile() {
        return this.profiles[this.currentProfile];
    }

    getCurrentProfileName() {
        return this.currentProfile;
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
            currentProfile: this.currentProfile,
            profile: this.getCurrentProfile(),
            networkState: this.networkState,
            lastReason: this.lastReason,
            lastDecision: this.lastDecision,
            historySize: this.history.length,
            goodSamples: this.goodSamples,
            badSamples: this.badSamples,
            severeBadSamples: this.severeBadSamples,
            startupGraceRemainingMs: Math.max(
                0,
                this.startupGracePeriodMs - (Date.now() - this.startedAt)
            )
        };
    }

    number(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
}