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
    cards: [{ text: '1.7대↑', t: .1 }, { text: '1.5대', t: 2.35 }, { text: '1.3대', t: 4.65 }],
    subs: [
      { text: '1.7↑ [해탈] 🙏', t0: .35, t1: 2.35, big: true },
      { text: '1.5 [럭키비키] ✌️', t0: 2.6, t1: 4.65, big: true },
      { text: '1.3 [킹받음]', t0: 4.9, t1: 7.0, big: true },
    ],
    gauge: [[0, 0], [1.2, 0], [2.3, 10], [3.6, 10], [4.6, 20], [5.8, 20], [6.9, 30]],
  },
  3: {
    dur: 12.0, redden: true, boom: 10.0,
    cards: [{ text: '1.1대', t: .1 }, { text: '0.8대', t: 3.1 }, { text: '0.6대↓', t: 6.6 }],
    subs: [
      { text: '1.1 [던전]', t0: .35, t1: 3.1, big: true },
      { text: '0.8 [멱살각]', t0: 3.35, t1: 6.6, big: true },
      { text: '0.6 [모닝콜]', t0: 6.85, t1: 10.0, big: true },
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
  b1: 'B1', b2: 'B2 ↓', b5: 'B5', gate: '지하주차장', ent: '입구', apt: '101동', apt2: '102동', clock: '06:00', board: ['세대당 주차대수', '= 총 주차면수', '÷ 세대수'],
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
