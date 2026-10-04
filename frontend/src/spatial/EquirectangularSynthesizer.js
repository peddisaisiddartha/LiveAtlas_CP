export default class EquirectangularSynthesizer {
    constructor({
        width = 0,
        height = 0,
        fps = 30,
    } = {}) {
        this.width = width;
        this.height = height;
        this.fps = fps;

        this.sourceStream = null;
        this.outputStream = null;
    }

    async start(sourceStream) {
        if (!sourceStream) {
            throw new Error(
                "[360 Source] Source stream missing"
            );
        }

        const videoTracks =
            sourceStream.getVideoTracks();

        if (videoTracks.length === 0) {
            throw new Error(
                "[360 Source] No video track available"
            );
        }

        const videoTrack =
            videoTracks[0];

        const settings =
            videoTrack.getSettings();

        const width =
            settings.width || 0;

        const height =
            settings.height || 0;

        if (!width || !height) {
            throw new Error(
                "[360 Source] Video dimensions unavailable"
            );
        }

        const aspectRatio =
            width / height;

        const EQUIRECTANGULAR_RATIO = 2;
        const EQUIRECTANGULAR_TOLERANCE = 0.05;

        if (
            Math.abs(
                aspectRatio -
                EQUIRECTANGULAR_RATIO
            ) > EQUIRECTANGULAR_TOLERANCE
        ) {
            throw new Error(
                `[360 Source] Genuine equirectangular source required. Received ${width}x${height}`
            );
        }

        this.width = width;
        this.height = height;
        this.fps =
            settings.frameRate ||
            this.fps;

        this.sourceStream =
            sourceStream;

        this.outputStream =
            new MediaStream();

        videoTracks.forEach((track) => {
            this.outputStream.addTrack(track);
        });

        sourceStream
            .getAudioTracks()
            .forEach((track) => {
                this.outputStream.addTrack(track);
            });

        console.log(
            "[360 Source] Genuine equirectangular source accepted:",
            {
                width: this.width,
                height: this.height,
                fps: this.fps,
                aspectRatio,
            }
        );

        return this.outputStream;
    }

    getVideoTrack() {
        return (
            this.outputStream
                ?.getVideoTracks()[0] ||
            null
        );
    }

    stop() {
        if (this.outputStream) {
            this.outputStream
                .getTracks()
                .forEach((track) => {
                    track.stop();
                });
        }

        this.outputStream = null;
        this.sourceStream = null;
    }
}