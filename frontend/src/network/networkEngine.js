import { Telemetry } from "./telemetry";
import { AdaptiveController } from "./adaptiveController";
import { EncoderController } from "./encoderController";

export class NetworkEngine {

    constructor(peerConnection) {

        this.peerConnection = peerConnection;

        this.telemetry = new Telemetry(peerConnection);
        this.adaptiveController = new AdaptiveController();
        this.encoderController = new EncoderController();

        this.interval = null;

    }

    start() {

        this.telemetry.start();

        this.interval = setInterval(async () => {

            const stats = this.telemetry.getStats();

            if (!stats || Object.keys(stats).length === 0) {
                return;
            }

            this.adaptiveController.update(stats);

            const profile = this.adaptiveController.getCurrentProfile();

            await this.encoderController.applyProfile(
                this.peerConnection,
                profile
            );

        }, 1000);

    }

    stop() {

        this.telemetry.stop();

        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

    }

}