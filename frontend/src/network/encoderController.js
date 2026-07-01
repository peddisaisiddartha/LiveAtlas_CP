export class EncoderController {

    async applyProfile(peerConnection, profile) {

        if (!peerConnection) return;

        const sender = peerConnection
            .getSenders()
            .find(sender => sender.track?.kind === "video");

        if (!sender) return;

        const params = sender.getParameters();

        if (!params.encodings) {
            params.encodings = [{}];
        }

        params.degradationPreference = "maintain-resolution";

        params.encodings[0].maxBitrate = profile.bitrate;
        params.encodings[0].maxFramerate = profile.fps;
        params.encodings[0].scaleResolutionDownBy = 1.0;
        params.encodings[0].networkPriority = "high";
        params.encodings[0].priority = "high";

        try {
            await sender.setParameters(params);
        } catch (err) {
            console.error("EncoderController:", err);
        }

    }

}