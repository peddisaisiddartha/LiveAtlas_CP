export class AdaptiveController {

    constructor() {

        this.currentLevel = 3;

        this.levels = [
            {
                name: "LOW",
                width: 640,
                height: 480,
                fps: 20,
                bitrate: 700000
            },
            {
                name: "MEDIUM",
                width: 1280,
                height: 720,
                fps: 24,
                bitrate: 1500000
            },
            {
                name: "HIGH",
                width: 1920,
                height: 1080,
                fps: 30,
                bitrate: 3000000
            }
        ];

        this.history = [];

    }

    update(stats) {

        this.history.push(stats);

        if (this.history.length > 5) {
            this.history.shift();
        }

        if (this.history.length < 5) return;

        const avgRTT =
            this.history.reduce((s, x) => s + (x.rtt || 0), 0) /
            this.history.length;

        const avgFPS =
            this.history.reduce((s, x) => s + (x.fps || 0), 0) /
            this.history.length;

        const avgBitrate =
            this.history.reduce((s, x) => s + (x.availableBitrate || 0), 0) /
            this.history.length;

        if (
            avgRTT > 0.4 ||
            avgFPS < 15 ||
            avgBitrate < 1000000
        ) {
            this.decreaseQuality();
        }
        else if (
            avgRTT < 0.25 &&
            avgFPS > 24 &&
            avgBitrate > 2000000
        ) {
            this.increaseQuality();
        }

    }

    getCurrentProfile() {
        return this.levels[this.currentLevel - 1];
    }

    increaseQuality() {

        if (this.currentLevel < 3) {
            this.currentLevel++;
        }

    }

    decreaseQuality() {

        if (this.currentLevel > 1) {
            this.currentLevel--;
        }

    }

}