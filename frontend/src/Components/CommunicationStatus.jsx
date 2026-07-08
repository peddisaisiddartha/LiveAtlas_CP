import "./CommunicationStatus.css";

export default function CommunicationStatus({
    visible = true,
    connected = false,
    quality = "Basic",
    latency = "--",
    video = "SD",
}) {

    if (!visible) return null;

    return (
        <div className="communication-status">

            <div className="status-row">
                <span>🟢</span>
                <span>
                    {connected ? "Connected" : "Connecting..."}
                </span>
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

        </div>
    );
}