import { useState, useCallback } from 'react';
import { analyzeImage, analyzeText } from '../gemini';

export default function AddFood({ apiKey, onAdd }) {
  const [image, setImage] = useState(null); // { base64, mimeType, preview }
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleCamera = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        const base64 = dataUrl.split(',')[1];
        setImage({ base64, mimeType: file.type, preview: dataUrl });
        setResult(null);
        setError('');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!apiKey) { setError('Bitte zuerst den API-Key in den Einstellungen eingeben.'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      let res;
      if (image) {
        res = await analyzeImage(apiKey, image.base64, image.mimeType);
      } else if (text.trim()) {
        res = await analyzeText(apiKey, text.trim());
      } else {
        setError('Bitte ein Foto aufnehmen oder Essen eingeben.');
        setLoading(false);
        return;
      }
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiKey, image, text]);

  const handleAdd = useCallback(() => {
    if (!result) return;
    onAdd({
      id: Date.now(),
      name: result.name,
      calories: result.calories,
      note: result.note,
      image: image?.preview || null,
      time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    });
    setResult(null);
    setImage(null);
    setText('');
  }, [result, image, onAdd]);

  return (
    <div className="add-section">
      <div className="add-card">
        <h2>Essen hinzufügen</h2>

        <button className="camera-btn" onClick={handleCamera}>
          📷 Foto aufnehmen
        </button>

        {image && (
          <div className="image-preview">
            <img src={image.preview} alt="Aufgenommenes Essen" />
            <button className="remove-img" onClick={() => { setImage(null); setResult(null); }}>✕</button>
          </div>
        )}

        <div className="divider">— oder —</div>

        <div className="text-input-row">
          <input
            className="food-input"
            placeholder="z.B. 200g Hähnchenbrust"
            value={text}
            onChange={e => { setText(e.target.value); setResult(null); }}
            onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
          />
        </div>

        <button
          className="analyze-btn"
          style={{ width: '100%', marginTop: 10 }}
          onClick={handleAnalyze}
          disabled={loading || (!image && !text.trim())}
        >
          {loading ? 'Analysiere...' : '🔍 Kalorien berechnen'}
        </button>

        {loading && (
          <div className="loading">
            <div className="spinner" />
            <p style={{ marginTop: 8 }}>KI analysiert...</p>
          </div>
        )}

        {error && <div className="error">⚠️ {error}</div>}

        {result && (
          <div className="result-card">
            <div className="result-name">{result.name}</div>
            <div className="result-kcal">{result.calories} kcal</div>
            {result.note && <div className="result-note">{result.note}</div>}
            <button className="add-entry-btn" onClick={handleAdd}>
              + Zum Tagebuch hinzufügen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
