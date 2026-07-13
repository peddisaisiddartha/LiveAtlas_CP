export class EncoderController {

    constructor() {

        this.lastProfile = null;

    }

    async applyProfile(peerConnection, profile) {

        if (!peerConnection || !profile) return;

        // Prevent unnecessary encoder updates
        if (
            this.lastProfile &&
            this.lastProfile.name === profile.name
        ) {
            return;
        }

        const sender = peerConnection
            .getSenders()
            .find(s => s.track?.kind === "video");

        if (!sender) return;

        const params = sender.getParameters();

        const track = sender.track;

        if (!track) {
            return;
        }

        const settings = track.getSettings();

        params.encodings ??= [{}];

        params.encodings[0].active = true;

        params.encodings[0].maxBitrate = Math.max(
            params.encodings[0].maxBitrate || 0,
            profile.bitrate
        );

        // Keep the encoder from scaling below the camera capture
        if (
            settings.width &&
            settings.width >= 1280 &&
            profile.name === "HIGH"
        ) {
            params.encodings[0].scaleResolutionDownBy = 1.0;
        }

        params.degradationPreference = "balanced";

        params.encodings[0].maxBitrate = profile.bitrate;

        params.encodings[0].minBitrate =
            profile.name === "HIGH"
                ? 2500000
                : profile.name === "MEDIUM"
                ? 1000000
                : 400000;

        params.encodings[0].maxFramerate = profile.fps;

        params.encodings[0].maxFramerate =
            profile.name === "HIGH"
                ? 30
                : profile.name === "MEDIUM"
                ? 24
                : 20;

        

        if (profile.name === "HIGH") {

        params.encodings[0].scaleResolutionDownBy = 1.0;

        } else if (profile.name === "MEDIUM") {

            params.encodings[0].scaleResolutionDownBy = 1.5;

        } else {

            params.encodings[0].scaleResolutionDownBy = 2.0;

        }
        params.encodings[0].priority =
            profile.name === "LOW" ? "medium" : "high";

        params.encodings[0].networkPriority =
            profile.name === "LOW" ? "medium" : "high";

        try {

            if (
                profile.name === "HIGH" &&
                settings.width &&
                settings.width < 1280
            ) {
                console.warn(
                "[Encoder] Camera is not providing 1280px width:",
                settings
                );
            }

            await sender.setParameters(params);

            this.lastProfile = profile;

            console.log(
                `[Encoder] Switched to ${profile.name} (${profile.width}x${profile.height} @ ${profile.fps} FPS, ${Math.round(profile.bitrate / 1000)} kbps)`
            );

        } catch (err) {

            console.error(
                "[Encoder] Failed to apply profile:",
                err
            );

        }

    }

    reset() {

        this.lastProfile = null;

    }

}