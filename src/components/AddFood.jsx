import { useState, useCallback } from 'react';
import { Camera, Search, X, CheckCircle } from 'lucide-react';
import { analyzeImage, analyzeText } from '../gemini';

export default function AddFood({ apiKey, onAdd }) {
  const [image, setImage] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleCamera = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
    input.onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        setImage({ base64: dataUrl.split(',')[1], mimeType: file.type, preview: dataUrl });
        setResult(null); setError('');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!apiKey) { setError('Bitte zuerst den Gemini API-Key in den Einstellungen eingeben.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = image
        ? await analyzeImage(apiKey, image.base64, image.mimeType)
        : await analyzeText(apiKey, text.trim());
      setResult(res);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [apiKey, image, text]);

  const handleAdd = useCallback(() => {
    if (!result) return;
    onAdd({ id: Date.now(), name: result.name, calories: result.calories, note: result.note, image: image?.preview || null, time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) });
    setResult(null); setImage(null); setText('');
  }, [result, image, onAdd]);

  return (
    <div className="page">
      <div className="add-card">
        <div className="add-card-title">Foto aufnehmen</div>
        <button className="camera-btn" onClick={handleCamera}>
          <span className="camera-btn-icon"><Camera size={22} strokeWidth={2} color="white" /></span>
          Essen fotografieren
        </button>
        {image && (
          <div className="image-preview">
            <img src={image.preview} alt="Aufgenommenes Essen" />
            <button className="remove-img" onClick={() => { setImage(null); setResult(null); }}>
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>

      <div className="add-card">
        <div className="add-card-title">Oder manuell eingeben</div>
        <input className="food-input" placeholder="z.B. 200g Hähnchenbrust, Pizza Margherita…"
          value={text} onChange={e => { setText(e.target.value); setResult(null); }}
          onKeyDown={e => e.key === 'Enter' && handleAnalyze()} />
        <button className="btn-primary" onClick={handleAnalyze} disabled={loading || (!image && !text.trim())}>
          {loading
            ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Analysiere…</>
            : <><Search size={18} strokeWidth={2} /> Kalorien berechnen</>}
        </button>
        {error && <div className="error">{error}</div>}
      </div>

      {result && (
        <div className="result-card">
          <div className="result-name">{result.name}</div>
          <div><span className="result-kcal">{result.calories}</span><span className="result-unit"> kcal</span></div>
          {result.note && <div className="result-note">{result.note}</div>}
          <button className="btn-add" onClick={handleAdd}>
            <CheckCircle size={16} strokeWidth={2} style={{ marginRight: 6 }} />
            Zum Tagebuch hinzufügen
          </button>
        </div>
      )}
    </div>
  );
}
