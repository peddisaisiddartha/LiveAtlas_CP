# 🌍 LiveAtlas — Real-time Virtual Tour Platform

**LiveAtlas** is a cutting-edge, full-stack WebRTC application designed to bridge the gap between local tour guides and global travelers. Through live, interactive broadcasts, guides can showcase locations in real-time, providing an immersive travel experience from anywhere in the world.

---

## ✨ Features

- 🎭 **Dual-Role Ecosystem:** Dedicated dashboards for **Guides** (content creators) and **Tourists** (viewers)  
- ⚡ **Low-Latency Streaming:** High-performance WebRTC video for near-instant interaction  
- 🎛️ **Interactive Signal Controls:** Mute, Video Toggle, Fullscreen (Focus Mode), and End Call  
- 🔴 **Live Discovery Engine:** Tourist dashboard updates in real-time as guides go live  
- 🎨 **Modern UI:** Sky-blue travel theme with high-quality thumbnails  

---

## 🛠️ Technology Stack

| Layer | Technology |
|------|-----------|
| **Frontend** | React.js, Vite, React Router, React Icons |
| **Backend** | Django, Django Channels (ASGI), Daphne |
| **Real-time** | WebRTC, WebSockets (Signaling) |
| **Storage** | SQLite (Dev) / PostgreSQL (Production), Pillow |

---

## 📋 System Requirements

Make sure you have the following installed:

- **Python:** 3.10+  
- **Node.js:** 18+  
- **npm:** 9+  
- **Git:** Latest version  
- **Browser:** Chrome / Edge (recommended for WebRTC)

---

## 💻 Quick Start

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/mekalasindhuja70/LiveAtlas.git
cd LiveAtlas


```

---

## 🔧 Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install django daphne channels pillow

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Start server
python manage.py runserver
```

---

## 🎨 Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 🚀 How to Use

### 👩‍💼 For Guides

1. Login and open your dashboard
2. Create a tour with title + thumbnail
3. Click **Start Broadcast**
4. Begin live streaming

---

### 🌐 For Tourists

1. Login to the platform
2. Browse **Active Broadcasts**
3. Click **Join Broadcast**
4. Interact with the guide in real time

---

## 🛡️ Architecture & Security

* 🔄 **Signaling:** Django Channels + WebSockets exchange SDP & ICE candidates
* 🎥 **Media:** Direct Peer-to-Peer (P2P) streaming using WebRTC
* 🔐 **Permissions:** Camera/mic require **HTTPS or localhost**
* 🧠 **ASGI Server:** Daphne handles async communication

---

## ✅ Troubleshooting

### 📷 Camera Not Loading

* Use **HTTPS or localhost**
* Check browser permissions
* Ensure no other app is using the camera

### 🔌 Connection Failed

* Verify Django/Daphne server is running
* Check WebSocket connection in Network tab
* Ensure ports are not blocked

### 🖼️ Image Issues

* Confirm Pillow is installed
* Verify `MEDIA_ROOT` and `MEDIA_URL` in `settings.py`
* Run migrations properly

---

## 🔮 Future Enhancements

* 🌍 Multi-language support
* 💳 Paid tour integration
* 📱 Mobile app version
* 🧑‍🤝‍🧑 Multi-viewer rooms
* ☁️ Cloud deployment (AWS/GCP)

---

## 👩‍💻 Author

 * **mekalasindhuja70**
 * **m-priyambica**
 * **Pragthi060**
 * **srichandanachavali**


