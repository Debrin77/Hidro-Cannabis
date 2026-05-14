import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const basePath = path.join(__dirname, '..', 'data', 'meteoalarm-emma-centroids.json');
const ovPath = path.join(__dirname, '..', 'data', 'meteoalarm-emma-overrides.json');

const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
const ov = JSON.parse(fs.readFileSync(ovPath, 'utf8'));

base.zones.forEach((z) => {
  const o = ov[z.emma];
  if (o && typeof o.lat === 'number' && typeof o.lon === 'number') {
    z.lat = o.lat;
    z.lon = o.lon;
  }
});

fs.writeFileSync(basePath, JSON.stringify(base, null, 2), 'utf8');
console.log('Merged overrides into', basePath);
