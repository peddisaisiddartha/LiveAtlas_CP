

```markdown
# LiveAtlas - Real-time Virtual Tour Platform 🌍

**LiveAtlas** is a full-stack WebRTC application designed to connect local tour guides with global travelers through live, interactive broadcasts. Experience the world from your screen with low-latency, peer-to-peer streaming.

---

## 🚀 Key Features

* **Dual Dashboards:** Dedicated interfaces for **Guides** (to create/manage tours) and **Tourists** (to browse and join sessions).
* **Live WebRTC Video:** High-performance, real-time video streaming powered by peer-to-peer signaling.
* **In-Room Controls:** Interactive features including Mute, Video Toggle, Fullscreen (Focus Mode), and End Call.
* **Dynamic Discovery:** A real-time tourist dashboard that updates instantly as guides go live or end sessions.
* **Image Uploads:** Guides can upload high-quality thumbnails to showcase their tours.
* **Sky-Blue Theme:** A modern, travel-inspired UI built with clean "LiveAtlas" branding.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React.js, Vite, React Router, React Icons |
| **Backend** | Django, Django Channels (ASGI), Daphne |
| **Communication** | WebRTC (Signaling via WebSockets) |
| **Database** | SQLite (Dev) / PostgreSQL (Prod) |

---

## 💻 Local Setup Instructions

### 1. Clone the Repository
```bash
git clone [https://github.com/mekalasindhuja70/LiveAtlas.git](https://github.com/mekalasindhuja70/LiveAtlas.git)
cd LiveAtlas

```

### 2. Backend Setup

```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install Dependencies:
pip install django daphne channels pillow

# Setup Database:
python manage.py makemigrations
python manage.py migrate

# Start Server:
python manage.py runserver

```

### 3. Frontend Setup

```bash
cd ../frontend
npm install

# Start Frontend:
npm run dev

```

---

## ✅ Final Project Checklist

* **Guide Flow:** Login → Create Tour with Image → Click "Start Broadcast" → Enter Room.
* **User Flow:** Login → Browse "Active Broadcasts" → Click "Join" → Enter Room.
* **Permissions:** Ensure you are running on `localhost` or `HTTPS` for browser camera/microphone permissions to function correctly.

```

---
**Would you like me to add a "License" or "Contributors" section to the bottom of the file as well?**

```
