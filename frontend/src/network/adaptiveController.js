export class AdaptiveController {

    constructor() {

        this.history = [];

        this.currentProfile = "MEDIUM";

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
                bitrate: 3200000
            }

        };

        this.lastSwitch = Date.now();

        this.profileChanged = false;

    }

    update(stats) {

        this.profileChanged = false;

        this.history.push(stats);

        if (this.history.length > 10) {
            this.history.shift();
        }

        if (this.history.length < 10) {
            return;
        }

        const avg = {

            rtt:
                this.history.reduce((s, x) => s + (x.rtt || 0), 0) /
                this.history.length,

            fps:
                this.history.reduce((s, x) => s + (x.fps || 0), 0) /
                this.history.length,

            bitrate:
                this.history.reduce(
                    (s, x) => s + (x.availableBitrate || 0),
                    0
                ) / this.history.length,

            loss:
                this.history.reduce(
                    (s, x) => s + (x.packetLoss || 0),
                    0
                ) / this.history.length,

            jitter:
                this.history.reduce(
                    (s, x) => s + (x.jitter || 0),
                    0
                ) / this.history.length

        };

        const now = Date.now();

        if (now - this.lastSwitch < 15000) {
            return;
        }

        // ---------- DOWNGRADE ----------

        if (

            avg.rtt > 0.45 ||
            avg.loss > 0.05 ||
            avg.fps < 18

        ) {

            this.decrease();

            return;

        }

        // ---------- UPGRADE ----------

        if (

            avg.rtt < 0.18 &&
            avg.loss < 0.02 &&
            avg.fps >= 24 &&
            avg.bitrate > 2500000

        ) {

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

}