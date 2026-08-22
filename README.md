# HNM Assets

`assets.hicksnewmedia.com`

Brand idents for the HicksNewMedia network. Standalone — reads nothing from
Kue, HNM.LIVE, or Teksync, and nothing reads from it. It produces files.

**16 idents:** 4 brands × (intro + outro) × (16:9 + 9:16), each renderable
silent or with sound, in ProRes master or H.264 social. 64 files at full
matrix.

## The architecture

There is no universal motion effect. Each brand's motion is derived from its
own mark's material:

| Brand | Treatment | Why |
|---|---|---|
| HicksNewMedia | `glitch` | the mark is three horizontal bars — it already looks like a signal frozen mid-displacement |
| Team No Sleep | `stamp` | a gold crest; gold is the one material in the network that responds to light |
| Digital Collective | `editorial` | a typographic paper-first mark; type is built, not corrupted |
| vibe.code | `terminal` | monospace wordmark for a building-in-public show; typing says *making*, glitch says *breaking* |

What unifies them is **timing grammar**, not effect: 90 frames at 30fps,
resolve into stillness, hard cut — never a fade.

Outros invert their own intro rather than playing it backwards. The seal
lifts and its shockwave contracts, the print pulls out of register, the
cursor backspaces the text away.

## No database, on purpose

Four brands changing maybe twice a year. A TypeScript file in git beats a
table: `git log src/brand/entities.ts` shows every brand change with dates
and reasons, there's no infra to maintain, and CI doesn't need credentials
to look up a hex value.

State lives in **git** (what the brand is) and **R2** (rendered files).

## Rendering

Omit a flag and it means "all of them":

```
node render/render.mjs --entity tns --template outro --orientation vertical --audio silent --format master
```

```
node render/render.mjs --entity dc
```

```
node render/render.mjs --all --dry-run
```

Measured on a Mac Studio: ~9s per H.264 render. A full brand kit (16 files)
is roughly 3 minutes locally versus 45+ on a CI runner — **render locally by
default.** The GitHub Actions workflow exists for rendering away from your
desk, not for speed.

## Sound

Every ident renders silent until files exist in `public/audio/`. The hook is
wired; dropping files in needs no code change. `render.mjs` warns before any
`sfx` render whose file is missing, so you can't ship a silent "with sound"
master.

Filenames, cue frames, and per-brand direction: `public/audio/README.md`.

## Going live

```
npm install && npm run build
```

Connect to Netlify — `netlify.toml` handles build command, publish dir,
functions, and puts `/api/render` *before* the SPA catch-all (that ordering
is the thing that bites every time). Point `assets.hicksnewmedia.com` at it
in Cloudflare, grey cloud.

Optional env, set by you, never committed: `GITHUB_TOKEN` + `GITHUB_REPO` in
Netlify; the four `R2_*` values in GitHub Actions secrets. No `VITE_` prefix
on any of them.

## Verification status

- `npm test` — 15/15 pass (matrix, filename collisions, audio/transparent
  flag correctness, rejection of dropped brands)
- `npm run build` — clean, 1505 modules, 52kB gzipped
- `npm run typecheck` — zero errors
- Workflow YAML parses, both triggers resolve
- TNS crest confirmed bundling to `dist/marks/`
- **Not verified: any video render of the new treatments.** Remotion needs a
  browser; the sandbox has none. Only the old HNM glitch has ever rendered on
  real hardware.
- **Not verified in a browser:** the Studio. Run `npm run dev` and click
  through every brand before deploying.

## Known gaps

- Sound files don't exist (8 needed).
- "DC" renders in Bebas Neue, which may be lighter than your logo's
  letterforms. If it doesn't match, that element should become outlined
  vector paths rather than live type.
- Sound cues don't exist yet. `render/prep-audio.mjs` conditions downloaded
  SFX to spec (strips leading silence so the transient sits at 0:00,
  normalises loudness, caps length). Drop files in `audio-drop/` and run it.
