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
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const NAV = [
  { id: 'add',     icon: '＋',  label: 'Hinzufügen' },
  { id: 'log',     icon: '📋',  label: 'Heute' },
  { id: 'history', icon: '📅',  label: 'Verlauf' },
  { id: 'settings',icon: '⚙️', label: 'Settings' },
];

export default function App() {
  const [tab, setTab] = useState('add');
  const [entries, setEntries] = useState(() => loadData().entries?.[todayKey()] || []);
  const [apiKey, setApiKey]           = useState(() => loadData().apiKey || '');
  const [githubToken, setGithubToken] = useState(() => loadData().githubToken || '');
  const [goal, setGoal]               = useState(() => loadData().goal || 2000);
  const [syncStatus, setSyncStatus]   = useState(null); // {msg, type}

  const totalCalories = entries.reduce((s, e) => s + e.calories, 0);
  const progress = Math.min((totalCalories / goal) * 100, 100);
  const isOver = totalCalories > goal;

  const addEntry = useCallback(async (entry) => {
    const full = { ...entry, date: todayKey() };
    setEntries(prev => {
      const next = [...prev, full];
      const d = loadData();
      d.entries = { ...(d.entries || {}), [todayKey()]: next };
      saveData(d);
      return next;
    });
    setTab('log');

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
      } catch (e) {
        console.warn('GitHub delete failed:', e.message);
      }
    }
  }, [githubToken]);

  const handleSaveSettings = useCallback((key, kcalGoal, ghToken) => {
    setApiKey(key); setGoal(kcalGoal); setGithubToken(ghToken);
    const d = loadData();
    Object.assign(d, { apiKey: key, goal: kcalGoal, githubToken: ghToken });
    saveData(d);
  }, []);

  const dateLabel = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-top">
          <div className="header-title">
            <div className="header-icon">🥗</div>
            <h1>Kalorienbash</h1>
          </div>
          <button className="header-settings-btn" onClick={() => setTab('settings')}>⚙️</button>
        </div>

        {/* Summary inside header */}
        <div className="summary-card">
          <div className="summary-date">{dateLabel}</div>
          <div className="calorie-row">
            <div className="calorie-left">
              <span className={`calorie-number ${isOver ? 'over' : ''}`}>{totalCalories}</span>
              <span className="calorie-unit">kcal</span>
            </div>
            <div className="calorie-right">
              <div className="calorie-goal-label">Tagesziel</div>
              <div className="calorie-goal-val">{goal} kcal</div>
            </div>
          </div>
          <div className="progress-track">
            <div className={`progress-fill ${isOver ? 'over' : ''}`} style={{ width: `${progress}%` }} />
          </div>
          <div className="calorie-status">
            {isOver
              ? `${totalCalories - goal} kcal über dem Ziel`
              : `Noch ${goal - totalCalories} kcal verfügbar`}
          </div>
          {syncStatus && (
            <div className={`sync-status ${syncStatus.type}`} style={{ marginTop: 8 }}>
              {syncStatus.msg}
            </div>
          )}
        </div>
      </header>

      {/* Page content */}
      {tab === 'add'      && <AddFood apiKey={apiKey} onAdd={addEntry} />}
      {tab === 'log'      && <FoodLog entries={entries} onDelete={deleteEntry} />}
      {tab === 'history'  && <History githubToken={githubToken} goal={goal} />}
      {tab === 'settings' && <Settings apiKey={apiKey} githubToken={githubToken} goal={goal} onSave={handleSaveSettings} />}

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        {NAV.map(n => (
          <button
            key={n.id}
            className={`nav-item ${tab === n.id ? 'active' : ''}`}
            onClick={() => setTab(n.id)}
          >
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
