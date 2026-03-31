import React, { useState } from 'react';
import './index.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import VideoRoom from './pages/VideoRoom'; // Your existing video room
import Login from './pages/Login.jsx';         // We will create this
import GuideDashboard from './pages/GuideDashboard'; // We will create this
import UserDashboard from './pages/UserDashboard';   // We will create this

function App() {
  // Mock login state for now (we will connect to backend later)
  const [userRole, setUserRole] = useState(null); // 'guide' or 'user' or null

  return (
    <BrowserRouter>
      <Routes>
        {/* Login Page */}
        <Route path="/" element={<Login setUserRole={setUserRole} />} />

        {/* Dashboards (Protected) */}
        <Route
          path="/guide-dashboard"
          element={userRole === 'guide' ? <GuideDashboard /> : <Navigate to="/" />}
        />
        <Route
          path="/user-dashboard"
          element={userRole === 'user' ? <UserDashboard /> : <Navigate to="/" />}
        />

        {/* Video Room */}
        <Route path="/room/:roomID" element={<VideoRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
