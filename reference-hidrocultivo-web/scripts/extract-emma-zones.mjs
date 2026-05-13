import https from 'https';

const url = 'https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-spain';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

const xml = await get(url);
const pairs = new Map();
const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
let em;
while ((em = entryRe.exec(xml))) {
  const block = em[1];
  const geocode = block.match(/<valueName>EMMA_ID<\/valueName>\s*<value>([^<]+)<\/value>/);
  const area = block.match(/<cap:areaDesc>([^<]*)<\/cap:areaDesc>/);
  if (geocode && area) pairs.set(geocode[1], area[1]);
}
console.log(JSON.stringify([...pairs.entries()].sort((a, b) => a[0].localeCompare(b[0])), null, 2));
