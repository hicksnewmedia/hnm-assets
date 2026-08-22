#!/usr/bin/env node
// AUDIO PREP
// Conditions downloaded sound effects into ident cues.
//
//   node render/prep-audio.mjs                 # process everything in audio-drop/
//   node render/prep-audio.mjs --dry-run       # show the plan
//   node render/prep-audio.mjs --keep-tail     # skip the length cap
//
// Drop files in audio-drop/ named for their target, any audio format:
//   hnm-intro.wav  tns-intro.mp3  dc-outro.aiff  vibecode-intro.wav
// They land in public/audio/ as correctly-conditioned .mp3 files.
//
// Three things get fixed, and all three matter:
//
// 1. LEADING SILENCE. The cue frame assumes the hit is at 0:00. Stock SFX
//    routinely carry 50-200ms of head silence, which lands your impact late
//    by several frames. This is the single most common way a good sound
//    feels wrong against picture.
// 2. LOUDNESS. Eight cues sourced separately will not match. Nothing exposes
//    a homemade ident faster than an outro noticeably louder than its intro.
//    Everything is normalized to one EBU R128 target.
// 3. LENGTH. Anything past the frame-84 cut is inaudible but still inflates
//    the file, so cues are capped to their usable window.

import { execFileSync } from 'node:child_process';
import { readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, resolve, parse } from 'node:path';

const ROOT = resolve(process.cwd());
const DROP = join(ROOT, 'audio-drop');
const OUT = join(ROOT, 'public/audio');
const FPS = 30, CUT = 84;

// Must match src/brand/entities.ts. If a cue moves there, move it here.
const CUES = {
  'hnm-intro': 32, 'hnm-outro': 60,
  'tns-intro': 14, 'tns-outro': 20,
  'dc-intro': 16, 'dc-outro': 18,
  'vibecode-intro': 8, 'vibecode-outro': 10,
};

// Broadcast-ish target. Quieter than music masters on purpose — an ident
// should not jump out over the programme audio that follows it.
const LUFS = -16, TRUE_PEAK = -1.5, LRA = 11;
const SILENCE_FLOOR = '-45dB';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const DRY = has('dry-run');
const KEEP_TAIL = has('keep-tail');

function ffmpegAvailable() {
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'pipe' }); return true; }
  catch { return false; }
}

if (!ffmpegAvailable()) {
  console.error('\n  ffmpeg not found.  brew install ffmpeg\n');
  process.exit(1);
}

if (!existsSync(DROP)) {
  mkdirSync(DROP, { recursive: true });
  console.log(`\n  Created ${DROP}`);
  console.log('  Drop your sound files there, named for their target:\n');
  for (const k of Object.keys(CUES)) console.log(`    ${k}.wav`);
  console.log('');
  process.exit(0);
}

const AUDIO_EXT = new Set(['.wav', '.mp3', '.aiff', '.aif', '.flac', '.m4a', '.ogg']);
const files = readdirSync(DROP).filter((f) => AUDIO_EXT.has(parse(f).ext.toLowerCase()));

if (!files.length) {
  console.error(`\n  No audio files in ${DROP}\n`);
  process.exit(1);
}

const jobs = [];
const unknown = [];
for (const f of files) {
  const name = parse(f).name.toLowerCase();
  if (CUES[name] === undefined) { unknown.push(f); continue; }
  jobs.push({ src: join(DROP, f), name, cue: CUES[name] });
}

if (unknown.length) {
  console.log('\n  Skipping — filename does not match a known cue:');
  for (const u of unknown) console.log(`    ${u}`);
  console.log(`  Valid names: ${Object.keys(CUES).join(', ')}`);
}

if (!jobs.length) { console.error('\n  Nothing to process.\n'); process.exit(1); }

console.log(`\n  ${jobs.length} cue${jobs.length === 1 ? '' : 's'} to condition\n`);
for (const j of jobs) {
  const window = ((CUT - j.cue) / FPS).toFixed(2);
  console.log(`    ${(j.name + '.mp3').padEnd(22)} cue frame ${String(j.cue).padStart(2)}  ·  ${window}s usable`);
}

if (DRY) { console.log('\n  Dry run — nothing written.\n'); process.exit(0); }

mkdirSync(OUT, { recursive: true });

let failed = 0;
for (const j of jobs) {
  const dest = join(OUT, `${j.name}.mp3`);
  const maxLen = ((CUT - j.cue) / FPS).toFixed(3);
  process.stdout.write(`\n  ${j.name}.mp3 … `);

  // silenceremove strips the head so the transient sits at 0:00;
  // loudnorm matches every cue to one target.
  const filters = [
    `silenceremove=start_periods=1:start_threshold=${SILENCE_FLOOR}:start_silence=0`,
    `loudnorm=I=${LUFS}:TP=${TRUE_PEAK}:LRA=${LRA}`,
    'afade=t=out:st=' + Math.max(0, Number(maxLen) - 0.12).toFixed(3) + ':d=0.12',
  ].join(',');

  const args = ['-y', '-i', j.src, '-af', filters];
  if (!KEEP_TAIL) args.push('-t', maxLen);
  args.push('-ar', '48000', '-b:a', '192k', '-map_metadata', '-1', dest);

  try {
    execFileSync('ffmpeg', args, { stdio: 'pipe' });
    const kb = (statSync(dest).size / 1024).toFixed(0);
    const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=nw=1:nk=1', dest], { stdio: 'pipe' }).toString().trim();
    console.log(`ok  ${Number(dur).toFixed(2)}s  ${kb}KB`);
  } catch (err) {
    console.log('FAILED');
    console.error(`     ${(err.stderr?.toString() || err.message).trim().split('\n').slice(-2).join('\n     ')}`);
    failed++;
  }
}

const missing = Object.keys(CUES).filter((k) => !existsSync(join(OUT, `${k}.mp3`)));
console.log(`\n  Done — ${jobs.length - failed}/${jobs.length} conditioned`);
if (missing.length) {
  console.log(`\n  Still missing ${missing.length} cue${missing.length === 1 ? '' : 's'}:`);
  for (const m of missing) console.log(`    ${m}.mp3`);
}
console.log('');
process.exit(failed ? 1 : 0);
