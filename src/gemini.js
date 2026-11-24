const MODEL = 'gemini-flash-latest';
const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-3.8-flash'];
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function isOverloaded(status, msg) {
  return status === 503 || status === 429 || (msg || '').toLowerCase().includes('high demand') || (msg || '').toLowerCase().includes('overloaded');
}

async function callAPI(apiKey, model, body, attempt = 0) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );

  if (!res.ok) {
    const err = await res.json();
    const msg = err.error?.message || 'API-Fehler';

    if (isOverloaded(res.status, msg)) {
      // Retry same model up to MAX_RETRIES times
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        return callAPI(apiKey, model, body, attempt + 1);
      }
      // Try fallback models
      for (const fallback of FALLBACK_MODELS) {
        if (fallback === model) continue;
        try {
          const fb = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${fallback}:generateContent?key=${apiKey}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
          );
          if (fb.ok) return fb.json();
        } catch {}
      }
      throw new Error('KI-Server überlastet – bitte in ein paar Minuten erneut versuchen.');
    }

    throw new Error(msg);
  }

  return res.json();
}

export async function analyzeImage(apiKey, base64Image, mimeType) {
  const prompt = `Analysiere dieses Essen-Foto. Antworte NUR mit einem JSON-Objekt ohne Markdown-Blöcke:
{
  "name": "Name des Gerichts auf Deutsch",
  "calories": Zahl (geschätzte Kalorien),
  "note": "kurze Bemerkung zur Schätzung (z.B. Portionsgröße)"
}
Schätze die Kalorien für eine normale Portion.`;

  const data = await callAPI(apiKey, MODEL, {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Image } }] }]
  });
  return parseResult(data.candidates?.[0]?.content?.parts?.[0]?.text || '');
}

export async function analyzeText(apiKey, foodText) {
  const prompt = `Schätze die Kalorien für folgendes Essen: "${foodText}"
Antworte NUR mit einem JSON-Objekt ohne Markdown-Blöcke:
{
  "name": "Name des Essens auf Deutsch",
  "calories": Zahl (geschätzte Kalorien),
  "note": "kurze Bemerkung (z.B. 'für 100g' oder 'normale Portion')"
}`;

  const data = await callAPI(apiKey, MODEL, {
    contents: [{ parts: [{ text: prompt }] }]
  });
  return parseResult(data.candidates?.[0]?.content?.parts?.[0]?.text || '');
}

function parseResult(text) {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    const obj = JSON.parse(clean);
    if (!obj.name || typeof obj.calories !== 'number') throw new Error('Unvollständige Antwort');
    return obj;
  } catch {
    throw new Error('KI-Antwort konnte nicht verarbeitet werden');
  }
}
