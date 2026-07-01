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

            let stats;

            try {
                stats = await this.peerConnection.getStats();
            } catch {
                return;
            }

            const telemetry = {};

            stats.forEach(report => {

                if (
                    report.type === "outbound-rtp" &&
                    report.kind === "video"
                ) {

                    telemetry.frameWidth = report.frameWidth;
                    telemetry.frameHeight = report.frameHeight;
                    telemetry.fps = report.framesPerSecond;
                    telemetry.framesSent = report.framesSent;
                    telemetry.bytesSent = report.bytesSent;
                    telemetry.qualityLimitation = report.qualityLimitationReason;

                }

                if (
                    report.type === "candidate-pair" &&
                    report.state === "succeeded"
                ) {

                    telemetry.rtt = report.currentRoundTripTime;
                    telemetry.availableBitrate = report.availableOutgoingBitrate;
                    telemetry.localCandidate = report.localCandidateId;
                    telemetry.remoteCandidate = report.remoteCandidateId;
                    telemetry.selected = report.nominated;

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