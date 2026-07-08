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
    constructor() {
        this.features = {
            // Future support systems
            deviceCapabilityManager: false,
            sessionPreparationManager: false,
            connectionGuardian: false,
            resourceMonitor: false,
            motionAnalyzer: false,
            networkHistorian: false,
            recoveryAssistant: false,
            qualityVerifier: false,
            performanceRecorder: false,
            experimentEngine: false,
            communicationSupervisor: false,
        };
    }

    isEnabled(featureName) {
        return this.features[featureName] === true;
    }

    enable(featureName) {
        if (featureName in this.features) {
            this.features[featureName] = true;
        }
    }

    disable(featureName) {
        if (featureName in this.features) {
            this.features[featureName] = false;
        }
    }

    set(featureName, enabled) {
        if (featureName in this.features) {
            this.features[featureName] = Boolean(enabled);
        }
    }

        getAll() {
        return { ...this.features };
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

    toggle(featureName) {
        if (featureName in this.features) {
            this.features[featureName] = !this.features[featureName];
        }
    }

    exists(featureName) {
        return featureName in this.features;
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
}

const featureToggleManager = new FeatureToggleManager();

export default featureToggleManager;