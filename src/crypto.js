// Crypto helpers using WebCrypto API (runs in browser, nothing leaves the device)

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function deriveKey(password, saltHex) {
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(h => parseInt(h, 16)));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function randomHex(bytes) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password) {
  const salt = randomHex(16);
  const hash = await sha256(salt + password);
  return { salt, hash };
}

export async function verifyPassword(password, salt, hash) {
  const check = await sha256(salt + password);
  return check === hash;
}

export async function encryptText(text, password) {
  const salt = randomHex(16);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(text)
  );
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const dataHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');
  return salt + ':' + ivHex + ':' + dataHex;
}

export async function decryptText(encrypted, password) {
  const [salt, ivHex, dataHex] = encrypted.split(':');
  if (!salt || !ivHex || !dataHex) throw new Error('Ungültiges Format');
  const iv = new Uint8Array(ivHex.match(/.{2}/g).map(h => parseInt(h, 16)));
  const data = new Uint8Array(dataHex.match(/.{2}/g).map(h => parseInt(h, 16)));
  const key = await deriveKey(password, salt);
  try {
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error('Falsches Passwort');
  }
}
