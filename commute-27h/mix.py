"""출퇴근 27시간: 컷별 음악(마림바·글로켄슈필 펄스, 112 BPM) + 폴리 + 앰비언스 → out/mix{n}.wav, 자막 큐 → out/cues{n}.json
모두 numpy 합성. 음성 없음. 타임랩스 구간은 음악 + "빨리 감기" 히스, 실시간 구간은 진짜 동네 소리."""
import json, os, sys, subprocess
import numpy as np
import soundfile as sf
LIB = os.environ.get('LIB', '/root/lemo-opuscar'); sys.path.insert(0, os.path.join(LIB, 'core', 'audio'))
import sfx
from sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, add

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out')
rng = np.random.default_rng(11)
BEAT = 60 / 112; E8 = BEAT / 2; E16 = BEAT / 4
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)

# —— 악기 ——
def marimba(m, v=1.0, d=.8):
    f = mtof(m); tt = t_(d)
    x = np.sin(2 * np.pi * f * tt) * env_exp(d, .3) + .3 * np.sin(2 * np.pi * f * 3.93 * tt) * env_exp(d, .05) + .08 * np.sin(2 * np.pi * f * 9.2 * tt) * env_exp(d, .012)
    x[:96] *= np.linspace(0, 1, 96); return x * v
def glock(m, v=1.0, d=1.4):
    f = mtof(m); tt = t_(d)
    x = sum(a * np.sin(2 * np.pi * f * r * tt) * env_exp(d, tau) for r, a, tau in [(1, 1, .7), (2.76, .35, .25), (5.4, .2, .1)])
    x[:48] *= np.linspace(0, 1, 48); return x * v
def vib(m, v=1.0, d=1.6):
    f = mtof(m); tt = t_(d); trem = 1 + .25 * np.sin(2 * np.pi * 5.5 * tt)
    x = (np.sin(2 * np.pi * f * tt) + .15 * np.sin(4 * np.pi * f * tt)) * env_exp(d, .9) * trem
    x[:96] *= np.linspace(0, 1, 96); return x * v
def pad(ms, d, v=1.0):
    tt = t_(d); x = np.zeros_like(tt)
    for m in ms:
        f = mtof(m)
        for det in (-.1, .1): ph = 2 * np.pi * f * (1 + det / 100) * tt; x += np.sin(ph) + .25 * np.sin(2 * ph)
    return lp(x, 1500) * np.minimum(1, tt / .3) * np.minimum(1, (d - tt) / .3) * v / len(ms)
def bass(m, d, v=1.0):
    f = mtof(m); tt = t_(d)
    return (np.sin(2 * np.pi * f * tt) + .35 * np.sin(4 * np.pi * f * tt) + .15 * np.sin(6 * np.pi * f * tt)) * np.minimum(1, tt / .01) * env_exp(d, .45) * v
def shaker(v=1.0): d = .08; return bp(noise(d), 5000, 11000) * np.sin(np.pi * t_(d) / d) ** 2 * v
def kick(v=1.0):
    d = .3; tt = t_(d); f = 50 + 70 * np.exp(-tt * 30); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .09) * v

# —— 폴리 ——
def door_close(v=1.0):   # 지하철 문: 공기 쉬익 + 고무 닫힘 탁 + 짧은 차임 두 음
    d = .9; out = np.zeros(int(d * SR))
    hiss = bp(noise(.45), 1500, 6000) * np.sin(np.pi * t_(.45) / .45) ** .5; out[:len(hiss)] += hiss * .5
    th = sfx.thump(.9, 95); s = int(.42 * SR); out[s:s + len(th)] += th[:len(out) - s]
    c = sfx.clack(.6, .5); out[s:s + len(c)] += c[:len(out) - s] * .6
    return out * v
def boing(v=1.0):
    d = .7; tt = t_(d); f = 200 + 260 * np.sin(2 * np.pi * 8 * tt) * np.exp(-tt * 4) + 160 * tt
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .25) * v
def key(v=1.0, p=1.0):
    d = .05; tt = t_(d); return (hp(noise(d), 2500) * env_exp(d, .004) + .6 * np.sin(2 * np.pi * 2400 * p * tt) * env_exp(d, .01)) * v
def beep(v=1.0, f=2600): d = .07; tt = t_(d); return np.sign(np.sin(2 * np.pi * f * tt)) * .3 * np.minimum(1, (d - tt) / .01) * v
def thud(v=1.0):   # 상자 툭: 판지 + 낮은 쿵
    a = sfx.thump(1.0, 70); b = bp(noise(.12), 300, 2500) * env_exp(.12, .025); out = a.copy(); out[:len(b)] += b * .8; return out * v
def swoosh(v=1.0, up=True):   # 그래프 슈욱: 상승 스윕 + 바람
    d = .55; tt = t_(d); f = 300 * (1 + 3 * (tt / d) ** 1.5) if up else 900 - 600 * tt / d
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * .35 + sfx.whoosh(d, 1.0)[:len(tt)]
    return x * np.sin(np.pi * tt / d) * v
def hiss(d, v=1.0):   # 빨리 감기 히스 (테이프 질감)
    tt = t_(d); return hp(noise(d), 4000) * (.7 + .3 * np.sin(2 * np.pi * 8 * tt)) * v
def tick(v=1.0): return sfx.click(1.4, 1.0) * v
def sip(v=1.0): d = .3; return bp(noise(d), 600, 3000) * np.sin(np.pi * t_(d) / d) ** 3 * v
def chirp(v=1.0):
    d = .14; tt = t_(d); f = 4200 - 1800 * tt / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR + 3 * np.sin(2 * np.pi * 60 * tt)) * np.sin(np.pi * tt / d) * v
def amb(what, d):
    tt = t_(d)
    if what == 'train': x = lp(sfx.brown(d), 300) * (1 + .3 * np.sin(2 * np.pi * 1.7 * tt)) + .2 * bp(noise(d), 800, 2000) * (np.abs(np.sin(2 * np.pi * .9 * tt)) ** 8)   # 덜컹
    elif what == 'office': x = lp(sfx.brown(d), 400) * .5
    elif what == 'lapse': x = lp(sfx.brown(d), 900) * .4 + hp(noise(d), 3000) * .1
    else: x = lp(sfx.brown(d), 700) * .6 + .15 * np.sin(2 * np.pi * 48 * tt) * (1 + .2 * np.sin(2 * np.pi * 3 * tt))   # 동네: 먼 차, 공회전
    return norm(x[:int(d * SR)], 1.0)

# —— 화성: 컷별 코드 진행 (한 마디 = 4박) ——
PROG = {1: [[50, 53, 57, 60], [46, 50, 53, 57]], 2: [[50, 53, 57, 60], [45, 48, 52, 55], [46, 50, 53, 57]],
        3: [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 55], [48, 52, 55, 59]],
        4: [[48, 52, 55, 59], [41, 45, 48, 52], [43, 47, 50, 55], [48, 52, 55, 59]]}

def build(c):
    E = json.load(open(os.path.join(OUT, f'events{c}.json'))); dur = E['dur']; ev = E['ev']
    N = int(dur * SR) + SR
    mus = np.zeros((N, 2)); fol = np.zeros((N, 2)); bed = np.zeros((N, 2))
    bar = 4 * BEAT
    # 반주: 패드 + 베이스 + 마림바 펄스 (라이히식: 같은 음형을 8분음표로 반복, 컷마다 밀도 변화)
    for b in range(int(dur / bar) + 1):
        ch = PROG[c][b % len(PROG[c])]; t0 = b * bar
        if t0 >= dur: break
        add(mus, pad([m + 12 for m in ch[:3]], min(bar, dur - t0) + .2, .13), t0)
        add(mus, bass(ch[0] - 12, bar * .9, .2), t0)
        sub = E16 if (c == 3 and t0 < 4.0) or (c == 4 and t0 >= 6.0 - bar) else E8
        n = int(round(bar / sub))
        for k in range(n):
            tt = t0 + k * sub
            if tt >= dur - .02: break
            if c == 3 and 4.0 <= tt < 4.5: continue                 # 실시간: 음악 정지
            if c == 4 and 6.0 > tt and sub == E16 and False: continue
            m = [ch[0] + 24, ch[2] + 24, ch[1] + 24, ch[3] + 24, ch[2] + 24, ch[1] + 36][k % 6]
            vel = {1: .18, 2: .14, 3: .2, 4: .16}[c] * (1.15 if k % 4 == 0 else .9)
            if c == 4 and tt >= 6.0: vel *= 1.2
            if c == 4 and tt < 6.0 and sub == E16: continue
            add(mus, marimba(m, vel, .45), tt, 1.0, -.35 if k % 2 else .35)
            if c in (3, 4) and k % 2 == 0 and not (c == 3 and 4.0 <= tt < 4.5): add(mus, shaker(.06), tt + sub / 2, 1.0, .5)
            if c == 3 and tt >= 4.5 and k % 8 == 0: add(mus, kick(.3), tt)
    def mute(a, b):
        i, j = int(a * SR), int(b * SR); mus[i:j] = 0; r = 240; mus[max(0, i - r):i] *= np.linspace(1, 0, min(r, i))[:, None]
    if c == 3: mute(4.0, 4.5)
    if c == 4: mute(7.62, dur + 1)
    # 이벤트
    for e in ev:
        t, ty = e['t'], e['type']
        if ty == 'doorClose': add(fol, door_close(.9), t); add(mus, glock(81, .25), t + .55); add(mus, glock(76, .25), t + .8)
        elif ty == 'boing': add(fol, boing(.7), t); add(mus, glock(86, .3), t); mute(t - .05, t)
        elif ty == 'key': add(fol, key(.5, rng.uniform(.9, 1.1)), t, 1.0, .3); add(fol, beep(.12), t + .01, 1.0, .3)
        elif ty == 'pop': add(fol, sfx.pop(.35), t, 1.0, rng.uniform(-.3, .3)); add(mus, marimba(rng.choice([74, 77, 79, 81]), .4), t)
        elif ty == 'ding': add(fol, sfx.ding(.7), t); [add(mus, glock(m, .35), t + i * .04) for i, m in enumerate([74, 77, 81, 86])]
        elif ty == 'shock':
            add(fol, boing(.35), t + .05)
        elif ty == 'tick': add(fol, tick(.08), t, 1.0, rng.uniform(-.6, .6))
        elif ty == 'thud': add(fol, thud(1.0), t)
        elif ty == 'realtime':
            for k in range(3): add(bed, chirp(.08), t + .15 + k * .22, 1.0, rng.uniform(-.6, .6))
        elif ty == 'swoosh': add(fol, swoosh(.6), t); add(mus, glock([79, 83][e.get('n', 0)], .35), t + .45)
        elif ty == 'ting': [add(mus, glock(m, .4), t + i * .06) for i, m in enumerate([84, 88, 91])]
        elif ty == 'sip': add(fol, sip(.25), t)
        elif ty == 'speedup': add(fol, swoosh(.35), t - .3);
        elif ty == 'amb':
            d = e['d']; a = amb(e['what'], d)
            g = .1 if e['what'] != 'lapse' else .07
            add(bed, a, e['t'], g, -.1); add(bed, a[::-1].copy(), e['t'], g, .1)
            if e['what'] == 'lapse': h = hiss(d, .03); add(bed, h, e['t'], 1.0, -.2); add(bed, h[::-1].copy(), e['t'], 1.0, .2)
            if e['what'] == 'city':
                for k in range(int(d / 1.3)): add(bed, chirp(.05), e['t'] + .5 + k * 1.3 + rng.uniform(0, .4), 1.0, rng.uniform(-.7, .7))
    mus = np.stack([sfx.compress(mus[:, i], .3, 2.5) for i in (0, 1)], 1)
    fol = np.stack([sfx.compress(fol[:, i], .22, 4.0, .002, .12) for i in (0, 1)], 1)
    mix = (mus * .6 + fol * .85 + bed)[:int(dur * SR)]
    mix *= .85 / max(1e-9, np.abs(mix).max())
    sf.write(os.path.join(OUT, f'mix{c}.wav'), mix.astype(np.float32), SR)
    return dur

def cues():
    js = subprocess.run(['node', '--input-type=module', '-e', f"import {{ CUTS }} from '{HERE}/story.js'; console.log(JSON.stringify(CUTS))"], capture_output=True, text=True, check=True).stdout
    C = json.loads(js); strip = lambda s: s.replace('[', '').replace(']', '')
    for c, d in C.items():
        if c == '0': continue
        q = []
        if d.get('title'): q.append(d['title'])
        q += d.get('subs', [])
        if d.get('head'): q.append(d['head'])
        if d.get('card'): q.append({'t0': d['card']['t0'], 't1': d['card']['t1'], 'text': d['card']['word'] + ' = ' + d['card']['def']})
        q = sorted([{'t0': x['t0'], 't1': x['t1'], 'text': strip(x['text'])} for x in q], key=lambda x: x['t0'])
        json.dump(q, open(os.path.join(OUT, f'cues{c}.json'), 'w'), ensure_ascii=False)

if __name__ == '__main__':
    only = [int(a) for a in sys.argv[1:]] or [1, 2, 3, 4]
    for c in only:
        if os.path.exists(os.path.join(OUT, f'events{c}.json')): print('mix', c, build(c))
    cues()
