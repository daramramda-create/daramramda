"""주차대수 분노 게이지: 컷별 음악(마림바·글로켄슈필 펄스, 112 BPM) + 폴리 + 앰비언스 → out/mix{n}.wav, 자막 큐 → out/cues{n}.json
모두 numpy 합성. 음성 없음. 타임랩스 구간은 음악 + "빨리 감기" 히스, 실시간 구간은 진짜 동네 소리."""
import json, os, sys, subprocess
import numpy as np
import soundfile as sf
LIB = os.environ.get('LIB', '/root/lemo-opuscar'); sys.path.insert(0, os.path.join(LIB, 'core', 'audio'))
import sfx
from sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, add

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out')
rng = np.random.default_rng(11)
BEAT = 60 / 116; E8 = BEAT / 2; E16 = BEAT / 4
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
def sweep(f0, f1, d, v=1.0, shape=1.0):
    tt = t_(d); f = f0 + (f1 - f0) * (tt / d) ** shape
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d) * v
def engine(v=1.0):   # 시동 부릉: 낮은 톱니파가 올라갔다 가라앉음
    d = 1.1; tt = t_(d); f = 45 + 70 * np.sin(np.pi * tt / d) ** 2
    ph = np.cumsum(f) / SR; x = 2 * (ph % 1) - 1
    return lp(x, 500) * np.minimum(1, tt / .05) * np.minimum(1, (d - tt) / .3) * (1 + .3 * np.sin(2 * np.pi * 22 * tt)) * v
def moktak(v=1.0):   # 목탁 똑
    d = .25; tt = t_(d); return (np.sin(2 * np.pi * 620 * tt) * env_exp(d, .05) + .5 * np.sin(2 * np.pi * 1240 * tt) * env_exp(d, .02) + .3 * hp(noise(d), 2000) * env_exp(d, .002)) * v
def blip(n=0, v=1.0):   # 게이지 뿅뿅: 두 번 올라가는 음
    out = np.zeros(int(.3 * SR)); 
    for k in range(2):
        b = sweep(500 + n * 90 + k * 200, 1000 + n * 120 + k * 250, .11, 1.0, .6); s0 = int(k * .12 * SR); out[s0:s0 + len(b)] += b
    return out * v
def sigh(v=1.0):   # 한숨 하아
    d = .9; tt = t_(d); return bp(noise(d), 500, 2200) * np.sin(np.pi * tt / d) ** 1.5 * (1 - .5 * tt / d) * v
def honk(v=1.0):   # 경적 빵빵
    d = .28; tt = t_(d); x = sum(np.sign(np.sin(2 * np.pi * f * tt)) for f in (420, 530))
    return lp(x, 2500) * np.minimum(1, tt / .01) * np.minimum(1, (d - tt) / .03) * .4 * v
def ring(d, v=1.0):   # 전화벨 따르릉
    tt = t_(d); gate = ((tt % .9) < .55).astype(float)
    x = (np.sin(2 * np.pi * 1400 * tt) + np.sin(2 * np.pi * 1750 * tt)) * (.5 + .5 * np.sign(np.sin(2 * np.pi * 24 * tt)))
    return x * gate * .3 * v
def boom(v=1.0):   # 펑: 저음 폭발 + 파편 + 불타는 소리
    d = 2.0; tt = t_(d); f = 38 + 110 * np.exp(-tt * 9)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .35) + lp(noise(d), 900) * env_exp(d, .25) * .9 + hp(noise(d), 2500) * env_exp(d, .05) * .5
    fire = bp(noise(d), 300, 3000) * (.5 + .5 * np.abs(lp(noise(d), 30)) * 6) * np.minimum(1, tt / .3) * .25
    return (np.tanh(x * 2.2) + fire) * v
def cough(v=1.0):   # 콜록
    out = np.zeros(int(.4 * SR))
    for k, s in enumerate((0, .16)):
        d = .14; b = bp(noise(d), 350, 2600) * env_exp(d, .035); i = int(s * SR); out[i:i + len(b)] += b * (1 - .25 * k)
    return out * v
def chalk(d, v=1.0):
    tt = t_(d); return bp(noise(d), 2500, 8000) * np.abs(np.sin(2 * np.pi * 7 * tt)) ** 2 * v
def chirp(v=1.0):
    d = .14; tt = t_(d); f = 4200 - 1800 * tt / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR + 3 * np.sin(2 * np.pi * 60 * tt)) * np.sin(np.pi * tt / d) * v
def amb(what, d):
    tt = t_(d)
    if what == 'outdoor': x = lp(sfx.brown(d), 700) * .6
    elif what == 'garage': x = lp(sfx.brown(d), 350) + .08 * np.sin(2 * np.pi * 100 * tt)
    elif what == 'dungeon': x = lp(sfx.brown(d), 200) + .2 * np.sin(2 * np.pi * 55 * tt) * (1 + .3 * np.sin(2 * np.pi * .7 * tt))
    else: x = lp(sfx.brown(d), 450) * .5
    return norm(x[:int(d * SR)], 1.0)

# 컷별 코드 진행: 1 평화(장조) → 2 가벼움 → 3 점점 어둡고 빠르게(단조) → 4 잔잔한 마무리
PROG = {1: [[48, 52, 55, 59], [53, 57, 60, 64]], 2: [[48, 52, 55, 59], [45, 48, 52, 55], [53, 57, 60, 64], [43, 47, 50, 55]],
        3: [[45, 48, 52, 55], [41, 45, 48, 52], [38, 41, 45, 48], [40, 44, 47, 52], [45, 48, 52, 55], [40, 44, 47, 52]],
        4: [[48, 52, 55, 59], [53, 57, 60, 64], [48, 52, 55, 59]]}

def build(c):
    E = json.load(open(os.path.join(OUT, f'events{c}.json'))); dur = E['dur']; ev = E['ev']
    N = int(dur * SR) + SR
    mus = np.zeros((N, 2)); fol = np.zeros((N, 2)); bed = np.zeros((N, 2))
    bar = 4 * BEAT; boomT = next((e['t'] for e in ev if e['type'] == 'boom'), 1e9)
    for b in range(int(dur / bar) + 1):
        ch = PROG[c][b % len(PROG[c])]; t0 = b * bar
        if t0 >= min(dur, boomT): break
        if c == 4 and t0 < 1.0: continue
        add(mus, pad([m + 12 for m in ch[:3]], min(bar, dur - t0) + .2, .12), t0); add(mus, bass(ch[0] - 12, bar * .9, .2), t0)
        rage = clampf((t0 - 0) / 10) if c == 3 else 0
        sub = E16 if (c == 3 and t0 > 5.5) else E8
        for k in range(int(round(bar / sub))):
            tt = t0 + k * sub
            if tt >= min(dur - .02, boomT - .12): break
            m = [ch[0] + 24, ch[2] + 24, ch[1] + 24, ch[3] + 24, ch[2] + 24, ch[1] + 36][k % 6] - (12 if c == 3 and rage > .5 else 0)
            vel = {1: .15, 2: .17, 3: .16 + .1 * rage, 4: .12}[c] * (1.15 if k % 4 == 0 else .9)
            add(mus, marimba(m, vel, .45), tt, 1.0, -.35 if k % 2 else .35)
            if c in (2, 3) and k % 2 == 0: add(mus, shaker(.05 + .04 * rage), tt + sub / 2, 1.0, .5)
            if c == 3 and k % (4 if sub == E8 else 8) == 0: add(mus, kick(.25 + .2 * rage), tt)
    if boomT < 1e8:
        i = int((boomT - .1) * SR); mus[i:] = 0
    for e in ev:
        t, ty = e['t'], e['type']; n = e.get('n', 0)
        if ty == 'engine': add(fol, engine(.8), t)
        elif ty == 'barrier': add(fol, sweep(300, 500, .5, .15), t); add(fol, sfx.click(1.0, .4), t + .55)
        elif ty == 'card': add(fol, sfx.whoosh(.2, .3), t); add(fol, sfx.thump(.5, 110), t + .26); add(mus, glock(79, .25), t + .26)
        elif ty == 'moktak': add(fol, moktak(.9), t); add(fol, moktak(.6), t + .45)
        elif ty == 'stop': add(fol, sfx.click(.8, .4), t)
        elif ty == 'blip': add(fol, blip(n, .35), t - .25); add(fol, blip(n, .35), t)
        elif ty == 'okay': add(mus, glock(84, .3), t); add(mus, glock(88, .3), t + .12)
        elif ty == 'sigh': add(fol, sigh(.5), t)
        elif ty == 'honk': add(fol, honk(.8), t); add(fol, honk(.8), t + .34)
        elif ty == 'ring': add(fol, ring(e.get('d', 2.5), .7), t)
        elif ty == 'gasp': add(fol, sweep(400, 1100, .25, .3), t)
        elif ty == 'boom': add(fol, boom(1.0), t)
        elif ty == 'cough': add(fol, cough(.7), t)
        elif ty == 'chalk': add(fol, chalk(e.get('d', .9), .14), t)
        elif ty == 'ting': [add(mus, glock(m, .35), t + i * .07) for i, m in enumerate([84, 88, 91])]
        elif ty == 'amb':
            a = amb(e['what'], e['d']); add(bed, a, t, .08, -.1); add(bed, a[::-1].copy(), t, .08, .1)
            if e['what'] == 'outdoor':
                for k in range(int(e['d'] / 1.4)): add(bed, chirp(.05), t + .4 + k * 1.4, 1.0, rng.uniform(-.7, .7))
    mus = np.stack([sfx.compress(mus[:, i], .3, 2.5) for i in (0, 1)], 1)
    fol = np.stack([sfx.compress(fol[:, i], .22, 4.0, .002, .12) for i in (0, 1)], 1)
    mix = (mus * .6 + fol * .85 + bed)[:int(dur * SR)]
    mix *= .85 / max(1e-9, np.abs(mix).max())
    sf.write(os.path.join(OUT, f'mix{c}.wav'), mix.astype(np.float32), SR)
    return dur
clampf = lambda x: max(0., min(1., x))

def cues():
    js = subprocess.run(['node', '--input-type=module', '-e', f"import {{ CUTS }} from '{HERE}/story.js'; console.log(JSON.stringify(CUTS))"], capture_output=True, text=True, check=True).stdout
    C = json.loads(js); strip = lambda s: s.replace('[', '').replace(']', '')
    for c, d in C.items():
        if c == '0': continue
        q = []
        if d.get('title'): q.append(d['title'])
        q += d.get('subs', [])
        if d.get('head'): q.append(d['head'])
        q += [{'t0': x['t'], 't1': x['t'] + 2.0, 'text': x['text']} for x in d.get('cards', [])]
        q = sorted([{'t0': x['t0'], 't1': x['t1'], 'text': strip(x['text'])} for x in q], key=lambda x: x['t0'])
        json.dump(q, open(os.path.join(OUT, f'cues{c}.json'), 'w'), ensure_ascii=False)

if __name__ == '__main__':
    only = [int(a) for a in sys.argv[1:]] or [1, 2, 3, 4]
    for c in only:
        if os.path.exists(os.path.join(OUT, f'events{c}.json')): print('mix', c, build(c))
    cues()
