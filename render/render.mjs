#!/usr/bin/env node
// RENDER EXECUTOR — identical on your Mac and on a CI runner.
//
//   node render/render.mjs --entity hnm --template intro --format social
//   node render/render.mjs --entity tns              # every tns variant
//   node render/render.mjs --all --dry-run
//
// Omit a flag and it means "all of them" — that's how batch works.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expandJobs, renderArgs, FORMATS } from './job-spec.mjs';

const argv = process.argv.slice(2);
const flag = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? undefined : (i + 1 >= argv.length || argv[i + 1].startsWith('--')) ? true : argv[i + 1];
};
const has = (n) => argv.includes(`--${n}`);

const ROOT = resolve(process.cwd());
const ENTRY = join(ROOT, 'src/index.ts');
const OUT = join(ROOT, 'out');

let jobs;
try {
  jobs = has('all') ? expandJobs({}) : expandJobs({
    entity: flag('entity'), template: flag('template'), orientation: flag('orientation'),
    audio: flag('audio'), format: flag('format'),
  });
} catch (err) { console.error(`\n  ${err.message}\n`); process.exit(1); }

console.log(`\n  ${jobs.length} job${jobs.length === 1 ? '' : 's'} planned\n`);
for (const j of jobs) console.log(`    ${j.outputName.padEnd(46)} ${FORMATS[j.format].note}`);

// Sound cues that don't exist yet would render as silence without warning.
const missingAudio = [...new Set(jobs.filter((j) => j.audio === 'sfx')
  .map((j) => `public/audio/${j.entity}-${j.template}.mp3`))]
  .filter((p) => !existsSync(join(ROOT, p)));
if (missingAudio.length) {
  console.log('\n  WARNING — these sound files are missing; those renders will be silent:');
  for (const m of missingAudio) console.log(`    ${m}`);
}

if (has('dry-run')) { console.log('\n  Dry run — nothing rendered.\n'); process.exit(0); }
if (!existsSync(ENTRY)) { console.error(`\n  Missing ${ENTRY}. Run from the repo root.\n`); process.exit(1); }

mkdirSync(OUT, { recursive: true });
const results = [];
let failed = 0;

for (const [i, job] of jobs.entries()) {
  const outPath = join(OUT, job.outputName);
  process.stdout.write(`\n  [${i + 1}/${jobs.length}] ${job.outputName} … `);
  const started = Date.now();
  try {
    execFileSync('npx', renderArgs(job, ENTRY, outPath), { stdio: 'pipe', cwd: ROOT });
    const bytes = statSync(outPath).size;
    console.log(`ok  ${(bytes / 1e6).toFixed(1)}MB  ${((Date.now() - started) / 1000).toFixed(1)}s`);
    results.push({ ...job, status: 'rendered', bytes, path: outPath });
  } catch (err) {
    console.log('FAILED');
    console.error(`      ${(err.stderr?.toString() || err.message).trim().split('\n').slice(-3).join('\n      ')}`);
    results.push({ ...job, status: 'failed' });
    failed++;
  }
}

writeFileSync(join(OUT, 'render-manifest.json'), JSON.stringify({
  renderedAt: new Date().toISOString(),
  total: results.length, rendered: results.length - failed, failed, assets: results,
}, null, 2));

console.log(`\n  Done — ${results.length - failed}/${results.length} rendered`);
console.log(`  Manifest: ${join(OUT, 'render-manifest.json')}\n`);
process.exit(failed ? 1 : 0);
