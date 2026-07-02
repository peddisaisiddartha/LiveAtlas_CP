export class Telemetry {

    constructor(peerConnection) {

        this.peerConnection = peerConnection;
        this.interval = null;
        this.latestStats = {};

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

            reports.forEach(report => {

                switch (report.type) {

                    case "outbound-rtp":

                        if (report.kind !== "video") break;

                        telemetry.frameWidth = report.frameWidth || telemetry.frameWidth;
                        telemetry.frameHeight = report.frameHeight || telemetry.frameHeight;
                        telemetry.fps = report.framesPerSecond || telemetry.fps;
                        telemetry.framesEncoded = report.framesEncoded || 0;
                        telemetry.totalEncodeTime = report.totalEncodeTime || 0;
                        telemetry.qualityLimitation =
                            report.qualityLimitationReason || "none";

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

                            const total =
                                report.packetsReceived +
                                report.packetsLost;

                            telemetry.packetLoss =
                                total > 0
                                    ? report.packetsLost / total
                                    : 0;

                        }

                        break;

                    case "candidate-pair":

                        if (report.state !== "succeeded") break;

                        telemetry.rtt =
                            report.currentRoundTripTime || 0;

                        telemetry.availableBitrate =
                            report.availableOutgoingBitrate || 0;

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