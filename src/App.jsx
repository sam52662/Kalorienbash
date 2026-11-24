import { useState, useEffect, useCallback } from 'react';
import AddFood from './components/AddFood';
import FoodLog from './components/FoodLog';
import Settings from './components/Settings';
import './index.css';

const STORAGE_KEY = 'calorie-tracker-data';
const todayKey = () => new Date().toISOString().slice(0, 10);

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
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
  const [goal, setGoal] = useState(() => loadData().goal || 2000);

  const totalCalories = entries.reduce((s, e) => s + e.calories, 0);
  const progress = Math.min((totalCalories / goal) * 100, 100);
  const isOver = totalCalories > goal;

  const addEntry = useCallback((entry) => {
    setEntries(prev => {
      const next = [...prev, entry];
      const d = loadData();
      d.entries = { ...(d.entries || {}), [todayKey()]: next };
      saveData(d);
      return next;
    });
    setTab('log');
  }, []);

  const deleteEntry = useCallback((id) => {
    setEntries(prev => {
      const next = prev.filter(e => e.id !== id);
      const d = loadData();
      d.entries = { ...(d.entries || {}), [todayKey()]: next };
      saveData(d);
      return next;
    });
  }, []);

  const handleSaveSettings = useCallback((key, kcalGoal) => {
    setApiKey(key);
    setGoal(kcalGoal);
    const d = loadData();
    d.apiKey = key;
    d.goal = kcalGoal;
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
        <div className="summary-title">Heute</div>
        <div className="calorie-display">
          <span className="calorie-number" style={isOver ? { color: 'var(--red)' } : {}}>
            {totalCalories}
          </span>
          <span className="calorie-unit">kcal</span>
        </div>
        <div className="calorie-goal">Ziel: {goal} kcal · {isOver ? `${totalCalories - goal} kcal über Ziel` : `noch ${goal - totalCalories} kcal`}</div>
        <div className="progress-bar" style={{ marginTop: 8 }}>
          <div className={`progress-fill ${isOver ? 'over' : ''}`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'add' ? 'active' : ''}`} onClick={() => setTab('add')}>+ Hinzufügen</button>
        <button className={`tab ${tab === 'log' ? 'active' : ''}`} onClick={() => setTab('log')}>
          Tagebuch {entries.length > 0 && `(${entries.length})`}
        </button>
        <button className={`tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>⚙️</button>
      </div>

      {tab === 'add' && <AddFood apiKey={apiKey} onAdd={addEntry} />}
      {tab === 'log' && <FoodLog entries={entries} onDelete={deleteEntry} />}
      {tab === 'settings' && <Settings apiKey={apiKey} goal={goal} onSave={handleSaveSettings} />}
    </div>
  );
}
