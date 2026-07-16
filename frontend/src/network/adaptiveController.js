/**
 * AdaptiveController
 *
 * Decision engine for LiveAtlas.
 *
 * This module observes the complete media pipeline and produces a stable,
 * evidence-based recommendation. It never calls WebRTC APIs, changes a sender,
 * restarts ICE, replaces tracks, or attempts to override browser congestion
 * control.
 *
 * The browser remains responsible for real-time adaptation. This controller
 * identifies where quality changed and tells the orchestration layer whether
 * the browser should be allowed to recover naturally.
 */

const DEFAULT_PROFILES = Object.freeze({

    LOW: {
        name: "LOW",
        width: 640,
        height: 360,
        fps: 20,
        bitrate: 800000
    },

    MEDIUM: {
        name: "MEDIUM",
        width: 960,
        height: 540,
        fps: 24,
        bitrate: 1800000
    },

    HIGH: {
        name: "HIGH",
        width: 1280,
        height: 720,
        fps: 30,
        bitrate: 3800000
    }

});

const DEFAULT_OPTIONS = Object.freeze({
    historySize: 20,
    analysisWindowSize: 8,
    minimumSamplesForDecision: 4,
    hdAreaRatio: 0.90,
    healthyRttMs: 220,
    healthyJitterMs: 45,
    healthyPacketLoss: 0.03,
    healthyBitrate: 1800000,
});

export class AdaptiveController {
    constructor(options = {}) {
        this.options = {
            ...DEFAULT_OPTIONS,
            ...options,
        };

        // Kept for compatibility with the existing NetworkEngine API.
        this.profiles = structuredClone(DEFAULT_PROFILES);

        this.currentProfile = this.profiles.HIGH;
        this.previousProfile = null;
        this.profileChanged = false;

        this.history = [];
        this.lastDecision = this.createInitialDecision();
        this.lastUpdatedAt = null;

        this.lastProfileChange = 0;
        this.minimumProfileDuration = 10000; // 10 seconds
    }

    update(telemetry = {}) {
        const sample = this.normalizeTelemetry(telemetry);

        if (!sample.timestamp) {
            return this.getLastDecision();
        }

        this.history.push(sample);

        if (this.history.length > this.options.historySize) {
            this.history.shift();
        }

        const samples = this.getAnalysisSamples();
        const pipeline = this.analyzePipeline(samples);
        const network = this.analyzeNetwork(samples);
        const browser = this.analyzeBrowser(samples, pipeline, network);

        this.previousProfile = this.currentProfile;
        this.profileChanged = false;
        this.lastUpdatedAt = sample.timestamp;

        this.lastDecision = this.createDecision({
            sample,
            samples,
            pipeline,
            network,
            browser,
        });

        return this.getLastDecision();
    }

    getCurrentProfile() {
        return { ...this.currentProfile };
    }

    getCurrentProfileName() {
        return this.currentProfile.name;
    }

    getStartupProfile() {
        return this.getCurrentProfile();
    }

    hasProfileChanged() {
        return this.profileChanged;
    }

    getLastDecision() {
        return this.clone(this.lastDecision);
    }

    getDecision() {
        return this.getLastDecision();
    }

    getHistory() {
        return this.history.map((sample) => this.clone(sample));
    }

    getDiagnostics() {
        return {
            profile: this.getCurrentProfile(),
            historySize: this.history.length,
            lastUpdatedAt: this.lastUpdatedAt,
            decision: this.getLastDecision(),
        };
    }

    reset() {
        this.currentProfile = this.profiles.HIGH;
        this.previousProfile = null;
        this.profileChanged = false;
        this.history = [];
        this.lastUpdatedAt = null;
        this.lastDecision = this.createInitialDecision();
    }

    createInitialDecision() {
        return {
            timestamp: null,
            state: "OBSERVING",
            reason: "Waiting for WebRTC telemetry.",
            pipeline: {
                state: "UNKNOWN",
                capture: null,
                encoded: null,
                received: null,
                captureToEncoderRatio: null,
                encoderToReceiverRatio: null,
            },
            network: {
                state: "UNKNOWN",
                stable: false,
                estimateUnderstatesThroughput: false,
            },
            browser: {
                state: "UNKNOWN",
                shouldAllowNativeRecovery: true,
            },
            recommendation: {
                encoderAction: "NO_PARAMETER_CHANGE",
                networkAction: "NO_ACTION",
                browserAction: "ALLOW_NATIVE_ADAPTATION",
            },
        };
    }

    getAnalysisSamples() {
        return this.history.slice(-this.options.analysisWindowSize);
    }

    normalizeTelemetry(telemetry) {
        const captureWidth = this.firstNumber(
            telemetry.capture?.width,
            telemetry.capture?.frameWidth,
            telemetry.captureWidth,
            telemetry.captureFrameWidth
        );

        const captureHeight = this.firstNumber(
            telemetry.capture?.height,
            telemetry.capture?.frameHeight,
            telemetry.captureHeight,
            telemetry.captureFrameHeight
        );

        const encodedWidth = this.firstNumber(
            telemetry.encoding?.width,
            telemetry.encoding?.frameWidth,
            telemetry.encodedWidth,
            telemetry.encodedFrameWidth
        );

        const encodedHeight = this.firstNumber(
            telemetry.encoding?.height,
            telemetry.encoding?.frameHeight,
            telemetry.encodedHeight,
            telemetry.encodedFrameHeight
        );

        const receivedWidth = this.firstNumber(
            telemetry.reception?.width,
            telemetry.reception?.frameWidth,
            telemetry.receivedWidth,
            telemetry.receivedFrameWidth,
            telemetry.frameWidth
        );

        const receivedHeight = this.firstNumber(
            telemetry.reception?.height,
            telemetry.reception?.frameHeight,
            telemetry.receivedHeight,
            telemetry.receivedFrameHeight,
            telemetry.frameHeight
        );

        return {
            timestamp: this.firstNumber(telemetry.timestamp, Date.now()),

            capture: this.createResolution(captureWidth, captureHeight),
            encoded: this.createResolution(encodedWidth, encodedHeight),
            received: this.createResolution(receivedWidth, receivedHeight),

            fps: this.firstNumber(
                telemetry.encoding?.fps,
                telemetry.fps
            ),

            actualBitrate: this.firstNumber(
                telemetry.transmission?.actualBitrate,
                telemetry.actualBitrate
            ),

            availableBitrate: this.firstNumber(
                telemetry.transmission?.availableBitrate,
                telemetry.availableBitrate,
                telemetry.availableOutgoingBitrate
            ),

            rttMs: this.toMilliseconds(
                this.firstNumber(
                    telemetry.rttMs,
                    telemetry.transmission?.rttMs,
                    telemetry.rtt,
                    telemetry.transmission?.rtt
                ),
                telemetry.rttMs !== undefined ||
                    telemetry.transmission?.rttMs !== undefined
            ),

            jitterMs: this.toMilliseconds(
                this.firstNumber(
                    telemetry.jitterMs,
                    telemetry.reception?.jitterMs,
                    telemetry.jitter,
                    telemetry.reception?.jitter
                ),
                telemetry.jitterMs !== undefined ||
                    telemetry.reception?.jitterMs !== undefined
            ),

            packetLoss: this.toRatio(
                this.firstNumber(
                    telemetry.packetLoss,
                    telemetry.reception?.packetLoss
                )
            ),

            qualityLimitation: String(
                telemetry.qualityLimitation ||
                    telemetry.encoding?.qualityLimitation ||
                    telemetry.encoding?.qualityLimitationReason ||
                    "none"
            ).toLowerCase(),

            encoderLimitedByCpu: Boolean(
                telemetry.encoderLimitedByCpu ||
                    telemetry.encoding?.limitedByCpu
            ),

            encoderLimitedByBandwidth: Boolean(
                telemetry.encoderLimitedByBandwidth ||
                    telemetry.encoding?.limitedByBandwidth
            ),

            connectionState:
                telemetry.connectionState ||
                telemetry.connection?.connectionState ||
                "",

            iceConnectionState:
                telemetry.iceConnectionState ||
                telemetry.connection?.iceConnectionState ||
                "",
        };
    }

    analyzePipeline(samples) {
        const latest = samples[samples.length - 1];

        if (!latest) {
            return {
                state: "UNKNOWN",
                capture: null,
                encoded: null,
                received: null,
                captureToEncoderRatio: null,
                encoderToReceiverRatio: null,
            };
        }

        const captureToEncoderRatio = this.resolutionRatio(
            latest.encoded,
            latest.capture
        );

        const encoderToReceiverRatio = this.resolutionRatio(
            latest.received,
            latest.encoded
        );

        const encodedBelowCapture =
            this.isHd(latest.capture) &&
            captureToEncoderRatio !== null &&
            captureToEncoderRatio < 0.90;

        const receivedBelowEncoder =
            this.isHd(latest.encoded) &&
            encoderToReceiverRatio !== null &&
            encoderToReceiverRatio < 0.90;

        let state = "PARTIALLY_OBSERVED";

        if (!latest.capture.width || !latest.capture.height) {
            state = "CAPTURE_UNKNOWN";
        } else if (!latest.encoded.width || !latest.encoded.height) {
            state = "ENCODER_UNKNOWN";
        } else if (encodedBelowCapture) {
            state = "CAPTURE_TO_ENCODER_DEGRADATION";
        } else if (receivedBelowEncoder) {
            state = "ENCODER_TO_RECEIVER_DEGRADATION";
        } else if (this.isHd(latest.capture) && this.isHd(latest.encoded)) {
            state = "HD_PRESERVED";
        } else {
            state = "PIPELINE_ALIGNED";
        }

        return {
            state,
            capture: latest.capture,
            encoded: latest.encoded,
            received: latest.received,
            captureToEncoderRatio,
            encoderToReceiverRatio,
            encodedBelowCapture,
            receivedBelowEncoder,
        };
    }

    analyzeNetwork(samples) {
        if (!samples.length) {
            return {
                state: "UNKNOWN",
                stable: false,
                healthySampleRatio: 0,
                estimateUnderstatesThroughput: false,
            };
        }

        const averageRttMs = this.average(samples, "rttMs");
        const averageJitterMs = this.average(samples, "jitterMs");
        const averagePacketLoss = this.average(samples, "packetLoss");
        const averageActualBitrate = this.average(samples, "actualBitrate");
        const averageAvailableBitrate = this.average(samples, "availableBitrate");

        const healthySamples = samples.filter((sample) => {
            const rttHealthy =
                sample.rttMs === 0 ||
                sample.rttMs <= this.options.healthyRttMs;

            const jitterHealthy =
                sample.jitterMs === 0 ||
                sample.jitterMs <= this.options.healthyJitterMs;

            const lossHealthy =
                sample.packetLoss <= this.options.healthyPacketLoss;

            return rttHealthy && jitterHealthy && lossHealthy;
        });

        const healthySampleRatio = healthySamples.length / samples.length;

        const estimateUnderstatesThroughput =
            averageActualBitrate > 1500000 &&
        (
            averageAvailableBitrate === 0 ||
            averageActualBitrate > averageAvailableBitrate * 1.5
        );

        const hasSustainedVideoThroughput =
            averageActualBitrate >= this.options.healthyBitrate;

        const stable =
            healthySampleRatio >= 0.75 &&
        (
            hasSustainedVideoThroughput ||
            estimateUnderstatesThroughput
        );

        let state = "OBSERVING";

        if (samples.length < this.options.minimumSamplesForDecision) {
            state = "OBSERVING";
        } else if (stable) {
            state = "HEALTHY";
        } else if (healthySampleRatio >= 0.5) {
            state = "VARIABLE";
        } else {
            state = "CONSTRAINED";
        }

        return {
            state,
            stable,
            healthySampleRatio,
            averageRttMs,
            averageJitterMs,
            averagePacketLoss,
            averageActualBitrate,
            averageAvailableBitrate,
            estimateUnderstatesThroughput,
            hasSustainedVideoThroughput,
        };
    }

    analyzeBrowser(samples, pipeline, network) {
        const latest = samples[samples.length - 1];

        if (!latest) {
            return {
                state: "UNKNOWN",
                shouldAllowNativeRecovery: true,
            };
        }

        const cpuLimited =
            latest.encoderLimitedByCpu ||
            latest.qualityLimitation.includes("cpu");

        const bandwidthLimited =
            latest.encoderLimitedByBandwidth ||
            latest.qualityLimitation.includes("bandwidth");

        const sustainedEncoderDownscale =
            samples.length >= this.options.minimumSamplesForDecision &&
            samples.filter((sample) => {
                const ratio = this.resolutionRatio(
                    sample.encoded,
                    sample.capture
                );

                return (
                    ratio !== null &&
                    ratio < this.options.hdAreaRatio
                );
            }).length >= this.options.minimumSamplesForDecision;

        const likelyConservative =
            sustainedEncoderDownscale &&
            network.stable &&
            !cpuLimited &&
            !bandwidthLimited;

        let state = "NATIVE_ADAPTATION";

        if (likelyConservative) {
            state = "CONSERVATIVE_ENCODING";
        } else if (cpuLimited) {
            state = "CPU_LIMITED";
        } else if (bandwidthLimited) {
            state = "BANDWIDTH_LIMITED";
        } else if (pipeline.state === "HD_PRESERVED") {
            state = "HD_PRESERVED";
        }

        return {
            state,
            cpuLimited,
            bandwidthLimited,
            sustainedEncoderDownscale,
            likelyConservative,
            shouldAllowNativeRecovery: true,
        };
    }

    createDecision({ sample, samples, pipeline, network, browser }) {
        let state = "OBSERVING";
        let reason = "Collecting enough stable telemetry samples.";

        if (this.isConnectionUnavailable(sample)) {
            state = "CONNECTION_NOT_READY";
            reason = "WebRTC connection is not ready for media analysis.";
        } else if (samples.length < this.options.minimumSamplesForDecision) {
            state = "OBSERVING";
            reason = "Collecting a short telemetry history before judging quality.";
        } else if (pipeline.state === "HD_PRESERVED") {
            state = "HD_PRESERVED";
            reason = "Capture and encoder are preserving HD resolution.";
        } else if (browser.likelyConservative) {
            state = "BROWSER_CONSERVATIVE";
            reason =
                "The encoder is below capture resolution while transport remains stable. " +
                "Allow Chrome to recover without repeatedly changing sender parameters.";
        } else if (browser.cpuLimited) {
            state = "BROWSER_CPU_LIMITED";
            reason =
                "Browser telemetry reports CPU pressure. Keep the session stable and let the browser adapt.";
        } else if (network.state === "CONSTRAINED") {
            state = "NETWORK_CONSTRAINED";
            reason =
                "Multiple transport signals indicate genuine network pressure. Native WebRTC congestion control should lead.";
        } else if (pipeline.state === "CAPTURE_TO_ENCODER_DEGRADATION") {
            state = "ENCODER_BELOW_CAPTURE";
            reason =
                "The camera is capturing more detail than the active encoder is producing. Continue observing browser recovery.";
        } else if (pipeline.state === "ENCODER_TO_RECEIVER_DEGRADATION") {
            state = "RECEIVER_BELOW_ENCODER";
            reason =
                "The receiver is displaying less resolution than the sender encodes. Inspect receiver-side browser and rendering telemetry.";
        } else {
            state = "STABLE";
            reason = "The media pipeline is stable with no action required.";
        }

        const profile = this.selectProfile(
            pipeline,
            network,
            browser
        );

        const now = Date.now();

        if (
            this.currentProfile.name !== profile.name &&
            now - this.lastProfileChange >= this.minimumProfileDuration
        ) {
            this.currentProfile = profile;
            this.profileChanged = true;
            this.lastProfileChange = now;
        } else {
            this.profileChanged = false;
        }

        return {
            timestamp: sample.timestamp,
            state,
            reason,
            profile,
            pipeline,
            network,
            browser,
            recommendation: {
                encoderAction: this.profileChanged
                ? "APPLY_PROFILE"
                : "NO_PARAMETER_CHANGE",
                networkAction: "NO_ACTION",
                browserAction: "ALLOW_NATIVE_ADAPTATION",
                applyProfile: this.profileChanged
            }
        };
    }

    isConnectionUnavailable(sample) {
        const terminalStates = ["failed", "closed"];
        const connectionState = String(sample.connectionState).toLowerCase();
        const iceState = String(sample.iceConnectionState).toLowerCase();

        return (
            terminalStates.includes(connectionState) ||
            terminalStates.includes(iceState)
        );
    }

    createResolution(width, height) {
        const normalizedWidth = Math.max(0, Number(width) || 0);
        const normalizedHeight = Math.max(0, Number(height) || 0);

        return {
            width: normalizedWidth,
            height: normalizedHeight,
            area: normalizedWidth * normalizedHeight,
        };
    }

    resolutionRatio(output, input) {
        if (!output?.area || !input?.area) {
            return null;
        }

        return output.area / input.area;
    }

    isHd(resolution) {
        return (
            resolution?.width >= 1280 &&
            resolution?.height >= 720
        );
    }

    average(samples, key) {
        const values = samples
            .map((sample) => Number(sample[key]))
            .filter((value) => Number.isFinite(value) && value >= 0);

        if (!values.length) {
            return 0;
        }

        return values.reduce((total, value) => total + value, 0) / values.length;
    }

    firstNumber(...values) {
        for (const value of values) {
            const numericValue = Number(value);

            if (Number.isFinite(numericValue) && numericValue >= 0) {
                return numericValue;
            }
        }

        return 0;
    }

    toMilliseconds(value, alreadyMilliseconds) {
        if (!Number.isFinite(value) || value <= 0) {
            return 0;
        }

        return alreadyMilliseconds ? value : value * 1000;
    }

    toRatio(value) {
        if (!Number.isFinite(value) || value <= 0) {
            return 0;
        }

        return value > 1 ? value / 100 : value;
    }

    clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    selectProfile(pipeline, network, browser) {

    // Preserve HD whenever possible.
    if (
        pipeline.state === "HD_PRESERVED" &&
        network.stable
    ) {
        return this.profiles.HIGH;
    }

    // Browser is temporarily conservative.
    // Don't immediately downgrade.
    if (
        browser.likelyConservative &&
        network.stable
    ) {
        return this.currentProfile;
    }

    // CPU limitation is real.
    if (
        browser.cpuLimited
    ) {
        return this.profiles.MEDIUM;
    }

    // Genuine network congestion.
    if (
        network.state === "CONSTRAINED"
    ) {
        return this.profiles.LOW;
    }

    // Variable network.
    if (
        network.state === "VARIABLE"
    ) {
        return this.profiles.MEDIUM;
    }

    return this.profiles.HIGH;

}
}

export default AdaptiveController;