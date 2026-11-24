import { useState } from 'react';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function History({ githubToken, goal }) {
  const [days, setDays] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    if (!githubToken) { setError('Bitte GitHub Token in den Einstellungen eintragen.'); return; }
    setLoading(true);
    setError('');
    try {
      const { loadHistory } = await import('../github.js');
      const data = await loadHistory(githubToken);
      setDays(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!days && !loading) {
    return (
      <div className="log-section">
        {error && <div className="error">⚠️ {error}</div>}
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>📅</div>
          <p style={{ color: 'var(--gray-500)', marginBottom: 16 }}>Verlauf aus GitHub laden</p>
          <button className="analyze-btn" style={{ width: '100%' }} onClick={load}>
            Verlauf laden
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading" style={{ padding: 40 }}>
        <div className="spinner" />
        <p style={{ marginTop: 8 }}>Lade Verlauf...</p>
      </div>
    );
  }

  if (days && days.length === 0) {
    return (
      <div className="log-section">
        <div className="log-empty">
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>📭</div>
          <p>Noch keine Einträge gespeichert.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="log-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div className="log-date">Verlauf ({days.length} Tage)</div>
        <button onClick={load} style={{ background: 'none', border: 'none', color: 'var(--green)', fontSize: '0.85rem', cursor: 'pointer' }}>
          ↻ Aktualisieren
        </button>
      </div>

      {error && <div className="error">⚠️ {error}</div>}

      {days.map(day => {
        const isOver = day.total > goal;
        const pct = Math.min((day.total / goal) * 100, 100);
        const isOpen = expanded === day.date;
        return (
          <div key={day.date} className="log-item" style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'pointer', gap: 8 }}
            onClick={() => setExpanded(isOpen ? null : day.date)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="log-item-icon" style={{ fontSize: '1.2rem' }}>📅</div>
              <div className="log-item-info">
                <div className="log-item-name">{formatDate(day.date)}</div>
                <div className="log-item-time">{day.entries.length} Mahlzeit{day.entries.length !== 1 ? 'en' : ''}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="log-item-kcal" style={isOver ? { color: 'var(--red)' } : {}}>{day.total} kcal</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{isOpen ? '▲' : '▼'}</div>
              </div>
            </div>

            <div className="progress-bar">
              <div className={`progress-fill ${isOver ? 'over' : ''}`} style={{ width: `${pct}%` }} />
            </div>

            {isOpen && (
              <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {day.entries.map((e, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--gray-700)' }}>
                      <span style={{ color: 'var(--gray-500)', marginRight: 6 }}>{e.time}</span>
                      {e.name}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--green-dark)' }}>{e.calories} kcal</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
