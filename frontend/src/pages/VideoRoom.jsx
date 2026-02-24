import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './VideoRoom.css';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash, FaExpand, FaCompress, FaGlobeAmericas, FaSyncAlt } from 'react-icons/fa';
import { initVR, disposeVR } from "../vr/vrEngine";

const VideoRoom = () => {
    const { roomID } = useParams();
    const navigate = useNavigate();

    // State for controls
    const [isAudioOn, setIsAudioOn] = useState(true);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isVRMode, setIsVRMode] = useState(false);
    const [cameraFacing, setCameraFacing] = useState("environment");
    const [connectionQuality, setConnectionQuality ] = useState("good"); // "good", "poor", "disconnected"
    const [micLevel, setMicLevel] = useState(0); // 0 to 1 for visualizer
    const [isReconnecting, setIsReconnecting] = useState(false);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const vrContainerRef = useRef(null);
    const ws = useRef(null);
    const peerConnection = useRef(null);

    const switchCamera = async () => {
  const newFacing = cameraFacing === "environment" ? "user" : "environment";
  setCameraFacing(newFacing);

  // Stop old stream tracks
    const oldStream = localVideoRef.current?.srcObject;
    if (oldStream) {
        oldStream.getVideoTracks().forEach(track => track.stop());
    }

  try {
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: newFacing } },

    });

    // Replace local video
    const videoTrack = newStream.getVideoTracks()[0];
    const sender = peerConnection.current
      ?.getSenders()
      .find(s => s.track && s.track.kind === "video");

    if (sender) {
      sender.replaceTrack(videoTrack);
    }

    // Update local preview
    localVideoRef.current.srcObject = newStream;

  } catch (err) {
    console.error("Camera switch failed:", err);
  }
};

    useEffect(() => {
        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
const connectWebSocket = () => {
    ws.current = new WebSocket(
        `${protocol}://liveatlas-cp.onrender.com/ws/tours/${roomID}/`
    );


    ws.current.onopen = () => {
        console.log("WebSocket connected");
        setIsReconnecting(false);
        setupWebRTC();
    };

    ws.current.onclose = () => {
        console.log("WebSocket disconnected. Reconnecting...");
        setIsReconnecting(true);

        setTimeout(() => {
            connectWebSocket();
        }, 2000);
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
    if (!remoteVideoRef.current || !vrContainerRef.current) return;

    if (isVRMode) {
        initVR(remoteVideoRef.current, vrContainerRef.current);
    } else {
        disposeVR();
    }

    return () => {
        disposeVR();
    };
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
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // Mic level analyzer
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
      {
        urls: "stun:stun.relay.metered.ca:80",
      },
      {
        urls: "turn:global.relay.metered.ca:80",
        username: "a08d7dab4952ac44632adaaa",
        credential: "4+8LpWBi440BQE2K",
      },
      {
        urls: "turn:global.relay.metered.ca:80?transport=tcp",
        username: "a08d7dab4952ac44632adaaa",
        credential: "4+8LpWBi440BQE2K",
      },
      {
        urls: "turn:global.relay.metered.ca:443",
        username: "a08d7dab4952ac44632adaaa",
        credential: "4+8LpWBi440BQE2K",
      },
      {
        urls: "turns:global.relay.metered.ca:443?transport=tcp",
        username: "a08d7dab4952ac44632adaaa",
        credential: "4+8LpWBi440BQE2K",
      },
  ],

  iceCandidatePoolSize: 10
});


        stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));


        peerConnection.current.ontrack = (event) => {
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
        };

       peerConnection.current.onicecandidate = (event) => {
         if (event.candidate) {
            console.log("Candidate:", event.candidate.candidate);
            ws.current.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
    }
};

  // Monitor connection quality
setInterval(async () => {
    if (!peerConnection.current) return;

    const stats = await peerConnection.current.getStats();
    stats.forEach(report => {
        if (report.type === "candidate-pair" && report.state === "succeeded") {
            const rtt = report.currentRoundTripTime;

            if (rtt < 0.15) {
                setConnectionQuality("good");
            } else if (rtt < 0.3) {
                setConnectionQuality("medium");
            } else {
                setConnectionQuality("poor");
            }
        }
    });
}, 3000);

        setTimeout(createOffer, 500);
    };

    const createOffer = async () => {
        if (!peerConnection.current) return;
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        ws.current.send(JSON.stringify({ type: 'offer', offer: offer }));
    };

    const handleSignalMessage = async (data) => {
        if (!peerConnection.current) return;
        if (data.type === 'offer') {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);
            ws.current.send(JSON.stringify({ type: 'answer', answer: answer }));
        } else if (data.type === 'answer') {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        } else if (data.type === 'candidate') {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    };

    // --- CONTROLS LOGIC ---

    const toggleAudio = () => {
    const stream = localVideoRef.current?.srcObject;
    if (!stream) return;

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) return;

    const audioTrack = audioTracks[0];
    audioTrack.enabled = !audioTrack.enabled;
    setIsAudioOn(audioTrack.enabled);
};

    const toggleVideo = () => {
        const stream = localVideoRef.current.srcObject;
        const videoTrack = stream.getVideoTracks()[0];
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
    };

    const endCall = async () => {
        // 1. Get the ID (e.g., turn "tour-15" into "15")
        const dbId = roomID.split('-')[1];

        // 2. Tell the backend to kill the tour
        try {
            await fetch(`https://liveatlas-cp.onrender.com/api/end-tour/${dbId}/`, {
                method: 'POST'
            });
            console.log("Tour ended successfully");
        } catch (err) {
            console.error("Failed to end tour:", err);
        }

        // 3. Stop the camera/mic
        if (localVideoRef.current && localVideoRef.current.srcObject) {
            localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }

        // 4. Close connection and leave
        if (ws.current) ws.current.close();
        navigate('/'); // Go back home
    };

    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
    };

    const toggleVRMode = () => {
    setIsVRMode(prev => !prev);
    };

    useEffect(() => {
        if (isVRMode && vrContainerRef.current) {
            initVR(localVideoRef.current, vrContainerRef.current);
        } else if (!isVRMode && vrContainerRef.current) {
            disposeVR();
        }
    }, [isVRMode]);

    return (
        <div className={`room-container ${isFullScreen ? 'fullscreen-mode' : ''}`}>

            {isReconnecting && (
                <div className="reconnect-banner">
                  Reconnecting...
                </div>
            )}
            {/* Header */}
            {!isFullScreen && (
                <div className="room-header">
                    <FaGlobeAmericas size={28} color="#0EA5E9" />
                    <span className="brand-text">Live<span style={{color: '#0EA5E9'}}>Atlas</span></span>
                </div>
            )}
            {!isVRMode && (
            <div className="video-grid">
                {/* Local Video (You) - Hidden in Fullscreen Mode usually, or becomes a small PiP */}
                <div className="video-wrapper local">
                    <video ref={localVideoRef} autoPlay playsInline muted />
                    <div className="name-tag">You {!isAudioOn && '(Muted)'}</div>
                </div>

                {/* Remote Video (Them) - Takes full space in Fullscreen */}
                <div className="video-wrapper remote">
                    <video ref={remoteVideoRef} autoPlay playsInline />
                    <div className="name-tag">Live Feed</div>
                </div>
            </div>
            )}

            {isVRMode && (
                <div
                ref={vrContainerRef}
                style={{
                    width: "100vw",
                    height: "100vh",
                    position: "fixed",
                    top: 0,
                    left: 0,
                    zIndex: 9999,
                    backgroundColor: "black"
                }}
                />

            )}

            {/* Controls Bar */}

            <div className={`connection-indicator ${connectionQuality}`}>
                {connectionQuality === "good" && "🟢 Good"}
                {connectionQuality === "medium" && "🟡 Medium"}
                {connectionQuality === "poor" && "🔴 Poor"}
            </div>

            <div className="controls-bar">
                <button className={`control-btn ${!isAudioOn ? 'off' : ''}`} onClick={toggleAudio}>
                    {isAudioOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
                    <div className="mic-meter">
                    <div
                         className="mic-fill"
                        style={{ height: `${Math.min(micLevel, 100)}%` }}
                     ></div>
                    </div>
                </button>

                <button className={`control-btn ${!isVideoOn ? 'off' : ''}`} onClick={toggleVideo}>
                    {isVideoOn ? <FaVideo /> : <FaVideoSlash />}
                </button>

                <button className="control-btn end-call" onClick={endCall}>
                    <FaPhoneSlash />
                </button>

                <button className="control-btn" onClick={switchCamera}>
                    <FaSyncAlt />
                </button>

                <button className="control-btn" onClick={toggleFullScreen}>
                    {isFullScreen ? <FaCompress /> : <FaExpand />}
                </button>

                <button className="control-btn" onClick={toggleVRMode}>
                    {isVRMode ? "Exit VR" : "VR"}
                </button>
            </div>
        </div>
    );
};

export default VideoRoom;
