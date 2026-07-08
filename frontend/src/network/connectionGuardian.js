/**
 * ConnectionGuardian
 *
 * Responsible ONLY for tracking WebRTC connection state.
 *
 * This module NEVER:
 * - calls restartIce()
 * - changes bitrate
 * - modifies encoder settings
 * - creates RTCPeerConnection
 * - performs recovery
 *
 * It simply stores and exposes connection information.
 */

class ConnectionGuardian {
    constructor() {
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

            connectionDuration: 0,
            connectedSince: null,

            transitionCount: 0,
            lastTransition: null,

            lastUpdated: null,
        };
    }

    /**
     * Update one or more connection states.
     *
     * Example:
     * guardian.update({
     *   connectionState: pc.connectionState,
     *   iceConnectionState: pc.iceConnectionState
     * });
     */
        update(partialState = {}) {

        const now = Date.now();

        if (
            this.state.connectionState !== partialState.connectionState &&
            partialState.connectionState !== undefined
        ) {
            this.state.previousConnectionState =
                this.state.connectionState;
        }

        if (
            this.state.iceConnectionState !== partialState.iceConnectionState &&
            partialState.iceConnectionState !== undefined
        ) {
            this.state.previousIceConnectionState =
                this.state.iceConnectionState;
        }

        if (
            partialState.connectionState === "connected" &&
            !this.state.connectedSince
        ) {
            this.state.connectedSince = now;
        }

        if (
            partialState.connectionState !== "connected"
        ) {
            this.state.connectedSince = null;
            this.state.connectionDuration = 0;
        }

        if (this.state.connectedSince) {
            this.state.connectionDuration =
                now - this.state.connectedSince;
        }

        this.state = {
            ...this.state,
            ...partialState,
            lastUpdated: now,
        };

        this.state.transitionCount++;

        this.state.lastTransition = {
            timestamp: now,
            connectionState: this.state.connectionState,
            iceConnectionState: this.state.iceConnectionState,
            iceGatheringState: this.state.iceGatheringState,
            signalingState: this.state.signalingState,
        };
    }

    getState() {
        return { ...this.state };
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

    isConnected() {
        return this.state.connectionState === "connected";
    }

        getConnectionDuration() {
        return this.state.connectionDuration;
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

    isDisconnected() {
        return (
            this.state.connectionState === "disconnected" ||
            this.state.connectionState === "failed" ||
            this.state.iceConnectionState === "failed"
        );
    }
}

const connectionGuardian = new ConnectionGuardian();

export default connectionGuardian;