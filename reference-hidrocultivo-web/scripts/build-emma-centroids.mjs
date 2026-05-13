/**
 * Genera data/meteoalarm-emma-centroids.json desde el feed Atom (requiere red).
 * Política Nominatim: ~1 petición/s.
 */
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '..', 'data', 'meteoalarm-emma-centroids.json');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'HidroCultivo-build/1.0' } }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const feedUrl = 'https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-spain';
const xml = await get(feedUrl);
const pairs = new Map();
const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
let em;
while ((em = entryRe.exec(xml))) {
  const block = em[1];
  const geocode = block.match(/<valueName>EMMA_ID<\/valueName>\s*<value>([^<]+)<\/value>/);
  const area = block.match(/<cap:areaDesc>([^<]*)<\/cap:areaDesc>/);
  if (geocode && area) pairs.set(geocode[1], area[1]);
}

const list = [...pairs.entries()].sort((a, b) => a[0].localeCompare(b[0]));
const results = [];

for (let i = 0; i < list.length; i++) {
  const [emma, areaDesc] = list[i];
  const q = `${areaDesc}, España`;
  const url =
    'https://nominatim.openstreetmap.org/search?q=' +
    encodeURIComponent(q) +
    '&format=json&limit=1&countrycodes=es';
  try {
    const txt = await get(url);
    const arr = JSON.parse(txt);
    if (Array.isArray(arr) && arr[0] && arr[0].lat && arr[0].lon) {
      results.push({
        emma,
        areaDesc,
        lat: parseFloat(arr[0].lat),
        lon: parseFloat(arr[0].lon),
      });
      console.error('OK', emma, areaDesc);
    } else {
      console.error('MISS', emma, areaDesc);
      results.push({ emma, areaDesc, lat: null, lon: null });
    }
  } catch (e) {
    console.error('ERR', emma, e.message);
    results.push({ emma, areaDesc, lat: null, lon: null });
  }
  await sleep(1100);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({ generated: new Date().toISOString(), zones: results }, null, 2), 'utf8');
console.log('Wrote', outPath, 'count', results.length);
