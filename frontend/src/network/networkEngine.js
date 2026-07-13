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

        /*
        * Enable support systems.
        */
        this.featureToggleManager.enable("deviceCapabilityManager");
        this.featureToggleManager.enable("sessionPreparationManager");
        this.featureToggleManager.enable("connectionGuardian");
        this.featureToggleManager.enable("resourceMonitor");

        this.interval = null;
        this.currentProfile = null;

        this.connectionListenersRegistered = false;

        this.connectionHandlers = {};

    }

    start() {

        this.telemetry.start();

        /*
        * Initialize support systems.
        */

        if (this.featureToggleManager.isEnabled("deviceCapabilityManager")) {
            this.deviceCapabilityManager.refresh();
        }

        if (this.featureToggleManager.isEnabled("sessionPreparationManager")) {
            this.sessionPreparationManager.prepare();
        }

        if (this.featureToggleManager.isEnabled("resourceMonitor")) {
            this.resourceMonitor.refresh();
        }

        if (this.featureToggleManager.isEnabled("connectionGuardian")) {

    this.connectionGuardian.update({
        connectionState: this.peerConnection.connectionState,
        iceConnectionState: this.peerConnection.iceConnectionState,
        iceGatheringState: this.peerConnection.iceGatheringState,
        signalingState: this.peerConnection.signalingState,
    });

    if (!this.connectionListenersRegistered) {

        this.connectionHandlers.connectionState = () => {
    this.connectionGuardian.update({
        connectionState: this.peerConnection.connectionState,
    });
};

this.connectionHandlers.iceConnectionState = () => {
    this.connectionGuardian.update({
        iceConnectionState: this.peerConnection.iceConnectionState,
    });
};

this.connectionHandlers.iceGatheringState = () => {
    this.connectionGuardian.update({
        iceGatheringState: this.peerConnection.iceGatheringState,
    });
};

this.connectionHandlers.signalingState = () => {
    this.connectionGuardian.update({
        signalingState: this.peerConnection.signalingState,
    });
};

this.peerConnection.addEventListener(
    "connectionstatechange",
    this.connectionHandlers.connectionState
);

this.peerConnection.addEventListener(
    "iceconnectionstatechange",
    this.connectionHandlers.iceConnectionState
);

this.peerConnection.addEventListener(
    "icegatheringstatechange",
    this.connectionHandlers.iceGatheringState
);

this.peerConnection.addEventListener(
    "signalingstatechange",
    this.connectionHandlers.signalingState
);

        this.connectionListenersRegistered = true;
    }

}

        if (this.interval) return;

        this.interval = setInterval(async () => {

            if (
                this.adaptiveController.history.length < 5
            ) {
                return;
            }

            const stats = this.telemetry.getStats();

            /*
             * Refresh runtime support systems.
             */
            if (this.featureToggleManager.isEnabled("resourceMonitor")) {
                this.resourceMonitor.refresh();
            }

            // ConnectionGuardian is now event-driven.
            // No polling required here.

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

            if (
                !profile ||
                !profile.name
            ) {
                return;
            }

            if (this.currentProfile !== profile.name) {

            console.log(
                `[NetworkEngine] ${this.currentProfile ?? "NONE"} → ${profile.name}`
            );

            this.currentProfile = profile.name;

            await this.encoderController.applyProfile(
                this.peerConnection,
                profile
            );

            const stats = this.telemetry.getStats();

            console.log(
                `[NetworkEngine] Profile=${profile.name} | ` +
                `Actual=${Math.round((stats.actualBitrate || 0) / 1000)} kbps | ` +
                `Available=${Math.round((stats.availableBitrate || 0) / 1000)} kbps | ` +
                `RTT=${Math.round((stats.rtt || 0) * 1000)} ms`
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

    if (this.featureToggleManager.isEnabled("connectionGuardian")) {

        if (this.connectionListenersRegistered) {

            this.peerConnection.removeEventListener(
                    "connectionstatechange",
                this.connectionHandlers.connectionState
            );

            this.peerConnection.removeEventListener(
                "iceconnectionstatechange",
                this.connectionHandlers.iceConnectionState
            );

            this.peerConnection.removeEventListener(
                "icegatheringstatechange",
                this.connectionHandlers.iceGatheringState
            );

            this.peerConnection.removeEventListener(
                "signalingstatechange",
                this.connectionHandlers.signalingState
            );

            this.connectionListenersRegistered = false;
            this.connectionHandlers = {};
        }

        this.connectionGuardian.reset();
    }

    if (this.featureToggleManager.isEnabled("resourceMonitor")) {
        this.resourceMonitor.destroy();
    }

    this.encoderController.reset();

}

}