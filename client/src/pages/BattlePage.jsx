import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function BattlePage() {
  const { runId } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Combat State
  const [floorTitle, setFloorTitle] = useState('');
  const [playerHp, setPlayerHp] = useState(100);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [monster, setMonster] = useState(null);
  const [question, setQuestion] = useState(null);
  const [startTime, setStartTime] = useState(Date.now());

  // Answer Feedback Modal State
  const [feedback, setFeedback] = useState(null);

  const fetchNextEncounter = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    setError('');

    try {
      const res = await api(`/api/runs/${runId}/next`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load encounter');
      }

      if (data.finished || data.run_status === 'won' || data.run_status === 'lost') {
        navigate(`/run/${runId}/summary`);
        return;
      }

      setFloorTitle(data.floor_title || 'Catacomb Chamber');
      setPlayerHp(data.player_hp);
      setXp(data.xp);
      setStreak(data.streak);
      setMonster(data.monster);
      setQuestion(data.question);
      setStartTime(Date.now());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [runId, api, navigate]);

  useEffect(() => {
    fetchNextEncounter();
  }, [fetchNextEncounter]);

  async function handleAnswerSubmit(selectedOption) {
    if (submitting || feedback) return;
    setSubmitting(true);

    const timeElapsedMs = Date.now() - startTime;

    try {
      const res = await api(`/api/runs/${runId}/answer`, {
        method: 'POST',
        body: JSON.stringify({
          question_id: question.id,
          monster_id: monster.id,
          user_answer: selectedOption,
          time_ms: timeElapsedMs,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit answer');
      }

      // Update HP and XP from server response
      setPlayerHp(data.player_hp);
      setXp(data.xp);
      setStreak(data.streak);

      // Show feedback modal
      setFeedback(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Keyboard shortcuts (1, 2, 3, 4) for rapid response
  useEffect(() => {
    function handleKeyDown(e) {
      if (feedback) {
        if (e.key === 'Enter' || e.key === ' ') {
          if (feedback.run_status === 'won' || feedback.run_status === 'lost') {
            navigate(`/run/${runId}/summary`);
          } else {
            fetchNextEncounter();
          }
        }
        return;
      }

      if (question && question.options && !submitting) {
        const keyIndex = parseInt(e.key, 10) - 1;
        if (keyIndex >= 0 && keyIndex < question.options.length) {
          handleAnswerSubmit(question.options[keyIndex]);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [feedback, question, submitting, fetchNextEncounter, navigate, runId]);

  if (loading && !monster) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '5rem', fontFamily: 'var(--font-mono)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem', animation: 'pulse-low-hp 1s infinite' }}>⚔️</div>
        Summoning encounter...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ color: 'var(--accent-red)', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
          ⚠️ {error}
        </div>
        <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
          Return to Quest HQ
        </button>
      </div>
    );
  }

  const isPlayerHpCritical = playerHp <= 30;

  return (
    <div className="container" style={{ maxWidth: '780px' }}>
      {/* Floor & Streak Arena Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span className="pixel-title" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {floorTitle}
        </span>

        <div className="mono-text" style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem' }}>
          <span style={{ color: streak > 1 ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>
            🔥 Streak: {streak} {streak > 1 ? `(+${Math.min(streak * 5, 30)} XP)` : ''}
          </span>
          <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>
            ⭐ {xp} XP
          </span>
        </div>
      </div>

      {/* Monster Combat Card */}
      {monster && (
        <div 
          className="card" 
          style={{ 
            marginBottom: '1.5rem', 
            border: monster.is_boss ? '2px solid rgba(239, 68, 68, 0.6)' : '1px solid var(--border-color)',
            background: monster.is_boss 
              ? 'linear-gradient(180deg, rgba(239, 68, 68, 0.1) 0%, rgba(18, 24, 38, 0.95) 100%)' 
              : 'var(--bg-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ fontSize: monster.is_boss ? '2.5rem' : '2rem' }}>
                {monster.is_boss ? '🐲' : monster.difficulty === 1 ? '👾' : '👹'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {monster.concept_name}
                  </h2>
                  {monster.is_boss && <span className="badge badge-boss">BOSS TRIAL</span>}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Difficulty: {'★'.repeat(monster.difficulty)}{'☆'.repeat(3 - monster.difficulty)}
                </div>
              </div>
            </div>

            {/* Monster HP */}
            <div style={{ minWidth: '150px', textAlign: 'right' }}>
              <div className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--accent-red)', fontWeight: 700, marginBottom: '0.25rem' }}>
                MONSTER HITS: {monster.current_hp} / {monster.max_hp}
              </div>
              <div className="hp-track">
                <div 
                  className="hp-fill hp-fill-monster" 
                  style={{ width: `${(monster.current_hp / monster.max_hp) * 100}%` }} 
                />
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            {monster.summary}
          </p>
        </div>
      )}

      {/* Question Arena */}
      {question && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid var(--border-glow)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            🎯 ACTIVE RECALL TRIAL
          </div>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.5', marginBottom: '1.5rem' }}>
            {question.prompt}
          </h3>

          {/* Options Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
            {(question.options || []).map((opt, idx) => (
              <button
                key={idx}
                disabled={submitting || feedback !== null}
                onClick={() => handleAnswerSubmit(opt)}
                className="btn btn-secondary"
                style={{
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  padding: '0.85rem 1rem',
                  fontSize: '0.9rem',
                  lineHeight: '1.4',
                  whiteSpace: 'normal',
                  fontFamily: 'var(--font-mono)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <span style={{ color: 'var(--accent-gold)', fontWeight: 800, marginRight: '0.5rem' }}>
                  [{idx + 1}]
                </span>
                <span>{opt}</span>
              </button>
            ))}
          </div>

          <div style={{ marginTop: '0.85rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Tip: Press number keys [1 - 4] on your keyboard to strike
          </div>
        </div>
      )}

      {/* Player HUD Bar */}
      <div 
        className="card" 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: '1.5rem',
          padding: '1rem 1.25rem',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
            <span style={{ color: isPlayerHpCritical ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: 700 }}>
              ❤️ PLAYER HEALTH
            </span>
            <span style={{ color: isPlayerHpCritical ? 'var(--accent-red)' : 'var(--text-primary)', fontWeight: 700 }}>
              {playerHp} / 100 HP
            </span>
          </div>
          <div className="hp-track">
            <div 
              className={`hp-fill ${isPlayerHpCritical ? 'hp-fill-player-low' : 'hp-fill-player'}`}
              style={{ width: `${Math.max(0, playerHp)}%` }} 
            />
          </div>
        </div>

        <button 
          onClick={() => navigate('/dashboard')} 
          className="btn btn-secondary" 
          style={{ fontSize: '0.75rem', padding: '0.45rem 0.8rem' }}
        >
          Retreat
        </button>
      </div>

      {/* Answer Feedback Overlay Modal */}
      {feedback && (
        <div className="modal-overlay">
          <div 
            className="modal-content" 
            style={{ 
              borderColor: feedback.is_correct ? 'var(--accent-green)' : 'var(--accent-red)',
              boxShadow: feedback.is_correct 
                ? '0 0 40px rgba(16, 185, 129, 0.25)' 
                : '0 0 40px rgba(239, 68, 68, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2rem' }}>
                {feedback.is_correct ? '⚔️💥' : '🛡️💔'}
              </div>
              <div>
                <h3 className="pixel-title" style={{ fontSize: '1rem', color: feedback.is_correct ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {feedback.is_correct ? 'CRITICAL HIT!' : 'DAMAGE SUSTAINED!'}
                </h3>
                <div className="mono-text" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {feedback.is_correct
                    ? `Monster takes 1 hit! +${feedback.xp_earned} XP`
                    : `You lose 20 HP! Streak reset.`}
                </div>
              </div>
            </div>

            {/* Answer & Explanation Details */}
            <div style={{ backgroundColor: '#0b0f19', borderRadius: '6px', padding: '1rem', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
              {!feedback.is_correct && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'block' }}>
                    Correct Answer:
                  </span>
                  <strong style={{ color: 'var(--accent-gold)', fontSize: '0.95rem' }}>
                    {feedback.correct_answer}
                  </strong>
                </div>
              )}

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'block' }}>
                  Knowledge Rationale:
                </span>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', marginTop: '0.2rem' }}>
                  {feedback.explanation}
                </p>
              </div>

              {!feedback.is_correct && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)' }}>
                  🔄 This concept will re-appear later to reinforce your recall.
                </div>
              )}
            </div>

            {/* Modal Continue Action */}
            <button
              autoFocus
              onClick={() => {
                if (feedback.run_status === 'won' || feedback.run_status === 'lost') {
                  navigate(`/run/${runId}/summary`);
                } else {
                  fetchNextEncounter();
                }
              }}
              className={`btn ${feedback.is_correct ? 'btn-success' : 'btn-danger'}`}
              style={{ width: '100%', padding: '0.85rem' }}
            >
              {feedback.run_status === 'won'
                ? '🏆 View Victory Chronicle [Enter]'
                : feedback.run_status === 'lost'
                ? '💀 View Defeat Analytics [Enter]'
                : feedback.monster_defeated
                ? '🎉 Monster Vanquished! Advance [Enter]'
                : 'Next Strike [Enter]'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
