/**
 * SessionPreparationManager
 *
 * Responsible for validating that the environment is ready
 * before a communication session begins.
 *
 * This module NEVER:
 * - creates RTCPeerConnection
 * - captures media
 * - changes encoder settings
 * - modifies bitrate
 * - restarts ICE
 *
 * It only reports readiness.
 */

import deviceCapabilityManager from "./deviceCapabilityManager";

class SessionPreparationManager {
    constructor() {
        this.status = null;
    }

    prepare() {
        const profile = deviceCapabilityManager.getProfile();

        this.status = {
            ready: true,

            checks: {
                secureContext: window.isSecureContext,
                online: navigator.onLine,
                mediaDevicesSupported: !!navigator.mediaDevices,
                getUserMediaSupported:
                    !!navigator.mediaDevices?.getUserMedia,
                enumerateDevicesSupported:
                    !!navigator.mediaDevices?.enumerateDevices,
                browserSupported:
                    profile.browser !== "Unknown",
            },

            deviceProfile: profile,

            preparedAt: Date.now(),
        };

        // Determine overall readiness
        this.status.ready = Object.values(this.status.checks).every(Boolean);

        return this.status;
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

    hasMediaSupport() {
        const checks = this.getStatus().checks;

        return (
            checks.mediaDevicesSupported &&
            checks.getUserMediaSupported &&
            checks.enumerateDevicesSupported
        );
    }

    isSecure() {
        return this.getStatus().checks.secureContext;
    }
}

const sessionPreparationManager = new SessionPreparationManager();

export default sessionPreparationManager;