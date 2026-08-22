#!/usr/bin/env node
// RENDER EXECUTOR
// Runs identically on your Mac Studio and on a GitHub Actions runner.
//
//   node render/render.mjs --entity hnm --template intro --format master
//   node render/render.mjs --entity hnm                 # every hnm asset
//   node render/render.mjs --all                        # the whole network
//   node render/render.mjs --entity hnm --dry-run       # show the plan only
//
// Uploads to R2 when R2_BUCKET and the AWS_* env vars are present.
// Never hardcode credentials here — this file is committed.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expandJobs, renderArgs, FORMATS } from './job-spec.mjs';

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && (i + 1 >= argv.length || argv[i + 1].startsWith('--')) ? true : i !== -1 ? argv[i + 1] : undefined;
};
const has = (name) => argv.includes(`--${name}`);

const ROOT = resolve(process.cwd());
const ENTRY = join(ROOT, 'src/index.ts');
const OUT_DIR = join(ROOT, 'out');
const DRY = has('dry-run');

let jobs;
try {
  jobs = has('all')
    ? expandJobs({})
    : expandJobs({
        entity: flag('entity'),
        template: flag('template'),
        orientation: flag('orientation'),
        format: flag('format'),
      });
} catch (err) {
  console.error(`\n  Bad selection: ${err.message}\n`);
  process.exit(1);
}

if (!jobs.length) {
  console.error('\n  No jobs matched that selection.\n');
  process.exit(1);
}

console.log(`\n  ${jobs.length} job${jobs.length === 1 ? '' : 's'} planned\n`);
for (const j of jobs) console.log(`    ${j.outputName.padEnd(44)} ${FORMATS[j.format].note}`);

if (DRY) {
  console.log('\n  Dry run — nothing rendered.\n');
  process.exit(0);
}

if (!existsSync(ENTRY)) {
  console.error(`\n  Entry point missing: ${ENTRY}\n  Run this from the repo root.\n`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

const results = [];
let failed = 0;

for (const [i, job] of jobs.entries()) {
  const outPath = join(OUT_DIR, job.outputName);
  process.stdout.write(`\n  [${i + 1}/${jobs.length}] ${job.outputName} … `);
  const started = Date.now();
  try {
    execFileSync('npx', renderArgs(job, ENTRY, outPath), { stdio: 'pipe', cwd: ROOT });
    const bytes = statSync(outPath).size;
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`ok  ${(bytes / 1e6).toFixed(1)}MB  ${secs}s`);
    results.push({ ...job, status: 'rendered', bytes, path: outPath });
  } catch (err) {
    console.log('FAILED');
    console.error(`      ${(err.stderr?.toString() || err.message).trim().split('\n').slice(-3).join('\n      ')}`);
    results.push({ ...job, status: 'failed' });
    failed++;
  }
}

// Upload to R2 (S3-compatible). Skipped silently when not configured, so
// local renders just leave files in out/ without needing credentials.
const bucket = process.env.R2_BUCKET;
const endpoint = process.env.R2_ENDPOINT;
if (bucket && endpoint && process.env.AWS_ACCESS_KEY_ID) {
  console.log('\n  Uploading to R2 …');
  for (const r of results.filter((x) => x.status === 'rendered')) {
    const key = `brand-vault/${r.entity}/${r.outputName}`;
    try {
      execFileSync('aws', [
        's3', 'cp', r.path, `s3://${bucket}/${key}`,
        '--endpoint-url', endpoint, '--only-show-errors',
      ], { stdio: 'pipe' });
      r.remoteKey = key;
      console.log(`    ${key}`);
    } catch (err) {
      console.error(`    upload failed: ${key}`);
    }
  }
} else {
  console.log('\n  R2 not configured — files left in out/ only.');
}

const manifestPath = join(OUT_DIR, 'render-manifest.json');
writeFileSync(manifestPath, JSON.stringify({
  renderedAt: new Date().toISOString(),
  total: results.length,
  rendered: results.filter((r) => r.status === 'rendered').length,
  failed,
  assets: results,
}, null, 2));

console.log(`\n  Done — ${results.length - failed}/${results.length} rendered`);
console.log(`  Manifest: ${manifestPath}\n`);
process.exit(failed ? 1 : 0);
