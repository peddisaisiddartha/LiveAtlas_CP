import { useEffect, useRef, useState } from "react";
import SpatialTest from "./SpatialTest";

export default function SpatialTestPage() {
    const canvasRef = useRef(null);
    const testRef = useRef(null);

    const [vrSupported, setVrSupported] = useState(false);

    useEffect(() => {
        if (!canvasRef.current) {
            return;
        }

        const test = new SpatialTest(
            canvasRef.current
        );

        testRef.current = test;

        test.initialize().then(() => {
            test.webXR.isSupported().then(setVrSupported);
        });

        return () => {
            test.destroy();
            testRef.current = null;
        };
    }, []);

    const startVR = async () => {
        if (!testRef.current) {
            return;
        }

        await testRef.current.startVR();
    };

    return (
        <div
            style={{
                width: "100vw",
                height: "100vh",
                background: "#111",
                overflow: "hidden",
                position: "relative"
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    width: "100%",
                    height: "100%",
                    display: "block"
                }}
            />

            <div
                style={{
                    position: "absolute",
                    top: 20,
                    right: 20,
                    zIndex: 10
                }}
            >
                <button
                    onClick={startVR}
                    disabled={!vrSupported}
                    style={{
                        padding: "12px 18px",
                        fontSize: "14px",
                        cursor: vrSupported
                            ? "pointer"
                            : "not-allowed"
                    }}
                >
                    {vrSupported
                        ? "Enter Spatial VR"
                        : "WebXR Not Available"}
                </button>
            </div>
        </div>
    );
}