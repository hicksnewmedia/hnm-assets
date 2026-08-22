# HNM Assets

`assets.hicksnewmedia.com`

The platform behind every HicksNewMedia branded asset. Standalone by
design — it reads nothing from Kue, HNM.LIVE, Teksync, or anything else,
and nothing reads from it. It produces files. You use the files wherever
you want.

```
src/motion/core.ts     pure functions — the single source of truth
src/brand/entities.ts  the five shows; adding one is adding an object
src/templates/         the frame renderer, shared by studio and worker
studio/                the browser app deployed to assets.hicksnewmedia.com
render/                the render worker: job spec + executor
.github/workflows/     CI render on GitHub Actions
netlify/functions/     lets the Studio queue a render safely
```

## The one architectural idea

The Studio and the render worker import the **same** `GlitchFrame`
component and the **same** motion core. Not a port, not a reimplementation
— the identical files. Verified: the production bundle contains exactly
one copy of the PRNG constant.

That's why a scrubbed preview matches a ProRes master. Not because two
implementations were kept in sync carefully, but because there's only one.

## There is no database, on purpose

An earlier version of this plan had Supabase holding the entities. That
was wrong and it's been removed.

The entity table would have five rows and change maybe twice a year. For
that, a TypeScript file in git is strictly better:

- **Versioned.** `git log src/brand/entities.ts` shows every brand change
  you've ever made, with dates and reasons. A database row silently
  becomes a different color and you can't tell when or why.
- **Zero infra.** No project, no auth, no RLS, no client keys, and the CI
  render job doesn't need credentials just to look up a hex value.
- **Already how the renderer reads it.**

Adding a show: configure it in the Studio, hit the copy button, paste the
object into `src/brand/entities.ts`, commit. Slightly manual for a
twice-a-year action, and the git history is the payoff.

State lives in exactly two places: **git** (what the brand is) and **R2**
(rendered files). No third system.

## Render worker

Three formats, because one file can't serve three jobs:

| Format | File | Alpha | For |
|---|---|---|---|
| `master` | ProRes 4444 `.mov` | yes | the edit timeline |
| `overlay` | VP8 `.webm` | yes | OBS/Ecamm browser source |
| `social` | H.264 `.mp4` | no | YouTube, Shorts, Reels, review |

Omit any flag and it means "all of them" — that's batch mode:

```
node render/render.mjs --entity hnm --template intro --orientation vertical --format master
```

```
node render/render.mjs --entity tekstack
```

```
node render/render.mjs --all --dry-run
```

**Read `FIRST-RENDER.md` before your first render.** The render path has
never been executed and there's a known-likely font issue documented there
with the fix.

### Why GitHub Actions and not Remotion Lambda

Lambda is the technically correct answer and the wrong one here — it adds
AWS IAM, Lambda deploys, and S3 to a stack that has none of it.

Actions is already in your stack, render volume is low and bursty, and the
free tier covers it. The honest trade-off: Actions is slow. Chromium boot
plus ProRes is 2–4 minutes per asset. Fine for batch, wrong for anything
interactive. The day you need a lower third in ten seconds mid-show is the
day Lambda earns its complexity.

## Going live

```
npm install && npm run build
```

Connect the repo to Netlify. `netlify.toml` already sets the build command,
publish directory, function directory, and — importantly — puts the
`/api/render` proxy rule *before* the SPA catch-all, since the catch-all
otherwise swallows it.

Point `assets.hicksnewmedia.com` at the Netlify site in Cloudflare DNS.

Optional env vars, all set by you in the dashboards, none committed:

| Where | Var | Purpose |
|---|---|---|
| Netlify | `GITHUB_TOKEN` | fine-grained PAT, Actions:write, this repo only |
| Netlify | `GITHUB_REPO` | e.g. `hicksnewmedia/hnm-assets` |
| GitHub | `R2_BUCKET`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | upload renders to R2 |

None carry a `VITE_` prefix — that prefix inlines a value into the client
bundle and would leak the token. Without them the site still works; the
queue button reports the worker isn't configured, and CI renders fall back
to build artifacts so nothing is lost.

## Verification status

- `npm test` — 18/18 pass (matrix expansion, filename collisions, input
  rejection, per-format alpha correctness)
- `npm run build` — clean, 1503 modules, 52kB gzipped
- `npm run typecheck` — zero errors
- Workflow YAML parses, both triggers resolve
- CLI dry-run verified for single, batch, and invalid input
- **Not verified: an actual video render.** See `FIRST-RENDER.md`.

## Known gaps

- No render status in the Studio — it queues and you watch the Actions tab.
- Audio is unresolved. The producer-tag direction is retired; glitch-native
  sound design hasn't been specified, so no SFX variants exist.
- Template shelf is three deep (intro, outro, lower third). Corner bug,
  segment cards, starting-soon, and audiogram frames are the obvious adds.
