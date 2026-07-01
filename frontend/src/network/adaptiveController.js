export class AdaptiveController {

    constructor() {

        this.currentLevel = 3;

        this.levels = [
    {
        name: "LOW",
        width: 640,
        height: 360,
        fps: 20,
        bitrate: 900000
    },
    {
        name: "MEDIUM",
        width: 1280,
        height: 720,
        fps: 24,
        bitrate: 2200000
    },
    {
        name: "HIGH",
        width: 1920,
        height: 1080,
        fps: 30,
        bitrate: 4500000
    }
];

        this.history = [];

    }

    update(stats) {

    this.history.push(stats);

    if (this.history.length > 10) {
        this.history.shift();
    }

    if (this.history.length < 10) return;

    const avgRTT =
        this.history.reduce((s, x) => s + (x.rtt || 0), 0) /
        this.history.length;

    const avgFPS =
        this.history.reduce((s, x) => s + (x.fps || 0), 0) /
        this.history.length;

    const avgBitrate =
        this.history.reduce((s, x) => s + (x.availableBitrate || 0), 0) /
        this.history.length;

    if (avgRTT > 0.45 || avgFPS < 15) {

        this.decreaseQuality();

    } else if (

        avgRTT < 0.15 &&
        avgFPS >= 20 &&
        avgBitrate > 1200000

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