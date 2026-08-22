#!/usr/bin/env node
// ASSET IMPORT
// Closes the loop between the browser library and the repository.
//
//   node render/import-assets.mjs --from ~/Downloads/library-export.json
//   node render/import-assets.mjs --from <file> --dry-run
//
// A web page can't write into git, so the Library tab organizes assets in the
// browser and exports a manifest with the files embedded. This unpacks that
// into public/brand/library/<section>/ and writes the committed index at
// src/brand/library.json, which the site reads on next build.
//
// You can also skip the browser entirely: drop files into asset-drop/<section>/
// and run with --scan.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join, resolve, extname, basename } from 'node:path';

const ROOT = resolve(process.cwd());
const LIB_DIR = join(ROOT, 'public/brand/library');
const INDEX = join(ROOT, 'src/brand/library.json');
const SCAN_DIR = join(ROOT, 'asset-drop');

const argv = process.argv.slice(2);
const flag = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? undefined : (i + 1 >= argv.length || argv[i + 1].startsWith('--')) ? true : argv[i + 1];
};
const has = (n) => argv.includes(`--${n}`);
const DRY = has('dry-run');

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unsorted';
const safeName = (s) => basename(s).replace(/[^a-zA-Z0-9._-]/g, '_');

let sections = [];
let items = [];

if (has('scan')) {
  if (!existsSync(SCAN_DIR)) {
    mkdirSync(join(SCAN_DIR, 'logos'), { recursive: true });
    console.log(`\n  Created ${SCAN_DIR}`);
    console.log('  Make a subfolder per section, drop files in, run again with --scan\n');
    process.exit(0);
  }
  const dirs = readdirSync(SCAN_DIR).filter((d) => statSync(join(SCAN_DIR, d)).isDirectory());
  dirs.forEach((d, si) => {
    sections.push({ id: slug(d), title: d, order: si });
    readdirSync(join(SCAN_DIR, d))
      .filter((f) => !f.startsWith('.'))
      .forEach((f, ii) => {
        items.push({
          sectionId: slug(d), name: safeName(f), order: ii,
          srcPath: join(SCAN_DIR, d, f), size: statSync(join(SCAN_DIR, d, f)).size,
        });
      });
  });
} else {
  const from = flag('from');
  if (!from || from === true) {
    console.error('\n  Usage: node render/import-assets.mjs --from <library-export.json>');
    console.error('     or: node render/import-assets.mjs --scan\n');
    process.exit(1);
  }
  const path = resolve(String(from).replace(/^~/, process.env.HOME ?? '~'));
  if (!existsSync(path)) { console.error(`\n  Not found: ${path}\n`); process.exit(1); }

  let payload;
  try { payload = JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { console.error(`\n  Not valid JSON: ${e.message}\n`); process.exit(1); }

  if (!Array.isArray(payload.items) || !Array.isArray(payload.sections)) {
    console.error('\n  This does not look like a library export (missing items/sections).\n');
    process.exit(1);
  }
  sections = payload.sections;
  items = payload.items.map((i) => ({ ...i, data: i.data }));
}

if (!items.length) { console.error('\n  Nothing to import.\n'); process.exit(1); }

const byId = Object.fromEntries(sections.map((s) => [s.id, s]));
console.log(`\n  ${items.length} file${items.length === 1 ? '' : 's'} across ${sections.length} section${sections.length === 1 ? '' : 's'}\n`);
for (const s of [...sections].sort((a, b) => a.order - b.order)) {
  const mine = items.filter((i) => i.sectionId === s.id);
  console.log(`    ${s.title}  (${mine.length})`);
  for (const i of mine) console.log(`        ${i.name}`);
}

if (DRY) { console.log('\n  Dry run — nothing written.\n'); process.exit(0); }

let written = 0, failed = 0;
const index = { generatedAt: new Date().toISOString(), sections: [], items: [] };

for (const s of [...sections].sort((a, b) => a.order - b.order)) {
  index.sections.push({ id: s.id, title: s.title, order: s.order });
  const dir = join(LIB_DIR, s.id);
  mkdirSync(dir, { recursive: true });

  for (const it of items.filter((i) => i.sectionId === s.id).sort((a, b) => a.order - b.order)) {
    const name = safeName(it.name);
    const dest = join(dir, name);
    try {
      if (it.srcPath) copyFileSync(it.srcPath, dest);
      else writeFileSync(dest, Buffer.from(it.data, 'base64'));
      index.items.push({
        sectionId: s.id, name,
        file: `/brand/library/${s.id}/${name}`,
        ext: extname(name).slice(1).toLowerCase(),
        size: statSync(dest).size,
        order: it.order,
      });
      written++;
    } catch (e) {
      console.error(`    failed: ${name} — ${e.message}`);
      failed++;
    }
  }
}

writeFileSync(INDEX, JSON.stringify(index, null, 2));

console.log(`\n  Done — ${written} written${failed ? `, ${failed} failed` : ''}`);
console.log(`  Files:  public/brand/library/`);
console.log(`  Index:  src/brand/library.json`);
console.log('\n  Next:');
console.log('    git add public/brand/library src/brand/library.json');
console.log('    git commit -m "assets: import library"');
console.log('    npm run build\n');
process.exit(failed ? 1 : 0);
