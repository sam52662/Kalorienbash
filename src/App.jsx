import { useState, useCallback } from 'react';
import {
  Plus, Home, BarChart2, Settings as SettingsIcon,
  Flame, Target, UtensilsCrossed, CalendarDays, Trash2,
  Utensils, CheckCircle, AlertCircle,
} from 'lucide-react';
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

  const cx = 110, cy = 110, r = 85;
  const startAngle = -210;
  const sweepTotal = 240;

  function polarToXY(angle, radius) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  const segments = 20;
  const gap = 4;
  const segAngle = sweepTotal / segments;
  const filled = Math.round(pct * segments);

  const paths = Array.from({ length: segments }, (_, i) => {
    const a1 = startAngle + i * segAngle + gap / 2;
    const a2 = startAngle + (i + 1) * segAngle - gap / 2;
    const p1o = polarToXY(a1, r), p2o = polarToXY(a2, r);
    const p1i = polarToXY(a1, r - 14), p2i = polarToXY(a2, r - 14);
    const large = a2 - a1 > 180 ? 1 : 0;
    const fill = i < filled ? (isOver ? '#ef4444' : '#16a34a') : '#e9f0eb';
    return (
      <path key={i}
        d={`M${p1i.x},${p1i.y} A${r-14},${r-14} 0 ${large} 1 ${p2i.x},${p2i.y} L${p2o.x},${p2o.y} A${r},${r} 0 ${large} 0 ${p1o.x},${p1o.y} Z`}
        fill={fill} style={{ transition: 'fill 0.3s ease' }}
      />
    );
  });

  return (
    <div className="gauge-wrap">
      <svg className="gauge-svg" width="220" height="130" viewBox="0 0 220 130">{paths}</svg>
      <div className="gauge-center">
        <Flame size={22} color={isOver ? '#ef4444' : '#f97316'} strokeWidth={2} style={{ marginBottom: 2 }} />
        <div className={`gauge-number ${isOver ? 'over' : ''}`}>{isOver ? value : remaining}</div>
        <div className="gauge-label">{isOver ? 'kcal über Ziel' : 'Verbleibend'}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('home');
  const [entries, setEntries]         = useState(() => loadData().entries?.[todayKey()] || []);
  const [apiKey, setApiKey]           = useState(() => loadData().apiKey || '');
  const [githubToken, setGithubToken] = useState(() => loadData().githubToken || '');
  const [goal, setGoal]               = useState(() => loadData().goal || 2000);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft]     = useState('');
  const [syncStatus, setSyncStatus]   = useState(null);

  const commitGoal = useCallback(() => {
    const val = parseInt(goalDraft, 10);
    if (val >= 100 && val <= 9999) {
      setGoal(val);
      const d = loadData(); d.goal = val; saveData(d);
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
      saveData(d); return next;
    });
    setTab('home');
    if (githubToken) {
      setSyncStatus({ msg: 'Speichere…', type: 'ok' });
      try {
        const { appendEntry } = await import('./github.js');
        await appendEntry(githubToken, full);
        setSyncStatus({ msg: 'In GitHub gespeichert', type: 'ok' });
        setTimeout(() => setSyncStatus(null), 3000);
      } catch (e) {
        setSyncStatus({ msg: 'Sync fehlgeschlagen', type: 'err' });
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
      saveData(d); return next;
    });
    if (githubToken && deleted) {
      try { const { deleteEntry: ghDelete } = await import('./github.js'); await ghDelete(githubToken, deleted); } catch {}
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
  const IC = { size: 22, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <div>
            <div className="header-greeting">{greeting}</div>
            <div className="header-name">Kalorienbash</div>
          </div>
          <div className="header-actions">
            <button className="header-action-btn" onClick={() => setTab('history')} title="Verlauf">
              <CalendarDays size={20} strokeWidth={2} color="#374151" />
            </button>
            <button className="header-action-btn" onClick={() => setTab('settings')} title="Einstellungen">
              <SettingsIcon size={20} strokeWidth={2} color="#374151" />
            </button>
          </div>
        </div>
        <WeekStrip />
      </header>

      {tab === 'home' && (
        <div className="page">
          <div className="gauge-card">
            <div className="gauge-header">
              <span className="gauge-title">Kalorien</span>
              {editingGoal ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input autoFocus type="number" min="100" max="9999" value={goalDraft}
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
                <UtensilsCrossed {...IC} color="#16a34a" />
                <div className="macro-val">{totalCalories}</div>
                <div className="macro-name">Gegessen</div>
              </div>
              <div className="macro-item">
                <Target {...IC} color="#16a34a" />
                <div className="macro-val">{goal}</div>
                <div className="macro-name">Tagesziel</div>
              </div>
              <div className="macro-item">
                <Utensils {...IC} color="#16a34a" />
                <div className="macro-val">{entries.length}</div>
                <div className="macro-name">Mahlzeiten</div>
              </div>
            </div>
            {syncStatus && (
              <div className={`sync-pill ${syncStatus.type}`}>
                {syncStatus.type === 'ok'
                  ? <CheckCircle size={13} strokeWidth={2} />
                  : <AlertCircle size={13} strokeWidth={2} />}
                {syncStatus.msg}
              </div>
            )}
          </div>

          <div className="section-row">
            <span className="section-title">Heute</span>
          </div>

          {entries.length === 0 ? (
            <div className="log-empty">
              <UtensilsCrossed size={48} strokeWidth={1.5} color="#94a3b8" style={{ marginBottom: 12 }} />
              <p>Noch keine Mahlzeiten.<br />Tippe + um eine hinzuzufügen.</p>
            </div>
          ) : entries.map(entry => (
            <div key={entry.id} className="meal-card">
              {entry.image
                ? <img className="meal-thumb" src={entry.image} alt={entry.name} />
                : <div className="meal-icon-placeholder"><Utensils size={28} strokeWidth={1.5} color="#16a34a" /></div>
              }
              <div className="meal-info">
                <div className="meal-name">{entry.name}</div>
                <div className="meal-kcal">
                  <Flame size={14} strokeWidth={2} color="#f97316" />
                  {entry.calories} Kalorien
                </div>
                {entry.note && <div className="meal-tags"><span className="meal-tag">{entry.note}</span></div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span className="meal-time">{entry.time}</span>
                <button className="meal-delete" onClick={() => deleteEntry(entry.id)} title="Löschen">
                  <Trash2 size={16} strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'add'      && <AddFood apiKey={apiKey} onAdd={addEntry} />}
      {tab === 'history'  && <History githubToken={githubToken} goal={goal} />}
      {tab === 'settings' && <Settings apiKey={apiKey} githubToken={githubToken} goal={goal} onSave={handleSaveSettings} />}

      <nav className="bottom-nav">
        <button className={`nav-pill-add ${tab === 'add' ? 'active' : ''}`} onClick={() => setTab('add')}>
          <Plus size={22} strokeWidth={2.5} />
          Hinzufügen
        </button>
        <button className={`nav-pill-item ${tab === 'home' ? 'active' : ''}`} onClick={() => setTab('home')}>
          <Home size={22} strokeWidth={2} color={tab === 'home' ? '#15803d' : '#94a3b8'} />
          Heute
        </button>
        <button className={`nav-pill-item ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          <BarChart2 size={22} strokeWidth={2} color={tab === 'history' ? '#15803d' : '#94a3b8'} />
          Verlauf
        </button>
        <button className={`nav-pill-item ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
          <SettingsIcon size={22} strokeWidth={2} color={tab === 'settings' ? '#15803d' : '#94a3b8'} />
          Einstellungen
        </button>
      </nav>
    </div>
  );
}
