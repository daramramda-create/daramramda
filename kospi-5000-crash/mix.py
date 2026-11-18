# Sound: synthesized foley + an original toy score (glockenspiel, toy piano, pizzicato, toy brass) → out/mix.wav
# Timeline mirrors E in main.js.
import sys, os, numpy as np, soundfile as sf
LIB = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar'))
sys.path.insert(0, os.path.join(LIB, 'core/audio'))
from sfx import *

HERE = os.path.dirname(os.path.abspath(__file__))
DUR = 25.0; N = int(DUR * SR)
fx, mus, amb = np.zeros((N, 2)), np.zeros((N, 2)), np.zeros((N, 2))
rng = np.random.default_rng(11)
BPM = 110; BEAT = 60 / BPM

def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def adsr(d, a=.005, tau=.4):
    t = t_(d); e = np.exp(-t / tau); n = max(1, int(a * SR)); e[:n] *= np.linspace(0, 1, n); return e

# —— instruments ——
def glock(m, d=1.2, v=1.0):
    f = mtof(m); t = t_(d)
    x = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t / (.9 / k ** .7)) for k, a in [(1, 1), (2.76, .35), (5.40, .12), (8.93, .05)])
    return x * adsr(d, .002, 2) * v
def toypiano(m, d=.9, v=1.0):
    f = mtof(m); t = t_(d)
    x = sum(a * np.sin(2 * np.pi * f * k * t + k) * np.exp(-t / (.55 / k)) for k, a in [(1, 1), (2.0, .4), (3.9, .25), (6.1, .08)])
    return x * adsr(d, .002, 3) * v
def pizz(m, d=.35, v=1.0):
    f = mtof(m); t = t_(d)
    x = sum(a / k * np.sin(2 * np.pi * f * k * t) for k, a in [(1, 1), (2, .6), (3, .4), (4, .25), (5, .15)])
    return lp(x * np.exp(-t / .09), 3000) * v
def brass(m, d=.5, v=1.0):
    f = mtof(m); t = t_(d); ph = 2 * np.pi * f * t + .004 * np.sin(2 * np.pi * 5.5 * t) * f
    saw = sum(np.sin(k * ph) / k for k in range(1, 12))
    e = np.minimum(1, t / .03) * np.exp(-np.maximum(0, t - d * .7) / .05)
    return lp(saw, 2600) * e * v
def bass(m, d=.4, v=1.0):
    f = mtof(m); t = t_(d)
    return (np.sin(2 * np.pi * f * t) + .35 * np.sin(4 * np.pi * f * t) + .15 * np.sin(6 * np.pi * f * t)) * np.exp(-t / .2) * v

def play(inst, notes, t0, gain=1.0, pan=0.0, **kw):
    for (b, m, d) in notes:
        for mm in (m if isinstance(m, (list, tuple)) else [m]):
            add(mus, inst(mm, d * BEAT + .3, **kw), t0 + b * BEAT, gain, pan)

# —— score ——
# 3.0–6.0  June: bright fanfare + glock (C major), cut dead at 6.0 by the record scratch
play(brass, [(0, [60, 64, 67], .5), (.5, [60, 64, 67], .5), (1, [62, 65, 69], .5), (1.5, [64, 67, 72], 1.5)], 3.1, .22)
play(glock, [(3.2, 79, .5), (3.7, 76, .5), (4.2, 79, .5), (4.7, 84, 1)], 3.1, .3)
play(bass, [(3.2, 48, .5), (4.2, 43, .5), (4.7, 48, .5)], 3.1, .35)
# make sure nothing rings past the scratch
cut = int(6.0 * SR); fade = int(.03 * SR); mus[cut:cut + fade] *= np.linspace(1, 0, fade)[:, None]; mus[cut + fade:] = 0
# 6.4–11  now: slow sad toy piano (A minor)
play(toypiano, [(0, 69, 1), (1, 67, 1), (2, 64, 1), (3, 65, 1.5), (4.5, 64, .5), (5, 62, 1), (6, 60, 2), (8, 57, 2)], 6.4, .3)
play(toypiano, [(0, [45, 52], 2), (2, [41, 48], 2), (4, [43, 50], 2), (6, [45, 52], 2.5)], 6.4, .2)
# 11–17  march: pizzicato bass + staccato line (D minor), stops at the whoosh
for b in range(0, 22):
    t = 11.0 + b * BEAT / 2 * 1.0
    if t >= 17.0: break
    add(mus, pizz([50, 57][b % 2] if b % 4 < 2 else [48, 55][b % 2], .3), t, .5, -.15)
mel = [(0, 74, .5), (1, 72, .5), (2, 70, .5), (3, 69, 1), (4, 74, .5), (5, 72, .5), (6, 70, .5), (7, 69, 1), (8, 67, .5), (9, 69, .5), (10, 70, 1)]
for (b, m, d) in mel:
    t = 11.0 + b * BEAT / 2 * 1.0 + BEAT * 2
    if t < 16.9: add(mus, pizz(m, .3), t, .32, .2)
# 18–25  the fix: bright glock theme in C, ending on a held chord
theme = [(0, 72, .5), (.5, 76, .5), (1, 79, 1), (2, 77, .5), (2.5, 76, .5), (3, 74, 1), (4, 72, .5), (4.5, 74, .5), (5, 76, .5), (5.5, 79, .5), (6, 84, 2)]
play(glock, theme, 20.9, .3)
play(toypiano, [(0, [48, 55, 64], 2), (2, [53, 57, 65], 2), (4, [55, 59, 62], 2), (6, [48, 55, 64, 72], 4)], 20.9, .16)
play(bass, [(0, 36, 1), (2, 41, 1), (4, 43, 1), (6, 36, 2)], 20.9, .4)
play(glock, [(0, 84, .25), (.5, 88, .25)], 18.0, .2)

# —— foley ——
def siren(d=.45, v=1.0):
    t = t_(d); f = 900 + 450 * (t / d < .5) ; ph = 2 * np.cumsum(np.full_like(t, 1.0) * np.pi * f / SR)
    sq = np.sign(np.sin(ph)) * .5 + np.sin(ph) * .5
    return lp(sq, 4000) * np.minimum(1, t / .01) * v
def crack(v=1.0):   # plastic "쩍": sharp transient + a splintering tail
    d = .5; t = t_(d); x = hp(noise(d), 1500) * np.exp(-t / .012) * 1.4
    for k in range(6): s = int((.012 + k * .03 + rng.uniform(0, .02)) * SR); n = int(.008 * SR); x[s:s + n] += hp(noise(.008), 2500)[:len(x[s:s+n])] * (.7 - k * .1)
    x += np.sin(2 * np.pi * 180 * t) * np.exp(-t / .05) * .5
    return norm(x) * v
def scratch(v=1.0):   # record "끼익": noise through a fast-sliding band
    d = .45; t = t_(d); x = noise(d); out = np.zeros_like(x); seg = int(.015 * SR)
    for i in range(0, len(x), seg):
        u = i / len(x); fc = max(400, 2600 * (1 - u) + 500 + 700 * np.sin(u * 22))
        out[i:i + seg] = bp(x[i:i + seg + 600], fc * .7, fc * 1.3)[:len(out[i:i + seg])]
    return norm(out) * np.minimum(1, t / .01) * np.exp(-t / .25) * v
def wail(v=1.0):   # "뿌앵": wobbly falling toy-kazoo wail
    d = 1.3; t = t_(d); f = 620 * np.exp(-t * .5) * (1 + .05 * np.sin(2 * np.pi * 7 * t)); ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(k * ph) / k ** 1.3 for k in range(1, 8))
    return bp(x, 300, 3500) * np.minimum(1, t / .05) * np.exp(-np.maximum(0, t - .8) / .2) * v
def mixn(*xs):
    n = max(len(x) for x in xs); return sum(np.pad(x, (0, n - len(x))) for x in xs)
def stamp(v=1.0): return norm(mixn(thump(1, 60), clack(.7, 1) * .8, lp(noise(.2), 900) * env_exp(.2, .03) * .6)) * v
def boop(v=1.0): t = t_(.35); f = 300 + 500 * t / .35; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .12) * v

G = []
for k in range(5): G.append((siren(.45), k * .5, .35, 0))
G += [(crack(), 2.15, .9, -.3), (boop(), 1.4, .25, .2), (pop(), 0.0, .3, 0), (pop(), 1.5, .25, .1)]
G += [(click(1.1), 3.0, .4, -.3), (pop(), 3.3, .25, -.3), (scratch(), 6.0, .55, 0), (wail(), 6.5, .32, .3), (pop(), 6.0, .2, .3)]
for i, t in enumerate([7.95, 8.95]): G += [(clack(.9 + i * .1, 1), t, .5, -.2 + i * .4), (thump(.6, 90), t, .4, 0), (whoosh(.25, .6), t - .4, .2, 0)]
for k in range(int(6 / .2)):   # tiny plastic footsteps of the marchers
    t = 11.0 + k * .2 + rng.uniform(0, .03)
    if t < 17.0: G.append((step(.7), t, .3, float(rng.uniform(-.4, .4))))
for t in [12.0, 13.5, 15.0]: G += [(click(1.4, 1), t, .5, .1), (ding(.5), t + .02, .12, .1)]
G += [(boop(), 15.4, .2, -.2), (whoosh(.8, 1), 17.0, .5, .4)]
G += [(pop(), 18.6, .25, 0)]
for t in [19.0, 19.6, 20.2]: G.append((stamp(), t, .75, 0))
for t in [21.5, 22.3]: G.append((ding(1), t, .45, 0))
G += [(click(1.0), 11.4, .3, 0), (click(1.0), 3.6, .3, 0), (click(1.0), .3, .3, 0)]   # subtitle pops
for x, t, g, p in G: add(fx, x, t, g, p)

# room tone + a ticking clock (heard under the June→now silence)
room = lp(brown(DUR), 250) * .02; amb[:, 0] += room; amb[:, 1] += np.roll(room, 997)
for k in range(int(DUR * 2)):
    tick = hp(noise(.02), 3000) * env_exp(.02, .002) * .03; add(amb, tick, k * .5 + .25, 1.0, .5)

mix = mus * .85 + fx * .9 + amb
for c in range(2): mix[:, c] = limit(mix[:, c], .95)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print('mix peak', np.abs(mix).max(), 'rms', np.sqrt((mix ** 2).mean()))
