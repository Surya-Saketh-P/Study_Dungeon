import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, loginDemo } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password, displayName);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    setError('');
    setLoading(true);
    try {
      await loginDemo();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: '520px', marginTop: '3rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⚔️ 🛡️ 🐉</div>
        <h1 className="pixel-title" style={{ fontSize: '1.6rem', color: 'var(--accent-gold)', marginBottom: '0.75rem' }}>
          STUDY DUNGEON
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Turn your notes and lecture PDFs into an active-recall turn-based RPG.
          Every concept is a monster. Every correct answer is a hit.
        </p>
      </div>

      {/* Demo Shortcut Card */}
      <div 
        className="card" 
        style={{ 
          marginBottom: '1.5rem', 
          borderColor: 'rgba(251, 191, 36, 0.4)', 
          background: 'linear-gradient(180deg, rgba(251, 191, 36, 0.08) 0%, rgba(18, 24, 38, 0.9) 100%)',
          textAlign: 'center'
        }}
      >
        <div style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
          ⚡ Fast Evaluation / Demo Mode
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Hop straight into the pre-seeded Data Structures & Algorithms Cavern without creating an account or using AI tokens.
        </p>
        <button 
          onClick={handleDemoLogin} 
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%' }}
        >
          {loading ? 'Entering...' : '⚔️ Play Pre-Seeded Demo Dungeon'}
        </button>
      </div>

      <div className="card">
        {/* Tab Toggle */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'none',
              border: 'none',
              borderBottom: !isRegister ? '2px solid var(--accent-gold)' : '2px solid transparent',
              color: !isRegister ? 'var(--accent-gold)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'none',
              border: 'none',
              borderBottom: isRegister ? '2px solid var(--accent-gold)' : '2px solid transparent',
              color: isRegister ? 'var(--accent-gold)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Create Adventurer
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '0.75rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            fontFamily: 'var(--font-mono)',
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                Adventurer Name
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Sir Recalls-a-Lot"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)' }}>
              Email Address
            </label>
            <input
              type="email"
              required
              className="input-field"
              placeholder="student@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)' }}>
              Password
            </label>
            <input
              type="password"
              required
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-secondary"
            style={{ marginTop: '0.5rem', width: '100%', borderColor: 'var(--border-glow)' }}
          >
            {loading ? 'Opening gates...' : isRegister ? '⚔️ Begin Journey' : '🔑 Enter Dungeon'}
          </button>
        </form>
      </div>
    </div>
  );
}
