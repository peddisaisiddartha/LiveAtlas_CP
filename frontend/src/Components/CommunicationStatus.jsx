import "./CommunicationStatus.css";

export default function CommunicationStatus({
    visible = true,
    connected = false,
    quality = "Basic",
    latency = "--",
    video = "SD",

    actualBitrate = 0,
    availableBitrate = 0,

    captureWidth = 0,
    captureHeight = 0,

    encodedWidth = 0,
    encodedHeight = 0,

    receivedWidth = 0,
    receivedHeight = 0,
}) {

    if (!visible) return null;

    return (
        <div className="communication-status">

            <div className="status-row">
                <span>🟢</span>
                <span>{connected ? "Connected" : "Connecting..."}</span>
            </div>

            <div className="status-row">
                <span>📶</span>
                <span>{quality}</span>
            </div>

            <div className="status-row">
                <span>🎥</span>
                <span>{video}</span>
            </div>

            <div className="status-row">
                <span>🌐</span>
                <span>{latency} ms</span>
            </div>

            <hr />

            <div className="status-row">
                <span>Capture</span>
                <span>{captureWidth} × {captureHeight}</span>
            </div>

            <div className="status-row">
                <span>Encoded</span>
                <span>{encodedWidth} × {encodedHeight}</span>
            </div>

            <div className="status-row">
                <span>Received</span>
                <span>{receivedWidth} × {receivedHeight}</span>
            </div>

            <div className="status-row">
                <span>Actual</span>
                <span>{Math.round(actualBitrate / 1000)} kbps</span>
            </div>

            <div className="status-row">
                <span>Available</span>
                <span>{Math.round(availableBitrate / 1000)} kbps</span>
            </div>

        </div>
    );
}