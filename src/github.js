const OWNER = 'sam52662';
const REPO = 'Kalorienbash';
const FILE_PATH = 'data/log.csv';
const CSV_HEADER = 'datum,uhrzeit,name,kalorien\n';

async function apiCall(token, method, path, body) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'GitHub API Fehler');
  }
  return res.json();
}

async function getFile(token) {
  try {
    const data = await apiCall(token, 'GET', FILE_PATH);
    const content = atob(data.content.replace(/\n/g, ''));
    return { content, sha: data.sha };
  } catch (e) {
    if (e.message.includes('Not Found') || e.message.includes('404')) {
      return { content: CSV_HEADER, sha: null };
    }
    throw e;
  }
}

export async function appendEntry(token, entry) {
  const { content, sha } = await getFile(token);
  const line = `${entry.date},${entry.time},"${entry.name.replace(/"/g, '""')}",${entry.calories}\n`;
  const newContent = content + line;
  const encoded = btoa(unescape(encodeURIComponent(newContent)));

  const body = {
    message: `log: ${entry.date} ${entry.name} (${entry.calories} kcal)`,
    content: encoded,
    ...(sha ? { sha } : {}),
  };

  await apiCall(token, 'PUT', FILE_PATH, body);
}

export async function deleteEntry(token, entry) {
  const { content, sha } = await getFile(token);
  if (!sha) return;

  const lines = content.split('\n');
  const filtered = lines.filter(line => {
    if (!line.trim() || line.startsWith('datum,')) return true;
    const cols = parseCsvLine(line);
    return !(cols[0] === entry.date && cols[1] === entry.time && cols[3] == entry.calories);
  });

  const newContent = filtered.join('\n');
  const encoded = btoa(unescape(encodeURIComponent(newContent)));
  await apiCall(token, 'PUT', FILE_PATH, {
    message: `delete: ${entry.date} ${entry.name}`,
    content: encoded,
    sha,
  });
}

export async function loadHistory(token) {
  const { content } = await getFile(token);
  const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('datum,'));

  const byDate = {};
  for (const line of lines) {
    const cols = parseCsvLine(line);
    if (cols.length < 4) continue;
    const [date, time, name, calories] = cols;
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push({ date, time, name, calories: Number(calories) });
  }

  return Object.entries(byDate)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, entries]) => ({
      date,
      entries,
      total: entries.reduce((s, e) => s + e.calories, 0),
    }));
}

function parseCsvLine(line) {
  const cols = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (c === ',' && !inQuote) {
      cols.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  cols.push(cur);
  return cols;
}
