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
        this.currentProfile = null;

    }

    start() {

        this.telemetry.start();

        if (this.interval) return;

        this.interval = setInterval(async () => {

            const stats = this.telemetry.getStats();

            if (
                !stats ||
                stats.timestamp === undefined
            ) {
                return;
            }

            this.adaptiveController.update(stats);

            if (!this.adaptiveController.hasProfileChanged()) {
                return;
            }

            const profile =
            this.adaptiveController.getCurrentProfile();

            if (this.currentProfile !== profile.name) {

            console.log(
                `[NetworkEngine] ${this.currentProfile ?? "NONE"} → ${profile.name}`
            );

            this.currentProfile = profile.name;

            await this.encoderController.applyProfile(
                this.peerConnection,
                profile
        );

}

        }, 1000);

    }

    stop() {

        this.telemetry.stop();

        if (this.interval) {

            clearInterval(this.interval);
            this.interval = null;

        }

        this.encoderController.reset();

    }

}