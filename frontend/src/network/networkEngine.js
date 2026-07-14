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
            applyInitialProfile: options.applyInitialProfile ?? true,
            engineVersion: options.engineVersion || "V2_COMPAT"
        };

        this.telemetry = new Telemetry(peerConnection);
        this.adaptiveController = new AdaptiveController({
            initialProfile: options.initialProfile || "MEDIUM"
        });
        this.encoderController = new EncoderController();

        this.featureToggleManager = featureToggleManager;
        this.deviceCapabilityManager = deviceCapabilityManager;
        this.sessionPreparationManager = sessionPreparationManager;
        this.connectionGuardian = connectionGuardian;
        this.resourceMonitor = resourceMonitor;

        this.interval = null;
        this.currentProfile = null;
        this.started = false;

        this.connectionListenersRegistered = false;
        this.connectionHandlers = {};

        this.lastStats = null;
        this.lastEngineDecision = null;
        this.lastAppliedProfile = null;
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

        if (this.options.applyInitialProfile) {
            await this.applyStartupProfile();
        }

        if (this.interval) {
            return;
        }

        this.interval = setInterval(() => {
            this.tick();
        }, this.options.telemetryIntervalMs);
    }

    enableSupportSystems() {
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

    async applyStartupProfile() {
        const preferredProfileName =
            this.deviceCapabilityManager.getPreferredStartupProfile?.() || "MEDIUM";

        const profile =
            this.adaptiveController.profiles?.[preferredProfileName] ||
            this.adaptiveController.profiles?.MEDIUM;

        if (!profile) {
            return;
        }

        const applied = await this.encoderController.applyProfile(
            this.peerConnection,
            profile
        );

        if (applied) {
            this.currentProfile = profile.name;
            this.lastAppliedProfile = profile;
            this.lastEngineDecision = {
                type: "STARTUP_PROFILE",
                profile: profile.name,
                reason: "Device capability startup preference",
                timestamp: Date.now()
            };

            console.log(
                `[NetworkEngine] Startup profile=${profile.name} (${profile.width}x${profile.height})`
            );
        }
    }

    async tick() {
        if (!this.started || !this.peerConnection) {
            return;
        }

        const stats = this.telemetry.getStats();

        if (!stats || stats.timestamp === undefined) {
            return;
        }

        this.lastStats = this.enrichStats(stats);

        this.refreshRuntimeSystems();

        this.adaptiveController.update(this.lastStats);

        const decision = this.adaptiveController.getLastDecision?.() || null;

        this.lastEngineDecision = {
            type: "ADAPTIVE_DECISION",
            profile: this.adaptiveController.getCurrentProfileName?.() || null,
            reason: this.adaptiveController.getLastReason(),
            networkState: this.adaptiveController.getNetworkState(),
            decision,
            timestamp: Date.now()
        };

        if (!this.adaptiveController.hasProfileChanged()) {
            return;
        }

        const profile = this.adaptiveController.getCurrentProfile();

        if (!profile || !profile.name) {
            return;
        }

        await this.applyAdaptiveProfile(profile);
    }

    enrichStats(stats) {
        const connectionState = this.connectionGuardian.getState?.() || {};
        const resourceState = this.resourceMonitor.getSnapshot?.() || this.resourceMonitor.getState?.() || null;

        return {
            ...stats,

            connectionState: connectionState.connectionState || this.peerConnection.connectionState,
            iceConnectionState: connectionState.iceConnectionState || this.peerConnection.iceConnectionState,
            iceGatheringState: connectionState.iceGatheringState || this.peerConnection.iceGatheringState,
            signalingState: connectionState.signalingState || this.peerConnection.signalingState,

            connectionStabilityState: connectionState.stabilityState || "UNKNOWN",
            connectionDuration: connectionState.connectionDuration || 0,

            resourceState
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

    async applyAdaptiveProfile(profile) {
        if (this.currentProfile === profile.name) {
            return;
        }

        const previousProfile = this.currentProfile || "NONE";

        console.log(`[NetworkEngine] ${previousProfile} -> ${profile.name}`);

        const applied = await this.encoderController.applyProfile(
            this.peerConnection,
            profile
        );

        if (!applied) {
            return;
        }

        this.currentProfile = profile.name;
        this.lastAppliedProfile = profile;

        const stats = this.telemetry.getStats() || {};

        console.log(
            `[NetworkEngine] Profile=${profile.name} | ` +
            `Actual=${Math.round((stats.actualBitrate || 0) / 1000)} kbps | ` +
            `Available=${Math.round((stats.availableBitrate || 0) / 1000)} kbps | ` +
            `RTT=${Math.round((stats.rtt || 0) * 1000)} ms | ` +
            `Reason=${this.adaptiveController.getLastReason()}`
        );
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
        return this.lastAppliedProfile;
    }

    getCurrentProfileName() {
        return this.currentProfile;
    }

    getLastStats() {
        return this.lastStats;
    }

    getLastDecision() {
        return this.lastEngineDecision;
    }

    getDiagnostics() {
        return {
            engineVersion: this.options.engineVersion,
            started: this.started,
            currentProfile: this.currentProfile,
            lastAppliedProfile: this.lastAppliedProfile,
            lastStats: this.lastStats,
            lastEngineDecision: this.lastEngineDecision,
            adaptive: this.adaptiveController.getDiagnostics?.() || null,
            encoder: this.encoderController.getLastDiagnostics?.() || null,
            connection: this.connectionGuardian.getDiagnostics?.() || null,
            device: this.deviceCapabilityManager.getDiagnostics?.() || null,
            resource: this.resourceMonitor.getDiagnostics?.() || null
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

        this.currentProfile = null;
        this.lastStats = null;
        this.lastEngineDecision = null;
        this.lastAppliedProfile = null;
    }
}