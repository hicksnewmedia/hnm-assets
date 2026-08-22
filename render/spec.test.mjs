import { expandJobs, renderArgs, FORMATS, ENTITY_IDS, TEMPLATES, ORIENTATIONS } from './job-spec.mjs';

let pass = 0, fail = 0;
const ok = (label, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS  ${label}${extra ? '  ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL  ${label}${extra ? '  ' + extra : ''}`); }
};

// Full matrix size
const all = expandJobs({});
const expected = ENTITY_IDS.length * TEMPLATES.length * ORIENTATIONS.length * Object.keys(FORMATS).length;
ok('full matrix size', all.length === expected, `${all.length} (expect ${expected})`);

// Single entity
const hnm = expandJobs({ entity: 'hnm' });
ok('single entity scoped', hnm.length === expected / ENTITY_IDS.length, `${hnm.length}`);
ok('single entity all hnm', hnm.every(j => j.entity === 'hnm'));

// Fully specified = exactly one job
const one = expandJobs({ entity: 'hnm', template: 'intro', orientation: 'vertical', format: 'master' });
ok('fully specified yields 1 job', one.length === 1);
ok('composition id correct', one[0].compositionId === 'hnm-intro-vertical', one[0].compositionId);
ok('output name correct', one[0].outputName === 'hnm-intro-vertical-master.mov', one[0].outputName);

// Comma lists
const two = expandJobs({ entity: 'hnm,tns', template: 'intro', orientation: 'horizontal', format: 'social' });
ok('comma list works', two.length === 2, two.map(j => j.entity).join('+'));

// No duplicate output names anywhere in the full matrix
const names = new Set(all.map(j => j.outputName));
ok('no duplicate filenames', names.size === all.length, `${names.size} unique`);

// Every composition id maps to a real Root.tsx composition pattern
const idPattern = /^[a-z]+-(intro|outro|lowerThird)-(horizontal|vertical)$/;
ok('all composition ids well-formed', all.every(j => idPattern.test(j.compositionId)));

// Invalid input must throw, not silently render the wrong thing
let threw = false;
try { expandJobs({ entity: 'nope' }); } catch { threw = true; }
ok('rejects unknown entity', threw);
threw = false;
try { expandJobs({ format: 'gif' }); } catch { threw = true; }
ok('rejects unknown format', threw);

// Alpha correctness: master + overlay transparent, social not
ok('master is transparent', FORMATS.master.transparent === true);
ok('overlay is transparent', FORMATS.overlay.transparent === true);
ok('social is NOT transparent', FORMATS.social.transparent === false);

// renderArgs shape
const args = renderArgs(one[0], 'src/index.ts', 'out/x.mov');
ok('renderArgs starts with remotion render', args[0] === 'remotion' && args[1] === 'render');
ok('renderArgs carries prores 4444', args.includes('--codec=prores') && args.includes('--prores-profile=4444'));
const propsArg = args.find(a => a.startsWith('--props='));
ok('renderArgs passes transparent=true for master', JSON.parse(propsArg.slice(8)).transparent === true);

const socialArgs = renderArgs(expandJobs({ entity:'hnm', template:'intro', orientation:'horizontal', format:'social' })[0], 'src/index.ts', 'out/y.mp4');
ok('social passes transparent=false', JSON.parse(socialArgs.find(a=>a.startsWith('--props=')).slice(8)).transparent === false);

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
