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
  const [syncStatus, setSyncStatus]     = useState(null);

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
              <button className="gauge-edit-btn" onClick={() => setTab('settings')}>Bearbeiten</button>
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
        <button className={`nav-item ${tab === 'home' ? 'active' : ''}`} onClick={() => setTab('home')}>
          <span className="nav-icon">🏠</span>
          Home
        </button>
        <button className={`nav-item ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          <span className="nav-icon">📊</span>
          Verlauf
        </button>
        <button className="nav-add-btn" onClick={() => setTab('add')}>+</button>
        <button className={`nav-item ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
          <span className="nav-icon">⚙️</span>
          Settings
        </button>
        <div style={{ flex: 1 }} />
      </nav>
    </div>
  );
}
