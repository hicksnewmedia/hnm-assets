import { expandJobs, renderArgs, FORMATS, ENTITY_IDS, TEMPLATES, ORIENTATIONS, AUDIO } from './job-spec.mjs';
let pass = 0, fail = 0;
const ok = (l, c, x = '') => { c ? pass++ : fail++; console.log(`  ${c ? 'PASS' : 'FAIL'}  ${l}${x ? '  ' + x : ''}`); };

const all = expandJobs({});
const expected = ENTITY_IDS.length * TEMPLATES.length * ORIENTATIONS.length * AUDIO.length * Object.keys(FORMATS).length;
ok('full matrix size', all.length === expected, `${all.length} (expect ${expected})`);
ok('16 unique compositions', new Set(all.map(j => j.compositionId)).size === 16);
ok('no duplicate filenames', new Set(all.map(j => j.outputName)).size === all.length);
ok('no lower thirds remain', !all.some(j => j.template.includes('ower')));
ok('dropped brands gone', !ENTITY_IDS.includes('tekstack') && !ENTITY_IDS.includes('tekforum'));

const one = expandJobs({ entity: 'tns', template: 'outro', orientation: 'vertical', audio: 'sfx', format: 'master' });
ok('fully specified yields 1', one.length === 1);
ok('composition id', one[0].compositionId === 'tns-outro-vertical', one[0].compositionId);
ok('output name', one[0].outputName === 'tns-outro-vertical-sfx-master.mov', one[0].outputName);

const a = renderArgs(one[0], 'src/index.ts', 'out/x.mov');
const props = JSON.parse(a.find(s => s.startsWith('--props=')).slice(8));
ok('sfx sets audio true', props.audio === true);
ok('master sets transparent true', props.transparent === true);
const sil = expandJobs({ entity: 'hnm', template: 'intro', orientation: 'horizontal', audio: 'silent', format: 'social' })[0];
const sp = JSON.parse(renderArgs(sil, 'src/index.ts', 'out/y.mp4').find(s => s.startsWith('--props=')).slice(8));
ok('silent sets audio false', sp.audio === false);
ok('social sets transparent false', sp.transparent === false);

ok('per-brand: 16 variants each', expandJobs({ entity: 'dc' }).length === expected / ENTITY_IDS.length,
   `${expandJobs({ entity: 'dc' }).length}`);
let threw = false; try { expandJobs({ entity: 'tekforum' }); } catch { threw = true; }
ok('rejects dropped brand', threw);
threw = false; try { expandJobs({ audio: 'loud' }); } catch { threw = true; }
ok('rejects bad audio', threw);

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
