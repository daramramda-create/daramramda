// 모든 문구와 타이밍의 단일 출처. 컷마다 t=0부터 시작한다. 120 BPM: 한 박 0.5초, 8분음표 0.25초.
export const BEAT = .5;
export const W = 1080, H = 1920;
// 릴스 안전지대 (픽셀): 핵심 그림과 글자는 이 안쪽에만
export const SAFE = { l: 100, r: 940, t: 250, b: 1500 };

export const CUTS = {
  1: {
    dur: 4.0, key: 'major',
    title: { text: "pov : 싸고 넓은 빌라 구했는데\n서류에 '근린생활시설'이라고\n적혀 있을 때", t0: 0, t1: 4.0 },
    bubbles: [{ who: 'sq', kind: 'say', text: '이 넓이에 이 가격?\n완전 땡잡았다!', t0: 1.85, t1: 4.0 }],
    subs: [],
  },
  2: {
    dur: 8.0, key: 'minor',
    bubbles: [
      { who: 'clerk', kind: 'say', text: '고객님, 이 집은 건축물대장상\n주택이 아니라서요…', t0: 1.0, t1: 4.5 },
      { who: 'sq', kind: 'think', text: '네? 사람 사는 집인데\n집이 아니라고요?', t0: 4.75, t1: 8.0 },
    ],
    head: { text: '🚨 전세대출 막힘', t0: 3.0, t1: 8.0 },
    subs: [],
  },
  3: {
    dur: 8.0, key: 'minor',
    head: { text: '집처럼 생겼지만 서류상 상가 😱', t0: 4.5, t1: 8.0 },
    subs: [{ text: "알고 보니 원래 상가 용도로 허가받은 건물을\n집처럼 꾸며놓은 '근생빌라'였던 거예요.", t0: 3.0, t1: 8.0 }],
    bubbles: [],
  },
  4: {
    dur: 10.0, key: 'major',
    subs: [
      { text: '근린생활시설은 편의점·카페·사무실처럼\n동네 생활에 필요한 시설 용도라서 주거용이 아니에요', t0: .25, t1: 3.75 },
      { text: '여기서 살면 불법 용도변경 위반건축물이 될 수 있고,\n전세대출이나 보증보험도 막힐 수 있어요', t0: 3.75, t1: 7.0 },
      { text: "계약 전 건축물대장 '용도' 칸 꼭 확인!", t0: 7.0, t1: 10.0 },
    ],
    bubbles: [],
    board: ['근린생활시설 = 상가 용도', '≠ 주택', '→ 건축물대장 용도 체크 ✅'],
  },
};

// 3D 소품에 찍히는 글자 (텍스처)
export const PROPS = {
  ledgerTitle: '건축물대장',
  ledgerRows: [['대지위치', '○○시 ○○동 123-4'], ['주구조', '철근콘크리트구조'], ['용도', ''], ['층수', '지상 4층']],
  stamp: '제2종\n근린생활시설',
  shop: '상가',
  bank: '다람은행',
  price: '싸다!',
  desk: '대출 창구',
  boardTitle: '근린생활시설',
  icons: ['편의점', '카페', '사무실', '주택'],
  docs: '전세대출 신청서',
};

export function allText() {
  const out = [];
  for (const c of Object.values(CUTS)) {
    if (c.title) out.push(c.title.text);
    if (c.head) out.push(c.head.text);
    (c.subs || []).forEach(s => out.push(s.text));
    (c.bubbles || []).forEach(s => out.push(s.text));
    (c.board || []).forEach(s => out.push(s));
  }
  const walk = v => typeof v === 'string' ? out.push(v) : Array.isArray(v) ? v.forEach(walk) : null;
  Object.values(PROPS).forEach(walk);
  return out.join('');
}
