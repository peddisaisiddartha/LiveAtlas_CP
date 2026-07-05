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
        this.state = {
            ...this.state,
            ...partialState,
            lastUpdated: Date.now(),
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