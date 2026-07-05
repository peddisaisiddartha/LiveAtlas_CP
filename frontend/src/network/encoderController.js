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

        params.encodings ??= [{}];

        params.degradationPreference = "maintain-resolution";

        params.encodings[0].maxBitrate = profile.bitrate;
        params.encodings[0].maxFramerate = profile.fps;
        params.encodings[0].scaleResolutionDownBy = 1.0;
        params.encodings[0].priority = "high";
        params.encodings[0].networkPriority = "high";

        try {

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