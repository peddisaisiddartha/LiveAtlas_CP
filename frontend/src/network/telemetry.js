/**
 * Telemetry
 *
 * Truth-only WebRTC diagnostics.
 *
 * This module never controls quality.
 * It only reads WebRTC stats and separates:
 * - capture
 * - encoding
 * - transmission
 * - reception
 * - decoding/rendering
 */

export class Telemetry {
    constructor(peerConnection, options = {}) {
        this.peerConnection = peerConnection;
        this.interval = null;
        this.intervalMs = options.intervalMs || 1000;

        this.latestStats = {};
        this.previous = new Map();

        this.outboundVideoId = null;
        this.inboundVideoId = null;
    }

    start() {
        if (this.interval) {
            return;
        }

        this.collect();

        this.interval = setInterval(() => {
            this.collect();
        }, this.intervalMs);
    }

    async collect() {
        if (!this.peerConnection?.getStats) {
            return null;
        }

        let reports;

        try {
            reports = await this.peerConnection.getStats();
        } catch (error) {
            this.latestStats = {
                ...this.latestStats,
                timestamp: Date.now(),
                error: error?.message || "getStats failed"
            };

            return this.latestStats;
        }

        const telemetry = this.createEmptyTelemetry();

        const candidates = {
            activePair: null,
            local: new Map(),
            remote: new Map()
        };

        reports.forEach((report) => {
            if (report.type === "media-source") {
                this.readMediaSource(report, telemetry);
            }

            if (report.type === "track") {
                this.readTrack(report, telemetry);
            }

            if (report.type === "outbound-rtp") {
                this.readOutboundVideo(report, telemetry);
            }

            if (report.type === "inbound-rtp") {
                this.readInboundVideo(report, telemetry);
            }

            if (report.type === "remote-inbound-rtp") {
                this.readRemoteInboundVideo(report, telemetry);
            }

            if (report.type === "candidate-pair") {
                this.readCandidatePair(report, candidates);
            }

            if (report.type === "local-candidate") {
                candidates.local.set(report.id, report);
            }

            if (report.type === "remote-candidate") {
                candidates.remote.set(report.id, report);
            }
        });

        this.applyCandidateInfo(candidates, telemetry);
        this.finalize(telemetry);

        this.latestStats = telemetry;

        return telemetry;
    }

    createEmptyTelemetry() {
        return {
            timestamp: Date.now(),

            capture: {
                width: 0,
                height: 0,
                fps: 0
            },

            encoding: {
                width: 0,
                height: 0,
                fps: 0,
                framesEncoded: 0,
                bytesSent: 0,
                actualBitrate: 0,
                totalEncodeTime: 0,
                averageEncodeTime: 0,
                qualityLimitation: "none",
                encoderImplementation: "",
                powerEfficientEncoder: null
            },

            transmission: {
                rtt: 0,
                jitter: 0,
                packetLoss: 0,
                availableOutgoingBitrate: 0,
                actualBitrate: 0,
                localCandidateType: "",
                remoteCandidateType: "",
                localProtocol: "",
                remoteProtocol: ""
            },

            reception: {
                width: 0,
                height: 0,
                fps: 0,
                framesReceived: 0,
                framesDecoded: 0,
                framesDropped: 0,
                bytesReceived: 0,
                actualBitrate: 0,
                packetsReceived: 0,
                packetsLost: 0,
                jitter: 0
            },

            decoding: {
                framesDecoded: 0,
                totalDecodeTime: 0,
                averageDecodeTime: 0,
                decoderImplementation: "",
                powerEfficientDecoder: null
            },

            rendering: {
                framesDropped: 0,
                freezeCount: 0,
                totalFreezesDuration: 0
            },

            resolution: {
                capture: "unknown",
                encoded: "unknown",
                received: "unknown",
                status: "UNKNOWN"
            },

            browser: {
                qualityLimitation: "none",
                encoderLimitedByCpu: false,
                encoderLimitedByBandwidth: false
            },

            // Compatibility fields used by UI / existing engine.
            captureWidth: 0,
            captureHeight: 0,
            encodedWidth: 0,
            encodedHeight: 0,
            encodedFrameWidth: 0,
            encodedFrameHeight: 0,
            receivedWidth: 0,
            receivedHeight: 0,
            receivedFrameWidth: 0,
            receivedFrameHeight: 0,
            frameWidth: 0,
            frameHeight: 0,

            fps: 0,
            framesEncoded: 0,
            framesDecoded: 0,
            framesDropped: 0,

            rtt: 0,
            jitter: 0,
            packetLoss: 0,

            actualBitrate: 0,
            availableBitrate: 0,
            availableOutgoingBitrate: 0,

            qualityLimitation: "none",
            encoderLimitedByCpu: false,
            encoderLimitedByBandwidth: false,

            localCandidateType: "",
            remoteCandidateType: "",
            localProtocol: "",
            remoteProtocol: ""
        };
    }

    readMediaSource(report, telemetry) {
        if (report.kind !== "video") {
            return;
        }

        telemetry.capture.width = this.number(report.width);
        telemetry.capture.height = this.number(report.height);
        telemetry.capture.fps = this.number(report.framesPerSecond);
    }

    readTrack(report, telemetry) {
        if (report.kind !== "video") {
            return;
        }

        if (report.remoteSource === true) {
            if (!telemetry.reception.width) {
                telemetry.reception.width = this.number(report.frameWidth);
            }

            if (!telemetry.reception.height) {
                telemetry.reception.height = this.number(report.frameHeight);
            }

            telemetry.rendering.framesDropped =
                this.number(report.framesDropped);
        } else {
            if (!telemetry.capture.width) {
                telemetry.capture.width = this.number(report.frameWidth);
            }

            if (!telemetry.capture.height) {
                telemetry.capture.height = this.number(report.frameHeight);
            }

            if (!telemetry.capture.fps) {
                telemetry.capture.fps = this.number(report.framesPerSecond);
            }
        }
    }

    readOutboundVideo(report, telemetry) {
        if (report.kind !== "video" && report.mediaType !== "video") {
            return;
        }

        if (this.outboundVideoId && report.id !== this.outboundVideoId) {
            return;
        }

        if (!this.outboundVideoId) {
            this.outboundVideoId = report.id;
        }

        telemetry.encoding.width = this.number(report.frameWidth);
        telemetry.encoding.height = this.number(report.frameHeight);
        telemetry.encoding.framesEncoded = this.number(report.framesEncoded);
        telemetry.encoding.bytesSent = this.number(report.bytesSent);
        telemetry.encoding.totalEncodeTime = this.number(report.totalEncodeTime);
        telemetry.encoding.qualityLimitation =
            report.qualityLimitationReason || "none";
        telemetry.encoding.encoderImplementation =
            report.encoderImplementation || "";
        telemetry.encoding.powerEfficientEncoder =
            report.powerEfficientEncoder ?? null;

        telemetry.encoding.fps =
            this.number(report.framesPerSecond) ||
            this.rate(report, "outbound", "framesEncoded");

        telemetry.encoding.actualBitrate =
            this.bitrate(report, "outbound", "bytesSent");

        telemetry.browser.qualityLimitation =
            telemetry.encoding.qualityLimitation;

        telemetry.browser.encoderLimitedByCpu =
            telemetry.encoding.qualityLimitation === "cpu";

        telemetry.browser.encoderLimitedByBandwidth =
            telemetry.encoding.qualityLimitation === "bandwidth";

        this.store(report, "outbound", [
            "timestamp",
            "bytesSent",
            "framesEncoded"
        ]);
    }

    readInboundVideo(report, telemetry) {
        if (report.kind !== "video" && report.mediaType !== "video") {
            return;
        }

        if (this.inboundVideoId && report.id !== this.inboundVideoId) {
            return;
        }

        if (!this.inboundVideoId) {
            this.inboundVideoId = report.id;
        }

        telemetry.reception.width = this.number(report.frameWidth);
        telemetry.reception.height = this.number(report.frameHeight);
        telemetry.reception.framesReceived =
            this.number(report.framesReceived);
        telemetry.reception.framesDecoded =
            this.number(report.framesDecoded);
        telemetry.reception.framesDropped =
            this.number(report.framesDropped);
        telemetry.reception.bytesReceived =
            this.number(report.bytesReceived);
        telemetry.reception.packetsReceived =
            this.number(report.packetsReceived);
        telemetry.reception.packetsLost =
            this.number(report.packetsLost);
        telemetry.reception.jitter =
            this.number(report.jitter);

        telemetry.reception.fps =
            this.number(report.framesPerSecond) ||
            this.rate(report, "inbound", "framesDecoded");

        telemetry.reception.actualBitrate =
            this.bitrate(report, "inbound", "bytesReceived");

        telemetry.decoding.framesDecoded =
            telemetry.reception.framesDecoded;
        telemetry.decoding.totalDecodeTime =
            this.number(report.totalDecodeTime);
        telemetry.decoding.decoderImplementation =
            report.decoderImplementation || "";
        telemetry.decoding.powerEfficientDecoder =
            report.powerEfficientDecoder ?? null;

        telemetry.rendering.framesDropped =
            telemetry.reception.framesDropped;
        telemetry.rendering.freezeCount =
            this.number(report.freezeCount);
        telemetry.rendering.totalFreezesDuration =
            this.number(report.totalFreezesDuration);

        telemetry.transmission.jitter = telemetry.reception.jitter;
        telemetry.transmission.packetLoss =
            this.packetLoss(report, "inbound");

        this.store(report, "inbound", [
            "timestamp",
            "bytesReceived",
            "framesDecoded",
            "packetsLost",
            "packetsReceived"
        ]);
    }

    readRemoteInboundVideo(report, telemetry) {
        if (report.kind !== "video" && report.mediaType !== "video") {
            return;
        }

        if (report.roundTripTime !== undefined) {
            telemetry.transmission.rtt = this.number(report.roundTripTime);
        }

        if (report.jitter !== undefined) {
            telemetry.transmission.jitter = this.number(report.jitter);
        }
    }

    readCandidatePair(report, candidates) {
        if (report.state !== "succeeded") {
            return;
        }

        if (report.selected || report.nominated || !candidates.activePair) {
            candidates.activePair = report;
        }
    }

    applyCandidateInfo(candidates, telemetry) {
        const pair = candidates.activePair;

        if (!pair) {
            return;
        }

        telemetry.transmission.rtt =
            telemetry.transmission.rtt ||
            this.number(pair.currentRoundTripTime);

        telemetry.transmission.availableOutgoingBitrate =
            this.number(pair.availableOutgoingBitrate);

        const local = candidates.local.get(pair.localCandidateId);
        const remote = candidates.remote.get(pair.remoteCandidateId);

        if (local) {
            telemetry.transmission.localCandidateType =
                local.candidateType || "";
            telemetry.transmission.localProtocol =
                local.protocol || "";
        }

        if (remote) {
            telemetry.transmission.remoteCandidateType =
                remote.candidateType || "";
            telemetry.transmission.remoteProtocol =
                remote.protocol || "";
        }
    }

    finalize(telemetry) {
        telemetry.encoding.averageEncodeTime =
            this.average(
                telemetry.encoding.totalEncodeTime,
                telemetry.encoding.framesEncoded
            );

        telemetry.decoding.averageDecodeTime =
            this.average(
                telemetry.decoding.totalDecodeTime,
                telemetry.decoding.framesDecoded
            );

        telemetry.resolution.capture =
            this.resolution(
                telemetry.capture.width,
                telemetry.capture.height
            );

        telemetry.resolution.encoded =
            this.resolution(
                telemetry.encoding.width,
                telemetry.encoding.height
            );

        telemetry.resolution.received =
            this.resolution(
                telemetry.reception.width,
                telemetry.reception.height
            );

        telemetry.resolution.status =
            this.resolutionStatus(telemetry);

        telemetry.captureWidth = telemetry.capture.width;
        telemetry.captureHeight = telemetry.capture.height;

        telemetry.encodedWidth = telemetry.encoding.width;
        telemetry.encodedHeight = telemetry.encoding.height;
        telemetry.encodedFrameWidth = telemetry.encoding.width;
        telemetry.encodedFrameHeight = telemetry.encoding.height;

        telemetry.receivedWidth = telemetry.reception.width;
        telemetry.receivedHeight = telemetry.reception.height;
        telemetry.receivedFrameWidth = telemetry.reception.width;
        telemetry.receivedFrameHeight = telemetry.reception.height;

        telemetry.frameWidth =
            telemetry.reception.width ||
            telemetry.encoding.width;

        telemetry.frameHeight =
            telemetry.reception.height ||
            telemetry.encoding.height;

        telemetry.fps =
            telemetry.encoding.fps ||
            telemetry.capture.fps ||
            telemetry.reception.fps;

        telemetry.framesEncoded =
            telemetry.encoding.framesEncoded;
        telemetry.framesDecoded =
            telemetry.reception.framesDecoded;
        telemetry.framesDropped =
            telemetry.rendering.framesDropped;

        telemetry.rtt = telemetry.transmission.rtt;
        telemetry.jitter = telemetry.transmission.jitter;
        telemetry.packetLoss = telemetry.transmission.packetLoss;

        telemetry.actualBitrate =
            telemetry.encoding.actualBitrate ||
            telemetry.transmission.actualBitrate;

        telemetry.availableBitrate =
            telemetry.transmission.availableOutgoingBitrate;

        telemetry.availableOutgoingBitrate =
            telemetry.transmission.availableOutgoingBitrate;

        telemetry.qualityLimitation =
            telemetry.browser.qualityLimitation;

        telemetry.encoderLimitedByCpu =
            telemetry.browser.encoderLimitedByCpu;

        telemetry.encoderLimitedByBandwidth =
            telemetry.browser.encoderLimitedByBandwidth;

        telemetry.localCandidateType =
            telemetry.transmission.localCandidateType;
        telemetry.remoteCandidateType =
            telemetry.transmission.remoteCandidateType;
        telemetry.localProtocol =
            telemetry.transmission.localProtocol;
        telemetry.remoteProtocol =
            telemetry.transmission.remoteProtocol;
        telemetry.pipeline = {

            capture: telemetry.resolution.capture,

            encoded: telemetry.resolution.encoded,

            received: telemetry.resolution.received,

            status: telemetry.resolution.status,

            captureWidth: telemetry.capture.width,

            captureHeight: telemetry.capture.height,

            encodedWidth: telemetry.encoding.width,

            encodedHeight: telemetry.encoding.height,

            receivedWidth: telemetry.reception.width,

            receivedHeight: telemetry.reception.height

        };
    }

    resolutionStatus(telemetry) {
        const capture = telemetry.resolution.capture;
        const encoded = telemetry.resolution.encoded;
        const received = telemetry.resolution.received;

        if (
            capture === "unknown" &&
            encoded === "unknown" &&
            received === "unknown"
        ) {
            return "UNKNOWN";
        }

        if (
            capture !== "unknown" &&
            encoded !== "unknown" &&
            capture !== encoded
        ) {
            return "CAPTURE_ENCODER_MISMATCH";
        }

        if (
            encoded !== "unknown" &&
            received !== "unknown" &&
            encoded !== received
        ) {
            return "ENCODER_RECEIVER_MISMATCH";
        }

        return "ALIGNED";
    }

    rate(report, key, frameField) {
        const previous = this.previous.get(key);

        if (
            !previous ||
            report[frameField] === undefined ||
            report.timestamp === undefined
        ) {
            return 0;
        }

        const frameDelta =
            this.number(report[frameField]) -
            this.number(previous[frameField]);

        const timeDelta =
            (
                this.number(report.timestamp) -
                this.number(previous.timestamp)
            ) / 1000;

        if (timeDelta <= 0 || frameDelta < 0) {
            return 0;
        }

        return frameDelta / timeDelta;
    }

    bitrate(report, key, byteField) {
        const previous = this.previous.get(key);

        if (
            !previous ||
            report[byteField] === undefined ||
            report.timestamp === undefined
        ) {
            return 0;
        }

        const bytesDelta =
            this.number(report[byteField]) -
            this.number(previous[byteField]);

        const timeDelta =
            (
                this.number(report.timestamp) -
                this.number(previous.timestamp)
            ) / 1000;

        if (timeDelta <= 0 || bytesDelta < 0) {
            return 0;
        }

        return Math.round((bytesDelta * 8) / timeDelta);
    }

    packetLoss(report, key) {
        const previous = this.previous.get(key);

        const packetsLost = this.number(report.packetsLost);
        const packetsReceived = this.number(report.packetsReceived);

        if (!previous) {
            const total = packetsLost + packetsReceived;
            return total > 0 ? packetsLost / total : 0;
        }

        const lostDelta = Math.max(
            0,
            packetsLost - this.number(previous.packetsLost)
        );

        const receivedDelta = Math.max(
            0,
            packetsReceived - this.number(previous.packetsReceived)
        );

        const total = lostDelta + receivedDelta;

        return total > 0 ? lostDelta / total : 0;
    }

    store(report, key, fields) {
        const snapshot = {};

        fields.forEach((field) => {
            snapshot[field] = report[field];
        });

        this.previous.set(key, snapshot);
    }

    average(total, count) {
        if (!total || !count) {
            return 0;
        }

        return total / count;
    }

    resolution(width, height) {
        if (!width || !height) {
            return "unknown";
        }

        return `${Math.round(width)}x${Math.round(height)}`;
    }

    number(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        this.previous.clear();
        this.outboundVideoId = null;
        this.inboundVideoId = null;
    }

    getStats() {
        return this.latestStats;
    }

    getDiagnostics() {
        return this.latestStats;
    }
}

export default Telemetry;