/**
 * FeatureToggleManager
 *
 * Central place to enable or disable optional communication-engine features.
 *
 * This manager MUST NOT contain business logic.
 * It only stores feature states and exposes helper methods.
 *
 * Keeping feature flags centralized allows:
 * - Safe rollout of new modules
 * - Easy rollback
 * - A/B experiments (future)
 * - Cleaner NetworkEngine
 */

class FeatureToggleManager {
    constructor(initialFeatures = {}) {
        this.features = {
            // Engine selection
            communicationEngineV2: false,
            legacyNetworkEngine: true,

            // Current support systems
            deviceCapabilityManager: false,
            sessionPreparationManager: false,
            connectionGuardian: false,
            resourceMonitor: false,

            // V2 diagnostics and policy modules
            telemetryEngineV2: false,
            decisionEngineV2: false,
            encoderEngineV2: false,
            resolutionGuardian: false,
            connectionSupervisor: false,
            resourceManager: false,
            diagnosticsEngine: false,

            // Future support systems
            motionAnalyzer: false,
            networkHistorian: false,
            recoveryAssistant: false,
            qualityVerifier: false,
            performanceRecorder: false,
            experimentEngine: false,
            communicationSupervisor: false,

            ...initialFeatures
        };
    }

    isEnabled(featureName) {
        return this.features[featureName] === true;
    }

    exists(featureName) {
        return Object.prototype.hasOwnProperty.call(this.features, featureName);
    }

    enable(featureName) {
        if (this.exists(featureName)) {
            this.features[featureName] = true;
        }
    }

    disable(featureName) {
        if (this.exists(featureName)) {
            this.features[featureName] = false;
        }
    }

    toggle(featureName) {
        if (this.exists(featureName)) {
            this.features[featureName] = !this.features[featureName];
        }
    }

    set(featureName, enabled) {
        if (this.exists(featureName)) {
            this.features[featureName] = Boolean(enabled);
        }
    }

    setMany(featureMap = {}) {
        Object.entries(featureMap).forEach(([featureName, enabled]) => {
            this.set(featureName, enabled);
        });
    }

    register(featureName, defaultValue = false) {
        if (!this.exists(featureName)) {
            this.features[featureName] = Boolean(defaultValue);
        }
    }

    unregister(featureName) {
        if (this.exists(featureName)) {
            delete this.features[featureName];
        }
    }

    useCommunicationEngineV2() {
        this.features.communicationEngineV2 = true;
        this.features.legacyNetworkEngine = false;

        this.features.telemetryEngineV2 = true;
        this.features.decisionEngineV2 = true;
        this.features.encoderEngineV2 = true;
        this.features.resolutionGuardian = true;
        this.features.connectionSupervisor = true;
        this.features.resourceManager = true;
        this.features.diagnosticsEngine = true;
    }

    useLegacyNetworkEngine() {
        this.features.communicationEngineV2 = false;
        this.features.legacyNetworkEngine = true;
    }

    enableCoreSupportSystems() {
        this.features.deviceCapabilityManager = true;
        this.features.sessionPreparationManager = true;
        this.features.connectionGuardian = true;
        this.features.resourceMonitor = true;
    }

    enableAll() {
        Object.keys(this.features).forEach((feature) => {
            this.features[feature] = true;
        });
    }

    disableAll() {
        Object.keys(this.features).forEach((feature) => {
            this.features[feature] = false;
        });
    }

    getAll() {
        return { ...this.features };
    }

    getEnabledFeatures() {
        return Object.keys(this.features).filter(
            (feature) => this.features[feature]
        );
    }

    getDisabledFeatures() {
        return Object.keys(this.features).filter(
            (feature) => !this.features[feature]
        );
    }

    getDiagnostics() {
        return {
            features: this.getAll(),
            enabled: this.getEnabledFeatures(),
            disabled: this.getDisabledFeatures(),
            engineMode: this.isEnabled("communicationEngineV2")
                ? "COMMUNICATION_ENGINE_V2"
                : "BROWSER_COOPERATIVE_PRESENTATION"
        };
    }
}

const featureToggleManager = new FeatureToggleManager();

export { FeatureToggleManager };
export default featureToggleManager;