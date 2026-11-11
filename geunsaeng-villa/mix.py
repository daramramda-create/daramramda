"""근생빌라: 컷별 음악(이벤트 구동 마림바·칼림바·벨 + 패드·셰이커) + 폴리 + 앰비언스 → out/mix{n}.wav, 자막 큐 → out/cues{n}.json
모두 numpy로 합성 (샘플 다운로드 없음). 120 BPM, 한 박 0.5초. 음성 없음."""
import json, os, sys
import numpy as np
import soundfile as sf
LIB = os.environ.get('LIB', '/root/lemo-opuscar'); sys.path.insert(0, os.path.join(LIB, 'core', 'audio'))
import sfx
from sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, add

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
rng = np.random.default_rng(7)
BEAT = .5
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)

# —— 악기 ——
def marimba(m, v=1.0, d=.9):
    f = mtof(m); tt = t_(d)
    x = np.sin(2 * np.pi * f * tt) * env_exp(d, .32) + .32 * np.sin(2 * np.pi * f * 3.93 * tt) * env_exp(d, .06) + .1 * np.sin(2 * np.pi * f * 9.2 * tt) * env_exp(d, .015)
    x[:96] *= np.linspace(0, 1, 96)
    return x * v
def kalimba(m, v=1.0, d=1.0):
    f = mtof(m); tt = t_(d)
    x = np.sin(2 * np.pi * f * tt) * env_exp(d, .45) + .25 * np.sin(2 * np.pi * f * 5.4 * tt) * env_exp(d, .05) + .08 * hp(noise(d), 3000) * env_exp(d, .003)
    x[:48] *= np.linspace(0, 1, 48)
    return x * v
def bell(m, v=1.0, d=2.2):
    f = mtof(m); tt = t_(d)
    x = sum(a * np.sin(2 * np.pi * f * r * tt) * env_exp(d, tau) for r, a, tau in [(1, 1, .9), (2.76, .45, .4), (5.4, .25, .2), (8.9, .12, .1)])
    x[:48] *= np.linspace(0, 1, 48)
    return x * v
def pad(ms, d, v=1.0):
    tt = t_(d); x = np.zeros_like(tt)
    for m in ms:
        f = mtof(m)
        for det in (-.12, .12):
            ph = 2 * np.pi * f * (1 + det / 100) * tt
            x += np.sin(ph) + .3 * np.sin(2 * ph) + .12 * np.sin(3 * ph)
    x = lp(x, 1800)
    a = np.minimum(1, tt / .25) * np.minimum(1, (d - tt) / .3)
    return x * a * v / len(ms)
def bass(m, d, v=1.0):
    f = mtof(m); tt = t_(d)
    x = np.sin(2 * np.pi * f * tt) + .35 * np.sin(4 * np.pi * f * tt) + .18 * np.sin(6 * np.pi * f * tt)
    return x * np.minimum(1, tt / .01) * env_exp(d, .5) * v
def shaker(v=1.0):
    d = .09; return bp(noise(d), 5000, 11000) * np.sin(np.pi * t_(d) / d) ** 2 * v
def kick(v=1.0):
    d = .3; tt = t_(d); f = 50 + 70 * np.exp(-tt * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .09) * v

# —— 폴리 ——
def rise_snd(v=1.0, big=False):   # 아래에서 솟는 블록: 상승 스윕 + 먼지
    d = .45 if big else .3; tt = t_(d); f = (140 if big else 260) * (1 + 1.4 * tt / d)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d) ** 2 + .4 * bp(noise(d), 800, 3000) * env_exp(d, .05)
    return x * v
def knock(v=1.0, p=1.0):   # 나무 노크 + 작은 바운스
    a = sfx.clack(p, 1.0); b = sfx.clack(p * 1.1, .4); out = np.zeros(len(a) + int(.09 * SR)); out[:len(a)] += a; out[int(.09 * SR):int(.09 * SR) + len(b)] += b
    return out * v
def woodblock(p=1.0, v=1.0):
    d = .12; tt = t_(d); return (np.sin(2 * np.pi * 820 * p * tt) * env_exp(d, .025) + .5 * hp(noise(d), 2000) * env_exp(d, .002)) * v
def paper(v=1.0):
    d = .3; return bp(noise(d), 2000, 7000) * np.sin(np.pi * t_(d) / d) * v
def siren(d, v=1.0):
    tt = t_(d); f = np.where((tt % .5) < .25, 760, 960)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = lp(np.sign(np.sin(ph)) * .5 + np.sin(ph), 2200)
    return x * np.minimum(1, tt / .05) * np.minimum(1, (d - tt) / .3) * v
def slide_down(v=1.0, d=.6):   # 충격: 미끄러져 내려가는 휘파람
    tt = t_(d); f = 1300 * (1 - .75 * (tt / d) ** .7)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d) * v
def boing(v=1.0):
    d = .5; tt = t_(d); f = 180 + 160 * np.sin(2 * np.pi * 9 * tt) * np.exp(-tt * 5) + 120 * tt
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .18) * v
def stamp_hit(v=1.0):
    a = sfx.thump(1.0, 52); c = sfx.clack(.7, .8); ink = bp(noise(.08), 1500, 5000) * env_exp(.08, .01)
    out = np.zeros(len(a)); out += a; out[:len(c)] += c * .7; out[:len(ink)] += ink * .5
    return out * v
def chalk(d, v=1.0):
    tt = t_(d); am = np.abs(np.sin(2 * np.pi * 7 * tt)) ** 2 * (.6 + .4 * np.sin(2 * np.pi * 2.3 * tt))
    return bp(noise(d), 2500, 8000) * am * v
def chirp(v=1.0):
    d = .14; tt = t_(d); f = 4200 - 1800 * tt / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR + 3 * np.sin(2 * np.pi * 60 * tt)) * np.sin(np.pi * tt / d) * v

def amb(what, d):
    n = int(d * SR)
    if what == 'room': x = lp(sfx.brown(d), 500) * .35
    elif what == 'bank': x = bp(sfx.brown(d), 250, 1100) * (.7 + .3 * np.sin(2 * np.pi * .7 * t_(d)))
    elif what == 'drone': x = lp(sfx.brown(d), 300) * .4 + .25 * np.sin(2 * np.pi * 55 * t_(d))
    else: x = lp(sfx.brown(d), 600) * .3
    return norm(x[:n], 1.0)

# —— 화성 (마디 = 2초) ——
SCALES = {'major': [60, 62, 64, 67, 69], 'minor': [57, 60, 62, 64, 67]}
PROG = {1: [[48, 52, 55], [53, 57, 60]],
        2: [[45, 48, 52], [41, 45, 48], [38, 41, 45], [40, 44, 47]],
        3: [[38, 41, 45], [45, 48, 52], [41, 45, 48], [40, 44, 47]],
        4: [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50], [48, 52, 55]]}
KEY = {1: 'major', 2: 'minor', 3: 'minor', 4: 'major'}
def deg(n, key, octv=1):
    sc = SCALES[key]; return sc[n % 5] + 12 * (octv + n // 5)

def build(c):
    E = json.load(open(os.path.join(OUT, f'events{c}.json'))); dur = E['dur']; ev = E['ev']
    N = int(dur * SR) + SR
    mus = np.zeros((N, 2)); fol = np.zeros((N, 2)); bed = np.zeros((N, 2))
    key = KEY[c]
    # 반주: 패드 + 베이스 + 마림바 오스티나토 + 셰이커/킥
    for b, ch in enumerate(PROG[c]):
        t0 = b * 2.0
        if t0 >= dur: break
        d = min(2.0, dur - t0) + .2
        add(mus, pad([m + 12 for m in ch], d, .16), t0, 1.0)
        add(mus, bass(ch[0] - 12 if ch[0] > 44 else ch[0], 1.9, .22), t0)
        if c == 2 and t0 >= 2.0: add(mus, bass(ch[0], .9, .12), t0 + 1.0)
        for k in range(8):
            tt = t0 + k * .25
            if tt >= dur - .05: break
            if c == 3 and 2.75 <= tt < 3.5: continue          # 반전 직전 비우기
            if c == 2 and 4.25 <= tt < 4.75: continue
            arp = [ch[0] + 24, ch[1] + 24, ch[2] + 24, ch[1] + 24][k % 4]
            dens = {1: 1, 2: .55 if tt < 2.6 else .35, 3: .35 if tt < 3.5 else .6, 4: .7}[c]
            if (c in (2, 3)) and k % 2: continue           # 마이너 컷은 4분음표로 얇게
            add(mus, marimba(arp, .22 * dens, .5), tt, 1.0, (-.3 if k % 2 else .3))
            if c in (1, 4) and k % 2 == 0: add(mus, shaker(.09), tt + .125, 1.0, .5)
            if c in (1, 4) and k % 4 == 0: add(mus, kick(.35), tt)
            if c == 3 and tt >= 3.5 and k % 4 == 0: add(mus, kick(.4), tt)
    # 무음 구간 (음악 버스 디지털 0)
    def mute(a, b):
        i, j = int(a * SR), int(b * SR); ramp = 240
        mus[i:j] = 0; mus[max(0, i - ramp):i] *= np.linspace(1, 0, min(ramp, i))[:, None]
    for e in ev:
        if e['type'] == 'silence': mute(e['t'], e['t'] + e.get('d', .25))
        if e['type'] == 'gap': mute(e['t'], e['t'] + .2)
    # 이벤트 → 음과 폴리
    up = 0
    for e in ev:
        t, ty = e['t'], e['type']; n = e.get('n', 0)
        if ty == 'tile':
            add(fol, rise_snd(.5), t); add(mus, marimba(deg(n, key, 0), .5), t, 1.0, -.2)
        elif ty == 'pop':
            add(fol, knock(.45 if e.get('big') else .3, 1.2 - .05 * n), t, 1.0, rng.uniform(-.4, .4)); add(mus, marimba(deg(n, key, 1), .55), t, 1.0, rng.uniform(-.3, .3))
        elif ty == 'rise':
            add(fol, rise_snd(.8, True), t); add(fol, sfx.thump(.5, 80), t + .22); add(mus, bell(deg(4, key, 1), .45), t + .22)
        elif ty == 'jump':
            add(fol, sfx.whoosh(.45, .45), t - .05); add(fol, boing(.35), t)
        elif ty == 'crouch':
            add(fol, sfx.creak(.18), t)
        elif ty == 'land':
            add(fol, sfx.thump(.7, 75), t); add(fol, bp(noise(.3), 300, 2000) * env_exp(.3, .08) * .25, t)
            if e.get('buzz'): add(fol, sfx.clack(.6, .5), t); add(mus, marimba(45, .5), t)
        elif ty == 'bubble':
            add(mus, kalimba(deg(3, key, 1), .35), t); add(mus, kalimba(deg(5, key, 1), .3), t + .125)
        elif ty == 'paper':
            add(fol, paper(.35), t)
        elif ty == 'wood':
            add(fol, woodblock(1.0 if n % 2 else 1.25, .55), t, 1.0, -.5 if n % 2 else .5)
        elif ty == 'siren':
            add(fol, siren(e['d'], .09), t); add(fol, sfx.thump(.4, 60), t)
        elif ty == 'shock':
            if c == 2: add(fol, slide_down(.3), t)
            else: add(fol, boing(.4), t); add(fol, slide_down(.25, .5), t + .05)
        elif ty == 'whoosh':
            add(fol, sfx.whoosh(.3, .5), t)
        elif ty == 'stamp':
            add(fol, stamp_hit(1.0), t); add(mus, bass(33, 1.2, .45), t); add(mus, marimba(45, .6), t)
        elif ty == 'lift':
            add(fol, sfx.creak(.4), t); add(fol, sfx.creak(.3), t + .18); add(fol, sfx.rumble(.8, .25), t)
        elif ty == 'chalk':
            add(fol, chalk(e.get('d', .8), .14), t)
        elif ty == 'check':
            s = t + .25
            add(fol, sfx.thump(.6, 90), s); add(fol, sfx.clack(1.3, .6), s); add(mus, bell(deg(5, key, 1), .5), s)
            for i, m in enumerate([0, 2, 4]): add(mus, kalimba(deg(m + 5, key, 1), .3), s + .25 + i * .125)
        elif ty == 'bell':
            add(mus, bell(deg(7, key, 1), .4), t + 1.75)
        elif ty == 'head':
            add(mus, kalimba(deg(7, key, 1), .3), t)
        elif ty == 'cut':
            add(fol, sfx.whoosh(.18, .12), t - .09)
        elif ty == 'amb':
            a = amb(e['what'], e['d']); add(bed, a, 0, .07, -.1); add(bed, a[::-1].copy(), 0, .07, .1)
    if c == 4:
        for k in range(5): add(bed, chirp(.05), .7 + k * 1.9 + rng.uniform(0, .4), 1.0, rng.uniform(-.7, .7))
    if c == 1:
        for k in range(3): add(bed, chirp(.05), .4 + k * 1.2, 1.0, rng.uniform(-.7, .7))
    mus = sfx.compress(mus, .3, 2.5) if mus.ndim == 1 else np.stack([sfx.compress(mus[:, i], .3, 2.5) for i in (0, 1)], 1)
    fol = np.stack([sfx.compress(fol[:, i], .22, 4.0, .002, .12) for i in (0, 1)], 1)
    mix = mus * .55 + fol * .85 + bed
    mix = mix[:int(dur * SR)]
    mix = mix * (.85 / max(1e-9, np.abs(mix).max()))
    sf.write(os.path.join(OUT, f'mix{c}.wav'), mix.astype(np.float32), SR)
    # 자막 큐 (.srt)
    sys.path.insert(0, HERE)
    return dur

def cues():
    import subprocess
    js = subprocess.run(['node', '--input-type=module', '-e', f"import {{ CUTS }} from '{HERE}/story.js'; console.log(JSON.stringify(CUTS))"], capture_output=True, text=True, check=True).stdout
    C = json.loads(js)
    for c, d in C.items():
        q = []
        if d.get('title'): q.append(d['title'])
        q += d.get('bubbles', []); q += d.get('subs', [])
        if d.get('head'): q.append(d['head'])
        q = sorted([{'t0': x['t0'], 't1': x['t1'], 'text': x['text']} for x in q], key=lambda x: x['t0'])
        json.dump(q, open(os.path.join(OUT, f'cues{c}.json'), 'w'), ensure_ascii=False)

if __name__ == '__main__':
    for c in (1, 2, 3, 4): print('mix', c, build(c))
    cues()
