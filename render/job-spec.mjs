// RENDER JOB SPEC
// One contract, two executors: your Mac and the GitHub Actions runner.
// Both build jobs from this file, so a CI render and a local render
// produce byte-identical output. If they ever diverge, it's a bug here.

export const FORMATS = {
  // True master. Alpha channel, huge files, for the edit timeline.
  master: {
    ext: 'mov',
    args: ['--codec=prores', '--prores-profile=4444'],
    transparent: true,
    note: 'ProRes 4444 with alpha — composite over footage, no keying',
  },
  // Browser-consumable alpha. For OBS/Ecamm browser sources, Kue, HNM.LIVE.
  overlay: {
    ext: 'webm',
    args: ['--codec=vp8', '--image-format=png', '--pixel-format=yuva420p'],
    transparent: true,
    note: 'VP8/WebM with alpha — live overlay in a browser source',
  },
  // Flat, small, universally playable. Social and review.
  social: {
    ext: 'mp4',
    args: ['--codec=h264', '--crf=16'],
    transparent: false,
    note: 'H.264 — YouTube, Shorts, Reels, client review',
  },
};

export const ENTITY_IDS = ['hnm', 'tns', 'tekstack', 'tekforum', 'dc'];
export const TEMPLATES = ['intro', 'outro', 'lowerThird'];
export const ORIENTATIONS = ['horizontal', 'vertical'];

/**
 * Expand a partial selection into a concrete job list.
 * Omitting a field means "all of them" — that's how batch mode works.
 */
export function expandJobs({ entity, template, orientation, format } = {}) {
  const pick = (val, all, label) => {
    if (!val || val === 'all') return all;
    const items = String(val).split(',').map((s) => s.trim()).filter(Boolean);
    const bad = items.filter((i) => !all.includes(i));
    if (bad.length) {
      throw new Error(`Unknown ${label}: ${bad.join(', ')}. Valid: ${all.join(', ')}`);
    }
    return items;
  };

  const entities = pick(entity, ENTITY_IDS, 'entity');
  const templates = pick(template, TEMPLATES, 'template');
  const orientations = pick(orientation, ORIENTATIONS, 'orientation');
  const formats = pick(format, Object.keys(FORMATS), 'format');

  const jobs = [];
  for (const e of entities) {
    for (const t of templates) {
      for (const o of orientations) {
        for (const f of formats) {
          jobs.push({
            entity: e,
            template: t,
            orientation: o,
            format: f,
            compositionId: `${e}-${t}-${o}`,
            outputName: `${e}-${t}-${o}-${f}.${FORMATS[f].ext}`,
          });
        }
      }
    }
  }
  return jobs;
}

/** Build the argv for `npx remotion render` for one job. */
export function renderArgs(job, entryPoint, outPath) {
  const fmt = FORMATS[job.format];
  return [
    'remotion', 'render', entryPoint, job.compositionId, outPath,
    ...fmt.args,
    `--props=${JSON.stringify({ transparent: fmt.transparent })}`,
    '--log=error',
  ];
}
