import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './VideoRoom.css';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash, FaExpand, FaCompress, FaGlobeAmericas, FaSyncAlt } from 'react-icons/fa';
import { initVR, disposeVR } from "../vr/vrEngine";
import { askAI } from '../ai/aiService';

const VideoRoom = () => {
    const { roomID } = useParams();
    const navigate = useNavigate();


    const [isAudioOn, setIsAudioOn] = useState(true);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isVRMode, setIsVRMode] = useState(false);
    const [cameraFacing, setCameraFacing] = useState("environment");
    const [connectionQuality, setConnectionQuality] = useState("good");
    const [micLevel, setMicLevel] = useState(0);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [aiQuestion, setAIQuestion] = useState("");
    const [aiAnswer, setAIAnswer] = useState("");
    const [aiLoading, setAILoading] = useState(false);
    const [guideLocation, setGuideLocation] = useState(null);
    const [placeName, setPlaceName] = useState("");

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const vrContainerRef = useRef(null);
    const ws = useRef(null);
    const peerConnection = useRef(null);


    const switchCamera = async () => {
        const newFacing = cameraFacing === "environment" ? "user" : "environment";
        setCameraFacing(newFacing);

        const oldStream = localVideoRef.current?.srcObject;
        if (oldStream) {
            oldStream.getVideoTracks().forEach(track => track.stop());
        }

        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: newFacing } },
            });

            const videoTrack = newStream.getVideoTracks()[0];
            const sender = peerConnection.current
                ?.getSenders()
                .find(s => s.track && s.track.kind === "video");

            if (sender) {
                sender.replaceTrack(videoTrack);
            }

            localVideoRef.current.srcObject = newStream;

        } catch (err) {
            console.error("Camera switch failed:", err);
        }
    };

    useEffect(() => {

        navigator.geolocation.getCurrentPosition((position) => {

    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    setGuideLocation({
        lat: latitude,
        lon: longitude
    });

    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,{
        headers: {
            "User-Agent": "LiveAtlas/1.0 (https://liveatlas-cp-1.onrender.com)"
        }
    })
    .then(res => res.json())
    .then(data => {

    if(data && data.display_name){
        setPlaceName(data.display_name);
    }

    })
.catch(err => console.error("Location API error:",err));

    console.log("Guide location:", latitude, longitude);

});

        const protocol = window.location.protocol === "https:" ? "wss" : "ws";

        const connectWebSocket = () => {
            const normalizedRoomID = roomID.replace("_", "-");
            ws.current = new WebSocket(
                `${protocol}://liveatlas-cp.onrender.com/ws/tours/${normalizedRoomID}/`
            );

            ws.current.onopen = async () => {
                console.log("WebSocket connected");
                setIsReconnecting(false);
                await setupWebRTC();
            };

            ws.current.onclose = () => {
                console.log("WebSocket disconnected. Reconnecting...");
                setIsReconnecting(true);
                setTimeout(connectWebSocket, 2000);
            };

            ws.current.onmessage = async (event) => {
                const data = JSON.parse(event.data);
                handleSignalMessage(data);
            };
        };

        connectWebSocket();

        return () => {
            if (ws.current) ws.current.close();
            if (peerConnection.current) peerConnection.current.close();
        };
    }, [roomID]);

    useEffect(() => {
        if (!remoteVideoRef.current) return;

       if (isVRMode && remoteVideoRef.current?.srcObject) {
            initVR(vrContainerRef.current, remoteVideoRef.current);
        } else {
            disposeVR();
        }

    return () => disposeVR();
}, [isVRMode]);

    const setupWebRTC = async () => {

        const stream = await navigator.mediaDevices.getUserMedia({
           video: {
                facingMode: cameraFacing,
                width: { min: 1280, ideal: 1920, max: 1920 },
                height: { min: 720, ideal: 1080, max: 1080 },
                frameRate: { min: 24, ideal: 30, max: 30 }
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        if (localVideoRef.current)
            localVideoRef.current.srcObject = stream;

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        analyser.fftSize = 256;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkMicLevel = () => {
            analyser.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            setMicLevel(avg);
            requestAnimationFrame(checkMicLevel);
        };
        checkMicLevel();

        peerConnection.current = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.relay.metered.ca:80" },
                {
                    urls: "turn:global.relay.metered.ca:80",
                    username: "a08d7dab4952ac44632adaaa",
                    credential: "4+8LpWBi440BQE2K"
                },
                {
                    urls: "turn:global.relay.metered.ca:80?transport=tcp",
                    username: "a08d7dab4952ac44632adaaa",
                    credential: "4+8LpWBi440BQE2K"
                },
                {
                    urls: "turn:global.relay.metered.ca:443",
                    username: "a08d7dab4952ac44632adaaa",
                    credential: "4+8LpWBi440BQE2K"
                },
                {
                    urls: "turns:global.relay.metered.ca:443?transport=tcp",
                    username: "a08d7dab4952ac44632adaaa",
                    credential: "4+8LpWBi440BQE2K"
                }
            ],
            iceCandidatePoolSize: 10
        });

        peerConnection.current.oniceconnectionstatechange = () => {

    const state = peerConnection.current.iceConnectionState;

    const sender = peerConnection.current.getSenders().find(
        s => s.track && s.track.kind === "video"
    );

    if (!sender) return;

    const params = sender.getParameters();

    if (!params.encodings) params.encodings = [{}];

    if (state === "connected") {
        params.encodings[0].maxBitrate = 2500000;
    }

    if (state === "disconnected" || state === "failed") {
        params.encodings[0].maxBitrate = 800000;
    }

    sender.setParameters(params);
};

        stream.getTracks().forEach(track =>
            peerConnection.current.addTrack(track, stream)
        );



        // ---- INITIAL OFFER CREATION ----
if (peerConnection.current.signalingState === "stable") {
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    ws.current.send(JSON.stringify({
        type: "offer",
        offer: offer
    }));

    console.log("Initial offer sent");
}
// ---- END INITIAL OFFER ----



       peerConnection.current.ontrack = (event) => {
    if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteVideoRef.current.play().catch(() => {});
    }
};

        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                ws.current.send(JSON.stringify({
                    type: 'candidate',
                    candidate: event.candidate
                }));
            }
        };
    };




    const handleSignalMessage = async (data) => {
        console.log("Signal received:", data.type);
        if (!peerConnection.current) return;

        if (data.type === 'offer') {
            await peerConnection.current.setRemoteDescription(
                new RTCSessionDescription(data.offer)
            );
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);
            ws.current.send(JSON.stringify({ type: 'answer', answer }));
        }
        else if (data.type === 'answer') {
            await peerConnection.current.setRemoteDescription(
                new RTCSessionDescription(data.answer)
            );
        }
        else if (data.type === 'candidate') {

    if (peerConnection.current.remoteDescription) {
        try {
            await peerConnection.current.addIceCandidate(
                new RTCIceCandidate(data.candidate)
            );
        } catch (err) {
            console.error("ICE error:", err);
        }
    } else {
        console.log("Skipping ICE - remoteDescription not set yet");
    }

}
    };

    const toggleAudio = () => {
        const stream = localVideoRef.current?.srcObject;
        if (!stream) return;
        const track = stream.getAudioTracks()[0];
        track.enabled = !track.enabled;
        setIsAudioOn(track.enabled);
    };

    const toggleVideo = () => {
        const stream = localVideoRef.current?.srcObject;
        if (!stream) return;
        const track = stream.getVideoTracks()[0];
        track.enabled = !track.enabled;
        setIsVideoOn(track.enabled);
    };

    const endCall = async () => {

        const dbId = roomID.split('_')[1];


        try {
            await fetch(`https://liveatlas-cp.onrender.com/api/end-tour/${dbId}/`, {
                method: 'POST'
            });

        } catch (err) {
            console.error(err);
        }

        if (localVideoRef.current?.srcObject) {
            localVideoRef.current.srcObject.getTracks()
                .forEach(track => track.stop());
        }

        if (ws.current) ws.current.close();
        navigate('/');
    };

    const toggleFullScreen = async () => {

    if (!document.fullscreenElement) {

        const element = document.querySelector(".room-container");

        if (element.requestFullscreen) {
            await element.requestFullscreen();
        }

        setIsFullScreen(true);

    } else {

        if (document.exitFullscreen) {
            await document.exitFullscreen();
        }

        setIsFullScreen(false);
    }
};
    const toggleVRMode = () => setIsVRMode(prev => !prev);

   const handleAskAI = async () => {

    if(!aiQuestion || aiLoading) return;

    setAILoading(true);

    try{

        const answer = await askAI(aiQuestion);

        setAIAnswer(answer);

    }catch(err){

        console.error(err);
        setAIAnswer("AI error occurred");

    }

    setAILoading(false);

};

    return (
        <div className={`room-container ${isFullScreen ? 'fullscreen-mode' : ''}`} style={{ position: "relative" }}>

            {guideLocation && (
            <div style={{
            position:"absolute",
            top:"80px",
            left:"20px",
            background:"rgba(0,0,0,0.6)",
            padding:"8px",
            borderRadius:"6px",
            color:"white",
            fontSize:"12px",
            zIndex:10
            }}>
                📍 {placeName ? placeName : `${guideLocation.lat.toFixed(4)}, ${guideLocation.lon.toFixed(4)}`}
            </div>
            )}

            {isReconnecting && <div className="reconnect-banner">Reconnecting...</div>}

            {!isFullScreen && (
                <div className="room-header">
                    <FaGlobeAmericas size={28} color="#0EA5E9" />
                    <span className="brand-text">Live<span style={{ color: '#0EA5E9' }}>Atlas</span></span>
                </div>
            )}


                <div
                    className="video-grid"
                    style={{ display: isVRMode ? "none" : "grid" }}
                >
                    {!isFullScreen && (
                    <div className="video-wrapper local">
                        <video ref={localVideoRef} autoPlay playsInline muted />
                        <div className="name-tag">You</div>
                    </div>
                    )}

                    <div className="video-wrapper remote">
                        <video ref={remoteVideoRef} autoPlay playsInline />
                        <div className="name-tag">Live Feed</div>
                    </div>

                </div>


            {isVRMode && (
                <div ref={vrContainerRef} style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "black"
                }} />
            )}



<div
style={{
    position: "absolute",
    right: "20px",
    bottom: "120px",
    zIndex: 9999,
    background: "rgba(0,0,0,0.7)",
    padding: "10px",
    borderRadius: "8px",
    color: "white",
    width: "260px"
}}
>

<input
    type="text"
    placeholder="Ask AI about this place..."
    value={aiQuestion}
    onChange={(e)=>setAIQuestion(e.target.value)}
    style={{width:"100%", padding:"6px"}}
/>

<button
    onClick={handleAskAI}
    style={{marginTop:"6px", width:"100%"}}
>
Ask
</button>

{aiLoading && <p>Thinking...</p>}

{aiAnswer && (
<p style={{marginTop:"8px"}}>
{aiAnswer}
</p>
)}

</div>

            <div className="controls-bar">
                <button onClick={toggleAudio}>
                    {isAudioOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
                </button>

                <button onClick={toggleVideo}>
                    {isVideoOn ? <FaVideo /> : <FaVideoSlash />}
                </button>

                <button onClick={endCall}>
                    <FaPhoneSlash />
                </button>

                <button onClick={switchCamera}>
                    <FaSyncAlt />
                </button>

                <button onClick={toggleFullScreen}>
                    {isFullScreen ? <FaCompress /> : <FaExpand />}
                </button>

                <button onClick={toggleVRMode}>
                    {isVRMode ? "Exit VR" : "VR"}
                </button>
            </div>

        </div>
    );
};

export default VideoRoom;
