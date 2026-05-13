import https from 'https';

const xml = await new Promise((resolve, reject) => {
  https.get('https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-spain', (res) => {
    let d = '';
    res.on('data', (c) => (d += c));
    res.on('end', () => resolve(d));
  }).on('error', reject);
});

const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
let em;
while ((em = entryRe.exec(xml))) {
  const block = em[1];
  const emma = block.match(/<valueName>EMMA_ID<\/valueName>\s*<value>(ES24[0-9])<\/value>/);
  if (!emma) continue;
  const area = block.match(/<cap:areaDesc>([^<]*)<\/cap:areaDesc>/);
  const event = block.match(/<cap:event>([^<]*)<\/cap:event>/);
  const title = block.match(/<title>([^<]*)<\/title>/);
  if (area && area[1].includes('Castell')) {
    console.log(emma[1], area[1], '|', event ? event[1] : '', '|', title ? title[1].slice(0, 60) : '');
  }
}
