# Sound

Every ident renders silent until a file exists here. The code is already
wired — `Ident.tsx` fires the cue at each brand's frame from `entities.ts`,
so dropping a file in requires **no code change**.

`render.mjs` warns before rendering any `sfx` variant whose file is missing,
so you can't accidentally ship a "with sound" master that's silent.

## Filenames

Exact names, all `.mp3`:

```
hnm-intro.mp3        hnm-outro.mp3
tns-intro.mp3        tns-outro.mp3
dc-intro.mp3         dc-outro.mp3
vibecode-intro.mp3   vibecode-outro.mp3
```

## Cue frames

The file starts playing at the cue, so **do not** pad the head with silence —
the impact should be at 0:00 of the file.

| Brand | Intro cue | Outro cue | What the cue lands on |
|---|---|---|---|
| hnm | 32 (1.07s) | 60 (2.00s) | mark locks / destabilises |
| tns | 14 (0.47s) | 20 (0.67s) | seal strikes / lifts |
| dc | 16 (0.53s) | 18 (0.60s) | "DC" presses / releases |
| vibecode | 8 (0.27s) | 10 (0.33s) | first keystroke / first delete |

Max useful length is about 2.4s (from the earliest cue to the frame-84 cut).
Anything longer gets truncated by the hard cut.

## Direction, per brand

The whole point of four motion treatments is that the brands don't look
alike. They shouldn't sound alike either. A gold seal and a paper print are
different materials and should read as different materials with your eyes
closed.

**hnm — digital**
Signal corruption resolving into a lock. Bit-crush, a brief burst of digital
static or sample-rate dropout, snapping into one clean sub-bass hit at the
lock. No whoosh. It should sound like a broadcast signal acquiring.

**tns — impact**
The heaviest sound in the network. A low boom with real weight, a metallic
ring off the gold, and a short tail of debris settling. Think a championship
seal being struck, not a door slamming. Sports-broadcast energy.

**dc — print**
The quietest. A soft mechanical press — a platen coming down, paper contact,
a light click as the rule registers. Analog and restrained. If it draws
attention to itself it's wrong.

**vibecode — terminal**
Mechanical keyboard keystrokes as characters type in, a distinct higher note
on the cyan dot, then one soft terminal chime on completion. Should feel like
a real session, not a UI sound pack.

## Sourcing

You need eight files. Options, in the order I'd try them:

1. **Library** (Artlist, Epidemic, Splice). Search terms per brand: `digital
   glitch impact`, `cinematic metal impact boom`, `letterpress print press`,
   `mechanical keyboard type`. Cheapest and fastest.
2. **AI generation** — the impact and glitch sounds are the easiest for these
   tools; the print sound is hardest to get right.
3. **Commission** a sound designer. Eight short cues is a small brief, and
   it's the only path where all four genuinely feel like one family.

Whichever you choose: master them at consistent loudness. Nothing exposes a
homemade ident faster than an intro that's noticeably louder than the outro.
