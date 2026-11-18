// 스토리보드 시트: 정지 화면 + 한국어 설명을 HTML로 배치해 한 장으로 캡처
import { chromium } from '/root/lemo-opuscar/node_modules/playwright-core/index.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const HERE = new URL('..', import.meta.url).pathname;
const S = JSON.parse(readFileSync(HERE + 'tools/board.json', 'utf8'));
const cells = S.map(s => `<div class=c><img src="file://${HERE}stills/${s.f}"><b>${s.n}</b> <span class=m>${s.m}</span><p>${s.d}</p></div>`).join('');
const html = `<html><head><style>@font-face{font-family:Jua;src:url(file://${HERE}fonts/Jua.woff2)}body{margin:0;background:#f6f1ea;font-family:Jua;color:#4a3426;width:2400px;padding:24px;box-sizing:border-box}
h1{margin:4px 8px 18px;font-size:40px}.g{display:grid;grid-template-columns:repeat(5,1fr);gap:20px}.c{background:#fff;border-radius:14px;padding:10px;font-size:24px}img{width:100%;border-radius:8px;display:block;margin-bottom:8px}.m{color:#a07a5a;font-size:20px}p{margin:6px 0 2px;font-size:21px;line-height:1.35}</style></head>
<body><h1>아파트 주차대수별 분위기 · 스토리보드 (9:16, 컷1 5초 / 컷2 7초 / 컷3 12초 / 컷4 6초)</h1><div class=g>${cells}</div></body></html>`;
writeFileSync(HERE + 'stills/board.html', html);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 2400, height: 800 } });
await p.goto('file://' + HERE + 'stills/board.html'); await p.waitForTimeout(800);
await p.screenshot({ path: HERE + 'storyboard.jpg', fullPage: true, type: 'jpeg', quality: 88 }); await b.close();
