import { useState, useEffect, useCallback } from 'react';
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

export default function App() {
  const [tab, setTab] = useState('add');
  const [entries, setEntries] = useState(() => {
    const d = loadData();
    return d.entries?.[todayKey()] || [];
  });
  const [apiKey, setApiKey] = useState(() => loadData().apiKey || '');
  const [githubToken, setGithubToken] = useState(() => loadData().githubToken || '');
  const [goal, setGoal] = useState(() => loadData().goal || 2000);
  const [syncStatus, setSyncStatus] = useState('');

  const totalCalories = entries.reduce((s, e) => s + e.calories, 0);
  const progress = Math.min((totalCalories / goal) * 100, 100);
  const isOver = totalCalories > goal;

  const addEntry = useCallback(async (entry) => {
    const entryWithDate = { ...entry, date: todayKey() };
    setEntries(prev => {
      const next = [...prev, entryWithDate];
      const d = loadData();
      d.entries = { ...(d.entries || {}), [todayKey()]: next };
      saveData(d);
      return next;
    });
    setTab('log');

    if (githubToken) {
      setSyncStatus('Speichere in GitHub...');
      try {
        const { appendEntry } = await import('./github.js');
        await appendEntry(githubToken, entryWithDate);
        setSyncStatus('✓ In GitHub gespeichert');
        setTimeout(() => setSyncStatus(''), 3000);
      } catch (e) {
        setSyncStatus('⚠️ GitHub-Sync fehlgeschlagen: ' + e.message);
        setTimeout(() => setSyncStatus(''), 5000);
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
    setApiKey(key);
    setGoal(kcalGoal);
    setGithubToken(ghToken);
    const d = loadData();
    d.apiKey = key;
    d.goal = kcalGoal;
    d.githubToken = ghToken;
    saveData(d);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>🥗 Kalorienbash</h1>
        <div className="header-right">
          <button
            style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.3rem', cursor: 'pointer' }}
            onClick={() => setTab('settings')}
            title="Einstellungen"
          >⚙️</button>
        </div>
      </header>

      <div className="summary">
        <div className="summary-title">Heute — {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
        <div className="calorie-display">
          <span className="calorie-number" style={isOver ? { color: 'var(--red)' } : {}}>
            {totalCalories}
          </span>
          <span className="calorie-unit">kcal</span>
        </div>
        <div className="calorie-goal">
          Ziel: {goal} kcal · {isOver ? `${totalCalories - goal} kcal über Ziel` : `noch ${goal - totalCalories} kcal`}
        </div>
        <div className="progress-bar" style={{ marginTop: 8 }}>
          <div className={`progress-fill ${isOver ? 'over' : ''}`} style={{ width: `${progress}%` }} />
        </div>
        {syncStatus && (
          <div style={{ fontSize: '0.78rem', marginTop: 6, color: syncStatus.startsWith('⚠️') ? 'var(--red)' : 'var(--green-dark)' }}>
            {syncStatus}
          </div>
        )}
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'add' ? 'active' : ''}`} onClick={() => setTab('add')}>+ Hinzufügen</button>
        <button className={`tab ${tab === 'log' ? 'active' : ''}`} onClick={() => setTab('log')}>
          Heute {entries.length > 0 && `(${entries.length})`}
        </button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>📅 Verlauf</button>
        <button className={`tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>⚙️</button>
      </div>

      {tab === 'add' && <AddFood apiKey={apiKey} onAdd={addEntry} />}
      {tab === 'log' && <FoodLog entries={entries} onDelete={deleteEntry} />}
      {tab === 'history' && <History githubToken={githubToken} goal={goal} />}
      {tab === 'settings' && <Settings apiKey={apiKey} githubToken={githubToken} goal={goal} onSave={handleSaveSettings} />}
    </div>
  );
}
