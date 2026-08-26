import spatialConfig from "./spatialConfig";

export class WebXRController {
    constructor() {
        this.session = null;
        this.referenceSpace = null;
        this.renderer = null;
        this.enabled = spatialConfig.webXR.enabled;
        this.pose = {
            x: 0,
            y: 0,
            z: 0,
            yaw: 0,
            pitch: 0,
            roll: 0
        };
        this.onXRFrame = this.onXRFrame.bind(this);
        this.lastPoseLogTime = 0;
    }


        setRenderer(renderer) {
            this.renderer = renderer;
        }


    async isSupported() {
        if (!this.enabled) {
            return false;
        }

        if (!navigator.xr) {
            return false;
        }

        return await navigator.xr.isSessionSupported("immersive-vr");
    }

        async startSession() {
            if (this.session) {
                console.log("[Spatial] WebXR session already active");
                return true;
            }

            const supported = await this.isSupported();

            if (!supported) {
                console.warn("[Spatial] WebXR immersive VR not supported");
                return false;
            }

            try {
                this.session = await navigator.xr.requestSession(
                    "immersive-vr",
                    {
                        optionalFeatures:
                            spatialConfig.webXR.optionalFeatures
                    }
                );

            this.session.addEventListener("end", () => {
                console.log("[Spatial] WebXR session ended");

                this.session = null;
                this.referenceSpace = null;
            });

                this.referenceSpace =
                    await this.session.requestReferenceSpace("local-floor");

                    if (this.renderer) {
                        await this.renderer.setupXR(this.session);
                    }

                    console.log("[Spatial] WebXR session started");

                    this.session.requestAnimationFrame(this.onXRFrame);
            

                return true;
                } catch (error) {
                    console.warn(
                        "[Spatial] WebXR session failed:",
                        error
                    );

                    this.session = null;
                    this.referenceSpace = null;

                    return false;
                }
        }

        updatePose(frame) {
            if (!this.session || !this.referenceSpace || !frame) {
                return this.pose;
            }

        const viewerPose =
            frame.getViewerPose(this.referenceSpace);

        if (!viewerPose) {
            return this.pose;
        }

        const transform =
            viewerPose.views[0]?.transform;

        if (!transform) {
            return this.pose;
        }

        const position = transform.position;

        this.pose.x = position.x;
        this.pose.y = position.y;
        this.pose.z = position.z;

        const orientation = transform.orientation;

        if (orientation) {
            const { x, y, z, w } = orientation;

            this.pose.yaw = Math.atan2(
                2 * (w * y + x * z),
                1 - 2 * (y * y + z * z)
            );

            this.pose.pitch = Math.asin(
                Math.max(
                    -1,
                    Math.min(
                        1,
                        2 * (w * x - z * y)
                    )
                )
            );

            this.pose.roll = Math.atan2(
                2 * (w * z + x * y),
                1 - 2 * (x * x + y * y)
            );
        }

        return this.pose;
    }

        onXRFrame(timestamp, frame) {
            if (!this.session) {
                return;
            }

            this.updatePose(frame);

            if (timestamp - this.lastPoseLogTime > 500) {
                console.log("[Spatial 6DoF POSE]", {
                    x: this.pose.x,
                    y: this.pose.y,
                    z: this.pose.z,
                    yaw: this.pose.yaw,
                    pitch: this.pose.pitch,
                    roll: this.pose.roll
                });

                this.lastPoseLogTime = timestamp;
            }

            if (this.renderer) {
                this.renderer.renderXR(
                    frame,
                    this.referenceSpace
                );
            }

            this.session.requestAnimationFrame(
                this.onXRFrame
            );
        }

    getPose() {
        return { ...this.pose };
    }

    async stopSession() {
        if (!this.session) {
            return;
        }

        try {
            await this.session.end();
        } catch (error) {
            console.warn(
                "[Spatial] Failed to end WebXR session:",
                error
            );
        }

        this.session = null;
        this.referenceSpace = null;

        console.log("[Spatial] WebXR session stopped");
    }

    isActive() {
        return !!this.session;
    }
}

export default WebXRController;