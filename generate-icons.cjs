const fs = require('fs');
const zlib = require('zlib');

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function makePNG(W, H, drawFn) {
  const buf = Buffer.alloc(W * H * 4, 0);

  function setPixel(x, y, r, g, b, a) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const i = (y * W + x) * 4;
    const aa = a / 255, oa = buf[i + 3] / 255;
    const na = aa + oa * (1 - aa);
    if (na === 0) return;
    buf[i]     = Math.round((r * aa + buf[i]     * oa * (1 - aa)) / na);
    buf[i + 1] = Math.round((g * aa + buf[i + 1] * oa * (1 - aa)) / na);
    buf[i + 2] = Math.round((b * aa + buf[i + 2] * oa * (1 - aa)) / na);
    buf[i + 3] = Math.round(na * 255);
  }

  drawFn(W, H, setPixel);

  function crc32(b) {
    const t = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    let c = 0xFFFFFFFF;
    for (let i = 0; i < b.length; i++) c = t[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const t = Buffer.from(type);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crc]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6;

  const rows = [];
  for (let y = 0; y < H; y++) {
    const row = Buffer.alloc(1 + W * 4); row[0] = 0;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      row[1 + x * 4] = buf[i]; row[2 + x * 4] = buf[i + 1];
      row[3 + x * 4] = buf[i + 2]; row[4 + x * 4] = buf[i + 3];
    }
    rows.push(row);
  }
  const compressed = zlib.deflateSync(Buffer.concat(rows), { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

function drawIcon(W, H, setPixel) {
  const r = W * 0.22;

  // --- Background ---
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = Math.max(0, Math.max(r - x, x - (W - 1 - r)));
      const dy = Math.max(0, Math.max(r - y, y - (H - 1 - r)));
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > r + 0.5) continue;
      const alpha = dist > r - 0.5 ? Math.round((r + 0.5 - dist) * 255) : 255;

      const nx = x / W - 0.5, ny = y / H - 0.5;
      const dr = Math.sqrt((nx + 0.12) ** 2 + (ny + 0.22) ** 2);
      const t = clamp(dr / 0.72, 0, 1);
      let bgR, bgG, bgB;
      if (t < 0.45) {
        const u = t / 0.45;
        bgR = Math.round(lerp(110, 34, u)); bgG = Math.round(lerp(224, 197, u)); bgB = Math.round(lerp(101, 94, u));
      } else {
        const u = (t - 0.45) / 0.55;
        bgR = Math.round(lerp(34, 21, u)); bgG = Math.round(lerp(197, 128, u)); bgB = Math.round(lerp(94, 61, u));
      }
      setPixel(x, y, bgR, bgG, bgB, alpha);

      // Top-left glow
      const gd = Math.sqrt((nx + 0.25) ** 2 + (ny + 0.32) ** 2);
      const ga = Math.max(0, (0.52 - gd) / 0.52) * 50;
      if (ga > 0) setPixel(x, y, 255, 255, 255, Math.round(ga * alpha / 255));
    }
  }

  const sc = W / 512;
  const cx = W / 2, cy = H / 2;
  const aOff = 10 * sc;

  function circle(px, py, rad, R, G, B, A) {
    for (let iy = Math.floor(py - rad - 1); iy <= py + rad + 1; iy++) {
      for (let ix = Math.floor(px - rad - 1); ix <= px + rad + 1; ix++) {
        const d = Math.sqrt((ix - px) ** 2 + (iy - py) ** 2);
        const a = clamp(rad + 0.5 - d, 0, 1);
        if (a > 0) setPixel(ix, iy, R, G, B, Math.round(A * a));
      }
    }
  }

  function line(x1, y1, x2, y2, lw, R, G, B, A) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) return;
    const steps = Math.ceil(len * 2.5);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      circle(x1 + dx * t, y1 + dy * t, lw / 2, R, G, B, A);
    }
  }

  function arc(acx, acy, rad, a1, a2, lw, R, G, B, A) {
    const steps = Math.ceil(Math.abs(a2 - a1) * rad * 2.5);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = a1 + (a2 - a1) * t;
      circle(acx + Math.cos(a) * rad, acy + Math.sin(a) * rad, lw / 2, R, G, B, A);
    }
  }

  // --- Swirl arcs ---
  arc(cx, cy + aOff, 195 * sc, Math.PI * 1.08, Math.PI * 1.92, 7 * sc, 255, 255, 255, 85);
  arc(cx, cy + aOff, 195 * sc, Math.PI * (-0.05), Math.PI * 0.88, 7 * sc, 255, 255, 255, 85);

  // --- Apple body fill ---
  const aW = 128 * sc, aH = 90 * sc, aCy = cy + aOff;
  for (let iy = Math.round(aCy - aH - 10 * sc); iy <= aCy + aH * 1.1; iy++) {
    for (let ix = Math.round(cx - aW - 5); ix <= cx + aW + 5; ix++) {
      const nx = (ix - cx) / aW, ny = (iy - aCy) / aH;
      const inLeft  = (nx + 0.52) ** 2 + (ny + 0.18) ** 2 < 0.56 ** 2;
      const inRight = (nx - 0.52) ** 2 + (ny + 0.18) ** 2 < 0.56 ** 2;
      const inBot   = nx ** 2 + (ny - 0.28) ** 2 < 0.74 ** 2;
      if (!((ny > -0.18) && (inLeft || inRight) && inBot)) continue;
      const dr2 = Math.sqrt((nx + 0.1) ** 2 + (ny + 0.15) ** 2);
      const t2 = clamp(dr2 / 0.85, 0, 1);
      const aR = Math.round(lerp(74, 20, t2)), aG = Math.round(lerp(222, 90, t2)), aB = Math.round(lerp(128, 10, t2));
      setPixel(ix, iy, aR, aG, aB, 255);
    }
  }
  // Apple highlight
  for (let iy = Math.round(aCy - aH); iy <= aCy + aH; iy++) {
    for (let ix = Math.round(cx - aW); ix <= cx + aW; ix++) {
      const nx = (ix - cx) / aW, ny = (iy - aCy) / aH;
      const inLeft  = (nx + 0.52) ** 2 + (ny + 0.18) ** 2 < 0.56 ** 2;
      const inRight = (nx - 0.52) ** 2 + (ny + 0.18) ** 2 < 0.56 ** 2;
      const inBot   = nx ** 2 + (ny - 0.28) ** 2 < 0.74 ** 2;
      if (!((ny > -0.18) && (inLeft || inRight) && inBot)) continue;
      const hd = Math.sqrt((nx + 0.44) ** 2 + (ny + 0.18) ** 2);
      const ha = Math.max(0, (0.52 - hd) / 0.52) * 72;
      if (ha > 0) setPixel(ix, iy, 255, 255, 255, Math.round(ha));
    }
  }

  // --- Stem ---
  line(cx + 5 * sc, aCy - 30 * sc, cx + 20 * sc, aCy - 90 * sc, 9 * sc, 255, 255, 255, 230);

  // --- Leaf (bezier approximation) ---
  const lx1 = cx + 18 * sc, ly1 = aCy - 72 * sc;
  const lx2 = cx + 85 * sc, ly2 = aCy - 58 * sc;
  const lxm = cx + 50 * sc, lym = aCy - 115 * sc;
  for (let t = 0; t <= 1; t += 0.003) {
    const bx = lx1 * (1-t)**2 + lxm * 2*t*(1-t) + lx2 * t**2;
    const by = ly1 * (1-t)**2 + lym * 2*t*(1-t) + ly2 * t**2;
    // Fill leaf by interpolating from start point
    line(lx1, ly1, bx, by, 3 * sc, 255, 255, 255, 220);
  }

  // --- Inner ring ---
  arc(cx, aCy + 30 * sc, 95 * sc, 0, Math.PI * 2, 4 * sc, 255, 255, 255, 100);

  // --- Fork ---
  const fkX = cx - 42 * sc;
  line(fkX, aCy + 125 * sc, fkX, aCy + 25 * sc, 11 * sc, 255, 255, 255, 255);
  line(fkX, aCy + 25 * sc, fkX, aCy + 10 * sc, 14 * sc, 255, 255, 255, 255);
  const tines = [-12 * sc, -3 * sc, 6 * sc];
  for (const dx of tines) {
    line(fkX + dx, aCy + 25 * sc, fkX + dx, aCy - 25 * sc, 7 * sc, 255, 255, 255, 255);
  }
  arc(fkX - 3 * sc, aCy - 25 * sc, 13 * sc, Math.PI, 0, 7 * sc, 255, 255, 255, 255);

  // --- Knife ---
  const knX = cx + 20 * sc;
  line(knX, aCy + 125 * sc, knX, aCy + 18 * sc, 11 * sc, 255, 255, 255, 255);
  for (let t = 0; t <= 1; t += 0.012) {
    const bx2 = knX * (1-t)**2 + (knX + 18*sc) * 2*t*(1-t) + (cx + 34*sc) * t**2;
    const by2 = (aCy + 18*sc) * (1-t)**2 + (aCy - 28*sc) * 2*t*(1-t) + (aCy - 82*sc) * t**2;
    circle(bx2, by2, 5 * sc, 255, 255, 255, 255);
  }
}

for (const size of [192, 512]) {
  const png = makePNG(size, size, drawIcon);
  fs.writeFileSync('public/icon-' + size + '.png', png);
  console.log('Generated icon-' + size + '.png (' + png.length + ' bytes)');
}
