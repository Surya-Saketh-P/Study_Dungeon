import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SummaryPage() {
  const { runId } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startingRevenge, setStartingRevenge] = useState(false);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await api(`/api/runs/${runId}/summary`);
        const data = await res.json();
        if (res.ok) {
          setSummary(data);
        } else {
          setError(data.error || 'Failed to load summary');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, [runId, api]);

  async function handleRevengeRun() {
    setStartingRevenge(true);
    try {
      // Find the dungeon id from the run
      const runRes = await api(`/api/runs/${runId}/next`);
      // Or start run on same dungeon
      const dungsRes = await api('/api/dungeons');
      const dungsData = await dungsRes.json();
      const firstDungeonId = dungsData.dungeons?.[0]?.id;

      if (!firstDungeonId) {
        navigate('/dashboard');
        return;
      }

      const res = await api(`/api/dungeons/${firstDungeonId}/runs`, {
        method: 'POST',
        body: JSON.stringify({ mode: 'revenge' }),
      });
      const data = await res.json();
      if (res.ok) {
        navigate(`/run/${data.run_id}`);
      } else {
        alert(data.error || 'Failed to start revenge run');
        setStartingRevenge(false);
      }
    } catch (err) {
      alert(err.message);
      setStartingRevenge(false);
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem', fontFamily: 'var(--font-mono)' }}>
        📊 Compiling battle analytics...
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ color: 'var(--accent-red)', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
          ⚠️ {error || 'Summary not found'}
        </div>
        <Link to="/dashboard" className="btn btn-secondary">
          Return to Quest HQ
        </Link>
      </div>
    );
  }

  const isVictory = summary.status === 'won';
  const missedSpots = (summary.weak_spots || []).filter((w) => w.misses > 0);

  return (
    <div className="container" style={{ maxWidth: '720px' }}>
      {/* Victory / Defeat Header Card */}
      <div 
        className="card" 
        style={{ 
          textAlign: 'center', 
          padding: '2.5rem 1.5rem', 
          marginBottom: '2rem',
          borderTop: isVictory ? '4px solid var(--accent-green)' : '4px solid var(--accent-red)',
          background: isVictory 
            ? 'linear-gradient(180deg, rgba(16, 185, 129, 0.1) 0%, rgba(18, 24, 38, 0.95) 100%)' 
            : 'linear-gradient(180deg, rgba(239, 68, 68, 0.12) 0%, rgba(18, 24, 38, 0.95) 100%)',
        }}
      >
        <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>
          {isVictory ? '🏆' : '💀'}
        </div>

        <h1 className="pixel-title" style={{ fontSize: '1.4rem', color: isVictory ? 'var(--accent-green)' : 'var(--accent-red)', marginBottom: '0.5rem' }}>
          {isVictory ? 'DUNGEON CONQUERED!' : 'EXPEDITION TERMINATED'}
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto' }}>
          {isVictory
            ? 'You mastered the curriculum concepts and routed the floor overlords! All concepts retained.'
            : 'Your player HP depleted. Review your weak spots below to target the concepts that caught you off guard.'}
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '1.25rem 0.75rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '0.25rem' }}>
            ACCURACY
          </div>
          <div className="pixel-title" style={{ fontSize: '1.3rem', color: summary.accuracy >= 70 ? 'var(--accent-green)' : 'var(--accent-gold)' }}>
            {summary.accuracy}%
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {summary.correct_answers} / {summary.total_questions_answered} hits
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '1.25rem 0.75rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '0.25rem' }}>
            TOTAL XP
          </div>
          <div className="pixel-title" style={{ fontSize: '1.3rem', color: 'var(--accent-gold)' }}>
            +{summary.xp}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Experience Earned
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '1.25rem 0.75rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '0.25rem' }}>
            EXPEDITION TIME
          </div>
          <div className="pixel-title" style={{ fontSize: '1.3rem', color: 'var(--accent-cyan)' }}>
            {summary.duration_seconds}s
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Time Elapsed
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '1.25rem 0.75rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '0.25rem' }}>
            FINAL HP
          </div>
          <div className="pixel-title" style={{ fontSize: '1.3rem', color: summary.player_hp > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {summary.player_hp}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Remaining Health
          </div>
        </div>
      </div>

      {/* Weak Spots & Revision Analytics */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="pixel-title" style={{ fontSize: '0.95rem', color: 'var(--accent-gold)' }}>
            🎯 WEAK-SPOT REVISION REPORT
          </h2>
          <span className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Ranked by priority
          </span>
        </div>

        {missedSpots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--accent-green)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
            ✨ Flawless recall! Zero concepts missed in this expedition.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {missedSpots.map((spot, idx) => (
              <div 
                key={idx}
                style={{
                  backgroundColor: '#0b0f19',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '6px',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--accent-red)', fontWeight: 800 }}>#{idx + 1}</span>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{spot.concept_name}</strong>
                  </div>
                  <div className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Avg Response Time: {(spot.avg_time_ms / 1000).toFixed(1)}s
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="badge badge-wounded" style={{ marginBottom: '0.25rem' }}>
                    {spot.misses} {spot.misses === 1 ? 'Miss' : 'Misses'}
                  </div>
                  <div className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {spot.accuracy}% Accuracy
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {missedSpots.length > 0 && (
          <button 
            onClick={handleRevengeRun} 
            disabled={startingRevenge}
            className="btn btn-danger" 
            style={{ flex: 1, padding: '0.85rem' }}
          >
            {startingRevenge ? 'Preparing...' : `💀 Launch Revenge Run (${missedSpots.length} Concepts)`}
          </button>
        )}

        <Link 
          to="/dashboard" 
          className="btn btn-secondary" 
          style={{ flex: 1, padding: '0.85rem', textAlign: 'center' }}
        >
          🗺️ Return to Quest HQ
        </Link>
      </div>
    </div>
  );
}
