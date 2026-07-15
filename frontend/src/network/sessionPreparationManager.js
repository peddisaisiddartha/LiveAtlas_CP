/**
 * SessionPreparationManager
 *
 * Read-only readiness checker for LiveAtlas communication sessions.
 *
 * This module never:
 * - creates RTCPeerConnection
 * - captures media
 * - changes encoder settings
 * - modifies bitrate
 * - restarts ICE
 * - controls adaptation
 *
 * It only reports whether the browser environment is ready.
 */

import deviceCapabilityManager from "./deviceCapabilityManager";

class SessionPreparationManager {
    constructor() {
        this.status = null;
    }

    prepare() {
        const profile = deviceCapabilityManager.getProfile();
        const checks = this.runChecks(profile);
        const issues = this.buildIssues(checks);
        const warnings = this.buildWarnings(checks, profile);

        this.status = {
            ready: issues.length === 0,
            checks,
            issues,
            warnings,
            deviceProfile: profile,
            recommendation: this.buildRecommendation(profile, issues, warnings),
            preparedAt: Date.now()
        };

        return this.status;
    }

    runChecks(profile) {
        return {
            secureContext: Boolean(window.isSecureContext),
            online: Boolean(navigator.onLine),

            mediaDevicesSupported: Boolean(navigator.mediaDevices),
            getUserMediaSupported: Boolean(navigator.mediaDevices?.getUserMedia),
            enumerateDevicesSupported: Boolean(navigator.mediaDevices?.enumerateDevices),

            webRTCSupported: Boolean(profile.webrtc?.peerConnection),
            getStatsSupported: Boolean(profile.webrtc?.getStats),
            senderParametersSupported: Boolean(
                profile.browserCapabilities?.supportsSenderParameters
            ),

            browserKnown: profile.browser !== "Unknown",
            browserSupported: this.isBrowserSupported(profile.browser)
        };
    }

    isBrowserSupported(browser) {
        return ["Chrome", "Edge", "Firefox", "Safari", "Opera"].includes(browser);
    }

    buildIssues(checks) {
        const issues = [];

        if (!checks.secureContext) {
            issues.push({
                code: "INSECURE_CONTEXT",
                message: "A secure HTTPS context is required for media and WebRTC APIs."
            });
        }

        if (!checks.online) {
            issues.push({
                code: "OFFLINE",
                message: "The browser is offline."
            });
        }

        if (!checks.mediaDevicesSupported) {
            issues.push({
                code: "MEDIA_DEVICES_UNAVAILABLE",
                message: "navigator.mediaDevices is unavailable."
            });
        }

        if (!checks.getUserMediaSupported) {
            issues.push({
                code: "GET_USER_MEDIA_UNAVAILABLE",
                message: "getUserMedia is unavailable."
            });
        }

        if (!checks.webRTCSupported) {
            issues.push({
                code: "WEBRTC_UNAVAILABLE",
                message: "RTCPeerConnection is unavailable."
            });
        }

        if (!checks.browserSupported) {
            issues.push({
                code: "UNSUPPORTED_BROWSER",
                message: "The browser is not recognized as a supported WebRTC browser."
            });
        }

        return issues;
    }

    buildWarnings(checks, profile) {
        const warnings = [];

        if (!checks.enumerateDevicesSupported) {
            warnings.push({
                code: "ENUMERATE_DEVICES_UNAVAILABLE",
                message: "Camera discovery may be limited."
            });
        }

        if (!checks.getStatsSupported) {
            warnings.push({
                code: "WEBRTC_STATS_UNAVAILABLE",
                message: "Telemetry may be limited because getStats is unavailable."
            });
        }

        if (!checks.senderParametersSupported) {
            warnings.push({
                code: "SENDER_PARAMETERS_LIMITED",
                message: "Startup encoder preference may be limited in this browser."
            });
        }

        if (profile.performance?.saveData) {
            warnings.push({
                code: "SAVE_DATA_ENABLED",
                message: "Browser data saver is enabled."
            });
        }

        return warnings;
    }

    buildRecommendation(profile, issues, warnings) {
        if (issues.length > 0) {
            return {
                canStart: false,
                presentationReady: false,
                reason: issues[0].message
            };
        }

        return {
            canStart: true,
            presentationReady: true,
            preferredStartupProfile: "HIGH",
            canPrefer720p: Boolean(profile.qualityHints?.canPrefer720p),
            reason: warnings.length > 0
                ? warnings[0].message
                : "Environment is ready for communication."
        };
    }

    getStatus() {
        if (!this.status) {
            return this.prepare();
        }

        return this.status;
    }

    refresh() {
        return this.prepare();
    }

    isReady() {
        return this.getStatus().ready;
    }

    getChecks() {
        return { ...this.getStatus().checks };
    }

    getIssues() {
        return [...this.getStatus().issues];
    }

    getWarningsSnapshot() {
        return [...this.getStatus().warnings];
    }

    getRecommendationSnapshot() {
        return { ...this.getStatus().recommendation };
    }

    hasMediaSupport() {
        const checks = this.getStatus().checks;

        return Boolean(
            checks.mediaDevicesSupported &&
            checks.getUserMediaSupported
        );
    }

    hasWebRTCSupport() {
        const checks = this.getStatus().checks;

        return Boolean(
            checks.webRTCSupported &&
            checks.getStatsSupported
        );
    }

    supportsEncoderControl() {
        return Boolean(this.getStatus().checks.senderParametersSupported);
    }

    isSecure() {
        return Boolean(this.getStatus().checks.secureContext);
    }

    getPreparationTime() {
        return this.status?.preparedAt ?? null;
    }

    getDiagnostics() {
        const status = this.getStatus();

        return {
            ready: status.ready,
            checks: status.checks,
            issues: status.issues,
            warnings: status.warnings,
            recommendation: status.recommendation,
            preparedAt: status.preparedAt
        };
    }
}

const sessionPreparationManager = new SessionPreparationManager();

export { SessionPreparationManager };
export default sessionPreparationManager;