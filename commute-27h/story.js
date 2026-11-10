// 모든 문구와 타이밍의 단일 출처. 컷마다 t=0부터. 112 BPM (한 박 ≈ 0.536초).
export const BPM = 112, BEAT = 60 / BPM;
export const SAFE = { l: 100, r: 940, t: 250, b: 1500 };
// [단어] = 강조색

export const CUTS = {
  0: { dur: 1, subs: [] },   // 모델 확인용
  1: {
    dur: 6.0,
    // 커버: 흰 알약 소제목 + 아주 굵은 남색 두 줄 + 형광펜 띠 (사용자 레퍼런스 스타일)
    title: { pill: 'POV: 출퇴근 시간 처음 계산해 본 직장인', lines: ['출퇴근만 한 달', '27시간?!'], text: 'POV: 출퇴근 시간 처음 계산해 본 직장인 / 출퇴근만 한 달 27시간?!', t0: 0, t1: 6.0 },
    subs: [
      { text: '한 달에… [27시간]?', t0: 3.4, t1: 6.0, big: true },
    ],
  },
  2: {
    dur: 7.0,
    head: { text: '하루 평균 [74분] → 한 달 [27시간]', t0: 4.0, t1: 7.0 },
    subs: [
      { text: '출근이랑 퇴근 합치면 하루 평균 74분.', t0: .3, t1: 2.6 },
      { text: '한 달 22일 출근하면 27시간.', t0: 2.6, t1: 4.6 },
      { text: '하루를 통째로 지하철에서 보낸 거야.', t0: 4.6, t1: 7.0 },
    ],
    panels: [
      { text: '36.5분', t: .55, key: '36.5' }, { text: '+ 37.4분', t: 1.1, key: '37.4' }, { text: '= 74분', t: 1.9, key: '74' },
      { text: '× 22일', t: 2.75, key: '22' }, { text: '= [27시간]', t: 3.75, key: '27', big: true },
    ],
  },
  3: {
    dur: 9.0,
    head: { text: '이사 이유 1위 = [출퇴근 단축]', t0: 4.5, t1: 9.0 },
    subs: [
      { text: '그래서 요즘 이사 이유 1위가 출퇴근 단축, 40.2%래.', t0: .3, t1: 3.2 },
      { text: '집값 아끼려는 사람보다 두 배 넘게 많아.', t0: 3.2, t1: 6.0 },
      { text: '청약 경쟁률 상위 5개 단지도 전부 회사 가까운 곳이었고.', t0: 6.0, t1: 9.0 },
    ],
    clock: [[0, 40], [4.0, 1]],
  },
  4: {
    dur: 8.0,
    card: { word: '직주근접', def: '직장 + 주거가 가까운 것', t0: .25, t1: 8.0 },
    subs: [
      { text: "이걸 '직주근접'이라고 해. 직장과 집이 가깝다는 뜻이야.", t0: .3, t1: 3.0 },
      { text: '집 볼 땐 월세만 보지 말고 출퇴근 시간도 꼭 계산해 봐.', t0: 3.0, t1: 5.8 },
      { text: '안 그러면 너도 한 달에…', t0: 5.8, t1: 8.0 },
    ],
    clock: [[0, 1], [6.0, 40]],
  },
};
export const PROPS = { office: '회사', home: '새 집', walk: '도보 1분', bar1: ['출퇴근 단축', '40.2%'], bar2: ['주거비 절약', '17.8%'], line: '2호선', calc: '0123456789.' };

export function allText() {
  const out = [];
  for (const c of Object.values(CUTS)) {
    if (c.title) out.push(c.title.text, ...(c.title.lines || []), c.title.pill || '');
    if (c.head) out.push(c.head.text);
    if (c.card) out.push(c.card.word, c.card.def);
    (c.subs || []).forEach(s => out.push(s.text));
    (c.panels || []).forEach(s => out.push(s.text));
  }
  const walk = v => typeof v === 'string' ? out.push(v) : Array.isArray(v) ? v.forEach(walk) : null;
  Object.values(PROPS).forEach(walk);
  out.push('×40 TIME-LAPSE ×1 REAL TIME');
  return out.join('');
}
