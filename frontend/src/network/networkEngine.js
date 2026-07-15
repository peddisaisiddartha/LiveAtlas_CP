import { Telemetry } from "./telemetry";
import { AdaptiveController } from "./adaptiveController";
import { EncoderController } from "./encoderController";
import featureToggleManager from "./featureToggleManager";
import deviceCapabilityManager from "./deviceCapabilityManager";
import sessionPreparationManager from "./sessionPreparationManager";
import connectionGuardian from "./connectionGuardian";
import resourceMonitor from "./resourceMonitor";

export class NetworkEngine {
    constructor(peerConnection, options = {}) {
        this.peerConnection = peerConnection;

        this.options = {
            telemetryIntervalMs: options.telemetryIntervalMs || 1000,
            applyStartupEncoderPreference:
                options.applyStartupEncoderPreference ?? true,
            engineVersion: options.engineVersion || "BROWSER_COOPERATIVE_PRESENTATION"
        };

        this.telemetry = new Telemetry(peerConnection);
        this.adaptiveController = new AdaptiveController();
        this.encoderController = new EncoderController(options.encoder || {});

        this.featureToggleManager = featureToggleManager;
        this.deviceCapabilityManager = deviceCapabilityManager;
        this.sessionPreparationManager = sessionPreparationManager;
        this.connectionGuardian = connectionGuardian;
        this.resourceMonitor = resourceMonitor;

        this.started = false;
        this.interval = null;

        this.currentProfile = "HIGH";
        this.lastStats = null;
        this.lastDiagnostics = null;
        this.lastEncoderResult = null;

        this.connectionListenersRegistered = false;
        this.connectionHandlers = {};
    }

    async start() {
        if (!this.peerConnection || this.started) {
            return;
        }

        this.started = true;

        this.enableSupportSystems();
        await this.initializeSupportSystems();
        this.registerConnectionListeners();

        this.telemetry.start();

        if (this.options.applyStartupEncoderPreference) {
            this.lastEncoderResult =
                await this.encoderController.applyStartupPreference(
                    this.peerConnection
                );
        }

        this.interval = setInterval(() => {
            this.tick();
        }, this.options.telemetryIntervalMs);
    }

    enableSupportSystems() {
        this.featureToggleManager.enableCoreSupportSystems?.();

        this.featureToggleManager.enable("deviceCapabilityManager");
        this.featureToggleManager.enable("sessionPreparationManager");
        this.featureToggleManager.enable("connectionGuardian");
        this.featureToggleManager.enable("resourceMonitor");
    }

    async initializeSupportSystems() {
        if (this.featureToggleManager.isEnabled("deviceCapabilityManager")) {
            this.deviceCapabilityManager.refresh();
        }

        if (this.featureToggleManager.isEnabled("sessionPreparationManager")) {
            await this.sessionPreparationManager.prepare();
        }

        if (this.featureToggleManager.isEnabled("resourceMonitor")) {
            this.resourceMonitor.refresh();
        }

        if (this.featureToggleManager.isEnabled("connectionGuardian")) {
            this.connectionGuardian.update(this.getPeerConnectionState());
        }
    }

    tick() {
        if (!this.started || !this.peerConnection) {
            return;
        }

        const stats = this.telemetry.getStats();

        if (!stats || stats.timestamp === undefined) {
            return;
        }

        this.refreshRuntimeSystems();

        this.lastStats = this.enrichStats(stats);

        this.adaptiveController.update(this.lastStats);

        this.lastDiagnostics = {
            timestamp: Date.now(),
            engineVersion: this.options.engineVersion,
            profile: this.currentProfile,
            telemetry: this.lastStats,
            adaptive: this.adaptiveController.getDiagnostics(),
            encoder: this.encoderController.getDiagnostics(),
            connection: this.connectionGuardian.getDiagnostics?.() || null,
            resource: this.resourceMonitor.getDiagnostics?.() || null,
            device: this.deviceCapabilityManager.getDiagnostics?.() || null
        };
    }

    enrichStats(stats) {
        const connectionState = this.connectionGuardian.getState?.() || {};

        return {
            ...stats,

            connectionState:
                connectionState.connectionState ||
                this.peerConnection.connectionState,

            iceConnectionState:
                connectionState.iceConnectionState ||
                this.peerConnection.iceConnectionState,

            iceGatheringState:
                connectionState.iceGatheringState ||
                this.peerConnection.iceGatheringState,

            signalingState:
                connectionState.signalingState ||
                this.peerConnection.signalingState,

            connectionStabilityState:
                connectionState.stabilityState || "UNKNOWN",

            connectionDuration:
                connectionState.connectionDuration || 0
        };
    }

    refreshRuntimeSystems() {
        if (this.featureToggleManager.isEnabled("resourceMonitor")) {
            this.resourceMonitor.refresh();
        }

        if (this.featureToggleManager.isEnabled("connectionGuardian")) {
            this.connectionGuardian.update(this.getPeerConnectionState());
        }
    }

    registerConnectionListeners() {
        if (
            !this.featureToggleManager.isEnabled("connectionGuardian") ||
            this.connectionListenersRegistered ||
            !this.peerConnection
        ) {
            return;
        }

        this.connectionHandlers.connectionState = () => {
            this.connectionGuardian.update({
                connectionState: this.peerConnection.connectionState
            });
        };

        this.connectionHandlers.iceConnectionState = () => {
            this.connectionGuardian.update({
                iceConnectionState: this.peerConnection.iceConnectionState
            });
        };

        this.connectionHandlers.iceGatheringState = () => {
            this.connectionGuardian.update({
                iceGatheringState: this.peerConnection.iceGatheringState
            });
        };

        this.connectionHandlers.signalingState = () => {
            this.connectionGuardian.update({
                signalingState: this.peerConnection.signalingState
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

    unregisterConnectionListeners() {
        if (!this.connectionListenersRegistered || !this.peerConnection) {
            return;
        }

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

    getPeerConnectionState() {
        return {
            connectionState: this.peerConnection.connectionState,
            iceConnectionState: this.peerConnection.iceConnectionState,
            iceGatheringState: this.peerConnection.iceGatheringState,
            signalingState: this.peerConnection.signalingState
        };
    }

    getCurrentProfile() {
        return {
            name: "HIGH",
            width: 1280,
            height: 720,
            fps: 30,
            bitrate: 3800000
        };
    }

    getCurrentProfileName() {
        return "HIGH";
    }

    getLastStats() {
        return this.lastStats;
    }

    getLastDecision() {
        return this.adaptiveController.getLastDecision();
    }

    getDiagnostics() {
        return this.lastDiagnostics || {
            timestamp: Date.now(),
            engineVersion: this.options.engineVersion,
            profile: this.currentProfile,
            telemetry: this.telemetry.getStats(),
            adaptive: this.adaptiveController.getDiagnostics(),
            encoder: this.encoderController.getDiagnostics(),
            connection: this.connectionGuardian.getDiagnostics?.() || null,
            resource: this.resourceMonitor.getDiagnostics?.() || null,
            device: this.deviceCapabilityManager.getDiagnostics?.() || null
        };
    }

    stop() {
        this.started = false;

        this.telemetry.stop();

        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        this.unregisterConnectionListeners();

        if (this.featureToggleManager.isEnabled("connectionGuardian")) {
            this.connectionGuardian.reset();
        }

        if (this.featureToggleManager.isEnabled("resourceMonitor")) {
            this.resourceMonitor.destroy();
        }

        this.encoderController.reset();

        this.lastStats = null;
        this.lastDiagnostics = null;
        this.lastEncoderResult = null;
    }
}

export default NetworkEngine;