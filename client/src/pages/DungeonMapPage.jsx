import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DungeonMapPage() {
  const { id } = useParams();
  const { api } = useAuth();
  const [dungeon, setDungeon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startingRun, setStartingRun] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchDungeon() {
      try {
        const res = await api(`/api/dungeons/${id}`);
        const data = await res.json();
        if (res.ok) {
          setDungeon(data.dungeon);
        } else {
          setError(data.error || 'Failed to load dungeon');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDungeon();
  }, [id, api]);

  async function handleStartRun(mode = 'normal') {
    setStartingRun(true);
    try {
      const res = await api(`/api/dungeons/${id}/runs`, {
        method: 'POST',
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (res.ok) {
        navigate(`/run/${data.run_id}`);
      } else {
        alert(data.error || 'Failed to start run');
        setStartingRun(false);
      }
    } catch (err) {
      alert(err.message);
      setStartingRun(false);
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        🗺️ Unfurling dungeon map scrolls...
      </div>
    );
  }

  if (error || !dungeon) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ color: 'var(--accent-red)', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
          ⚠️ {error || 'Dungeon not found'}
        </div>
        <Link to="/dashboard" className="btn btn-secondary">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  // Count wounded monsters to see if Revenge Run should be highlighted
  let totalWounded = 0;
  (dungeon.floors || []).forEach((f) => {
    (f.monsters || []).forEach((m) => {
      if (m.mastery_state === 'wounded') totalWounded++;
    });
  });

  return (
    <div className="container" style={{ maxWidth: '820px' }}>
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <Link to="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
          ← Quest Headquarters
        </Link>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {totalWounded > 0 && (
            <button
              onClick={() => handleStartRun('revenge')}
              disabled={startingRun}
              className="btn btn-danger"
              style={{ fontSize: '0.8rem', padding: '0.6rem 1rem' }}
            >
              💀 Revenge Run ({totalWounded})
            </button>
          )}

          <button
            onClick={() => handleStartRun('normal')}
            disabled={startingRun}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem', padding: '0.6rem 1.25rem' }}
          >
            {startingRun ? 'Entering...' : '⚔️ Start Expedition'}
          </button>
        </div>
      </div>

      {/* Dungeon Banner */}
      <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--accent-gold)' }}>
        <h1 className="pixel-title" style={{ fontSize: '1.25rem', color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>
          {dungeon.title}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Master each concept by dealing damage with correct answers. Slain monsters require 2 consecutive correct hits.
        </p>
      </div>

      {/* Vertical Dungeon Floors */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {(dungeon.floors || []).map((floor) => {
          const regularMonsters = (floor.monsters || []).filter((m) => !m.is_boss);
          const boss = (floor.monsters || []).find((m) => m.is_boss);
          const allRegularSlain = regularMonsters.every((m) => m.mastery_state === 'slain');

          return (
            <div key={floor.id} className="card" style={{ padding: '1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '0.75rem',
                marginBottom: '1rem',
              }}>
                <h2 className="pixel-title" style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {floor.title}
                </h2>
                <span className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Floor #{floor.order_index}
                </span>
              </div>

              {/* Monster Tiles Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                {regularMonsters.map((monster) => {
                  const isSlain = monster.mastery_state === 'slain';
                  const isWounded = monster.mastery_state === 'wounded';

                  return (
                    <div
                      key={monster.id}
                      style={{
                        backgroundColor: '#0b0f19',
                        border: `1px solid ${isSlain ? 'rgba(16, 185, 129, 0.4)' : isWounded ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-color)'}`,
                        borderRadius: '6px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '1.2rem' }}>
                            {monster.difficulty === 1 ? '👾' : monster.difficulty === 2 ? '👹' : '🐲'}
                          </span>
                          <span className={`badge ${isSlain ? 'badge-slain' : isWounded ? 'badge-wounded' : 'badge-untouched'}`}>
                            {monster.mastery_state.toUpperCase()}
                          </span>
                        </div>

                        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                          {monster.concept_name}
                        </h3>

                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '0.75rem' }}>
                          {monster.summary}
                        </p>
                      </div>

                      <div className="mono-text" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Diff: {'★'.repeat(monster.difficulty)}{'☆'.repeat(3 - monster.difficulty)}</span>
                        <span>Streak: {monster.mastery_streak}🔥</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Floor Boss Chamber */}
              {boss && (
                <div style={{
                  backgroundColor: allRegularSlain ? 'rgba(239, 68, 68, 0.08)' : '#070a10',
                  border: `2px dashed ${allRegularSlain ? 'rgba(239, 68, 68, 0.5)' : '#334155'}`,
                  borderRadius: '8px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ fontSize: '1.8rem' }}>{allRegularSlain ? '🔥' : '🔒'}</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="pixel-title" style={{ fontSize: '0.8rem', color: allRegularSlain ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                          {boss.concept_name}
                        </span>
                        <span className="badge badge-boss">BOSS GATE</span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {allRegularSlain
                          ? 'Boss gate unlocked! 5 mixed trial questions with 2 mistakes allowed.'
                          : 'Gate locked. Defeat all floor concepts to challenge the guardian.'}
                      </p>
                    </div>
                  </div>

                  <span className={`badge ${boss.mastery_state === 'slain' ? 'badge-slain' : 'badge-untouched'}`}>
                    {boss.mastery_state.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
