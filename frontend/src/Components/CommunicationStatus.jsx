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
            <span>
                <span className={connected ? "dot connected" : "dot"} />
                {connected ? "Connected" : "Connecting"}
            </span>

            <span>📶 {quality}</span>

            <span>🎥 {video}</span>

            <span>🌐 {latency} ms</span>
        </div>
    );
}