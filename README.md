# HNM Assets

`assets.hicksnewmedia.com`

The single home for HicksNewMedia network branding. Standalone — reads
nothing from Kue, HNM.LIVE, or Teksync, and nothing reads from it.

Three tabs:

- **Idents** — 16 motion pieces: 4 brands × (intro + outro) × (16:9 + 9:16),
  each renderable silent or with sound, as ProRes master or H.264 social.
  Preview and scrub any of them in the browser; render masters locally.
- **Brand** — the fixed material. Per-brand palettes, marks to download, the
  type stack, and every render command in one list.
- **Library** — drag and drop your own assets, sort them under headings you
  create, then export and import into the repo (see below).

## Theme

Light by design. Signal orange measures 2.35:1 against paper, which fails
text contrast, so orange is used only as fills and rules — never as type.
Body copy runs on ink (17.6:1) and a warm gray at 6.78:1, both passing
WCAG AA.

## Motion is derived from the mark's material

There is no universal effect:

| Brand | Treatment | Why |
|---|---|---|
| HicksNewMedia | `glitch` | the mark is three horizontal bars — already a signal frozen mid-displacement |
| Team No Sleep | `stamp` | a gold crest; gold is the one material here that responds to light |
| Digital Collective | `editorial` | a typographic paper-first mark; type is built, not corrupted |
| vibe.code | `terminal` | monospace wordmark for a building-in-public show — typing says *making*, glitch says *breaking* |

What unifies them is **timing grammar**, not effect: 90 frames at 30fps,
resolve into stillness, hard cut — never a fade.

Outros invert their own intro rather than playing backwards. The seal lifts
and the surface releases, the print unwinds in reverse order, the cursor
backspaces the line away.

## One implementation, two contexts

The Studio and the Remotion renderer import the **same** treatment
components. Treatments take a raster mark path as a `markSrc` prop instead of
importing Remotion's `staticFile()`, which is what lets one component run in
both a render and a browser. An earlier version had the Studio carry its own
copy of the stamp logic; it went stale within two rounds of fixes.

Verified in the production bundle: exactly one copy of the stamp recoil
constant, one copy of the PRNG constant.

The HNM marks in `public/brand/hnm/` are generated from the same coordinates
the renderer animates, so the static and motion versions cannot disagree.

## Rendering — local only

There is no CI render path and no upload step. A file renders in about nine
seconds here; a GitHub Actions runner takes two to four minutes plus queue
time. Remote rendering was strictly slower, so it was removed rather than
maintained.

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

Files land in `out/`. Always dry-run a big job first.

## Your own assets

The Library tab takes drag-and-drop files, sorts them under headings you
create, and stores them in IndexedDB — not localStorage, which caps around
5MB and would choke on a handful of logos.

**In Chrome or Edge, connect the repo folder once** (File System Access API)
and the round-trip disappears: every drop writes straight into
`public/brand/library/<section>/` and rewrites `src/brand/library.json`
live. Items show a `repo` badge once on disk; the only terminal step left is
`git add public/brand/library src/brand/library.json` and a commit, because
a page cannot and should not run git. The folder grant persists across
reloads (per origin — localhost and the live site each ask once).

Committed assets are absorbed on load from the built `library.json`, so the
library reads the same on every machine.

Safari and Firefox (no File System Access API) fall back to the round-trip:
organize, **Export for repo**, then
`node render/import-assets.mjs --from ~/Downloads/library-export.json`.

Either way, bulk imports can skip the browser — drop files into
`asset-drop/<section>/` and run `node render/import-assets.mjs --scan`.
Subfolder names become section headings. Filenames are sanitized identically
in the browser and the CLI (unit-tested against each other), so spaces,
shell-hostile characters, and path traversal never reach disk.

## No database, on purpose

Four brands changing maybe twice a year. A TypeScript file in git beats a
table: `git log src/brand/entities.ts` shows every brand change with dates
and reasons, and there's no infra to maintain.

## Sound

Every ident renders silent until files exist in `public/audio/`. The hook is
wired — dropping files in needs no code change — and `render.mjs` warns
before any `sfx` render whose file is missing.

`prep-audio.mjs` conditions downloaded SFX to spec: strips leading silence so
the transient sits at 0:00 (stock effects routinely carry 50–200ms of head
silence, which lands your cue frames late), normalizes loudness so the eight
cues match, and caps length to the usable window.

```
node render/prep-audio.mjs
```

First run creates `audio-drop/` and prints the eight filenames it expects.
Direction and cue frames: `public/audio/README.md`.

## Deploying

```
npm install && npm run build
```

Netlify builds from `netlify.toml`. `assets.hicksnewmedia.com` is a CNAME to
the Netlify subdomain in Cloudflare, gray cloud / DNS only, with the hostname
registered as a domain alias on the Netlify site — both halves are required.

## Verification status

- `npm test` — 15/15 (matrix, filename collisions, audio and transparency
  flag correctness, rejection of dropped brands)
- `npm run build` — clean, 1508 modules, 55kB gzipped
- `npm run typecheck` — zero errors
- All 16 idents audited frame by frame in both orientations
- Studio confirmed working in a browser on the live site

## Known gaps

- Eight sound cues don't exist yet.
- "DC" renders in Bebas Neue, which may be lighter than the logo's
  letterforms. If it doesn't match, that element should become outlined
  vector paths rather than live type.
- Team No Sleep, Digital Collective, and vibe.code have raster marks only.
  They won't scale past roughly 1080 cleanly; vector versions would remove
  that ceiling.
