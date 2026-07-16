/**
 * EncoderController
 *
 * Presentation-safe encoder controller.
 *
 * This module does NOT fight the browser.
 *
 * It applies a single startup HD preference to the video sender,
 * then lets WebRTC's native congestion control do its job.
 *
 * It never:
 * - restarts ICE
 * - creates RTCPeerConnection
 * - replaces tracks
 * - runs adaptation loops
 * - forces repeated profile switching
 */

export class EncoderController {
    constructor(options = {}) {
        this.applied = false;
        this.lastPlan = null;
        this.lastResult = null;
        this.lastError = null;

        this.options = {
            maxBitrate: options.maxBitrate || 3800000,
            minBitrate: options.minBitrate || 1200000,
            maxFramerate: options.maxFramerate || 30,
            scaleResolutionDownBy:
                Math.max(
                    1,
                    Number(options.scaleResolutionDownBy) || 1
                ),
            degradationPreference:
                options.degradationPreference || "maintain-resolution"
        };
    }

    async applyStartupPreference(peerConnection) {
        if (!peerConnection) {
            return this.lastResult;
        }

        const sender = this.getVideoSender(peerConnection);

        if (!sender || !sender.track) {
            this.lastResult = {
                applied: false,
                reason: "No video sender available",
                timestamp: Date.now()
            };

            return this.lastResult;
        }

        const trackSettings = this.getTrackSettings(sender.track);
        const plan = this.createStartupPlan(trackSettings);

        try {
            const params = sender.getParameters();

            params.encodings = this.prepareEncodings(params.encodings);

            params.encodings[0] = {
                ...params.encodings[0],
                active: true,
                adaptivePtime: false,
                maxBitrate: plan.maxBitrate,
                maxFramerate: plan.maxFramerate,
                scaleResolutionDownBy: plan.scaleResolutionDownBy,
                priority: "high",
                networkPriority: "high"
            };

            if (this.supportsMinBitrate()) {
                params.encodings[0].minBitrate = plan.minBitrate;
            }

            params.degradationPreference = plan.degradationPreference;

            await sender.setParameters(params);

            
            this.lastPlan = plan;
            this.lastError = null;
            this.lastResult = {
                applied: true,
                reason: "Startup HD preference applied",
                plan,
                timestamp: Date.now()
            };

            console.log(
                `[Encoder] Startup preference applied: ` +
                `${plan.targetWidth}x${plan.targetHeight}, ` +
                `${Math.round(plan.maxBitrate / 1000)} kbps, ` +
                `${plan.maxFramerate} fps`
            );

            return this.lastResult;
        } catch (error) {
            this.lastError = error;
            this.lastResult = {
                applied: false,
                reason: error?.message || "Failed to apply startup encoder preference",
                plan,
                timestamp: Date.now()
            };

            console.warn("[Encoder] Startup preference failed:", error);

            return this.lastResult;
        }
    }

    createStartupPlan(trackSettings = {}) {
        const captureWidth = Number(trackSettings.width || 0);
        const captureHeight = Number(trackSettings.height || 0);

        const captureIsHd =
            captureWidth >= 1280 &&
            captureHeight >= 720;

        return {
            targetWidth: captureIsHd ? 1280 : captureWidth || 1280,
            targetHeight: captureIsHd ? 720 : captureHeight || 720,

            captureWidth,
            captureHeight,
            captureIsHd,

            maxBitrate: this.options.maxBitrate,
            minBitrate: this.options.minBitrate,
            maxFramerate: this.options.maxFramerate,
            scaleResolutionDownBy: this.options.scaleResolutionDownBy,
            degradationPreference: this.options.degradationPreference,

            policy: captureIsHd
                ? "PRESERVE_HD_CAPTURE"
                : "USE_CAPTURE_NATIVE",

            allowBrowserAdaptation: true,

            preserveResolution: captureIsHd,

            verifyEncoderResolution: true
        };
    }

    getVideoSender(peerConnection) {
        if (typeof peerConnection.getSenders !== "function") {
            return null;
        }

        return peerConnection
            .getSenders()
            .find((sender) => sender.track?.kind === "video") || null;
    }

    getTrackSettings(track) {
        if (!track || typeof track.getSettings !== "function") {
            return {};
        }

        return track.getSettings() || {};
    }

    prepareEncodings(encodings) {
        if (!Array.isArray(encodings) || encodings.length === 0) {
            return [{}];
        }

        return encodings;
    }

    supportsMinBitrate() {
        return true;
    }

    wasApplied() {
        return this.applied;
    }

    getLastPlan() {
        return this.lastPlan;
    }

    getLastResult() {
        return this.lastResult;
    }

    getLastError() {
        return this.lastError;
    }

    getDiagnostics() {
        return {
            applied: this.applied,
            lastPlan: this.lastPlan,
            lastResult: this.lastResult,
            lastError: this.lastError
                ? this.lastError.message || String(this.lastError)
                : null
        };
    }

    verifyEncoderState(trackSettings = {}) {

    const width = Number(trackSettings.width || 0);
    const height = Number(trackSettings.height || 0);

    return {

        captureIsHd:
            width >= 1280 &&
            height >= 720,

        captureWidth: width,

        captureHeight: height,

        expectedWidth:
            this.lastPlan?.targetWidth ?? width,

        expectedHeight:
            this.lastPlan?.targetHeight ?? height,

        matchesPlan:
            width === (this.lastPlan?.targetWidth ?? width) &&
            height === (this.lastPlan?.targetHeight ?? height)

    };

}

    reset() {
        this.applied = false;
        this.lastPlan = null;
        this.lastResult = null;
        this.lastError = null;
    }
}

export default EncoderController;