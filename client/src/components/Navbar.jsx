import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav className="navbar">
      <Link to={user ? "/dashboard" : "/"} className="nav-brand">
        <span>⚔️</span> STUDY DUNGEON
      </Link>
      
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="mono-text" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            👤 <strong style={{ color: 'var(--text-primary)' }}>{user.display_name}</strong>
          </span>
          <Link to="/create" className="btn btn-primary" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}>
            + Forge Dungeon
          </Link>
          <button 
            onClick={handleLogout} 
            className="btn btn-secondary" 
            style={{ padding: '0.45rem 0.8rem', fontSize: '0.8rem' }}
          >
            Leave
          </button>
        </div>
      )}
    </nav>
  );
}
