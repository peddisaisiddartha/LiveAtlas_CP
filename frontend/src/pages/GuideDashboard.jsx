import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaGlobeAmericas, FaCamera, FaPlus, FaImage } from 'react-icons/fa';

const GuideDashboard = () => {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [image, setImage] = useState(null); // Store the file
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
        setImage(e.target.files[0]);
    }
  };

  const createTour = async () => {
    if (!title) return alert("Please enter a title!");

    // Create FormData (Required for sending files)
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', desc);
    formData.append('price', 20);
    if (image) {
        formData.append('thumbnail', image); // Attach the file
    }

    // Send to Backend
    const response = await fetch('https://liveatlas-cp-1.onrender.com/api/create-tour/', {
      method: 'POST',
      // Note: Do NOT set Content-Type header when using FormData; browser does it automatically
      body: formData
    });

    const data = await response.json();
    if (data.status === 'success') {
        navigate(`/room/tour-${data.tour_id}`);
    }
  };

  return (
    <div style={{minHeight: '100vh', background: '#F0F9FF'}}>
      <nav style={{background: 'white', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px', fontWeight: 'bold'}}>
           <FaGlobeAmericas color="#0EA5E9" />
           <span>Live<span style={{color: '#0EA5E9'}}>Atlas</span> Creator</span>
        </div>
        <Link to="/" className="btn" style={{color: '#64748B'}}>Logout</Link>
      </nav>

      <div style={{maxWidth: '600px', margin: '60px auto', padding: '0 20px'}}>
        <div style={{background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)'}}>
            <h2 style={{marginTop: 0, color: '#0F172A'}}>Create a Broadcast</h2>

            {/* Title Input */}
            <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', fontWeight: '600', marginBottom: '8px', color: '#334155'}}>Tour Title</label>
                <input type="text" placeholder="e.g. Walking tour of Old City" value={title} onChange={(e) => setTitle(e.target.value)}
                    style={{width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #E2E8F0', outline: 'none'}} />
            </div>

            {/* Image Input (New) */}
            <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', fontWeight: '600', marginBottom: '8px', color: '#334155'}}>Cover Image</label>
                <div style={{border: '2px dashed #CBD5E1', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer', background: '#F8FAFC'}}>
                    <input type="file" accept="image/*" onChange={handleImageChange} style={{display: 'none'}} id="file-upload" />
                    <label htmlFor="file-upload" style={{cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#64748B'}}>
                        <FaImage size={24} style={{marginBottom: '8px'}} />
                        {image ? image.name : "Click to upload a cover photo"}
                    </label>
                </div>
            </div>

            {/* Description Input */}
            <div style={{marginBottom: '30px'}}>
                <label style={{display: 'block', fontWeight: '600', marginBottom: '8px', color: '#334155'}}>Description</label>
                <textarea placeholder="What will viewers see?" value={desc} onChange={(e) => setDesc(e.target.value)}
                    style={{width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #E2E8F0', minHeight: '100px', outline: 'none'}} />
            </div>

            <button className="btn btn-primary" onClick={createTour} style={{width: '100%', padding: '16px', fontSize: '18px'}}>
                <FaPlus style={{marginRight: '8px'}}/> Start Broadcast
            </button>
        </div>
      </div>
    </div>
  );
};

export default GuideDashboard;
