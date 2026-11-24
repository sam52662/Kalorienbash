import { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { hashPassword, verifyPassword } from '../crypto.js';
import { loadAuth, saveAuth } from '../github.js';

const PROFILES = [
  { id: 'kai',    label: 'Kai',    color: '#15803d', bg: '#dcfce7' },
  { id: 'jasmin', label: 'Jasmin', color: '#7c3aed', bg: '#ede9fe' },
];

export default function ProfileLogin({ onLogin }) {
  const [githubToken, setGhToken] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kb-global') || '{}').githubToken || ''; } catch { return ''; }
  });

  // Start directly on the last-used profile if one is saved
  const lastProfileId = (() => {
    try { return JSON.parse(localStorage.getItem('kb-global') || '{}').lastProfile || null; } catch { return null; }
  })();
  const lastProfile = lastProfileId ? PROFILES.find(p => p.id === lastProfileId) || null : null;

  const [step, setStep]   = useState(() => {
    if (!lastProfile) return 'select';
    if (!JSON.parse(localStorage.getItem('kb-global') || '{}').githubToken) return 'token';
    return 'loading-auto';   // will trigger auto-load in useEffect
  });
  const [profile, setProfile]   = useState(lastProfile);
  const [pw, setPw]             = useState('');
  const [pw2, setPw2]           = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [showToken, setShowToken] = useState(false);

  // Auto-load auth for last-used profile on mount
  useEffect(() => {
    if (step !== 'loading-auto' || !lastProfile || !githubToken) return;
    loadAuth(githubToken, lastProfile.id)
      .then(auth => setStep(auth ? 'password' : 'setup'))
      .catch(e => { setError('GitHub-Fehler: ' + e.message); setStep('select'); });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  async function selectProfile(p) {
    setProfile(p); setError(''); setPw(''); setPw2('');
    if (!githubToken) { setStep('token'); return; }
    setStep('loading');
    try {
      const auth = await loadAuth(githubToken, p.id);
      setStep(auth ? 'password' : 'setup');
    } catch (e) {
      setError('GitHub-Fehler: ' + e.message);
      setStep('select');
    }
  }

  async function handleLogin() {
    if (!pw) { setError('Bitte Passwort eingeben.'); return; }
    setStep('loading'); setError('');
    try {
      const auth = await loadAuth(githubToken, profile.id);
      const ok = await verifyPassword(pw, auth.salt, auth.hash);
      if (!ok) { setError('Falsches Passwort.'); setStep('password'); return; }
      const g = JSON.parse(localStorage.getItem('kb-global') || '{}');
      g.lastProfile = profile.id;
      localStorage.setItem('kb-global', JSON.stringify(g));
      onLogin({ profile: profile.id, label: profile.label, password: pw, githubToken });
    } catch (e) {
      setError(e.message); setStep('password');
    }
  }

  async function handleSetup() {
    if (pw.length < 4) { setError('Mindestens 4 Zeichen.'); return; }
    if (pw !== pw2) { setError('Passwörter stimmen nicht überein.'); return; }
    setStep('loading'); setError('');
    try {
      const authObj = await hashPassword(pw);
      await saveAuth(githubToken, profile.id, authObj);
      const g = JSON.parse(localStorage.getItem('kb-global') || '{}');
      g.lastProfile = profile.id;
      localStorage.setItem('kb-global', JSON.stringify(g));
      onLogin({ profile: profile.id, label: profile.label, password: pw, githubToken });
    } catch (e) {
      setError(e.message); setStep('setup');
    }
  }

  function saveToken() {
    if (!githubToken.trim()) { setError('Bitte Token eingeben.'); return; }
    const g = JSON.parse(localStorage.getItem('kb-global') || '{}');
    g.githubToken = githubToken.trim();
    localStorage.setItem('kb-global', JSON.stringify(g));
    selectProfile(profile || PROFILES[0]);
  }

  const p = profile || PROFILES[0];

  return (
    <div style={styles.screen}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoIcon}>🥗</div>
          <div style={styles.logoTitle}>Kalorienbash</div>
        </div>

        {/* Profile select */}
        {step === 'select' && (
          <>
            <div style={styles.heading}>Profil wählen</div>
            <div style={styles.profileRow}>
              {PROFILES.map(p => (
                <button key={p.id} style={{ ...styles.profileBtn, background: p.bg, borderColor: p.color }}
                  onClick={() => selectProfile(p)}>
                  <div style={{ ...styles.profileAvatar, background: p.color }}>
                    <User size={28} strokeWidth={2} color="white" />
                  </div>
                  <span style={{ ...styles.profileLabel, color: p.color }}>{p.label}</span>
                </button>
              ))}
            </div>
            {error && <ErrorBox msg={error} />}
          </>
        )}

        {/* GitHub token */}
        {step === 'token' && (
          <>
            <div style={styles.heading}>GitHub Token</div>
            <p style={styles.hint}>Einmalig eingeben um Daten zu speichern.</p>
            <InputField label="Personal Access Token" value={githubToken} onChange={setGhToken}
              show={showToken} onToggle={() => setShowToken(v => !v)} placeholder="github_pat_…" icon={<Lock size={16} strokeWidth={2} color="#94a3b8" />} />
            {error && <ErrorBox msg={error} />}
            <ActionBtn label="Weiter" color={p.color} onClick={saveToken} />
            <BackBtn onClick={() => { setStep('select'); setError(''); }} />
          </>
        )}

        {/* Password entry */}
        {step === 'password' && (
          <>
            <ProfileChip p={profile} />
            <div style={styles.heading}>Willkommen zurück</div>
            <InputField label="Passwort" value={pw} onChange={setPw} show={showPw}
              onToggle={() => setShowPw(v => !v)} onEnter={handleLogin}
              icon={<Lock size={16} strokeWidth={2} color="#94a3b8" />} />
            {error && <ErrorBox msg={error} />}
            <ActionBtn label="Anmelden" color={profile.color} onClick={handleLogin} />
            <BackBtn onClick={() => {
              const g = JSON.parse(localStorage.getItem('kb-global') || '{}');
              delete g.lastProfile;
              localStorage.setItem('kb-global', JSON.stringify(g));
              setStep('select'); setError(''); setPw('');
            }} />
          </>
        )}

        {/* First-time setup */}
        {step === 'setup' && (
          <>
            <ProfileChip p={profile} />
            <div style={styles.heading}>Passwort festlegen</div>
            <p style={styles.hint}>Erstes Mal? Lege ein persönliches Passwort fest.</p>
            <InputField label="Neues Passwort" value={pw} onChange={setPw} show={showPw}
              onToggle={() => setShowPw(v => !v)}
              icon={<Lock size={16} strokeWidth={2} color="#94a3b8" />} />
            <InputField label="Passwort wiederholen" value={pw2} onChange={setPw2} show={showPw}
              onToggle={() => setShowPw(v => !v)} onEnter={handleSetup}
              icon={<Lock size={16} strokeWidth={2} color="#94a3b8" />} />
            {error && <ErrorBox msg={error} />}
            <ActionBtn label="Profil erstellen" color={profile.color} onClick={handleSetup} />
            <BackBtn onClick={() => { setStep('select'); setError(''); setPw(''); setPw2(''); }} />
          </>
        )}

        {/* Loading */}
        {step === 'loading' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Bitte warten…</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileChip({ p }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <User size={18} strokeWidth={2} color="white" />
      </div>
      <span style={{ fontWeight: 700, fontSize: '1rem', color: p.color }}>{p.label}</span>
    </div>
  );
}

function InputField({ label, value, onChange, show, onToggle, onEnter, placeholder, icon }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 5 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>{icon}</div>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onEnter?.()}
          placeholder={placeholder || '••••••••'}
          style={{ width: '100%', padding: '12px 42px 12px 36px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
        />
        <button onClick={onToggle} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          {show ? <EyeOff size={16} strokeWidth={2} color="#94a3b8" /> : <Eye size={16} strokeWidth={2} color="#94a3b8" />}
        </button>
      </div>
    </div>
  );
}

function ActionBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} style={{ width: '100%', padding: '13px', background: color, color: 'white', border: 'none', borderRadius: 10, fontSize: '0.95rem', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
      {label} <ArrowRight size={16} strokeWidth={2.5} />
    </button>
  );
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ width: '100%', padding: '10px', background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem', fontFamily: 'inherit', cursor: 'pointer', marginTop: 6 }}>
      ← Zurück
    </button>
  );
}

function ErrorBox({ msg }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: '0.83rem', color: '#b91c1c' }}>
      <AlertCircle size={15} strokeWidth={2} /> {msg}
    </div>
  );
}

const styles = {
  screen: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  card: {
    background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)',
    borderRadius: 24, padding: '28px 24px', width: '100%', maxWidth: 360,
    boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' },
  logoIcon: { fontSize: '1.8rem' },
  logoTitle: { fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' },
  heading: { fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: 16, letterSpacing: '-0.02em' },
  hint: { fontSize: '0.82rem', color: '#64748b', marginBottom: 14, lineHeight: 1.5 },
  profileRow: { display: 'flex', gap: 12, marginBottom: 8 },
  profileBtn: {
    flex: 1, padding: '16px 10px', border: '2px solid', borderRadius: 16,
    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    transition: 'all 0.15s',
  },
  profileAvatar: { width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  profileLabel: { fontSize: '0.9rem', fontWeight: 800 },
};
