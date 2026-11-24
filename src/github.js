const OWNER = 'sam52662';
const REPO = 'Kalorienbash';
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

async function getFile(token, path, fallback = '') {
  try {
    const data = await apiCall(token, 'GET', path);
    const content = atob(data.content.replace(/\n/g, ''));
    return { content, sha: data.sha };
  } catch (e) {
    if (e.message.includes('Not Found') || e.message.includes('404')) {
      return { content: fallback, sha: null };
    }
    throw e;
  }
}

async function putFile(token, path, content, sha, message) {
  const encoded = btoa(unescape(encodeURIComponent(content)));
  await apiCall(token, 'PUT', path, { message, content: encoded, ...(sha ? { sha } : {}) });
}

// ── Auth ──────────────────────────────────────────────

export async function loadAuth(token, profile) {
  const { content } = await getFile(token, `data/${profile}-auth.json`);
  if (!content) return null;
  try { return JSON.parse(content); } catch { return null; }
}

export async function saveAuth(token, profile, authObj) {
  const { sha } = await getFile(token, `data/${profile}-auth.json`);
  await putFile(token, `data/${profile}-auth.json`, JSON.stringify(authObj), sha, `auth: set password for ${profile}`);
}

// ── CSV entries ───────────────────────────────────────

function csvPath(profile) { return `data/${profile}.csv`; }

export async function appendEntry(token, entry, profile = 'default') {
  const { content, sha } = await getFile(token, csvPath(profile), CSV_HEADER);
  const line = `${entry.date},${entry.time},"${entry.name.replace(/"/g, '""')}",${entry.calories}\n`;
  await putFile(token, csvPath(profile), content + line, sha, `log: ${entry.date} ${entry.name} (${entry.calories} kcal)`);
}

export async function deleteEntry(token, entry, profile = 'default') {
  const { content, sha } = await getFile(token, csvPath(profile), CSV_HEADER);
  if (!sha) return;
  const lines = content.split('\n');
  const filtered = lines.filter(line => {
    if (!line.trim() || line.startsWith('datum,')) return true;
    const cols = parseCsvLine(line);
    return !(cols[0] === entry.date && cols[1] === entry.time && cols[3] == entry.calories);
  });
  await putFile(token, csvPath(profile), filtered.join('\n'), sha, `delete: ${entry.date} ${entry.name}`);
}

export async function loadHistory(token, profile = 'default') {
  const { content } = await getFile(token, csvPath(profile), CSV_HEADER);
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
    .map(([date, entries]) => ({ date, entries, total: entries.reduce((s, e) => s + e.calories, 0) }));
}

function parseCsvLine(line) {
  const cols = []; let cur = ''; let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (c === ',' && !inQuote) { cols.push(cur); cur = ''; }
    else cur += c;
  }
  cols.push(cur);
  return cols;
}
