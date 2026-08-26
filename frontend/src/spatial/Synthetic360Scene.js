export class Synthetic360Scene {
    constructor() {
        this.texture = null;
        this.canvas = null;
        this.ctx = null;
    }

    create(width = 2048, height = 1024) {
        this.canvas = document.createElement("canvas");

        this.canvas.width = width;
        this.canvas.height = height;

        this.ctx = this.canvas.getContext("2d");

        if (!this.ctx) {
            console.error(
                "[Spatial] Failed to create synthetic 360 canvas"
            );

            return null;
        }

        this.drawScene();

        this.createDepthMap();

        console.log(
            "[Spatial] Synthetic 360 scene created"
        );

        return this.canvas;
    }

    drawScene() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        ctx.fillStyle = "#18202a";
        ctx.fillRect(0, 0, width, height);

        /*
         * Synthetic sky
         */

        const skyGradient =
            ctx.createLinearGradient(
                0,
                0,
                0,
                height * 0.5
            );

        skyGradient.addColorStop(
            0,
            "#426b91"
        );

        skyGradient.addColorStop(
            1,
            "#b8d0df"
        );

        ctx.fillStyle = skyGradient;

        ctx.fillRect(
            0,
            0,
            width,
            height * 0.5
        );

        /*
         * Ground
         */

        ctx.fillStyle = "#59635b";

        ctx.fillRect(
            0,
            height * 0.5,
            width,
            height * 0.5
        );

        /*
         * Horizon
         */

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 6;

        ctx.beginPath();

        ctx.moveTo(
            0,
            height * 0.5
        );

        ctx.lineTo(
            width,
            height * 0.5
        );

        ctx.stroke();

        /*
         * Vertical reference lines.
         */

        ctx.strokeStyle =
            "rgba(255,255,255,0.35)";

        ctx.lineWidth = 3;

        for (
            let x = 0;
            x <= width;
            x += width / 12
        ) {
            ctx.beginPath();

            ctx.moveTo(
                x,
                0
            );

            ctx.lineTo(
                x,
                height
            );

            ctx.stroke();
        }

        /*
         * Large distance markers.
         */

        ctx.fillStyle = "#ffffff";

        ctx.font = "bold 70px sans-serif";

        const labels = [
            "NORTH",
            "EAST",
            "SOUTH",
            "WEST"
        ];

        labels.forEach(
            (label, index) => {
                const x =
                    width *
                    (index + 0.5) /
                    4;

                ctx.fillText(
                    label,
                    x - 100,
                    height * 0.35
                );
            }
        );

        /*
         * Near objects.
         */

        this.drawObject(
            width * 0.25,
            height * 0.65,
            130,
            "#d9a441"
        );

        this.drawObject(
            width * 0.50,
            height * 0.72,
            180,
            "#8f5b4a"
        );

        this.drawObject(
            width * 0.75,
            height * 0.62,
            110,
            "#527c63"
        );

        /*
         * Center reference marker.
         */

        ctx.fillStyle = "#ffffff";

        ctx.beginPath();

        ctx.arc(
            width * 0.5,
            height * 0.5,
            18,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    drawObject(
        x,
        y,
        size,
        color
    ) {
        const ctx = this.ctx;

        ctx.fillStyle = color;

        ctx.fillRect(
            x - size / 2,
            y - size,
            size,
            size
        );

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 5;

        ctx.strokeRect(
            x - size / 2,
            y - size,
            size,
            size
        );
    }


        createDepthMap() {
            const depthCanvas =
                document.createElement("canvas");

                depthCanvas.width =
                    this.canvas.width;

                depthCanvas.height =
                    this.canvas.height;

                const ctx =
                    depthCanvas.getContext("2d");

                if (!ctx) {
                    console.error(
                        "[Spatial] Failed to create depth map"
                    );

                    return null;
                }

                /*
                * Depth representation:
                *
                * White  = near
                * Gray   = medium
                * Black  = far
                */

                ctx.fillStyle = "#202020";

                ctx.fillRect(
                    0,
                    0,
                    depthCanvas.width,
                    depthCanvas.height
                );

                /*
                * Medium-depth environment
                */

                ctx.fillStyle = "#777777";

                ctx.fillRect(
                    0,
                    depthCanvas.height * 0.5,
                    depthCanvas.width,
                    depthCanvas.height * 0.5
                );

                /*
                * Near objects
                */

                ctx.fillStyle = "#eeeeee";

                ctx.fillRect(
                    depthCanvas.width * 0.25 - 65,
                    depthCanvas.height * 0.65 - 130,
                    130,
                     130
                );

                ctx.fillRect(
                    depthCanvas.width * 0.50 - 90,
                    depthCanvas.height * 0.72 - 180,
                    180,
                    180
                );

                ctx.fillRect(
                    depthCanvas.width * 0.75 - 55,
                    depthCanvas.height * 0.62 - 110,
                    110,
                    110
                );

                this.depthCanvas =
                    depthCanvas;

                console.log(
                    "[Spatial] Synthetic depth map created"
                );

                return depthCanvas;
        }

        getCanvas() {
            return this.canvas;
        }

        getDepthCanvas() {
            return this.depthCanvas;
        }
}

export default Synthetic360Scene;