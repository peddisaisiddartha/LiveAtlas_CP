export class AdaptiveController {
    constructor(options = {}) {
        this.history = [];

        this.currentProfile = options.initialProfile || "MEDIUM";
        this.profileChanged = false;

        this.initialEvaluationComplete = false;
        this.startupSamplesRequired = options.startupSamplesRequired || 4;

        this.lastSwitch = Date.now();
        this.lastReason = "Initial";
        this.networkState = "STARTUP";

        this.goodSamples = 0;
        this.badSamples = 0;
        this.stableSamples = 0;

        this.minimumSwitchIntervalMs = options.minimumSwitchIntervalMs || 8000;
        this.recoverySwitchIntervalMs = options.recoverySwitchIntervalMs || 4500;

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
            score: 0,
            confidence: 0,
            health: "STARTUP",
            reason: "Initial",
            shouldApplyEncoder: false,
            resolutionStatus: "UNKNOWN"
        };
    }

    update(stats = {}) {
        this.profileChanged = false;

        const sample = this.normalizeStats(stats);

        this.history.push(sample);

        if (this.history.length > 12) {
            this.history.shift();
        }

        const average = this.getAverages();
        const decision = this.evaluate(average, sample);

        this.lastDecision = decision;
        this.networkState = decision.health;
        this.lastReason = decision.reason;

        if (!this.initialEvaluationComplete) {
            this.handleStartupDecision(decision);
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

            captureWidth: this.number(stats.captureWidth || stats.cameraWidth),
            captureHeight: this.number(stats.captureHeight || stats.cameraHeight),

            encodedWidth: this.number(stats.encodedWidth || stats.frameWidth),
            encodedHeight: this.number(stats.encodedHeight || stats.frameHeight),

            receivedWidth: this.number(stats.receivedWidth),
            receivedHeight: this.number(stats.receivedHeight),

            framesEncoded: this.number(stats.framesEncoded),
            framesDecoded: this.number(stats.framesDecoded),

            encodeTime: this.number(stats.encodeTime),
            decodeTime: this.number(stats.decodeTime),

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
            acc.encodeTime += sample.encodeTime;
            acc.decodeTime += sample.decodeTime;

            return acc;
        }, {
            rtt: 0,
            packetLoss: 0,
            jitter: 0,
            fps: 0,
            actualBitrate: 0,
            availableBitrate: 0,
            encodeTime: 0,
            decodeTime: 0
        });

        return {
            rtt: total.rtt / count,
            packetLoss: total.packetLoss / count,
            jitter: total.jitter / count,
            fps: total.fps / count,
            actualBitrate: total.actualBitrate / count,
            availableBitrate: total.availableBitrate / count,
            encodeTime: total.encodeTime / count,
            decodeTime: total.decodeTime / count,
            samples: count
        };
    }

    evaluate(avg, latest) {
        const score = this.calculateQualityScore(avg, latest);
        const confidence = this.calculateNetworkConfidence(avg, latest);
        const stability = this.calculateStabilityIndex();
        const resolutionStatus = this.getResolutionStatus(latest);
        const browserState = this.getBrowserBehaviourState(avg, latest);

        const healthyForHd =
            score >= 78 &&
            confidence >= 70 &&
            stability >= 65 &&
            avg.rtt < 0.35 &&
            avg.packetLoss < 0.035 &&
            avg.jitter < 0.055 &&
            avg.fps >= 22 &&
            !latest.encoderLimitedByCpu &&
            !latest.encoderLimitedByBandwidth;

        const clearlyCongested =
            score < 45 ||
            avg.rtt > 0.85 ||
            avg.packetLoss > 0.12 ||
            avg.jitter > 0.14 ||
            avg.fps < 14 ||
            latest.encoderLimitedByBandwidth;

        const mildlyDegraded =
            !clearlyCongested &&
            (
                score < 62 ||
                avg.rtt > 0.55 ||
                avg.packetLoss > 0.065 ||
                avg.jitter > 0.09 ||
                avg.fps < 18
            );

        if (healthyForHd) {
            return {
                profile: "HIGH",
                score,
                confidence,
                stability,
                health: "HEALTHY",
                reason: "Healthy HD conditions",
                shouldApplyEncoder: this.currentProfile !== "HIGH",
                resolutionStatus,
                browserState
            };
        }

        if (clearlyCongested) {
            return {
                profile: this.currentProfile === "HIGH" ? "MEDIUM" : "LOW",
                score,
                confidence,
                stability,
                health: "CONGESTED",
                reason: this.getCongestionReason(avg, latest),
                shouldApplyEncoder: true,
                resolutionStatus,
                browserState
            };
        }

        if (mildlyDegraded) {
            return {
                profile: this.currentProfile === "HIGH" ? "MEDIUM" : this.currentProfile,
                score,
                confidence,
                stability,
                health: "DEGRADED",
                reason: this.getCongestionReason(avg, latest),
                shouldApplyEncoder: this.currentProfile === "HIGH",
                resolutionStatus,
                browserState
            };
        }

        return {
            profile: this.currentProfile,
            score,
            confidence,
            stability,
            health: "STABLE",
            reason: "Stable conditions",
            shouldApplyEncoder: false,
            resolutionStatus,
            browserState
        };
    }

    calculateQualityScore(avg, latest) {
        let score = 100;

        score -= this.clamp(avg.rtt * 55, 0, 35);
        score -= this.clamp(avg.packetLoss * 260, 0, 35);
        score -= this.clamp(avg.jitter * 150, 0, 20);

        if (avg.fps > 0 && avg.fps < 24) {
            score -= this.clamp((24 - avg.fps) * 2.5, 0, 25);
        }

        if (avg.actualBitrate > 0 && avg.actualBitrate < 900000) {
            score -= 18;
        }

        if (latest.encoderLimitedByCpu) {
            score -= 18;
        }

        if (latest.encoderLimitedByBandwidth) {
            score -= 22;
        }

        return Math.round(this.clamp(score, 0, 100));
    }

    calculateNetworkConfidence(avg, latest) {
        let confidence = 50;

        if (avg.rtt > 0 && avg.rtt < 0.3) confidence += 15;
        if (avg.packetLoss < 0.03) confidence += 15;
        if (avg.jitter < 0.05) confidence += 10;
        if (avg.fps >= 22) confidence += 10;

        if (avg.actualBitrate >= 2500000) confidence += 10;
        if (avg.availableBitrate >= 1800000) confidence += 5;

        if (latest.connectionState === "connected") confidence += 5;
        if (latest.iceConnectionState === "connected" || latest.iceConnectionState === "completed") confidence += 5;

        if (latest.encoderLimitedByBandwidth) confidence -= 20;
        if (latest.encoderLimitedByCpu) confidence -= 15;

        return Math.round(this.clamp(confidence, 0, 100));
    }

    calculateStabilityIndex() {
        if (this.history.length < 4) {
            return 50;
        }

        const rtts = this.history.map((sample) => sample.rtt);
        const losses = this.history.map((sample) => sample.packetLoss);
        const fpsValues = this.history.map((sample) => sample.fps).filter((fps) => fps > 0);

        const rttVariance = this.getVariance(rtts);
        const lossVariance = this.getVariance(losses);
        const fpsVariance = fpsValues.length > 1 ? this.getVariance(fpsValues) : 0;

        let stability = 100;

        stability -= this.clamp(rttVariance * 180, 0, 35);
        stability -= this.clamp(lossVariance * 900, 0, 35);
        stability -= this.clamp(fpsVariance * 1.5, 0, 30);

        return Math.round(this.clamp(stability, 0, 100));
    }

    getResolutionStatus(sample) {
        const capture = this.formatResolution(sample.captureWidth, sample.captureHeight);
        const encoded = this.formatResolution(sample.encodedWidth, sample.encodedHeight);
        const received = this.formatResolution(sample.receivedWidth, sample.receivedHeight);

        if (!capture && !encoded && !received) {
            return "UNKNOWN";
        }

        if (capture && encoded && capture !== encoded) {
            return `CAPTURE_TO_ENCODER_REDUCED:${capture}->${encoded}`;
        }

        if (encoded && received && encoded !== received) {
            return `ENCODER_TO_RECEIVER_CHANGED:${encoded}->${received}`;
        }

        return "CONSISTENT";
    }

    getBrowserBehaviourState(avg, latest) {
        if (latest.encoderLimitedByCpu) {
            return "BROWSER_CPU_LIMITED";
        }

        if (latest.encoderLimitedByBandwidth) {
            return "BROWSER_BANDWIDTH_LIMITED";
        }

        if (
            avg.availableBitrate > 0 &&
            avg.actualBitrate > avg.availableBitrate * 1.8 &&
            avg.rtt < 0.35 &&
            avg.packetLoss < 0.04
        ) {
            return "BROWSER_ESTIMATE_CONSERVATIVE";
        }

        return "BROWSER_NORMAL";
    }

    handleStartupDecision(decision) {
        if (this.history.length < this.startupSamplesRequired) {
            this.currentProfile = "MEDIUM";
            this.lastDecision.profile = "MEDIUM";
            this.lastReason = "Startup sampling";
            return;
        }

        this.initialEvaluationComplete = true;

        if (decision.health === "HEALTHY") {
            this.setProfile("HIGH", "Startup selected HIGH");
            return;
        }

        if (decision.health === "CONGESTED") {
            this.setProfile("LOW", decision.reason);
            return;
        }

        this.setProfile("MEDIUM", "Startup selected MEDIUM");
    }

    applyDecision(decision) {
        const now = Date.now();

        if (decision.health === "HEALTHY") {
            this.goodSamples += 1;
            this.badSamples = 0;
            this.stableSamples += 1;
        } else if (decision.health === "CONGESTED") {
            this.badSamples += 1;
            this.goodSamples = 0;
            this.stableSamples = 0;
        } else if (decision.health === "DEGRADED") {
            this.badSamples += 1;
            this.goodSamples = 0;
            this.stableSamples = 0;
        } else {
            this.stableSamples += 1;
            this.goodSamples = 0;
            this.badSamples = 0;
        }

        const recoveryMode = this.currentProfile === "LOW" && decision.profile !== "LOW";
        const switchInterval = recoveryMode
            ? this.recoverySwitchIntervalMs
            : this.minimumSwitchIntervalMs;

        if (now - this.lastSwitch < switchInterval) {
            return;
        }

        if (decision.profile === this.currentProfile) {
            return;
        }

        if (this.shouldDowngrade(decision)) {
            this.setProfile(decision.profile, decision.reason);
            return;
        }

        if (this.shouldUpgrade(decision)) {
            this.setProfile(decision.profile, decision.reason);
        }
    }

    shouldDowngrade(decision) {
        if (decision.profile === "HIGH") {
            return false;
        }

        if (decision.health === "CONGESTED") {
            return this.badSamples >= 2;
        }

        if (decision.health === "DEGRADED" && this.currentProfile === "HIGH") {
            return this.badSamples >= 3;
        }

        return false;
    }

    shouldUpgrade(decision) {
        if (decision.profile !== "HIGH" && decision.profile !== "MEDIUM") {
            return false;
        }

        if (decision.health !== "HEALTHY") {
            return false;
        }

        if (this.currentProfile === "LOW") {
            return this.goodSamples >= 2;
        }

        return this.goodSamples >= 3;
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

    getCongestionReason(avg, latest) {
        if (latest.encoderLimitedByCpu) return "Encoder CPU limited";
        if (latest.encoderLimitedByBandwidth) return "Encoder bandwidth limited";
        if (avg.rtt > 0.85) return "High RTT";
        if (avg.packetLoss > 0.12) return "High packet loss";
        if (avg.jitter > 0.14) return "High jitter";
        if (avg.fps > 0 && avg.fps < 14) return "Low FPS";
        if (avg.actualBitrate > 0 && avg.actualBitrate < 700000) return "Low actual bitrate";

        return "Network degradation";
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
            stableSamples: this.stableSamples
        };
    }

    number(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    getVariance(values) {
        const cleanValues = values.filter((value) => Number.isFinite(value));

        if (cleanValues.length <= 1) {
            return 0;
        }

        const mean = cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length;

        return cleanValues.reduce((sum, value) => {
            const diff = value - mean;
            return sum + diff * diff;
        }, 0) / cleanValues.length;
    }

    formatResolution(width, height) {
        if (!width || !height) {
            return "";
        }

        return `${Math.round(width)}x${Math.round(height)}`;
    }
}