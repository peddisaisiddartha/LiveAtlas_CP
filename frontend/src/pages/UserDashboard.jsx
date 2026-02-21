import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaGlobeAmericas, FaUserCircle } from 'react-icons/fa';

const UserDashboard = () => {
  const [tours, setTours] = useState([]);

  useEffect(() => {
    fetch('https://liveatlas-cp.onrender.com/api/tours/')
      .then(res => res.json())
      .then(data => setTours(data))
      .catch(err => console.error("Failed to load tours", err));
  }, []);

  return (
    <div style={{minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Inter', sans-serif"}}>

      {/* NAVBAR */}
      <nav style={{
        background: 'white',
        padding: '15px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px', fontWeight: 'bold', color: '#0F172A'}}>
           <FaGlobeAmericas color="#0EA5E9" />
           <span>Live<span style={{color: '#0EA5E9'}}>Atlas</span></span>
        </div>
        <Link to="/" className="btn" style={{
            textDecoration: 'none',
            color: '#64748B',
            fontWeight: '600',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0'
        }}>
            Logout
        </Link>
      </nav>

      {/* HERO SECTION */}
      <div style={{
        backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.6), rgba(15, 23, 42, 0.8)), url("https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=2021&q=80")',
        height: '350px',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        <h1 style={{fontSize: '48px', margin: '0 0 10px 0', fontWeight: '800'}}>Explore the World Live</h1>
        <p style={{fontSize: '20px', opacity: 0.9, maxWidth: '600px'}}>Connect with local guides in real-time and experience destinations from your home.</p>
      </div>

      {/* TOUR GRID */}
      <div style={{padding: '0 40px 60px 40px', maxWidth: '1200px', margin: '0 auto'}}>
        <h2 style={{marginBottom: '30px', color: '#0F172A', fontSize: '28px'}}>Active Broadcasts</h2>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px'}}>

          {tours.length === 0 ? (
            <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748B', background: 'white', borderRadius: '12px'}}>
                <h3>No active tours right now 😔</h3>
                <p>Please check back later when a guide goes live.</p>
            </div>
          ) : (
            tours.map(tour => {
               const imageUrl = tour.thumbnail
                ? tour.thumbnail
                : "https://via.placeholder.com/400x300";
                return (
                    <div key={tour.id} style={{
                      background: 'white',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                      transition: 'transform 0.2s',
                      border: '1px solid #F1F5F9',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      {/* Image Area */}
                      <div style={{
                        height: '200px',
                        backgroundImage: `url('${imageUrl}')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative'
                      }}>
                        <span style={{
                          position: 'absolute', top: '15px', right: '15px',
                          background: '#EF4444', color: 'white',
                          padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                          boxShadow: '0 2px 10px rgba(239, 68, 68, 0.4)',
                          display: 'flex', alignItems: 'center', gap: '5px'
                        }}>
                          <span style={{width: '8px', height: '8px', background: 'white', borderRadius: '50%', display: 'inline-block'}}></span>
                          LIVE
                        </span>
                      </div>

                      {/* Content Area */}
                      <div style={{padding: '24px', flex: 1, display: 'flex', flexDirection: 'column'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px'}}>
                          <h3 style={{margin: 0, fontSize: '18px', fontWeight: '700', color: '#0F172A'}}>{tour.title}</h3>

                          {/* UPDATED PRICE: Rupees Symbol + 1000 (or DB price) */}
                          <span style={{color: '#0EA5E9', fontWeight: '800', fontSize: '18px'}}>
                            ₹{tour.price > 0 ? tour.price : '1000'}
                          </span>
                        </div>

                        <p style={{color: '#64748B', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px', height: '44px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical'}}>
                            {tour.description}
                        </p>

                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 20px 0', color: '#94A3B8', fontSize: '13px', fontWeight: '500'}}>
                          <FaUserCircle size={16} />
                          <span>Guide: {tour.guide__username}</span>
                        </div>

                        {/* UPDATED BUTTON: Centered with margin: 0 auto */}
                        <div style={{marginTop: 'auto'}}>
                            <Link to={`/room/tour-${tour.id}`} className="btn" style={{
                              width: '80%', /* Not 100% anymore */
                              margin: '0 auto', /* This centers it */
                              display: 'block',
                              textAlign: 'center',
                              padding: '12px 24px',
                              borderRadius: '50px', /* More rounded pill shape */
                              background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
                              color: 'white',
                              textDecoration: 'none',
                              fontWeight: '600',
                              boxShadow: '0 4px 10px rgba(14, 165, 233, 0.4)'
                            }}>
                              Join Broadcast
                            </Link>
                        </div>
                      </div>
                    </div>
                );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
