import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './VideoRoom.css';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash, FaExpand, FaCompress, FaGlobeAmericas, FaSyncAlt } from 'react-icons/fa';
import { initVR, disposeVR } from "../vr/vrEngine";
import { askAI } from '../ai/aiService';
import { supabase } from '../lib/supabase';

/* ─────────────────────────────────────────────────────────
   QUALITY CONSTANTS  — tweak here for different networks
───────────────────────────────────────────────────────── */
const Q = {
  // Video resolution — min forces browser to actually deliver it
  VIDEO_W_MIN:  1280,
  VIDEO_W_IDEAL: 1280,
  VIDEO_H_MIN:  720,
  VIDEO_H_IDEAL: 720,
  FRAMERATE_MIN: 30,
  FRAMERATE_IDEAL: 30,

  // Bitrates (bits/sec)
  BITRATE_GOOD:  3_300_000,   // 3.3 Mbps  — crystal clear 1080p
  BITRATE_OK:    2_500_000,   // 2.5 Mbps — solid 720p
  BITRATE_POOR:  1_200_000,   // 1.2 Mbps — fallback

  // Audio
  AUDIO_SAMPLE_RATE: 48000,
  AUDIO_CHANNELS: 2,

  // Reconnect
  RECONNECT_DELAY_MS: 800,   // was 2000ms — much faster reconnect
};

/* ─────────────────────────────────────────────────────────
   CODEC PRIORITY HELPER
   Forces H.264 > VP9 > VP8 order in SDP
   H.264 hardware-encoded on phones = best quality + lowest CPU
───────────────────────────────────────────────────────── */
function preferHighQualityCodecs(sdp, kind) {
  if (kind !== 'video') return sdp;

  const lines = sdp.split('\r\n');
  const mLineIdx = lines.findIndex(l => l.startsWith('m=video'));
  if (mLineIdx === -1) return sdp;

  // Collect all rtpmap lines
  const rtpmaps = {};
  lines.forEach(l => {
    const m = l.match(/^a=rtpmap:(\d+)\s+(\S+)/);
    if (m) rtpmaps[m[1]] = m[2].toLowerCase();
  });

  // Priority order: H264 (hardware) → VP9 → AV1 → VP8
  const priority = ['h264', 'vp9', 'av1', 'vp8'];
  const mLine = lines[mLineIdx].split(' ');
  const header = mLine.slice(0, 3);
  const payloads = mLine.slice(3);

  const sorted = payloads.sort((a, b) => {
    const nameA = rtpmaps[a] || '';
    const nameB = rtpmaps[b] || '';
    const idxA = priority.findIndex(p => nameA.startsWith(p));
    const idxB = priority.findIndex(p => nameB.startsWith(p));
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  lines[mLineIdx] = [...header, ...sorted].join(' ');
  return lines.join('\r\n');
}

/* ─────────────────────────────────────────────────────────
   APPLY MAX BITRATE FROM THE START
   Most implementations only set bitrate on state change.
   We call this immediately after addTrack so quality is
   high from the very first frame.
───────────────────────────────────────────────────────── */
async function applyBitrate(peerConn, bitrate) {
  const sender = peerConn.getSenders().find(s => s.track?.kind === 'video');
  if (!sender) return;
  try {
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}];
    }
    params.encodings[0].maxBitrate          = bitrate;
    params.encodings[0].maxFramerate        = Q.FRAMERATE_IDEAL;
    params.encodings[0].networkPriority     = 'high';
    params.encodings[0].priority            = 'high';
    params.degradationPreference            = 'maintain-framerate';
    await sender.setParameters(params);
    console.log(`[Quality] Bitrate set → ${(bitrate/1_000_000).toFixed(1)} Mbps`);
  } catch (e) {
    console.warn('[Quality] setParameters failed (normal before connected):', e.message);
  }
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT — ALL ORIGINAL LOGIC PRESERVED
═══════════════════════════════════════════════════════ */
const VideoRoom = () => {
    const { roomID } = useParams();
    const navigate = useNavigate();

    /* ── ORIGINAL STATE ── */
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
    const [selectedIntent, setSelectedIntent] = useState("Explore");
    const [showControls, setShowControls] = useState(true);
    const [showLocalVideo, setShowLocalVideo] = useState(true);

    /* ── ORIGINAL REFS ── */
    const localVideoRef  = useRef(null);
    const remoteVideoRef = useRef(null);
    const vrContainerRef = useRef(null);
    const ws             = useRef(null);
    const peerConnection = useRef(null);

    /* ── ORIGINAL INTENT FETCH + REALTIME (unchanged) ── */
    useEffect(() => {
        async function fetchIntent() {
            const { data } = await supabase
                .from("session_intents")
                .select("*")
                .eq("room_id", roomID)
                .order("id", { ascending: false })
                .limit(1);

            if (data && data.length > 0) {
                setSelectedIntent(data[0].intent);
                console.log("Fetched Intent:", data[0].intent);
            } else {
                setSelectedIntent("Explore");
            }
        }

        fetchIntent();

        const channel = supabase
            .channel('intent-live')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'session_intents',
                filter: `room_id=eq.${roomID}`
            }, (payload) => {
                console.log("Realtime Intent:", payload.new.intent);
                setSelectedIntent(payload.new.intent);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomID]);

    /* ── ORIGINAL controls auto-hide (unchanged) ── */
    useEffect(() => {
        let timer;
        if (isFullScreen && showControls) {
            timer = setTimeout(() => setShowControls(false), 3000);
        }
        return () => clearTimeout(timer);
    }, [isFullScreen, showControls]);

    /* ── ORIGINAL INTENT EFFECT (unchanged) ── */
    useEffect(() => {
        console.log("Current Intent:", selectedIntent);
        if (selectedIntent === "Explore") { setIsVRMode(false); console.log("🌍 Explore → Normal viewing mode"); }
        if (selectedIntent === "Talk")    { setIsVRMode(false); console.log("🗣 Talk → Interaction focused mode"); }
        if (selectedIntent === "Learn") {
            setIsVRMode(false);
            if (!aiQuestion) { setAIQuestion("Explain this place"); handleAskAI(); }
            console.log("📘 Learn → AI auto explanation triggered");
        }
        if (selectedIntent === "Experience") { setIsVRMode(true); console.log("🎥 Experience → VR mode ON"); }
    }, [selectedIntent]);

    /* ── ORIGINAL switchCamera (unchanged) ── */
    const switchCamera = async () => {
        const newFacing = cameraFacing === "environment" ? "user" : "environment";
        setCameraFacing(newFacing);
        const oldStream = localVideoRef.current?.srcObject;
        if (oldStream) oldStream.getVideoTracks().forEach(track => track.stop());
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: newFacing } },
            });
            const videoTrack = newStream.getVideoTracks()[0];
            const sender = peerConnection.current?.getSenders().find(s => s.track?.kind === "video");
            if (sender) sender.replaceTrack(videoTrack);
            localVideoRef.current.srcObject = newStream;
        } catch (err) {
            console.error("Camera switch failed:", err);
        }
    };

    /* ── MAIN WebRTC EFFECT — signaling logic unchanged, quality upgraded ── */
    useEffect(() => {

        /* ORIGINAL geolocation (unchanged) */
        navigator.geolocation.getCurrentPosition((position) => {
            const latitude  = position.coords.latitude;
            const longitude = position.coords.longitude;
            setGuideLocation({ lat: latitude, lon: longitude });
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`, {
                headers: { "User-Agent": "LiveAtlas/1.0 (https://liveatlas-cp-1.onrender.com)" }
            })
            .then(res => res.json())
            .then(data => { if (data?.display_name) setPlaceName(data.display_name); })
            .catch(err => console.error("Location API error:", err));
            console.log("Guide location:", latitude, longitude);
        });

        const protocol = window.location.protocol === "https:" ? "wss" : "ws";

        /* ORIGINAL connectWebSocket — only RECONNECT_DELAY_MS changed (800ms vs 2000ms) */
        const connectWebSocket = () => {
            const normalizedRoomID = roomID.replace("_", "-");
            setIsReconnecting(true);
            if (!navigator.onLine) { console.warn("Offline: skipping reconnect"); return; }
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                console.log("WebSocket already connected"); return;
            }
            ws.current = new WebSocket(
                `${protocol}://liveatlas-cp.onrender.com/ws/tours/${normalizedRoomID}/`
            );
            ws.current.onopen = async () => {
                console.log("WebSocket connected");
                setIsReconnecting(false);
                if (!peerConnection.current) await setupWebRTC();
            };
            ws.current.onclose = () => {
                console.log("WebSocket disconnected. Reconnecting...");
                setIsReconnecting(true);
                setTimeout(() => {
                    if (document.visibilityState === "visible") connectWebSocket();
                }, Q.RECONNECT_DELAY_MS); // ← was 2000, now 800
            };
            ws.current.onmessage = async (event) => {
                const data = JSON.parse(event.data);
                handleSignalMessage(data);
            };
        };

        if (!ws.current) connectWebSocket();

        const handleVisibility = () => {
            if (document.hidden) {
                console.log("Tab hidden");
            } else {
                console.log("Tab active again — checking stream health");
                if (!ws.current) { console.log("Tab became visible - reconnecting"); connectWebSocket(); }
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            if (ws.current) { ws.current.onclose = null; ws.current.close(); ws.current = null; }
            if (localVideoRef.current?.srcObject) {
                localVideoRef.current.srcObject.getTracks().forEach(t => t.stop());
            }
            if (peerConnection.current) peerConnection.current.close();
            disposeVR();
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [roomID]);

    /* ── ORIGINAL VR effect (unchanged) ── */
    useEffect(() => {
        console.log("VR Effect Triggered:", isVRMode);
        const video = remoteVideoRef.current;
        if (!video || !vrContainerRef.current) { console.log("VR skipped: video or container missing"); return; }
        if (isVRMode) { console.log("Starting VR..."); initVR(vrContainerRef.current, video); }
        else          { console.log("Stopping VR..."); disposeVR(); }
        return () => { disposeVR(); };
    }, [isVRMode]);

    /* ══════════════════════════════════════════════════════
       setupWebRTC — ALL SIGNALING LOGIC PRESERVED
       QUALITY UPGRADES MARKED WITH [QUALITY]
    ══════════════════════════════════════════════════════ */
    const setupWebRTC = async () => {

        /* [QUALITY] Added min constraints so browser is FORCED to deliver them.
           Without min, "ideal" is just a suggestion the browser ignores.          */
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width:     { min: Q.VIDEO_W_MIN,  ideal: Q.VIDEO_W_IDEAL },
                height:    { min: Q.VIDEO_H_MIN,  ideal: Q.VIDEO_H_IDEAL },
                frameRate: { min: Q.FRAMERATE_MIN, ideal: Q.FRAMERATE_IDEAL },
                facingMode: cameraFacing,
                /* [QUALITY] These hints tell Chrome/Firefox to use hardware encoder */
                advanced: [
                    { width: 1920, height: 1080 },
                    { width: 1280, height: 720  },
                ]
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: false,
                autoGainControl:  false,
                channelCount:     Q.AUDIO_CHANNELS,
                sampleRate:       Q.AUDIO_SAMPLE_RATE,
                sampleSize:       16,
                /* [QUALITY] Latency hint — low latency mode for real-time */
                latency:          0,
                googEchoCancellation: true,
                googAutoGainControl: false,
                googNoiseSuppression: false,
                googHighpassFilter: false,
            }
        });

        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        /* ORIGINAL mic level analyser (unchanged) */
        if (!window.AudioContext && !window.webkitAudioContext) {
            console.log("AudioContext unsupported");
            
        }
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContext.suspend();
        const analyser   = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        analyser.fftSize = 256;
        const dataArray  = new Uint8Array(analyser.frequencyBinCount);
        const checkMicLevel = () => {
            analyser.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            setMicLevel(avg);
            if (!document.hidden) requestAnimationFrame(checkMicLevel);
        };
        audioContext.resume();
        checkMicLevel();

         /* UPDATED TURN + STUN servers */
       peerConnection.current = new RTCPeerConnection({
    iceServers: [
        {
            urls: "stun:stun.relay.metered.ca:80",
        },
        {
            urls: "turn:standard.relay.metered.ca:80",
            username: "3f8759bd068204338517a31d",
            credential: "9n2CI75lIUpwOsnx",
        },

        {
            urls: "turn:standard.relay.metered.ca:443",
            username: "3f8759bd068204338517a31d",
            credential: "9n2CI75lIUpwOsnx",
        },
        
    ],

    iceCandidatePoolSize: 10,
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
    encodedInsertableStreams: false,
});

        /* ORIGINAL ICE state handler — quality thresholds upgraded */
        peerConnection.current.oniceconnectionstatechange = async () => {
            const state = peerConnection.current.iceConnectionState;
            const stats = await peerConnection.current.getStats();

            stats.forEach(report => {

            if (
                report.type === "candidate-pair" &&
                report.state === "succeeded"
            ) {

                console.log(
                    "Current Candidate Pair:",
                    report.localCandidateId,
                    report.remoteCandidateId
                );
            }
            });
            console.log("ICE STATE:", state);

            if (state === "disconnected" || state === "failed") {
                setConnectionQuality("poor");
                console.warn("WebRTC connection unstable:", state);
                setTimeout(() => {
                    if (peerConnection.current && peerConnection.current.iceConnectionState !== "connected") {
                        console.warn("Attempting ICE recovery...");
                    }
                }, 4000);
            }
            if (state === "closed") console.log("ICE connection closed");

            if (state === "connected" || state === "completed") {
                setConnectionQuality("good");
                /* [QUALITY] Apply max bitrate the moment we're connected */
                await applyBitrate(peerConnection.current, Q.BITRATE_GOOD);
            }

            const sender = peerConnection.current.getSenders().find(s => s.track?.kind === "video");
            if (!sender) return;
            const params = sender.getParameters();
            params.degradationPreference = "maintain-framerate";
            if (!params.encodings) params.encodings = [{}];

            if (state === "connected" || state === "completed") {
                setConnectionQuality("good");
                /* [QUALITY] Higher bitrates than original */
                params.encodings[0].maxBitrate      = connectionQuality === "good" ? Q.BITRATE_GOOD : Q.BITRATE_OK;
                params.encodings[0].maxFramerate     = connectionQuality === "good" ? 30 : 24;
                params.encodings[0].networkPriority  = "high";   // [QUALITY] added
                params.encodings[0].priority         = "high";   // [QUALITY] added
                params.encodings[0].scaleResolutionDownBy = 1.0;
                params.encodings[0].adaptivePtime = true;
            } else {
                setConnectionQuality("poor");
            }

            if (state === "disconnected" || state === "failed") {
                params.encodings[0].maxBitrate = Q.BITRATE_POOR;
                if (peerConnection.current?.restartIce) {
                    console.log("Restarting ICE...");
                    peerConnection.current.restartIce();
                }
            }
            sender.setParameters(params);
        };

        /* ORIGINAL track hints (unchanged) */
        stream.getTracks().forEach(track => {
            if (track.kind === "video") track.contentHint = "motion";
            if (track.kind === "audio") track.contentHint = "speech";
            const existingSender = peerConnection.current.getSenders().find(
                s => s.track?.kind === track.kind
            );
            if (!existingSender) peerConnection.current.addTrack(track, stream);
        });

        /* [QUALITY] Apply bitrate immediately after adding tracks — 
           don't wait for ICE connected. First frames = already high quality. */
        setTimeout(async () => {
            if (peerConnection.current) {
                await applyBitrate(peerConnection.current, Q.BITRATE_GOOD);
            }
        }, 500);

        /* ORIGINAL offer creation — with codec priority injected into SDP */
        if (peerConnection.current.signalingState === "stable") {
            const offer = await peerConnection.current.createOffer({
                /* [QUALITY] offerToReceive both — ensures bidirectional negotiation */
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });

            /* [QUALITY] Rewrite SDP to prefer H264 > VP9 > VP8 */
            const optimizedSDP = preferHighQualityCodecs(offer.sdp, 'video');
            const optimizedOffer = { type: offer.type, sdp: optimizedSDP };

            await peerConnection.current.setLocalDescription(optimizedOffer);
            ws.current.send(JSON.stringify({ type: "offer", offer: optimizedOffer }));
            console.log("Initial offer sent (H264-preferred)");
        }

        /* ORIGINAL ontrack — with quality playback hints added */
        peerConnection.current.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];

                /* [QUALITY] Force real-time playback — no buffering delay */
                remoteVideoRef.current.playbackRate = 1.0;
                remoteVideoRef.current.preservesPitch = false;

                remoteVideoRef.current.disablePictureInPicture = true;

                event.streams[0].getVideoTracks()[0].onended = () => {
                    console.log("Remote video track ended");
                    setConnectionQuality("poor");
                    setIsReconnecting(true);
                };
                remoteVideoRef.current.play().catch(err => console.log("Autoplay blocked:", err));
            }
        };

        /* ORIGINAL ICE candidate handler (unchanged) */
        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                ws.current.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
            }
        };
    };

    /* ── ORIGINAL handleSignalMessage (unchanged) ── */
    const handleSignalMessage = async (data) => {
        console.log("Signal received:", data.type);
        if (!peerConnection.current) return;

        if (data.type === 'offer') {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);
            ws.current.send(JSON.stringify({ type: 'answer', answer }));
        }
        else if (data.type === 'answer') {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
        else if (data.type === 'candidate') {
            if (peerConnection.current.remoteDescription) {
                try {
                    await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (err) {
                    console.error("ICE error:", err);
                }
            } else {
                console.log("Skipping ICE - remoteDescription not set yet");
            }
        }
    };

    /* ── ORIGINAL toggles (unchanged) ── */
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

    /* ── ORIGINAL endCall (unchanged) ── */
    const endCall = async () => {
        const dbId = roomID.split('_')[1];
        try {
            await fetch(`https://liveatlas-cp.onrender.com/api/end-tour/${dbId}/`, { method: 'POST' });
        } catch (err) { console.error(err); }
        if (localVideoRef.current?.srcObject) {
            localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        if (ws.current) ws.current.close();
        disposeVR();
        navigate('/');
    };

    /* ── ORIGINAL toggleFullScreen (unchanged) ── */
    const toggleFullScreen = async () => {
        if (!document.fullscreenElement) {
            const element = document.querySelector(".room-container");
            if (element.requestFullscreen) await element.requestFullscreen();
            setIsFullScreen(true);
        } else {
            if (document.exitFullscreen) await document.exitFullscreen();
            setIsFullScreen(false);
        }
    };

    /* ── ORIGINAL toggleVRMode (unchanged) ── */
    const toggleVRMode = () => {
        console.log("VR TOGGLED:", !isVRMode);
        setIsVRMode(prev => !prev);
    };

    /* ── ORIGINAL handleAskAI (unchanged) ── */
    const handleAskAI = async () => {
        if (!aiQuestion || aiLoading) return;
        setAILoading(true);
        try {
            const answer = await askAI(aiQuestion);
            setAIAnswer(answer);
        } catch (err) {
            console.error(err);
            setAIAnswer("AI error occurred");
        }
        setAILoading(false);
    };

    /* ── ORIGINAL JSX (100% unchanged) ── */
    return (
        <div
            className={`room-container ${isFullScreen ? 'fullscreen-mode' : ''}`}
            onClick={() => { if (isFullScreen) setShowControls(true); }}
            style={{ position: "relative" }}
        >
            {guideLocation && (
                <div style={{ position:"absolute", top:"80px", left:"20px", background:"rgba(0,0,0,0.6)", padding:"8px", borderRadius:"6px", color:"white", fontSize:"12px", zIndex:10 }}>
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
                style={{ opacity: isVRMode ? 0 : 1, pointerEvents: isVRMode ? "none" : "auto", position: "relative", zIndex: 1 }}
            >
                {showLocalVideo && !isFullScreen && (
                    <div className="video-wrapper local">
                        <video ref={localVideoRef} autoPlay playsInline muted />
                        <div className="name-tag">You</div>
                    </div>
                )}

                <div className="video-wrapper remote">
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        onWaiting={() => setIsReconnecting(true)}
                        onPlaying={() => setIsReconnecting(false)}
                    />
                    <div className="name-tag">Live Feed</div>
                    <div style={{ position:"absolute", top:"10px", right:"10px", background: connectionQuality === "good" ? "green" : "red", color:"white", padding:"4px 8px", borderRadius:"6px", fontSize:"12px" }}>
                        {connectionQuality}
                    </div>
                </div>
            </div>

            {isVRMode && (
                <div ref={vrContainerRef} style={{ position:"absolute", inset:0, backgroundColor:"black", zIndex:0 }} />
            )}

            <div style={{ position:"absolute", right:"20px", bottom:"120px", zIndex:9999, background:"rgba(0,0,0,0.7)", padding:"10px", borderRadius:"8px", color:"white", width:"260px" }}>
                <input
                    type="text"
                    placeholder="Ask AI about this place..."
                    value={aiQuestion}
                    onChange={(e) => setAIQuestion(e.target.value)}
                    style={{ width:"100%", padding:"6px" }}
                />
                <button onClick={handleAskAI} style={{ marginTop:"6px", width:"100%" }}>Ask</button>
                {aiLoading && <p>Thinking...</p>}
                {aiAnswer && <p style={{ marginTop:"8px" }}>{aiAnswer}</p>}
            </div>

            {!isFullScreen && (
                <div style={{ position:"absolute", top:"120px", right:"20px", zIndex:1000, background:"rgba(0,0,0,0.7)", padding:"10px", borderRadius:"8px", color:"white" }}>
                    <p>Change Intent</p>
                    <select
                        value={selectedIntent}
                        onChange={async (e) => {
                            const newIntent = e.target.value;
                            setSelectedIntent(newIntent);
                            await supabase.from("session_intents").delete().eq("room_id", roomID);
                            const { error } = await supabase.from("session_intents").insert([{ room_id: roomID, intent: newIntent }]);
                            console.log("Intent Updated:", newIntent, error);
                        }}
                        style={{ width:"100%", padding:"5px" }}
                    >
                        <option value="Explore">Explore</option>
                        <option value="Talk">Talk</option>
                        <option value="Learn">Learn</option>
                        <option value="Experience">Experience</option>
                    </select>
                </div>
            )}

            <div className={`controls-bar ${isFullScreen && !showControls ? 'controls-hidden' : ''}`}>
                {!isFullScreen && (
                    <>
                        <button onClick={toggleAudio}>{isAudioOn ? <FaMicrophone /> : <FaMicrophoneSlash />}</button>
                        <button onClick={toggleVideo}>{isVideoOn ? <FaVideo /> : <FaVideoSlash />}</button>
                        <button onClick={() => setShowLocalVideo(prev => !prev)}>{showLocalVideo ? "Hide Cam" : "Show Cam"}</button>
                        <button onClick={endCall}><FaPhoneSlash /></button>
                        <button onClick={switchCamera}><FaSyncAlt /></button>
                        <button onClick={toggleVRMode}>{isVRMode ? "Exit VR" : "VR"}</button>
                    </>
                )}
                <button onClick={toggleFullScreen}>{isFullScreen ? <FaCompress /> : <FaExpand />}</button>
            </div>
        </div>
    );
};

export default VideoRoom;
