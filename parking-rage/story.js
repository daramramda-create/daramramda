// 모든 문구와 타이밍의 단일 출처. 컷마다 t=0부터. 게이지 = [[시각, %]].
export const BPM = 116, BEAT = 60 / BPM;
export const SAFE = { l: 100, r: 940, t: 250, b: 1500 };
// [단어] = 강조색

export const CUTS = {
  0: { dur: 1, subs: [] },
  1: {
    dur: 5.0,
    title: { pill: '2030 부동산 숏츠', lines: ['아파트', '주차대수별 분위기'], text: '아파트 주차대수별 분위기', t0: 0, t1: 3.2, dy: 120 },
    subs: [{ text: '분노 게이지 [0%]', t0: .5, t1: 5.0, big: true }],
    gauge: [[0, 0]],
  },
  2: {
    dur: 7.0,
    cards: [{ text: '1.7대↑', t: .1 }, { text: '1.3대', t: 3.5 }],
    subs: [
      { text: '1.7↑ [여유]', t0: .35, t1: 3.5, big: true },
      { text: '1.3 [낫배드]', t0: 3.75, t1: 7.0, big: true },
    ],
    gauge: [[0, 0], [2.2, 0], [3.4, 12], [5.0, 12], [6.9, 30]],
  },
  3: {
    dur: 12.0, redden: true, boom: 10.0,
    cards: [{ text: '1.1대', t: .1 }, { text: '0.8대', t: 3.1 }, { text: '0.6대↓', t: 6.6 }],
    subs: [
      { text: '1.1 [슬슬 킹받음]', t0: .35, t1: 3.1, big: true },
      { text: '0.8 [멱살각]', t0: 3.35, t1: 6.6, big: true },
      { text: '0.6 [책임happy]', t0: 6.85, t1: 10.0, big: true },
      { text: '💢 [100%]', t0: 10.1, t1: 12.0, big: true },
    ],
    gauge: [[0, 30], [.6, 30], [2.9, 55], [3.6, 55], [6.4, 80], [7.3, 80], [9.8, 100]],
  },
  4: {
    dur: 6.0, sooty: true,
    subs: [],
    gauge: [[0, 100]],
  },
};
export const PROPS = {
  b1: 'B1', b2: 'B2 ↓', b5: 'B5', gate: '지하주차장', ent: '입구', limit: '높이제한 2.3m', resident: '입주민 전용', inOk: '입차 가능', slow: '천천히', apt3: '103동', apt: '101동', apt2: '102동', clock: '06:00', board: ['세대당 주차대수', '= 총 주차면수', '÷ 세대수'],
  ring: '따르릉', call: '차 빼주세요', honk: '빵빵', sigh: '하아…', cough: '콜록', gaugeLabel: '분노 게이지',
};

export function allText() {
  const out = [];
  for (const c of Object.values(CUTS)) {
    if (c.title) out.push(c.title.text, ...(c.title.lines || []), c.title.pill || '');
    (c.subs || []).forEach(s => out.push(s.text));
    (c.cards || []).forEach(s => out.push(s.text));
  }
  const walk = v => typeof v === 'string' ? out.push(v) : Array.isArray(v) ? v.forEach(walk) : null;
  Object.values(PROPS).forEach(walk);
  return out.join('') + '0123456789%↑↓→÷=+';
}
