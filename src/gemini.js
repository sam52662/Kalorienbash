const MODEL = 'gemini-3.8-flash';

export async function analyzeImage(apiKey, base64Image, mimeType) {
  const prompt = `Analysiere dieses Essen-Foto. Antworte NUR mit einem JSON-Objekt ohne Markdown-Blöcke:
{
  "name": "Name des Gerichts auf Deutsch",
  "calories": Zahl (geschätzte Kalorien),
  "note": "kurze Bemerkung zur Schätzung (z.B. Portionsgröße)"
}
Schätze die Kalorien für eine normale Portion.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64Image } }
          ]
        }]
      })
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'API-Fehler');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return parseResult(text);
}

export async function analyzeText(apiKey, foodText) {
  const prompt = `Schätze die Kalorien für folgendes Essen: "${foodText}"
Antworte NUR mit einem JSON-Objekt ohne Markdown-Blöcke:
{
  "name": "Name des Essens auf Deutsch",
  "calories": Zahl (geschätzte Kalorien),
  "note": "kurze Bemerkung (z.B. 'für 100g' oder 'normale Portion')"
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'API-Fehler');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return parseResult(text);
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
