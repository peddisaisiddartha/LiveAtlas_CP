export class EncoderController {
    constructor(options = {}) {
        this.lastProfile = null;
        this.lastAppliedAt = null;
        this.lastError = null;
        this.lastDiagnostics = null;

        this.preserveHdResolution = options.preserveHdResolution ?? true;
    }

    async applyProfile(peerConnection, profile) {
        if (!peerConnection || !profile) {
            return false;
        }

        const sender = this.getVideoSender(peerConnection);

        if (!sender || !sender.track) {
            this.lastDiagnostics = {
                status: "NO_VIDEO_SENDER",
                profileName: profile.name,
                timestamp: Date.now()
            };

            return false;
        }

        const track = sender.track;
        const settings = this.getTrackSettings(track);

        const desiredPlan = this.buildEncoderPlan(profile, settings);

        if (this.isSamePlan(desiredPlan)) {
            return false;
        }

        try {
            const params = sender.getParameters();

            params.encodings = this.prepareEncodings(params.encodings);
            params.encodings[0] = {
                ...params.encodings[0],
                ...desiredPlan.encoding
            };

            if (desiredPlan.degradationPreference) {
                params.degradationPreference = desiredPlan.degradationPreference;
            }

            await sender.setParameters(params);

            this.lastProfile = {
                name: profile.name,
                width: profile.width,
                height: profile.height,
                fps: profile.fps,
                bitrate: profile.bitrate
            };

            this.lastAppliedAt = Date.now();
            this.lastError = null;
            this.lastDiagnostics = {
                status: "APPLIED",
                profileName: profile.name,
                capture: desiredPlan.capture,
                encoding: desiredPlan.encoding,
                degradationPreference: desiredPlan.degradationPreference,
                resolutionPolicy: desiredPlan.resolutionPolicy,
                timestamp: this.lastAppliedAt
            };

            console.log(
                `[Encoder] Applied ${profile.name} (${profile.width}x${profile.height} @ ${profile.fps} FPS, ${Math.round(profile.bitrate / 1000)} kbps)`
            );

            return true;
        } catch (error) {
            this.lastError = error;
            this.lastDiagnostics = {
                status: "FAILED",
                profileName: profile.name,
                message: error?.message || "Failed to apply encoder profile",
                timestamp: Date.now()
            };

            console.error("[Encoder] Failed to apply profile:", error);

            return false;
        }
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

    buildEncoderPlan(profile, settings) {
        const captureWidth = Number(settings.width || 0);
        const captureHeight = Number(settings.height || 0);

        const canCapture720p =
            captureWidth >= 1280 &&
            captureHeight >= 720;

        const isHigh = profile.name === "HIGH";
        const isMedium = profile.name === "MEDIUM";
        const isLow = profile.name === "LOW";

        const resolutionPolicy = this.getResolutionPolicy({
            profile,
            captureWidth,
            captureHeight,
            canCapture720p
        });

        const encoding = {
            active: true,
            maxBitrate: profile.bitrate,
            maxFramerate: this.getFps(profile),
            scaleResolutionDownBy: resolutionPolicy.scaleResolutionDownBy,
            priority: isLow ? "medium" : "high",
            networkPriority: isLow ? "medium" : "high"
        };

        const minBitrate = this.getMinBitrate(profile);

        if (minBitrate) {
            encoding.minBitrate = minBitrate;
        }

        return {
            profileName: profile.name,
            capture: {
                width: captureWidth || null,
                height: captureHeight || null
            },
            encoding,
            degradationPreference: this.getDegradationPreference(profile, canCapture720p),
            resolutionPolicy
        };
    }

    getResolutionPolicy({ profile, captureWidth, captureHeight, canCapture720p }) {
        if (profile.name === "HIGH") {
            if (this.preserveHdResolution && canCapture720p) {
                return {
                    name: "PRESERVE_CAPTURE_HD",
                    scaleResolutionDownBy: 1,
                    reason: "Camera capture supports 1280x720"
                };
            }

            return {
                name: "HIGH_WITH_AVAILABLE_CAPTURE",
                scaleResolutionDownBy: 1,
                reason: captureWidth && captureHeight
                    ? `Camera capture is ${captureWidth}x${captureHeight}`
                    : "Camera capture size is unknown"
            };
        }

        if (profile.name === "MEDIUM") {
            if (canCapture720p) {
                return {
                    name: "MEDIUM_SOFT_SCALE",
                    scaleResolutionDownBy: 1.333,
                    reason: "Medium profile reduces load while avoiding aggressive downscale"
                };
            }

            return {
                name: "MEDIUM_NO_EXTRA_SCALE",
                scaleResolutionDownBy: 1,
                reason: "Capture is already below HD"
            };
        }

        return {
            name: "LOW_CONSERVATIVE_SCALE",
            scaleResolutionDownBy: canCapture720p ? 2 : 1.5,
            reason: "Low profile for degraded network conditions"
        };
    }

    getDegradationPreference(profile, canCapture720p) {
        if (profile.degradationPreference) {
            return profile.degradationPreference;
        }

        if (profile.name === "HIGH" && canCapture720p) {
            return "maintain-resolution";
        }

        if (profile.name === "LOW") {
            return "maintain-framerate";
        }

        return "balanced";
    }

    getMinBitrate(profile) {
        if (profile.name === "HIGH") return 2500000;
        if (profile.name === "MEDIUM") return 1000000;
        if (profile.name === "LOW") return 350000;

        return undefined;
    }

    getFps(profile) {
        if (profile.name === "HIGH") return 30;
        if (profile.name === "MEDIUM") return 24;
        if (profile.name === "LOW") return 20;

        return profile.fps || 24;
    }

    prepareEncodings(encodings) {
        if (!Array.isArray(encodings) || encodings.length === 0) {
            return [{}];
        }

        return encodings;
    }

    isSamePlan(plan) {
        if (!this.lastProfile || !this.lastDiagnostics) {
            return false;
        }

        const lastEncoding = this.lastDiagnostics.encoding;

        return (
            this.lastProfile.name === plan.profileName &&
            lastEncoding?.maxBitrate === plan.encoding.maxBitrate &&
            lastEncoding?.maxFramerate === plan.encoding.maxFramerate &&
            lastEncoding?.scaleResolutionDownBy === plan.encoding.scaleResolutionDownBy
        );
    }

    getLastProfile() {
        return this.lastProfile;
    }

    getLastDiagnostics() {
        return this.lastDiagnostics;
    }

    getLastError() {
        return this.lastError;
    }

    reset() {
        this.lastProfile = null;
        this.lastAppliedAt = null;
        this.lastError = null;
        this.lastDiagnostics = null;
    }
}