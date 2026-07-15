/**
 * ConnectionGuardian
 *
 * Read-only WebRTC connection state tracker.
 *
 * This module never:
 * - calls restartIce()
 * - changes bitrate
 * - modifies encoder settings
 * - creates RTCPeerConnection
 * - performs recovery
 *
 * It only records connection state and exposes diagnostics.
 */

class ConnectionGuardian {
    constructor(options = {}) {
        this.maxTransitions = options.maxTransitions || 30;
        this.reset();
    }

    reset() {
        this.state = {
            connectionState: "new",
            iceConnectionState: "new",
            iceGatheringState: "new",
            signalingState: "stable",

            previousConnectionState: null,
            previousIceConnectionState: null,
            previousIceGatheringState: null,
            previousSignalingState: null,

            connectedSince: null,
            disconnectedSince: null,
            failedSince: null,

            connectionDuration: 0,
            disconnectedDuration: 0,
            failedDuration: 0,

            transitionCount: 0,
            lastTransition: null,
            transitions: [],

            stabilityState: "NEW",
            lastUpdated: null
        };
    }

    update(partialState = {}) {
        const now = Date.now();
        const normalized = this.normalizeState(partialState);
        const changed = this.hasStateChanged(normalized);

        this.updatePreviousStates(normalized);

        this.state = {
            ...this.state,
            ...normalized,
            lastUpdated: now
        };

        this.updateDurations(now);

        if (changed) {
            this.recordTransition(now);
        }

        this.state.stabilityState = this.calculateStabilityState(now);
    }

    normalizeState(partialState) {
        const next = {};

        if (partialState.connectionState !== undefined) {
            next.connectionState = partialState.connectionState || "unknown";
        }

        if (partialState.iceConnectionState !== undefined) {
            next.iceConnectionState = partialState.iceConnectionState || "unknown";
        }

        if (partialState.iceGatheringState !== undefined) {
            next.iceGatheringState = partialState.iceGatheringState || "unknown";
        }

        if (partialState.signalingState !== undefined) {
            next.signalingState = partialState.signalingState || "unknown";
        }

        return next;
    }

    hasStateChanged(nextState) {
        return (
            nextState.connectionState !== undefined &&
            nextState.connectionState !== this.state.connectionState
        ) || (
            nextState.iceConnectionState !== undefined &&
            nextState.iceConnectionState !== this.state.iceConnectionState
        ) || (
            nextState.iceGatheringState !== undefined &&
            nextState.iceGatheringState !== this.state.iceGatheringState
        ) || (
            nextState.signalingState !== undefined &&
            nextState.signalingState !== this.state.signalingState
        );
    }

    updatePreviousStates(nextState) {
        if (
            nextState.connectionState !== undefined &&
            nextState.connectionState !== this.state.connectionState
        ) {
            this.state.previousConnectionState = this.state.connectionState;
        }

        if (
            nextState.iceConnectionState !== undefined &&
            nextState.iceConnectionState !== this.state.iceConnectionState
        ) {
            this.state.previousIceConnectionState = this.state.iceConnectionState;
        }

        if (
            nextState.iceGatheringState !== undefined &&
            nextState.iceGatheringState !== this.state.iceGatheringState
        ) {
            this.state.previousIceGatheringState = this.state.iceGatheringState;
        }

        if (
            nextState.signalingState !== undefined &&
            nextState.signalingState !== this.state.signalingState
        ) {
            this.state.previousSignalingState = this.state.signalingState;
        }
    }

    updateDurations(now) {
        if (this.isConnected()) {
            if (!this.state.connectedSince) {
                this.state.connectedSince = now;
            }

            this.state.disconnectedSince = null;
            this.state.failedSince = null;
        } else {
            this.state.connectedSince = null;
        }

        if (this.isDisconnected()) {
            if (!this.state.disconnectedSince) {
                this.state.disconnectedSince = now;
            }
        } else {
            this.state.disconnectedSince = null;
        }

        if (this.isFailed()) {
            if (!this.state.failedSince) {
                this.state.failedSince = now;
            }
        } else {
            this.state.failedSince = null;
        }

        this.state.connectionDuration = this.state.connectedSince
            ? now - this.state.connectedSince
            : 0;

        this.state.disconnectedDuration = this.state.disconnectedSince
            ? now - this.state.disconnectedSince
            : 0;

        this.state.failedDuration = this.state.failedSince
            ? now - this.state.failedSince
            : 0;
    }

    recordTransition(now) {
        const transition = {
            timestamp: now,
            connectionState: this.state.connectionState,
            iceConnectionState: this.state.iceConnectionState,
            iceGatheringState: this.state.iceGatheringState,
            signalingState: this.state.signalingState
        };

        this.state.transitionCount += 1;
        this.state.lastTransition = transition;
        this.state.transitions.push(transition);

        if (this.state.transitions.length > this.maxTransitions) {
            this.state.transitions.shift();
        }
    }

    calculateStabilityState(now) {
        if (this.isClosed()) return "CLOSED";
        if (this.isFailed()) return "FAILED";
        if (this.isDisconnected()) return "DISCONNECTED";
        if (this.isConnecting()) return "CONNECTING";

        if (!this.isConnected()) {
            return "NEW";
        }

        const connectedDuration = this.state.connectedSince
            ? now - this.state.connectedSince
            : 0;

        if (connectedDuration >= 15000) return "STABLE";
        if (connectedDuration >= 4000) return "CONNECTED";

        return "WARMING_UP";
    }

    getState() {
        return {
            ...this.state,
            transitions: [...this.state.transitions]
        };
    }

    getDiagnostics() {
        return {
            connectionState: this.state.connectionState,
            iceConnectionState: this.state.iceConnectionState,
            iceGatheringState: this.state.iceGatheringState,
            signalingState: this.state.signalingState,
            stabilityState: this.state.stabilityState,

            connectedSince: this.state.connectedSince,
            disconnectedSince: this.state.disconnectedSince,
            failedSince: this.state.failedSince,

            connectionDuration: this.state.connectionDuration,
            disconnectedDuration: this.state.disconnectedDuration,
            failedDuration: this.state.failedDuration,

            transitionCount: this.state.transitionCount,
            lastTransition: this.state.lastTransition,

            isConnected: this.isConnected(),
            isConnecting: this.isConnecting(),
            isDisconnected: this.isDisconnected(),
            isFailed: this.isFailed(),
            isClosed: this.isClosed()
        };
    }

    getConnectionState() {
        return this.state.connectionState;
    }

    getIceConnectionState() {
        return this.state.iceConnectionState;
    }

    getIceGatheringState() {
        return this.state.iceGatheringState;
    }

    getSignalingState() {
        return this.state.signalingState;
    }

    getStabilityState() {
        return this.state.stabilityState;
    }

    getConnectionDuration() {
        return this.state.connectionDuration;
    }

    getDisconnectedDuration() {
        return this.state.disconnectedDuration;
    }

    getFailedDuration() {
        return this.state.failedDuration;
    }

    getPreviousConnectionState() {
        return this.state.previousConnectionState;
    }

    getPreviousIceConnectionState() {
        return this.state.previousIceConnectionState;
    }

    getTransitionCount() {
        return this.state.transitionCount;
    }

    getLastTransition() {
        return this.state.lastTransition;
    }

    getTransitions() {
        return [...this.state.transitions];
    }

    isConnected() {
        const peerConnected =
            this.state.connectionState === "connected";

        const iceConnected =
            this.state.iceConnectionState === "connected" ||
            this.state.iceConnectionState === "completed";

        return peerConnected || iceConnected;
    }

    isConnecting() {
        return (
            this.state.connectionState === "connecting" ||
            this.state.iceConnectionState === "checking" ||
            this.state.iceGatheringState === "gathering"
        );
    }

    isDisconnected() {
        return (
            this.state.connectionState === "disconnected" ||
            this.state.iceConnectionState === "disconnected"
        );
    }

    isFailed() {
        return (
            this.state.connectionState === "failed" ||
            this.state.iceConnectionState === "failed"
        );
    }

    isClosed() {
        return this.state.connectionState === "closed";
    }
}

const connectionGuardian = new ConnectionGuardian();

export { ConnectionGuardian };
export default connectionGuardian;