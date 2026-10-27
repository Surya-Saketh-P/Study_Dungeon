import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { api, user } = useAuth();
  const [dungeons, setDungeons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function fetchDungeons() {
    try {
      const res = await api('/api/dungeons');
      const data = await res.json();
      if (res.ok) {
        setDungeons(data.dungeons || []);
      } else {
        setError(data.error || 'Failed to load dungeons');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDungeons();

    // Auto poll every 4 seconds if any dungeon is in 'processing' status
    const interval = setInterval(() => {
      setDungeons((prev) => {
        const hasProcessing = prev.some((d) => d.status === 'processing');
        if (hasProcessing) {
          fetchDungeons();
        }
        return prev;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  async function handleStartRun(dungeonId) {
    try {
      const res = await api(`/api/dungeons/${dungeonId}/runs`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        navigate(`/run/${data.run_id}`);
      } else {
        alert(data.error || 'Failed to start run');
      }
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteDungeon(dungeonId, title) {
    if (!window.confirm(`Are you sure you want to delete quest "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await api(`/api/dungeons/${dungeonId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setDungeons((prev) => prev.filter((d) => d.id !== dungeonId));
      } else {
        alert(data.error || 'Failed to delete dungeon');
      }
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="container">
      {/* Dashboard Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="pixel-title" style={{ fontSize: '1.4rem', color: 'var(--accent-gold)', marginBottom: '0.4rem' }}>
            QUEST HEADQUARTERS
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Choose a knowledge realm to conquer or forge a new dungeon from your course notes.
          </p>
        </div>

        <Link to="/create" className="btn btn-primary">
          ⚔️ Forge New Dungeon
        </Link>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#f87171',
          padding: '1rem',
          borderRadius: '6px',
          marginBottom: '1.5rem',
        }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          🔍 Scanning dungeon catacombs...
        </div>
      ) : dungeons.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📜</div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            No Dungeons Discovered Yet
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem' }}>
            Turn your study slides, book chapters, or notes into your first playable RPG dungeon crawl.
          </p>
          <Link to="/create" className="btn btn-primary">
            + Forge Your First Dungeon
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {dungeons.map((dungeon) => {
            const isReady = dungeon.status === 'ready';
            const isProcessing = dungeon.status === 'processing';
            const isFailed = dungeon.status === 'failed';

            return (
              <div 
                key={dungeon.id} 
                className="card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  borderTop: isReady ? '3px solid var(--accent-gold)' : isProcessing ? '3px solid var(--accent-purple)' : '3px solid var(--accent-red)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {dungeon.title}
                    </h3>
                    <span className={`badge ${isReady ? 'badge-slain' : isProcessing ? 'badge-wounded' : 'badge-boss'}`}>
                      {isReady ? 'READY' : isProcessing ? 'GENERATING' : 'FAILED'}
                    </span>
                  </div>

                  <div className="mono-text" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem', display: 'flex', gap: '1rem' }}>
                    <span>🏰 {dungeon.floor_count || 1} Floors</span>
                    <span>👾 {dungeon.monster_count || 3} Concepts</span>
                  </div>

                  {isFailed && (
                    <div style={{ fontSize: '0.8rem', color: '#f87171', marginBottom: '1rem' }}>
                      {dungeon.error_message || 'AI extraction failed'}
                    </div>
                  )}

                  {isProcessing && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-purple)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ display: 'inline-block', animation: 'pulse-low-hp 1s infinite' }}>⏳</span>
                      Extracting concepts & building floors...
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
                  {isReady && (
                    <>
                      <Link 
                        to={`/dungeon/${dungeon.id}`} 
                        className="btn btn-secondary" 
                        style={{ flex: 1, padding: '0.6rem 0.8rem', fontSize: '0.8rem' }}
                      >
                        🗺️ Map
                      </Link>
                      <button 
                        onClick={() => handleStartRun(dungeon.id)} 
                        className="btn btn-primary" 
                        style={{ flex: 1, padding: '0.6rem 0.8rem', fontSize: '0.8rem' }}
                      >
                        ⚔️ Enter
                      </button>
                    </>
                  )}
                  {isProcessing && (
                    <button disabled className="btn btn-secondary" style={{ flex: 1, opacity: 0.6, fontSize: '0.8rem' }}>
                      Summoning...
                    </button>
                  )}
                  {isFailed && (
                    <button 
                      onClick={() => handleDeleteDungeon(dungeon.id, dungeon.title)} 
                      className="btn btn-danger" 
                      style={{ flex: 1, padding: '0.6rem 0.8rem', fontSize: '0.8rem' }}
                    >
                      🗑️ Remove Failed Quest
                    </button>
                  )}
                  {dungeon.user_id !== '0' && dungeon.user_id !== 0 && !isFailed && (
                    <button
                      title="Delete quest"
                      onClick={() => handleDeleteDungeon(dungeon.id, dungeon.title)}
                      className="btn btn-secondary"
                      style={{ padding: '0.6rem', fontSize: '0.8rem', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
