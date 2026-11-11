// Download Korean OFL font subsets (only the characters the film uses) from the Google Fonts CSS API.
import { allText } from '../story.js';
import { writeFileSync, mkdirSync } from 'node:fs';
const dir = new URL('../fonts/', import.meta.url).pathname; mkdirSync(dir, { recursive: true });
const chars = [...new Set(allText().replace(/[\[\]]/g, "") + '0123456789?!.,~·…\'"%()-=≠→ abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ○:')].filter(c => c.trim() && c.codePointAt(0) < 0x1F000).join('');
const fams = [['Noto Sans KR', '700', 'NotoSansKR700'], ['Noto Sans KR', '900', 'NotoSansKR900'], ['Overpass Mono', '600', 'OverpassMono']];
let css = '';
for (const [fam, wt, file] of fams) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam)}:wght@${wt}&text=${encodeURIComponent(chars)}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36' } });
  const t = await r.text(); const m = t.match(/url\((https:[^)]+)\)/);
  if (!m) throw new Error(fam + ': ' + t.slice(0, 200));
  const buf = Buffer.from(await (await fetch(m[1])).arrayBuffer());
  writeFileSync(dir + file + '.woff2', buf);
  css += `@font-face{font-family:"${fam}";font-weight:${wt};src:url("${file}.woff2") format("woff2");}\n`;
  console.log(fam, buf.length, 'bytes');
}
writeFileSync(dir + 'fonts.css', css);
