import WebXRController from "./WebXRController";
import SpatialRenderer from "./SpatialRenderer";
import DepthEngine from "./DepthEngine";
import Synthetic360Scene from "./Synthetic360Scene";

export class SpatialTest {
    constructor(canvas) {
        this.canvas = canvas;

        this.webXR = new WebXRController();
        this.renderer = new SpatialRenderer();
        this.depth = new DepthEngine();
        this.renderer.setDepthEngine(
        this.depth
        );
        this.synthetic360 = new Synthetic360Scene();

        this.webXR.setRenderer(this.renderer);

        this.running = false;
        this.animationFrame = null;
    }

    async initialize() {
        if (!this.canvas) {
            console.error("[SpatialTest] Canvas missing");
            return false;
        }

        const rendererReady =
            this.renderer.initialize(this.canvas);

        if (!rendererReady) {
            return false;
        }

            this.depth.initialize(
                this.canvas.width,
                this.canvas.height
            );

            const sceneCanvas =
                this.synthetic360.create();

            const depthCanvas =
                this.synthetic360.getDepthCanvas();

            if (sceneCanvas) {
                this.renderer.setSceneCanvas(
                    sceneCanvas
                );
            }


            
            if (depthCanvas) {
                this.renderer.setDepthCanvas(
                    depthCanvas
                );
            }

            const supported =
                await this.webXR.isSupported();

            console.log(
                "[SpatialTest] WebXR supported:",
                supported
            );

            this.running = true;
            this.renderLoop();

            return true;
    }

    renderLoop = (timestamp) => {
        if (!this.running) {
            return;
        }

        const pose = this.webXR.getPose();

        this.renderer.render(pose);

        this.animationFrame =
            requestAnimationFrame(this.renderLoop);
    };

    async startVR() {
        const started =
            await this.webXR.startSession();

        if (!started) {
            return false;
        }

        console.log(
            "[SpatialTest] VR session active"
        );

        return true;
    }

    async stopVR() {
        await this.webXR.stopSession();

        console.log(
            "[SpatialTest] VR session stopped"
        );
    }

    destroy() {
        this.running = false;

        if (this.animationFrame) {
            cancelAnimationFrame(
                this.animationFrame
            );

            this.animationFrame = null;
        }

        this.webXR.stopSession();
        this.renderer.destroy();
        this.depth.destroy();
    }
}

export default SpatialTest;