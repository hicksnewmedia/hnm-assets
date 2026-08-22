// RENDER JOB SPEC — one contract, two executors (your Mac and CI).

export const FORMATS = {
  master: { ext: 'mov', args: ['--codec=prores', '--prores-profile=4444'],
    transparent: true, note: 'ProRes 4444 + alpha — the edit timeline' },
  social: { ext: 'mp4', args: ['--codec=h264', '--crf=16'],
    transparent: false, note: 'H.264 — YouTube, Shorts, Reels, review' },
};

export const ENTITY_IDS = ['hnm', 'tns', 'dc', 'vibecode'];
export const TEMPLATES = ['intro', 'outro'];
export const ORIENTATIONS = ['horizontal', 'vertical'];
export const AUDIO = ['silent', 'sfx'];

export function expandJobs({ entity, template, orientation, audio, format } = {}) {
  const pick = (val, all, label) => {
    if (!val || val === 'all') return all;
    const items = String(val).split(',').map((s) => s.trim()).filter(Boolean);
    const bad = items.filter((i) => !all.includes(i));
    if (bad.length) throw new Error(`Unknown ${label}: ${bad.join(', ')}. Valid: ${all.join(', ')}`);
    return items;
  };

  const jobs = [];
  for (const e of pick(entity, ENTITY_IDS, 'entity'))
    for (const t of pick(template, TEMPLATES, 'template'))
      for (const o of pick(orientation, ORIENTATIONS, 'orientation'))
        for (const a of pick(audio, AUDIO, 'audio'))
          for (const f of pick(format, Object.keys(FORMATS), 'format'))
            jobs.push({
              entity: e, template: t, orientation: o, audio: a, format: f,
              compositionId: `${e}-${t}-${o}`,
              outputName: `${e}-${t}-${o}-${a}-${f}.${FORMATS[f].ext}`,
            });
  return jobs;
}

export function renderArgs(job, entryPoint, outPath) {
  const fmt = FORMATS[job.format];
  const props = { audio: job.audio === 'sfx', transparent: fmt.transparent };
  return ['remotion', 'render', entryPoint, job.compositionId, outPath,
    ...fmt.args, `--props=${JSON.stringify(props)}`, '--log=error'];
}
