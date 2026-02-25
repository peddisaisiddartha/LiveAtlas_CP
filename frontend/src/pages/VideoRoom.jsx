import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './VideoRoom.css';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash, FaExpand, FaCompress, FaGlobeAmericas, FaSyncAlt } from 'react-icons/fa';
import { initVR, disposeVR } from "../vr/vrEngine";

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
        const protocol = window.location.protocol === "https:" ? "wss" : "ws";

        const connectWebSocket = () => {
            const normalizedRoomID = roomID.replace("_", "-");
            ws.current = new WebSocket(
                `${protocol}://${window.location.host}/ws/tour/${normalizedRoomID}/`
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

        if (isVRMode) {
            initVR(vrContainerRef.current, remoteVideoRef.current);
        } else {
            disposeVR();
        }

        return () => disposeVR();
    }, [isVRMode]);

    const setupWebRTC = async () => {

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: cameraFacing },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 30, max: 30 }
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
            console.log("Remote stream received");
            if (remoteVideoRef.current)
                remoteVideoRef.current.srcObject = event.streams[0];
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
            await peerConnection.current.addIceCandidate(
                new RTCIceCandidate(data.candidate)
            );
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

    const toggleFullScreen = () => setIsFullScreen(!isFullScreen);
    const toggleVRMode = () => setIsVRMode(prev => !prev);

    return (
        <div className={`room-container ${isFullScreen ? 'fullscreen-mode' : ''}`} style={{ position: "relative" }}>
            {isReconnecting && <div className="reconnect-banner">Reconnecting...</div>}

            {!isFullScreen && (
                <div className="room-header">
                    <FaGlobeAmericas size={28} color="#0EA5E9" />
                    <span className="brand-text">Live<span style={{ color: '#0EA5E9' }}>Atlas</span></span>
                </div>
            )}

            {!isVRMode && (
                <div className="video-grid">
                    <div className="video-wrapper local">
                        <video ref={localVideoRef} autoPlay playsInline muted />
                        <div className="name-tag">You</div>
                    </div>
                    <div className="video-wrapper remote">
                        <video ref={remoteVideoRef} autoPlay playsInline />
                        <div className="name-tag">Live Feed</div>
                    </div>
                </div>
            )}

            {isVRMode && (
                <div ref={vrContainerRef} style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "black"
                }} />
            )}



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
