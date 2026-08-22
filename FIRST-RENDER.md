# First render checklist

No video has been rendered from this repo yet. The job spec is tested and
the code typechecks, but the Remotion render path is unexercised — it
needs a real browser, which the environment this was built in didn't have.

Expect one or two things to break. That's normal for a first render, not a
sign something is wrong. Work through this in order; each step fails fast
and cheap so you're not discovering a font problem 90 files deep.

## Before you start

You need Node 18+ and ffmpeg. Check both:

```
node --version && ffmpeg -version | head -1
```

If ffmpeg is missing:

```
brew install ffmpeg
```

## Step 1 — Install

```
npm install
```

Remotion downloads its own Chromium build on first use (~150MB). This is
normal and only happens once.

## Step 2 — Confirm the plan before rendering anything

```
node render/render.mjs --entity hnm --template intro --orientation horizontal --format social --dry-run
```

Expect exactly one job: `hnm-intro-horizontal-social.mp4`. If the count is
wrong, stop — the selection flags aren't doing what you think, and you do
not want to find that out during a 90-file batch.

## Step 3 — Render one small file

Deliberately the cheapest possible render: H.264, no alpha, 3 seconds.

```
node render/render.mjs --entity hnm --template intro --orientation horizontal --format social
```

Then actually watch it:

```
open out/hnm-intro-horizontal-social.mp4
```

## Step 4 — Check the render against these four things

1. **Font.** The wordmark must be Bebas Neue. If it's a generic sans, see
   failure mode A below. This is the single most likely thing to be wrong.
2. **Timing.** Glitch resolves at frame 32 (~1.07s), then holds dead still.
   If it never settles, the frame map didn't apply.
3. **Colors.** Signal orange `#F48022`, paper `#F5F1EB`, ink background.
4. **Length.** Exactly 3.00 seconds.

```
ffprobe -v error -show_entries format=duration -show_entries stream=width,height,codec_name out/hnm-intro-horizontal-social.mp4
```

## Step 5 — Then test alpha, which is the harder case

```
node render/render.mjs --entity hnm --template intro --orientation horizontal --format master
```

Verify the alpha channel actually survived — this is the check people skip
and then discover a black box in their timeline:

```
ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt,codec_name out/hnm-intro-horizontal-master.mov
```

You want a pixel format containing `a` (e.g. `yuva444p10le`). If there's no
`a`, see failure mode C.

## Step 6 — Only now, batch

```
node render/render.mjs --entity hnm --dry-run
```

```
node render/render.mjs --entity hnm
```

18 files. Budget 20–40 minutes locally, longer on a CI runner.

---

## Failure modes, in order of likelihood

### A. Wordmark renders in the wrong font

Most likely failure. Remotion loads fonts inside its own browser, and a
font installed on your Mac is not automatically available there.

Fix: install the Remotion Google Fonts package and load Bebas Neue in the
composition rather than relying on a CSS link.

```
npm install @remotion/google-fonts
```

Then add to `src/templates/Composition.tsx`, above the component:

```
import { loadFont } from '@remotion/google-fonts/BebasNeue';
loadFont();
```

Re-render step 3 and check again. The previous static proofs used DejaVu
Sans Condensed as a stand-in, so if the render looks like those proofs
rather than true Bebas Neue, this is why.

### B. Chromium won't launch

Symptoms: a timeout, or an error mentioning a missing shared library.

On macOS this is usually a Gatekeeper prompt on first launch — check for a
dialog. Force a clean re-download if needed:

```
npx remotion browser ensure
```

### C. ProRes renders but has no alpha channel

Check `remotion.config.ts` says `Config.setVideoImageFormat('png')`. JPEG
has no alpha channel, so a JPEG intermediate silently discards
transparency and you get a black background instead of a transparent one.

### D. Composition id not found

List what actually exists and compare against what the job spec builds:

```
npx remotion compositions src/index.ts
```

Ids follow `{entity}-{template}-{orientation}`, e.g. `hnm-intro-vertical`.

### E. Render is extremely slow

Concurrency defaults conservatively. On a Mac Studio you can push it:

```
node render/render.mjs --entity hnm --format social
```

and add `--concurrency=8` inside `renderArgs` in `render/job-spec.mjs` if
you want to tune it. Measure before and after — more isn't always faster.

---

## When it works

Record what the first successful render actually cost — file size and wall
time per format. That number is what tells you whether the CI runner is
worth using or whether local rendering is simply faster for your volume.
Right now that's a guess; after tonight it's data.
