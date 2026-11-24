import { useState } from 'react';
import { Bot, Target, ShieldCheck, CheckCircle, AlertTriangle, User } from 'lucide-react';

export default function Settings({ apiKey, githubToken, goal, onSave, profile, label }) {
  const [key, setKey] = useState(apiKey || '');
  const [kcalGoal, setKcalGoal] = useState(goal || 2000);
  const [saved, setSaved] = useState(false);

  const profileColor = profile === 'kai' ? '#15803d' : '#7c3aed';

  const handleSave = () => {
    onSave(key.trim(), Number(kcalGoal));
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="page">
      <div className="settings-card" style={{ borderLeft: `3px solid ${profileColor}` }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: profileColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={13} strokeWidth={2} color="white" />
          </div>
          Aktives Profil
        </h2>
        <p className="settings-hint" style={{ marginTop: 4 }}>
          Eingeloggt als <strong>{label}</strong> — Daten werden in <code>data/{profile}.csv</code> gespeichert.
          {githubToken ? ' GitHub-Token aktiv.' : ' Kein GitHub-Token — nur lokale Speicherung.'}
        </p>
      </div>

      <div className="settings-card">
        <h2><Bot size={18} strokeWidth={2} color="#15803d" /> Gemini API-Key</h2>
        <label className="settings-label">Key von aistudio.google.com</label>
        <input className="settings-input" type="password" placeholder="AIza…" value={key}
          onChange={e => setKey(e.target.value)} autoComplete="off" />
        <div className={`key-status ${key ? 'ok' : 'missing'}`} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {key
            ? <><CheckCircle size={13} strokeWidth={2} /> Key eingetragen</>
            : <><AlertTriangle size={13} strokeWidth={2} /> Kein Key — KI-Analyse nicht verfügbar</>}
        </div>
      </div>

      <div className="settings-card">
        <h2><Target size={18} strokeWidth={2} color="#15803d" /> Kalorienziel</h2>
        <label className="settings-label">Tagesziel in kcal</label>
        <input className="settings-input" type="number" min="500" max="5000" value={kcalGoal}
          onChange={e => setKcalGoal(e.target.value)} />
      </div>

      <button className="save-btn" onClick={handleSave}>Einstellungen speichern</button>
      {saved && (
        <div className="saved-hint" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <CheckCircle size={14} strokeWidth={2} /> Gespeichert
        </div>
      )}

      <div className="settings-card" style={{ marginTop: 10 }}>
        <h2><ShieldCheck size={18} strokeWidth={2} color="#15803d" /> Datenschutz</h2>
        <p className="settings-hint" style={{ marginTop: 0 }}>
          API-Keys werden nur lokal auf deinem Gerät gespeichert und nie übertragen.
          Fotos werden direkt an die Gemini API von Google gesendet.
          Kaloriendaten werden als CSV in deinem GitHub-Repository gespeichert.
        </p>
      </div>
    </div>
  );
}
