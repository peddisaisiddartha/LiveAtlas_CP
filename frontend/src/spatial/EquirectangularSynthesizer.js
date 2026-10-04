export default class EquirectangularSynthesizer {
    constructor({
        width = 2048,
        height = 1024,
        fps = 30,
    } = {}) {
        this.width = width;
        this.height = height;
        this.fps = fps;

        this.canvas = document.createElement("canvas");
        this.canvas.width = width;
        this.canvas.height = height;

        this.ctx = this.canvas.getContext("2d", {
            alpha: false,
            desynchronized: true,
        });

        this.video = document.createElement("video");
        this.video.autoplay = true;
        this.video.muted = true;
        this.video.playsInline = true;

        this.sourceStream = null;
        this.outputStream = null;
        this.animationFrame = null;
        this.running = false;
    }

    async start(sourceStream) {
        if (!sourceStream) {
            throw new Error("[360 Synth] Source stream missing");
        }

        this.sourceStream = sourceStream;
        this.video.srcObject = sourceStream;

        await this.video.play();

        const draw = () => {
            if (!this.running) return;

            const ctx = this.ctx;
            const W = this.width;
            const H = this.height;

            if (
                this.video.readyState >=
                HTMLMediaElement.HAVE_CURRENT_DATA
            ) {
                ctx.clearRect(0, 0, W, H);

                /*
                 * Convert the normal webcam image into a
                 * synthetic equirectangular panorama.
                 *
                 * The webcam view is repeated/mirrored around
                 * the full 360° longitude.
                 */

                const segmentWidth = W / 4;

                for (let i = 0; i < 4; i++) {
                    const x = i * segmentWidth;

                    ctx.save();

                    if (i % 2 === 0) {
                        ctx.drawImage(
                            this.video,
                            x,
                            0,
                            segmentWidth,
                            H
                        );
                    } else {
                        ctx.translate(x + segmentWidth, 0);
                        ctx.scale(-1, 1);

                        ctx.drawImage(
                            this.video,
                            0,
                            0,
                            segmentWidth,
                            H
                        );
                    }

                    ctx.restore();
                }
            }

            this.animationFrame =
                requestAnimationFrame(draw);
        };

        this.running = true;
        draw();

        this.outputStream =
            this.canvas.captureStream(this.fps);

        /*
         * Keep the original camera audio.
         */
        const audioTracks =
            sourceStream.getAudioTracks();

        audioTracks.forEach((track) => {
            this.outputStream.addTrack(track);
        });

        console.log(
            "[360 Synth] Synthetic equirectangular stream started",
            {
                width: this.width,
                height: this.height,
                fps: this.fps,
            }
        );

        return this.outputStream;
    }

    getVideoTrack() {
        return this.outputStream?.getVideoTracks()[0] || null;
    }

    stop() {
        this.running = false;

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        if (this.video) {
            this.video.pause();
            this.video.srcObject = null;
        }

        if (this.outputStream) {
            this.outputStream
                .getVideoTracks()
                .forEach((track) => track.stop());
        }

        this.outputStream = null;
        this.sourceStream = null;
    }
}