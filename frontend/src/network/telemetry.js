export class Telemetry {
    constructor(peerConnection, options = {}) {
        this.peerConnection = peerConnection;
        this.interval = null;
        this.latestStats = {};
        this.previous = new Map();

        this.intervalMs = options.intervalMs || 1000;
        this.outboundVideoReportId = null;
        this.inboundVideoReportId = null;
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
        if (!this.peerConnection || typeof this.peerConnection.getStats !== "function") {
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

        const parsed = this.parseReports(reports);

        this.latestStats = parsed;

        return parsed;
    }

    parseReports(reports) {
        const telemetry = this.createEmptyTelemetry();

        const candidates = {
            activePair: null,
            local: new Map(),
            remote: new Map()
        };

        reports.forEach((report) => {
            switch (report.type) {
                case "media-source":
                    this.parseMediaSource(report, telemetry);
                    break;

                case "track":
                    this.parseTrack(report, telemetry);
                    break;

                case "outbound-rtp":
                    this.parseOutboundRtp(report, telemetry);
                    break;

                case "inbound-rtp":
                    this.parseInboundRtp(report, telemetry);
                    break;

                case "remote-inbound-rtp":
                    this.parseRemoteInboundRtp(report, telemetry);
                    break;

                case "candidate-pair":
                    this.parseCandidatePair(report, candidates);
                    break;

                case "local-candidate":
                    candidates.local.set(report.id, report);
                    break;

                case "remote-candidate":
                    candidates.remote.set(report.id, report);
                    break;

                default:
                    break;
            }
        });

        this.applyCandidatePair(candidates, telemetry);
        this.finalizeTelemetry(telemetry);

        return telemetry;
    }

    createEmptyTelemetry() {
        return {
            timestamp: Date.now(),

            capture: {
                width: 0,
                height: 0,
                fps: 0,
                frames: 0
            },

            encoding: {
                width: 0,
                height: 0,
                fps: 0,
                framesEncoded: 0,
                totalEncodeTime: 0,
                averageEncodeTime: 0,
                qualityLimitationReason: "none",
                qualityLimitationDurations: null,
                encoderImplementation: "",
                powerEfficientEncoder: null,
                bytesSent: 0,
                actualBitrate: 0,
                targetBitrate: 0,
                retransmittedBytesSent: 0
            },

            transmission: {
                rtt: 0,
                packetLoss: 0,
                packetsSent: 0,
                packetsLost: 0,
                jitter: 0,
                availableOutgoingBitrate: 0,
                availableIncomingBitrate: 0,
                actualBitrate: 0,
                localCandidateType: "",
                remoteCandidateType: "",
                localProtocol: "",
                remoteProtocol: "",
                candidatePairState: "",
                candidatePairId: ""
            },

            reception: {
                width: 0,
                height: 0,
                fps: 0,
                framesReceived: 0,
                framesDecoded: 0,
                framesDropped: 0,
                framesPerSecond: 0,
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
                totalFreezesDuration: 0,
                pauseCount: 0,
                totalPausesDuration: 0
            },

            browser: {
                qualityLimitationReason: "none",
                encoderLimitedByCpu: false,
                encoderLimitedByBandwidth: false,
                encoderLimitedByOther: false
            },

            resolution: {
                capture: "unknown",
                encoded: "unknown",
                received: "unknown",
                status: "UNKNOWN"
            },

            // Backward-compatible flat fields used by the current engine/UI.
            captureWidth: 0,
            captureHeight: 0,
            captureFrameWidth: 0,
            captureFrameHeight: 0,
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
            totalEncodeTime: 0,
            encodeTime: 0,
            framesDecoded: 0,
            totalDecodeTime: 0,
            decodeTime: 0,
            framesDropped: 0,
            qualityLimitation: "none",
            rtt: 0,
            jitter: 0,
            packetLoss: 0,
            availableBitrate: 0,
            availableOutgoingBitrate: 0,
            actualBitrate: 0,
            localCandidateType: "",
            remoteCandidateType: "",
            localProtocol: "",
            remoteProtocol: ""
        };
    }

    parseMediaSource(report, telemetry) {
        if (report.kind !== "video") {
            return;
        }

        telemetry.capture.width = this.number(report.width);
        telemetry.capture.height = this.number(report.height);
        telemetry.capture.fps = this.number(report.framesPerSecond);
        telemetry.capture.frames = this.number(report.frames);

        telemetry.captureWidth = telemetry.capture.width;
        telemetry.captureHeight = telemetry.capture.height;
        telemetry.captureFrameWidth = telemetry.capture.width;
        telemetry.captureFrameHeight = telemetry.capture.height;
    }

    parseTrack(report, telemetry) {
        if (report.kind !== "video") {
            return;
        }

        if (report.remoteSource === false || report.remoteSource === undefined) {
            if (!telemetry.capture.width) telemetry.capture.width = this.number(report.frameWidth);
            if (!telemetry.capture.height) telemetry.capture.height = this.number(report.frameHeight);
            if (!telemetry.capture.fps) telemetry.capture.fps = this.number(report.framesPerSecond);
        } else {
            telemetry.reception.width = this.number(report.frameWidth);
            telemetry.reception.height = this.number(report.frameHeight);
            telemetry.reception.framesDropped = this.number(report.framesDropped);
            telemetry.rendering.framesDropped = this.number(report.framesDropped);
        }
    }

    parseOutboundRtp(report, telemetry) {
        if (report.kind !== "video" && report.mediaType !== "video") {
            return;
        }

        if (this.outboundVideoReportId && report.id !== this.outboundVideoReportId) {
            return;
        }

        if (!this.outboundVideoReportId) {
            this.outboundVideoReportId = report.id;
        }

        telemetry.encoding.width = this.number(report.frameWidth);
        telemetry.encoding.height = this.number(report.frameHeight);
        telemetry.encoding.framesEncoded = this.number(report.framesEncoded);
        telemetry.encoding.totalEncodeTime = this.number(report.totalEncodeTime);
        telemetry.encoding.qualityLimitationReason = report.qualityLimitationReason || "none";
        telemetry.encoding.qualityLimitationDurations = report.qualityLimitationDurations || null;
        telemetry.encoding.encoderImplementation = report.encoderImplementation || "";
        telemetry.encoding.powerEfficientEncoder = report.powerEfficientEncoder ?? null;
        telemetry.encoding.bytesSent = this.number(report.bytesSent);
        telemetry.encoding.targetBitrate = this.number(report.targetBitrate);
        telemetry.encoding.retransmittedBytesSent = this.number(report.retransmittedBytesSent);
        telemetry.encoding.fps = this.getFramesPerSecond(report, "outbound", "framesEncoded");

        telemetry.browser.qualityLimitationReason = telemetry.encoding.qualityLimitationReason;
        telemetry.browser.encoderLimitedByCpu = telemetry.encoding.qualityLimitationReason === "cpu";
        telemetry.browser.encoderLimitedByBandwidth = telemetry.encoding.qualityLimitationReason === "bandwidth";
        telemetry.browser.encoderLimitedByOther = telemetry.encoding.qualityLimitationReason === "other";

        telemetry.encoding.actualBitrate = this.getBitrate(report, "outbound", "bytesSent");
        telemetry.transmission.actualBitrate = telemetry.encoding.actualBitrate;
        telemetry.actualBitrate = telemetry.encoding.actualBitrate;

        this.storePrevious(report, "outbound", [
            "timestamp",
            "bytesSent",
            "framesEncoded",
            "packetsSent"
        ]);
    }

    parseInboundRtp(report, telemetry) {
        if (report.kind !== "video" && report.mediaType !== "video") {
            return;
        }

        if (this.inboundVideoReportId && report.id !== this.inboundVideoReportId) {
            return;
        }

        if (!this.inboundVideoReportId) {
            this.inboundVideoReportId = report.id;
        }

        telemetry.reception.width = this.number(report.frameWidth);
        telemetry.reception.height = this.number(report.frameHeight);
        telemetry.reception.framesReceived = this.number(report.framesReceived);
        telemetry.reception.framesDecoded = this.number(report.framesDecoded);
        telemetry.reception.framesDropped = this.number(report.framesDropped);
        telemetry.reception.framesPerSecond = this.number(report.framesPerSecond);
        telemetry.reception.bytesReceived = this.number(report.bytesReceived);
        telemetry.reception.packetsReceived = this.number(report.packetsReceived);
        telemetry.reception.packetsLost = this.number(report.packetsLost);
        telemetry.reception.jitter = this.number(report.jitter);
        telemetry.reception.fps =
            telemetry.reception.framesPerSecond ||
            this.getFramesPerSecond(report, "inbound", "framesDecoded");

        telemetry.decoding.framesDecoded = telemetry.reception.framesDecoded;
        telemetry.decoding.totalDecodeTime = this.number(report.totalDecodeTime);
        telemetry.decoding.decoderImplementation = report.decoderImplementation || "";
        telemetry.decoding.powerEfficientDecoder = report.powerEfficientDecoder ?? null;

        telemetry.rendering.framesDropped = telemetry.reception.framesDropped;
        telemetry.rendering.freezeCount = this.number(report.freezeCount);
        telemetry.rendering.totalFreezesDuration = this.number(report.totalFreezesDuration);
        telemetry.rendering.pauseCount = this.number(report.pauseCount);
        telemetry.rendering.totalPausesDuration = this.number(report.totalPausesDuration);

        telemetry.transmission.jitter = telemetry.reception.jitter;
        telemetry.transmission.packetLoss = this.getPacketLoss(report, "inbound");
        telemetry.transmission.packetsLost = telemetry.reception.packetsLost;

        telemetry.reception.actualBitrate = this.getBitrate(report, "inbound", "bytesReceived");

        this.storePrevious(report, "inbound", [
            "timestamp",
            "bytesReceived",
            "framesDecoded",
            "packetsLost",
            "packetsReceived"
        ]);
    }

    parseRemoteInboundRtp(report, telemetry) {
        if (report.kind !== "video" && report.mediaType !== "video") {
            return;
        }

        if (report.roundTripTime !== undefined) {
            telemetry.transmission.rtt = this.number(report.roundTripTime);
        }

        if (report.packetsLost !== undefined) {
            telemetry.transmission.packetsLost = this.number(report.packetsLost);
        }

        if (report.jitter !== undefined) {
            telemetry.transmission.jitter = this.number(report.jitter);
        }
    }

    parseCandidatePair(report, candidates) {
        if (report.state !== "succeeded") {
            return;
        }

        if (report.selected || report.nominated || !candidates.activePair) {
            candidates.activePair = report;
        }
    }

    applyCandidatePair(candidates, telemetry) {
        const pair = candidates.activePair;

        if (!pair) {
            return;
        }

        telemetry.transmission.rtt =
            telemetry.transmission.rtt ||
            this.number(pair.currentRoundTripTime);

        telemetry.transmission.availableOutgoingBitrate =
            this.number(pair.availableOutgoingBitrate);

        telemetry.transmission.availableIncomingBitrate =
            this.number(pair.availableIncomingBitrate);

        telemetry.transmission.candidatePairState = pair.state || "";
        telemetry.transmission.candidatePairId = pair.id || "";

        const local = candidates.local.get(pair.localCandidateId);
        const remote = candidates.remote.get(pair.remoteCandidateId);

        if (local) {
            telemetry.transmission.localCandidateType = local.candidateType || "";
            telemetry.transmission.localProtocol = local.protocol || "";
        }

        if (remote) {
            telemetry.transmission.remoteCandidateType = remote.candidateType || "";
            telemetry.transmission.remoteProtocol = remote.protocol || "";
        }
    }

    finalizeTelemetry(telemetry) {
        telemetry.encoding.averageEncodeTime =
            this.averageTime(
                telemetry.encoding.totalEncodeTime,
                telemetry.encoding.framesEncoded
            );

        telemetry.decoding.averageDecodeTime =
            this.averageTime(
                telemetry.decoding.totalDecodeTime,
                telemetry.decoding.framesDecoded
            );

        telemetry.resolution.capture = this.formatResolution(
            telemetry.capture.width,
            telemetry.capture.height
        );

        telemetry.resolution.encoded = this.formatResolution(
            telemetry.encoding.width,
            telemetry.encoding.height
        );

        telemetry.resolution.received = this.formatResolution(
            telemetry.reception.width,
            telemetry.reception.height
        );

        telemetry.resolution.status = this.getResolutionStatus(telemetry);

        telemetry.captureWidth = telemetry.capture.width;
        telemetry.captureHeight = telemetry.capture.height;
        telemetry.captureFrameWidth = telemetry.capture.width;
        telemetry.captureFrameHeight = telemetry.capture.height;

        telemetry.encodedWidth = telemetry.encoding.width;
        telemetry.encodedHeight = telemetry.encoding.height;
        telemetry.encodedFrameWidth = telemetry.encoding.width;
        telemetry.encodedFrameHeight = telemetry.encoding.height;

        telemetry.receivedWidth = telemetry.reception.width;
        telemetry.receivedHeight = telemetry.reception.height;
        telemetry.receivedFrameWidth = telemetry.reception.width;
        telemetry.receivedFrameHeight = telemetry.reception.height;

        telemetry.frameWidth = telemetry.reception.width || telemetry.encoding.width;
        telemetry.frameHeight = telemetry.reception.height || telemetry.encoding.height;

        telemetry.fps =
            telemetry.encoding.fps ||
            telemetry.capture.fps ||
            telemetry.reception.fps;

        telemetry.framesEncoded = telemetry.encoding.framesEncoded;
        telemetry.totalEncodeTime = telemetry.encoding.totalEncodeTime;
        telemetry.encodeTime = telemetry.encoding.averageEncodeTime;

        telemetry.framesDecoded = telemetry.decoding.framesDecoded;
        telemetry.totalDecodeTime = telemetry.decoding.totalDecodeTime;
        telemetry.decodeTime = telemetry.decoding.averageDecodeTime;

        telemetry.framesDropped = telemetry.rendering.framesDropped;
        telemetry.qualityLimitation = telemetry.encoding.qualityLimitationReason;

        telemetry.rtt = telemetry.transmission.rtt;
        telemetry.jitter = telemetry.transmission.jitter;
        telemetry.packetLoss = telemetry.transmission.packetLoss;

        telemetry.availableBitrate = telemetry.transmission.availableOutgoingBitrate;
        telemetry.availableOutgoingBitrate = telemetry.transmission.availableOutgoingBitrate;
        telemetry.actualBitrate = telemetry.encoding.actualBitrate || telemetry.transmission.actualBitrate;

        telemetry.localCandidateType = telemetry.transmission.localCandidateType;
        telemetry.remoteCandidateType = telemetry.transmission.remoteCandidateType;
        telemetry.localProtocol = telemetry.transmission.localProtocol;
        telemetry.remoteProtocol = telemetry.transmission.remoteProtocol;

        telemetry.encoderLimitedByCpu = telemetry.browser.encoderLimitedByCpu;
        telemetry.encoderLimitedByBandwidth = telemetry.browser.encoderLimitedByBandwidth;
    }

    getResolutionStatus(telemetry) {
        const capture = telemetry.resolution.capture;
        const encoded = telemetry.resolution.encoded;
        const received = telemetry.resolution.received;

        if (capture === "unknown" && encoded === "unknown" && received === "unknown") {
            return "UNKNOWN";
        }

        if (capture !== "unknown" && encoded !== "unknown" && capture !== encoded) {
            return "CAPTURE_TO_ENCODER_CHANGED";
        }

        if (encoded !== "unknown" && received !== "unknown" && encoded !== received) {
            return "ENCODER_TO_RECEIVER_CHANGED";
        }

        return "CONSISTENT";
    }

    getFramesPerSecond(report, key, frameField) {
        if (report.framesPerSecond !== undefined) {
            return this.number(report.framesPerSecond);
        }

        const previous = this.previous.get(key);

        if (!previous || report[frameField] === undefined || report.timestamp === undefined) {
            return 0;
        }

        const frameDelta = this.number(report[frameField]) - this.number(previous[frameField]);
        const timeDelta = (this.number(report.timestamp) - this.number(previous.timestamp)) / 1000;

        if (timeDelta <= 0 || frameDelta < 0) {
            return 0;
        }

        return Math.max(0, frameDelta / timeDelta);
    }

    getBitrate(report, key, byteField) {
        const previous = this.previous.get(key);

        if (!previous || report[byteField] === undefined || report.timestamp === undefined) {
            return 0;
        }

        const bytesDelta = this.number(report[byteField]) - this.number(previous[byteField]);
        const timeDelta = (this.number(report.timestamp) - this.number(previous.timestamp)) / 1000;

        if (timeDelta <= 0 || bytesDelta < 0) {
            return 0;
        }

        return Math.round((bytesDelta * 8) / timeDelta);
    }

    getPacketLoss(report, key) {
        const previous = this.previous.get(key);

        if (
            !previous ||
            report.packetsLost === undefined ||
            report.packetsReceived === undefined
        ) {
            const lost = Math.max(0, this.number(report.packetsLost));
            const received = Math.max(0, this.number(report.packetsReceived));
            const total = lost + received;

            return total > 0 ? lost / total : 0;
        }

        const lostDelta = Math.max(
            0,
            this.number(report.packetsLost) - this.number(previous.packetsLost)
        );

        const receivedDelta = Math.max(
            0,
            this.number(report.packetsReceived) - this.number(previous.packetsReceived)
        );

        const total = lostDelta + receivedDelta;

        return total > 0 ? lostDelta / total : 0;
    }

    storePrevious(report, key, fields) {
        const snapshot = {};

        fields.forEach((field) => {
            snapshot[field] = report[field];
        });

        this.previous.set(key, snapshot);
    }

    averageTime(totalTime, frames) {
        if (!totalTime || !frames) {
            return 0;
        }

        return totalTime / frames;
    }

    formatResolution(width, height) {
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
        this.outboundVideoReportId = null;
        this.inboundVideoReportId = null;
    }

    getStats() {
        return this.latestStats;
    }

    getDiagnostics() {
        return this.latestStats;
    }
}