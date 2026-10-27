import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function CreateDungeonPage() {
  const [mode, setMode] = useState('text'); // 'text' | 'pdf'
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Generation polling state
  const [generatingDungeonId, setGeneratingDungeonId] = useState(null);
  const [generationStep, setGenerationStep] = useState(1); // 1 = extracting, 2 = summoning, 3 = building

  const { api } = useAuth();
  const navigate = useNavigate();

  // Progress stepper timer simulation while polling
  useEffect(() => {
    if (!generatingDungeonId) return;

    const stepInterval = setInterval(() => {
      setGenerationStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 4500);

    const pollInterval = setInterval(async () => {
      try {
        const res = await api(`/api/dungeons/${generatingDungeonId}/status`);
        const data = await res.json();

        if (data.status === 'ready') {
          clearInterval(pollInterval);
          clearInterval(stepInterval);
          navigate(`/dungeon/${generatingDungeonId}`);
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          clearInterval(stepInterval);
          setSubmitting(false);
          setGeneratingDungeonId(null);
          setError(data.error_message || 'Dungeon generation failed. Ensure notes contain readable text.');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);

    return () => {
      clearInterval(stepInterval);
      clearInterval(pollInterval);
    };
  }, [generatingDungeonId, navigate, api]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (mode === 'text' && (!text || text.trim().length < 50)) {
      setError('Please provide at least 50 characters of study notes to summon monsters.');
      return;
    }

    if (mode === 'pdf' && !file) {
      setError('Please select a text-based PDF file (max 10 MB).');
      return;
    }

    setSubmitting(true);
    setGenerationStep(1);

    try {
      let res;
      if (mode === 'pdf') {
        const formData = new FormData();
        formData.append('title', title || file.name.replace(/\.[^/.]+$/, ''));
        formData.append('file', file);
        res = await api('/api/dungeons', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await api('/api/dungeons', {
          method: 'POST',
          body: JSON.stringify({
            title: title || 'Pasted Notes Dungeon',
            text,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate dungeon creation');
      }

      setGeneratingDungeonId(data.id);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: '680px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="pixel-title" style={{ fontSize: '1.4rem', color: 'var(--accent-gold)', marginBottom: '0.4rem' }}>
          FORGE NEW DUNGEON
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Convert your study materials into a playable RPG dungeon. Each key concept becomes a monster you must defeat through active recall.
        </p>
      </div>

      {submitting ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1.25rem', animation: 'pulse-low-hp 1.5s infinite' }}>
            ⚡ 🏰 👾
          </div>
          <h2 className="pixel-title" style={{ fontSize: '1.1rem', color: 'var(--accent-gold)', marginBottom: '1rem' }}>
            SUMMONING DUNGEON...
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem', fontFamily: 'var(--font-mono)' }}>
            This usually takes under 30 seconds.
          </p>

          {/* Stepper Display */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '420px', margin: '0 auto', textAlign: 'left' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: generationStep >= 1 ? 'var(--accent-green)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9rem',
            }}>
              <span>{generationStep > 1 ? '✅' : '⏳'}</span>
              <span>1. Extracting text & curriculum knowledge</span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: generationStep >= 2 ? 'var(--accent-green)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9rem',
            }}>
              <span>{generationStep > 2 ? '✅' : generationStep === 2 ? '⏳' : '⚪'}</span>
              <span>2. Summoning concept monsters & MCQs</span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: generationStep >= 3 ? 'var(--accent-green)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9rem',
            }}>
              <span>{generationStep >= 3 ? '⏳' : '⚪'}</span>
              <span>3. Forging dungeon floors & boss trials</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              padding: '0.85rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              marginBottom: '1.5rem',
              fontFamily: 'var(--font-mono)',
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                Dungeon Title
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Operating Systems: Concurrency & Semaphores"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Input Mode Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                Study Material Source
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setMode('text')}
                  style={{
                    flex: 1,
                    padding: '0.7rem',
                    background: mode === 'text' ? 'var(--bg-card-hover)' : 'var(--bg-primary)',
                    border: mode === 'text' ? '2px solid var(--accent-gold)' : '1px solid var(--border-color)',
                    color: mode === 'text' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                  }}
                >
                  📝 Paste Notes
                </button>
                <button
                  type="button"
                  onClick={() => setMode('pdf')}
                  style={{
                    flex: 1,
                    padding: '0.7rem',
                    background: mode === 'pdf' ? 'var(--bg-card-hover)' : 'var(--bg-primary)',
                    border: mode === 'pdf' ? '2px solid var(--accent-gold)' : '1px solid var(--border-color)',
                    color: mode === 'pdf' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                  }}
                >
                  📄 Upload PDF
                </button>
              </div>

              {mode === 'text' ? (
                <div>
                  <textarea
                    rows={9}
                    className="input-field"
                    style={{ resize: 'vertical' }}
                    placeholder="Paste lecture notes, summary points, or textbook excerpts here (minimum 50 characters)..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                    {text.length} characters
                  </div>
                </div>
              ) : (
                <div style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: '8px',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  backgroundColor: '#0b0f19',
                }}>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    id="pdf-upload"
                    style={{ display: 'none' }}
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                  <label htmlFor="pdf-upload" style={{ cursor: 'pointer' }}>
                    <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>📄</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      {file ? file.name : 'Choose a lecture PDF file'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Text-based PDF up to 10 MB (~30 pages)
                    </div>
                  </label>
                  {file && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>
                      Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: '0.5rem', padding: '0.9rem' }}
            >
              ⚡ Summon Dungeon & Begin Trial
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
