export class Telemetry {

    constructor(peerConnection) {

        this.peerConnection = peerConnection;
        this.interval = null;
        this.latestStats = {};
        this.previousOutboundVideo = null;
        this.previousInboundVideo = null;

    }

    start() {

        if (this.interval) return;

        this.interval = setInterval(async () => {

            if (!this.peerConnection) return;

            let reports;

            try {

                reports = await this.peerConnection.getStats();

            } catch {

                return;

            }

            const telemetry = {

                timestamp: Date.now(),

                // Video
                frameWidth: 0,
                frameHeight: 0,
                fps: 0,

                // Encoder
                framesEncoded: 0,
                totalEncodeTime: 0,

                // Decoder
                framesDecoded: 0,
                totalDecodeTime: 0,

                // Rendering
                framesDropped: 0,

                // Quality
                qualityLimitation: "none",

                // Network
                rtt: 0,
                jitter: 0,
                packetLoss: 0,
                availableBitrate: 0,

                // Transport
                localCandidateType: "",
                remoteCandidateType: "",
                localProtocol: "",
                remoteProtocol: ""

            };

            let activeCandidatePair = null;

            reports.forEach(report => {

                switch (report.type) {

                    case "outbound-rtp":

                        if (report.kind !== "video") break;

                        telemetry.frameWidth = report.frameWidth || telemetry.frameWidth;
                        telemetry.frameHeight = report.frameHeight || telemetry.frameHeight;
                        telemetry.framesEncoded = report.framesEncoded || 0;
                        telemetry.totalEncodeTime = report.totalEncodeTime || 0;
                        telemetry.qualityLimitation =
                            report.qualityLimitationReason || "none";

                        if (report.framesPerSecond !== undefined) {

                            telemetry.fps = report.framesPerSecond;

                        } else if (
                            this.previousOutboundVideo &&
                            report.framesEncoded !== undefined &&
                            report.timestamp !== undefined
                        ) {

                            const frameDelta =
                                report.framesEncoded -
                                this.previousOutboundVideo.framesEncoded;
                            const timeDelta =
                                (report.timestamp -
                                    this.previousOutboundVideo.timestamp) /
                                1000;

                            telemetry.fps =
                                timeDelta > 0
                                    ? Math.max(0, frameDelta / timeDelta)
                                    : telemetry.fps;

                        }

                        if (
                            report.framesEncoded !== undefined &&
                            report.timestamp !== undefined
                        ) {

                            this.previousOutboundVideo = {
                                framesEncoded: report.framesEncoded,
                                timestamp: report.timestamp
                            };

                        }

                        break;

                    case "inbound-rtp":

                        if (report.kind !== "video") break;

                        telemetry.jitter = report.jitter || 0;

                        telemetry.framesDecoded = report.framesDecoded || 0;
                        telemetry.totalDecodeTime = report.totalDecodeTime || 0;
                        telemetry.framesDropped = report.framesDropped || 0;

                        if (
                            report.packetsLost !== undefined &&
                            report.packetsReceived !== undefined
                        ) {

                            let packetsLost = report.packetsLost;
                            let packetsReceived = report.packetsReceived;

                            if (this.previousInboundVideo) {

                                packetsLost =
                                    report.packetsLost -
                                    this.previousInboundVideo.packetsLost;
                                packetsReceived =
                                    report.packetsReceived -
                                    this.previousInboundVideo.packetsReceived;

                            }

                            packetsLost = Math.max(0, packetsLost);
                            packetsReceived = Math.max(0, packetsReceived);

                            const total = packetsReceived + packetsLost;

                            telemetry.packetLoss =
                                total > 0
                                    ? packetsLost / total
                                    : 0;

                            this.previousInboundVideo = {
                                packetsLost: report.packetsLost,
                                packetsReceived: report.packetsReceived
                            };

                        }

                        break;

                    case "candidate-pair":

                        if (report.state !== "succeeded") break;

                        if (
                            report.selected ||
                            report.nominated ||
                            !activeCandidatePair
                        ) {

                            activeCandidatePair = report;

                        }

                        break;

                    case "local-candidate":

                        telemetry.localCandidateType =
                            report.candidateType || "";

                        telemetry.localProtocol =
                            report.protocol || "";

                        break;

                    case "remote-candidate":

                        telemetry.remoteCandidateType =
                            report.candidateType || "";

                        telemetry.remoteProtocol =
                            report.protocol || "";

                        break;

                }

            });

            if (activeCandidatePair) {

                telemetry.rtt =
                    activeCandidatePair.currentRoundTripTime || 0;

                telemetry.availableBitrate =
                    activeCandidatePair.availableOutgoingBitrate || 0;

            }

            this.latestStats = telemetry;

        }, 1000);

    }

    stop() {

        if (this.interval) {

            clearInterval(this.interval);
            this.interval = null;

        }

    }

    getStats() {

        return this.latestStats;

    }

}
