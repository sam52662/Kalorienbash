import { useState } from 'react';

export default function Settings({ apiKey, goal, onSave }) {
  const [key, setKey] = useState(apiKey || '');
  const [kcalGoal, setKcalGoal] = useState(goal || 2000);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(key.trim(), Number(kcalGoal));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-section">
      <div className="settings-card">
        <h2>Gemini API-Key</h2>
        <label className="settings-label">
          Key von aistudio.google.com
        </label>
        <input
          className="settings-input"
          type="password"
          placeholder="AIza..."
          value={key}
          onChange={e => setKey(e.target.value)}
          autoComplete="off"
        />
        <div className={`key-status ${key ? 'ok' : 'missing'}`}>
          {key ? '✓ Key eingetragen' : '✗ Kein Key — KI-Analyse nicht verfügbar'}
        </div>
      </div>

      <div className="settings-card">
        <h2>Kalorienziel</h2>
        <label className="settings-label">Tagesziel in kcal</label>
        <input
          className="settings-input"
          type="number"
          min="500"
          max="5000"
          value={kcalGoal}
          onChange={e => setKcalGoal(e.target.value)}
        />
      </div>

      <button className="save-btn" onClick={handleSave}>
        Einstellungen speichern
      </button>
      {saved && <div className="saved-hint">✓ Gespeichert</div>}

      <div className="settings-card" style={{ marginTop: 12 }}>
        <h2>Datenschutz</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', lineHeight: 1.5 }}>
          Dein API-Key und alle Einträge werden ausschließlich lokal auf deinem Gerät gespeichert.
          Fotos werden direkt an die Gemini API von Google gesendet und dort analysiert.
          Es werden keine Daten auf fremden Servern dauerhaft gespeichert.
        </p>
      </div>
    </div>
  );
}
