export class DepthEngine {
    constructor() {
        this.enabled = false;
        this.depthMap = null;
        this.width = 0;
        this.height = 0;
        this.smoothedDepth = null;
        this.depthSmoothing = 0.75;
    }

    initialize(width = 0, height = 0) {
        this.width = width;
        this.height = height;

        console.log(
            "[Spatial] Depth engine initialized:",
            `${width}x${height}`
        );

        return true;
    }

    setDepthSource(source) {
        if (!source) {
            console.warn(
                "[Spatial] Invalid depth source"
            );

            return false;
        }

        this.depthMap = {
            width: source.width,
            height: source.height,
            sourceAvailable: true,
            source,
            status: "synthetic"
        };

        this.width = source.width;
        this.height = source.height;

        console.log(
            "[Spatial] Synthetic depth source attached:",
            `${source.width}x${source.height}`
        );

        console.log(
            "[Spatial] Depth map ready:",
            this.depthMap
        );

        return true;
    }


    async estimate(source) {
        if (!source) {
            return null;
        }

        if (
            source.readyState !== undefined &&
            source.readyState <
            HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
            return null;
        }

        try {
            if (!this.depthPipeline) {
                console.log(
                    "[Spatial] Loading depth-estimation model..."
                );

                const { pipeline } =
                    await import(
                        "@huggingface/transformers"
                    );

                this.depthPipeline =
                    await pipeline(
                        "depth-estimation",
                        "onnx-community/depth-anything-v2-small"
                    );

                console.log(
                    "[Spatial] Depth-estimation model ready"
                );
            }

            const inputCanvas =
                document.createElement("canvas");

            const inputWidth =
                source.videoWidth ||
                source.width ||
                this.width ||
                1280;

            const inputHeight =
                source.videoHeight ||
                source.height ||
                this.height ||
                720;

            inputCanvas.width = inputWidth;
            inputCanvas.height = inputHeight;

            const inputCtx =
                inputCanvas.getContext("2d", {
                    willReadFrequently: true
                });

            if (!inputCtx) {
                console.warn(
                    "[Spatial] Unable to create depth input canvas"
                );

                return null;
            }

            inputCtx.drawImage(
                source,
                0,
                0,
                inputWidth,
                inputHeight
            );

            const result =
                await this.depthPipeline(
                    inputCanvas
                );

            if (
                !result ||
                !result.depth
            ) {
                console.warn(
                    "[Spatial] Depth estimation returned no depth map"
                );

                return null;
            }

            const depth =
                result.depth;

            const depthData =
                depth.data;

            if (!depthData || !depth.width || !depth.height) {
                console.warn(
                    "[Spatial] Invalid AI depth data"
                );

                return null;
            }

            if (
                !this.smoothedDepth ||
                this.smoothedDepth.length !== depthData.length
            ) {
                this.smoothedDepth =
                    new Float32Array(depthData.length);

                this.smoothedDepth.set(depthData);
            } else {
                const smoothing =
                    this.depthSmoothing;

                for (
                    let i = 0;
                    i < depthData.length;
                    i++
                ) {
                    this.smoothedDepth[i] =
                        this.smoothedDepth[i] * smoothing +
                        depthData[i] * (1 - smoothing);
                }
            }

            const canvas =
                document.createElement("canvas");

            canvas.width =
                depth.width;

            canvas.height =
                depth.height;

            const ctx =
                canvas.getContext("2d", {
                    willReadFrequently: true
                });

            if (!ctx) {
                return null;
            }

            const imageData =
                ctx.createImageData(
                    canvas.width,
                    canvas.height
                );

            const data =
                imageData.data;


            const sortedDepth =
                Array.from(this.smoothedDepth).sort(
                    (a, b) => a - b
                );

            const lowIndex =
                Math.floor(
                    sortedDepth.length * 0.02
                );

            const highIndex =
                Math.floor(
                    sortedDepth.length * 0.98
                );

            const depthMin =
                sortedDepth[lowIndex];

            const depthMax =
                sortedDepth[highIndex];

            const depthRange =
                Math.max(
                    depthMax - depthMin,
                    0.0001
                );

            for (
                let i = 0;
                i < this.smoothedDepth.length;
                i++
            ) {
                const normalized =
                    Math.max(
                        0,
                        Math.min(
                            1,
                            (
                                this.smoothedDepth[i] -
                                depthMin
                            ) / depthRange
                        )
                    );

                const enhanced =
                    Math.pow(
                        normalized,
                        0.75
                    );

                const value =
                    Math.round(
                        enhanced * 255
                    );

                const pixel =
                    i * 4;

                data[pixel] =
                    value;

                data[pixel + 1] =
                    value;

                data[pixel + 2] =
                    value;

                data[pixel + 3] =
                    255;
            }

            ctx.putImageData(
                imageData,
                0,
                0
            );

            this.depthMap = {
                width: canvas.width,
                height: canvas.height,
                sourceAvailable: true,
                source: canvas,
                status: "ai",
                min: depthMin,
                max: depthMax
            };

            this.width =
                canvas.width;

            this.height =
                canvas.height;

            console.log(
                "[Spatial] AI depth map generated:",
                `${canvas.width}x${canvas.height}`
            );

            return this.depthMap;

        } catch (error) {
            console.error(
                "[Spatial] Depth estimation failed:",
                error
            );

            return null;
        }
    }

    getDepthMap() {
        return this.depthMap;
    }

    getParallaxOffset(x, y, movementX, movementY) {
        if (!this.depthMap || !this.depthMap.source) {
            return {
                x: 0,
                y: 0
            };
        }

        const canvas =
            this.depthMap.source;

        const ctx =
            canvas.getContext("2d");

        if (!ctx) {
            return {
                x: 0,
                y: 0
            };
        }

        const px =
            Math.max(
                0,
                Math.min(
                    canvas.width - 1,
                    Math.floor(x * canvas.width)
                )
            );

        const py =
            Math.max(
                0,
                Math.min(
                    canvas.height - 1,
                    Math.floor(y * canvas.height)
                )
            );

        const pixel =
            ctx.getImageData(
                px,
                py,
                1,
                1
            ).data;

        const depth =
            pixel[0] / 255;

        return {
            x: movementX * depth * 0.15,
            y: movementY * depth * 0.15
        };
    }

    isReady() {
        return !!this.depthMap;
    }

    reset() {
        this.depthMap = null;
        this.smoothedDepth = null;
    }

    destroy() {
        this.reset();

        this.width = 0;
        this.height = 0;

        console.log("[Spatial] Depth engine destroyed");
    }
}

export default DepthEngine;