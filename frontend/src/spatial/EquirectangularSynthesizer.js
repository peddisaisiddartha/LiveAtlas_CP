export default class EquirectangularSynthesizer {
    constructor({
        width = 2048,
        height = 1024,
        fps = 30,
    } = {}) {
        this.width = width;
        this.height = height;
        this.fps = fps;

        this.sourceStream = null;
        this.outputStream = null;
        this.canvas = null;
        this.context = null;
        this.animationFrame = null;
        this.videoElement = null;
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

        const sourceWidth =
            settings.width || 0;

        const sourceHeight =
            settings.height || 0;

        if (!sourceWidth || !sourceHeight) {
            throw new Error(
                "[360 Source] Video dimensions unavailable"
            );
        }

        this.sourceStream = sourceStream;

        this.canvas =
            document.createElement("canvas");

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.context =
            this.canvas.getContext("2d");

        if (!this.context) {
            throw new Error(
                "[360 Source] Canvas 2D context unavailable"
            );
        }

        this.videoElement =
            document.createElement("video");

        this.videoElement.autoplay = true;
        this.videoElement.muted = true;
        this.videoElement.playsInline = true;
        this.videoElement.srcObject =
            sourceStream;

        await this.videoElement.play();

        const drawFrame = () => {
            if (
                !this.videoElement ||
                !this.context ||
                !this.outputStream
            ) {
                return;
            }

            const ctx = this.context;

            ctx.clearRect(
                0,
                0,
                this.width,
                this.height
            );

            const segmentWidth =
                this.width / 4;

            for (let i = 0; i < 4; i += 1) {
                const sourceX =
                    i % 2 === 0
                        ? 0
                        : sourceWidth;

                const sourceY =
                    i < 2
                        ? 0
                        : sourceHeight / 2;

                const sourceW =
                    sourceWidth;

                const sourceH =
                    sourceHeight / 2;

                const destinationX =
                    i * segmentWidth;

                ctx.drawImage(
                    this.videoElement,
                    sourceX,
                    sourceY,
                    sourceW,
                    sourceH,
                    destinationX,
                    0,
                    segmentWidth,
                    this.height
                );
            }

            this.animationFrame =
                requestAnimationFrame(
                    drawFrame
                );
        };

        const canvasStream =
            this.canvas.captureStream(
                this.fps
            );

        this.outputStream =
            new MediaStream();

        canvasStream
            .getVideoTracks()
            .forEach((track) => {
                this.outputStream.addTrack(track);
            });

        sourceStream
            .getAudioTracks()
            .forEach((track) => {
                this.outputStream.addTrack(track);
            });

        drawFrame();

        console.log(
            "[360 Source] Equirectangular synthesis started:",
            {
                sourceWidth,
                sourceHeight,
                outputWidth: this.width,
                outputHeight: this.height,
                fps: this.fps,
                aspectRatio:
                    this.width /
                    this.height,
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
        if (this.animationFrame) {
            cancelAnimationFrame(
                this.animationFrame
            );

            this.animationFrame = null;
        }

        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.srcObject = null;
            this.videoElement = null;
        }

        if (this.outputStream) {
            this.outputStream
                .getTracks()
                .forEach((track) => {
                    track.stop();
                });
        }

        this.outputStream = null;
        this.sourceStream = null;
        this.canvas = null;
        this.context = null;
    }
}