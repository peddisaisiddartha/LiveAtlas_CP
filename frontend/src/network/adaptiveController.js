export class AdaptiveController {

    constructor() {

        this.history = [];

        this.currentProfile = "MEDIUM";

        this.initialEvaluationComplete = false;

        this.profiles = {

            LOW: {
                name: "LOW",
                width: 640,
                height: 360,
                fps: 20,
                bitrate: 800000
            },

            MEDIUM: {
                name: "MEDIUM",
                width: 960,
                height: 540,
                fps: 24,
                bitrate: 1600000
            },

            HIGH: {
                name: "HIGH",
                width: 1280,
                height: 720,
                fps: 30,
                bitrate: 3800000
            }

        };

        this.lastSwitch = Date.now();

        this.goodSamples = 0;
        this.badSamples = 0;

        this.profileChanged = false;
        this.networkState = "STABLE";
        this.lastReason = "Initial";

    }

    update(stats) {

        this.profileChanged = false;

        this.history.push(stats);

        if (this.history.length > 10) {
            this.history.shift();
        }

        if (this.history.length < 5) {

            if (!this.initialEvaluationComplete) {

                this.currentProfile = "MEDIUM";

            }

            return;
        }

        let rtt = 0;
        let fps = 0;
        let bitrate = 0;
        let actualBitrate = 0;
        let loss = 0;
        let jitter = 0;

        for (const sample of this.history) {

            rtt += sample.rtt || 0;
            fps += sample.fps || 0;
            bitrate += sample.availableBitrate || 0;
            actualBitrate += sample.actualBitrate || 0;
            loss += sample.packetLoss || 0;
            jitter += sample.jitter || 0;

        }

        const count = this.history.length;

        const avg = {

            rtt: rtt / count,
            fps: fps / count,
            bitrate: bitrate / count,
            actualBitrate: actualBitrate / count,
            loss: loss / count,
            jitter: jitter / count

        };

        const now = Date.now();

        if (
            !this.initialEvaluationComplete &&
            this.history.length >= 5
        ) {
            this.initialEvaluationComplete = true;
            this.lastSwitch = now;
        }


        const downgrade =
            avg.rtt > 0.80 ||
            avg.loss > 0.10 ||
            avg.fps < 15 ||
            (
                avg.actualBitrate > 0 &&
                avg.actualBitrate < 700000
            );

        const upgrade =
            avg.rtt < 0.30 &&
            avg.loss < 0.03 &&
            avg.fps >= 22 &&
            (
                avg.bitrate > 1800000 ||
                avg.actualBitrate > 2500000
            );

        if (downgrade) {
            this.badSamples++;
            this.goodSamples = 0;
        } else if (upgrade) {
            this.goodSamples++;
            this.badSamples = 0;
        } else {
            this.goodSamples = 0;
            this.badSamples = 0;
        }

        if (now - this.lastSwitch < 10000) {
            return;
        }

        // ---------- DOWNGRADE ----------

       if (this.badSamples >= 3) {

            if (avg.rtt > 0.60)
                this.lastReason = "High RTT";

            else if (avg.loss > 0.08)
                this.lastReason = "Packet Loss";

            else
                this.lastReason = "Low FPS";

            this.networkState = "CONGESTED";

            this.decrease();

            return;

            }

        // ---------- UPGRADE ----------

        if (
            this.goodSamples >=
            (this.currentProfile === "LOW" ? 2 : 3)
        ) {
            this.lastReason = "Recovered";
            this.networkState = "RECOVERING";

            this.initialEvaluationComplete = true;

            if (
                this.currentProfile === "MEDIUM" &&
                avg.actualBitrate > 3200000 &&
                avg.rtt < 0.15 &&
                avg.loss < 0.01
            ) {

                this.goodSamples += 2;

            }

            this.increase();

        }

    }

    increase() {

        if (this.currentProfile === "LOW") {

            this.currentProfile = "MEDIUM";

        } else if (this.currentProfile === "MEDIUM") {

            this.currentProfile = "HIGH";

        } else {

            return;

        }

        this.profileChanged = true;
        this.lastSwitch = Date.now();

    }

    decrease() {

        if (this.currentProfile === "HIGH") {

            this.currentProfile = "MEDIUM";

        } else if (this.currentProfile === "MEDIUM") {

            this.currentProfile = "LOW";

        } else {

            return;

        }

        this.profileChanged = true;
        this.lastSwitch = Date.now();

    }

    hasProfileChanged() {

        return this.profileChanged;

    }

    getCurrentProfile() {

        return this.profiles[this.currentProfile];

    }

    getNetworkState() {

    return this.networkState;

    }

    getLastReason() {

    return this.lastReason;

}
}