import { useState, useCallback } from 'react';
import AddFood from './components/AddFood';
import FoodLog from './components/FoodLog';
import History from './components/History';
import Settings from './components/Settings';
import './index.css';

const STORAGE_KEY = 'calorie-tracker-data';
const todayKey = () => new Date().toISOString().slice(0, 10);

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function saveData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

function WeekStrip() {
  const today = new Date();
  const days = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i);
    return { name: days[d.getDay()], num: d.getDate(), isToday: d.toDateString() === today.toDateString() };
  });
  return (
    <div className="week-strip">
      {week.map((d, i) => (
        <div key={i} className={`week-day ${d.isToday ? 'active' : ''}`}>
          <span className="week-day-name">{d.name}</span>
          <span className="week-day-num">{d.num}</span>
        </div>
      ))}
    </div>
  );
}

function Gauge({ value, goal }) {
  const pct = Math.min(value / goal, 1);
  const remaining = Math.max(goal - value, 0);
  const isOver = value > goal;

  // Arc params
  const cx = 110, cy = 110, r = 85;
  const startAngle = -210;
  const sweepTotal = 240;

  function polarToXY(angle, radius) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  // Build segmented arc
  const segments = 20;
  const gap = 4;
  const segAngle = (sweepTotal / segments);
  const filled = Math.round(pct * segments);

  const paths = Array.from({ length: segments }, (_, i) => {
    const a1 = startAngle + i * segAngle + gap / 2;
    const a2 = startAngle + (i + 1) * segAngle - gap / 2;
    const p1o = polarToXY(a1, r);
    const p2o = polarToXY(a2, r);
    const p1i = polarToXY(a1, r - 14);
    const p2i = polarToXY(a2, r - 14);
    const large = a2 - a1 > 180 ? 1 : 0;
    const fill = i < filled ? (isOver ? '#ef4444' : '#16a34a') : '#e9f0eb';
    return (
      <path key={i}
        d={`M${p1i.x},${p1i.y} A${r-14},${r-14} 0 ${large} 1 ${p2i.x},${p2i.y} L${p2o.x},${p2o.y} A${r},${r} 0 ${large} 0 ${p1o.x},${p1o.y} Z`}
        fill={fill}
        style={{ transition: 'fill 0.3s ease' }}
      />
    );
  });

  return (
    <div className="gauge-wrap">
      <svg className="gauge-svg" width="220" height="130" viewBox="0 0 220 130">
        {paths}
      </svg>
      <div className="gauge-center">
        <span className="gauge-flame">🔥</span>
        <div className={`gauge-number ${isOver ? 'over' : ''}`}>{isOver ? value : remaining}</div>
        <div className="gauge-label">{isOver ? 'kcal über Ziel' : 'Verbleibend'}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('home');
  const [entries, setEntries]           = useState(() => loadData().entries?.[todayKey()] || []);
  const [apiKey, setApiKey]             = useState(() => loadData().apiKey || '');
  const [githubToken, setGithubToken]   = useState(() => loadData().githubToken || '');
  const [goal, setGoal]                 = useState(() => loadData().goal || 2000);
  const [editingGoal, setEditingGoal]   = useState(false);
  const [goalDraft, setGoalDraft]       = useState('');
  const [syncStatus, setSyncStatus]     = useState(null);

  const commitGoal = useCallback(() => {
    const val = parseInt(goalDraft, 10);
    if (val >= 100 && val <= 9999) {
      setGoal(val);
      const d = loadData();
      d.goal = val;
      saveData(d);
    }
    setEditingGoal(false);
  }, [goalDraft]);

  const totalCalories = entries.reduce((s, e) => s + e.calories, 0);

  const addEntry = useCallback(async (entry) => {
    const full = { ...entry, date: todayKey() };
    setEntries(prev => {
      const next = [...prev, full];
      const d = loadData();
      d.entries = { ...(d.entries || {}), [todayKey()]: next };
      saveData(d);
      return next;
    });
    setTab('home');
    if (githubToken) {
      setSyncStatus({ msg: 'Speichere…', type: 'ok' });
      try {
        const { appendEntry } = await import('./github.js');
        await appendEntry(githubToken, full);
        setSyncStatus({ msg: '✓ In GitHub gespeichert', type: 'ok' });
        setTimeout(() => setSyncStatus(null), 3000);
      } catch (e) {
        setSyncStatus({ msg: '⚠️ Sync fehlgeschlagen', type: 'err' });
        setTimeout(() => setSyncStatus(null), 5000);
      }
    }
  }, [githubToken]);

  const deleteEntry = useCallback(async (id) => {
    let deleted;
    setEntries(prev => {
      deleted = prev.find(e => e.id === id);
      const next = prev.filter(e => e.id !== id);
      const d = loadData();
      d.entries = { ...(d.entries || {}), [todayKey()]: next };
      saveData(d);
      return next;
    });
    if (githubToken && deleted) {
      try {
        const { deleteEntry: ghDelete } = await import('./github.js');
        await ghDelete(githubToken, deleted);
      } catch {}
    }
  }, [githubToken]);

  const handleSaveSettings = useCallback((key, kcalGoal, ghToken) => {
    setApiKey(key); setGoal(kcalGoal); setGithubToken(ghToken);
    const d = loadData();
    Object.assign(d, { apiKey: key, goal: kcalGoal, githubToken: ghToken });
    saveData(d);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Guten Morgen!' : hour < 18 ? 'Guten Tag!' : 'Guten Abend!';

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-top">
          <div>
            <div className="header-greeting">{greeting}</div>
            <div className="header-name">Kalorienbash</div>
          </div>
          <div className="header-actions">
            <button className="header-action-btn" onClick={() => setTab('history')} title="Verlauf">📅</button>
            <button className="header-action-btn" onClick={() => setTab('settings')} title="Einstellungen">⚙️</button>
          </div>
        </div>
        <WeekStrip />
      </header>

      {/* Page content */}
      {tab === 'home' && (
        <div className="page">
          {/* Gauge card */}
          <div className="gauge-card">
            <div className="gauge-header">
              <span className="gauge-title">Kalorien</span>
              {editingGoal ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    autoFocus
                    type="number"
                    min="100" max="9999"
                    value={goalDraft}
                    onChange={e => setGoalDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commitGoal(); if (e.key === 'Escape') setEditingGoal(false); }}
                    style={{ width: 80, padding: '4px 8px', border: '1.5px solid var(--brand)', borderRadius: 8, fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', textAlign: 'center' }}
                  />
                  <button className="gauge-edit-btn" onClick={commitGoal} style={{ background: 'var(--brand-dark)', color: 'white', border: 'none' }}>✓</button>
                </div>
              ) : (
                <button className="gauge-edit-btn" onClick={() => { setGoalDraft(String(goal)); setEditingGoal(true); }}>
                  Ziel: {goal} kcal
                </button>
              )}
            </div>
            <Gauge value={totalCalories} goal={goal} />
            <div className="macro-row">
              <div className="macro-item">
                <span className="macro-icon">☕</span>
                <div className="macro-val">{totalCalories}</div>
                <div className="macro-name">Gegessen</div>
              </div>
              <div className="macro-item">
                <span className="macro-icon">🎯</span>
                <div className="macro-val">{goal}</div>
                <div className="macro-name">Ziel</div>
              </div>
              <div className="macro-item">
                <span className="macro-icon">📊</span>
                <div className="macro-val">{entries.length}</div>
                <div className="macro-name">Mahlzeiten</div>
              </div>
            </div>
            {syncStatus && <div className={`sync-pill ${syncStatus.type}`}>{syncStatus.msg}</div>}
          </div>

          {/* Meal list */}
          <div className="section-row">
            <span className="section-title">Heute</span>
          </div>
          {entries.length === 0 ? (
            <div className="log-empty">
              <div className="log-empty-icon">🍽️</div>
              <p>Noch keine Mahlzeiten.<br/>Tippe + um eine hinzuzufügen.</p>
            </div>
          ) : (
            entries.map(entry => (
              <div key={entry.id} className="meal-card">
                {entry.image
                  ? <img className="meal-thumb" src={entry.image} alt={entry.name} />
                  : <div className="meal-icon-placeholder">🍴</div>
                }
                <div className="meal-info">
                  <div className="meal-name">{entry.name}</div>
                  <div className="meal-kcal">🔥 {entry.calories} Kalorien</div>
                  {entry.note && <div className="meal-tags"><span className="meal-tag">{entry.note}</span></div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span className="meal-time">{entry.time}</span>
                  <button className="meal-delete" onClick={() => deleteEntry(entry.id)}>🗑</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'add'      && <AddFood apiKey={apiKey} onAdd={addEntry} />}
      {tab === 'history'  && <History githubToken={githubToken} goal={goal} />}
      {tab === 'settings' && <Settings apiKey={apiKey} githubToken={githubToken} goal={goal} onSave={handleSaveSettings} />}

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <button className={`nav-pill-add ${tab === 'add' ? 'active' : ''}`} onClick={() => setTab('add')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Hinzufügen
        </button>
        <button className={`nav-pill-item ${tab === 'home' ? 'active' : ''}`} onClick={() => setTab('home')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1H4a1 1 0 01-1-1z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Heute
        </button>
        <button className={`nav-pill-item ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Verlauf
        </button>
        <button className={`nav-pill-item ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          Einstellungen
        </button>
      </nav>
    </div>
  );
}
