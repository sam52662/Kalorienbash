import { useState } from 'react';

export default function Settings({ apiKey, githubToken, goal, onSave }) {
  const [key, setKey] = useState(apiKey || '');
  const [ghToken, setGhToken] = useState(githubToken || '');
  const [kcalGoal, setKcalGoal] = useState(goal || 2000);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(key.trim(), Number(kcalGoal), ghToken.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="page">
      <div className="settings-card">
        <h2>🤖 Gemini API-Key</h2>
        <label className="settings-label">Key von aistudio.google.com</label>
        <input
          className="settings-input"
          type="password"
          placeholder="AIza…"
          value={key}
          onChange={e => setKey(e.target.value)}
          autoComplete="off"
        />
        <div className={`key-status ${key ? 'ok' : 'missing'}`}>
          {key ? '✓ Key eingetragen' : '○ Kein Key — KI-Analyse nicht verfügbar'}
        </div>
      </div>

      <div className="settings-card">
        <h2>🐙 GitHub Token</h2>
        <label className="settings-label">Personal Access Token für Verlauf-Speicherung</label>
        <input
          className="settings-input"
          type="password"
          placeholder="github_pat_…"
          value={ghToken}
          onChange={e => setGhToken(e.target.value)}
          autoComplete="off"
        />
        <div className={`key-status ${ghToken ? 'ok' : 'missing'}`}>
          {ghToken ? '✓ Token eingetragen — Verlauf wird in GitHub gespeichert' : '○ Kein Token — Verlauf nur lokal'}
        </div>
        <p className="settings-hint">
          Token mit <strong>repo</strong>-Berechtigung erstellen unter:<br />
          github.com → Settings → Developer settings → Personal access tokens
        </p>
      </div>

      <div className="settings-card">
        <h2>🎯 Kalorienziel</h2>
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

      <button className="save-btn" onClick={handleSave}>Einstellungen speichern</button>
      {saved && <div className="saved-hint">✓ Gespeichert</div>}

      <div className="settings-card" style={{ marginTop: 10 }}>
        <h2>🔒 Datenschutz</h2>
        <p className="settings-hint" style={{ marginTop: 0 }}>
          API-Keys werden nur lokal auf deinem Gerät gespeichert und nie übertragen.
          Fotos werden direkt an die Gemini API von Google gesendet.
          Kaloriendaten werden als CSV in deinem GitHub-Repository gespeichert.
        </p>
      </div>
    </div>
  );
}
