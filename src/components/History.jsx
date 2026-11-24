import { useState } from 'react';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Heute';
  if (dateStr === yesterday) return 'Gestern';
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
      setDays(await loadHistory(githubToken));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Lade Verlauf…</p>
      </div>
    );
  }

  if (!days) {
    return (
      <div className="page">
        {error && <div className="error">⚠️ {error}</div>}
        <div className="log-empty">
          <div className="log-empty-icon">📅</div>
          <p style={{ marginBottom: 20 }}>Verlauf aus GitHub laden</p>
          <button className="btn-primary" onClick={load}>Verlauf laden</button>
        </div>
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="page">
        <div className="log-empty">
          <div className="log-empty-icon">📭</div>
          <p>Noch keine Einträge gespeichert.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="section-label">{days.length} Tage gespeichert</div>
        <button className="refresh-btn" onClick={load}>↻ Aktualisieren</button>
      </div>

      {error && <div className="error">⚠️ {error}</div>}

      {days.map(day => {
        const isOver = day.total > goal;
        const pct = Math.min((day.total / goal) * 100, 100);
        const isOpen = expanded === day.date;
        return (
          <div key={day.date} className="history-item" onClick={() => setExpanded(isOpen ? null : day.date)}>
            <div className="history-top">
              <div className="history-icon">📅</div>
              <div className="history-info">
                <div className="history-date">{formatDate(day.date)}</div>
                <div className="history-meals">{day.entries.length} Mahlzeit{day.entries.length !== 1 ? 'en' : ''}</div>
              </div>
              <div>
                <div className={`history-kcal ${isOver ? 'over' : 'ok'}`}>{day.total} kcal</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', textAlign: 'right', marginTop: 2 }}>
                  {isOpen ? '▲' : '▼'}
                </div>
              </div>
            </div>

            <div className="history-track">
              <div className={`history-fill ${isOver ? 'over' : 'ok'}`} style={{ width: `${pct}%` }} />
            </div>

            {isOpen && (
              <div className="history-entries">
                {day.entries.map((e, i) => (
                  <div key={i} className="history-entry-row">
                    <span>
                      <span className="history-entry-time">{e.time}</span>
                      <span className="history-entry-name">{e.name}</span>
                    </span>
                    <span className="history-entry-kcal">{e.calories} kcal</span>
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
