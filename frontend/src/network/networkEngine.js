import { Telemetry } from "./telemetry";
import { AdaptiveController } from "./adaptiveController";
import { EncoderController } from "./encoderController";
import featureToggleManager from "./featureToggleManager";
import deviceCapabilityManager from "./deviceCapabilityManager";
import sessionPreparationManager from "./sessionPreparationManager";
import connectionGuardian from "./connectionGuardian";
import resourceMonitor from "./resourceMonitor";

export class NetworkEngine {

    constructor(peerConnection) {

        this.peerConnection = peerConnection;

        this.telemetry = new Telemetry(peerConnection);
        this.adaptiveController = new AdaptiveController();
        this.encoderController = new EncoderController();

        /*
        * Support Systems
        * These modules are read-only at this stage.
        * They never influence the communication pipeline.
        */
        this.featureToggleManager = featureToggleManager;
        this.deviceCapabilityManager = deviceCapabilityManager;
        this.sessionPreparationManager = sessionPreparationManager;
        this.connectionGuardian = connectionGuardian;
        this.resourceMonitor = resourceMonitor;

        this.interval = null;
        this.currentProfile = null;

    }

    start() {

        this.telemetry.start();

        /*
        * Initialize support systems.
        * Read-only initialization only.
        */
        this.deviceCapabilityManager.getProfile();
        this.sessionPreparationManager.prepare();
        this.resourceMonitor.getSnapshot();

        this.connectionGuardian.update({
            connectionState: this.peerConnection.connectionState,
            iceConnectionState: this.peerConnection.iceConnectionState,
            iceGatheringState: this.peerConnection.iceGatheringState,
            signalingState: this.peerConnection.signalingState,
        });

        if (this.interval) return;

        this.interval = setInterval(async () => {

            const stats = this.telemetry.getStats();

            /*
            * Refresh passive support systems.
            * No influence on encoder or adaptive logic.
            */
            this.resourceMonitor.refresh();

            this.connectionGuardian.update({
                connectionState: this.peerConnection.connectionState,
                iceConnectionState: this.peerConnection.iceConnectionState,
                iceGatheringState: this.peerConnection.iceGatheringState,
                signalingState: this.peerConnection.signalingState,
            });

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