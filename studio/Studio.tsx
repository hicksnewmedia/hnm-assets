import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Download, Film, Check, Cloud, Volume2, VolumeX } from 'lucide-react';
import { ENTITIES } from '../src/brand/entities';
import { FPS, DURATION, FRAME, TemplateKey, Orientation } from '../src/motion/core';
import { Glitch } from '../src/treatments/Glitch';
import { Editorial } from '../src/treatments/Editorial';
import { Terminal } from '../src/treatments/Terminal';
import { Stamp } from '../src/treatments/Stamp';

// The Studio renders the same treatment components the Remotion pipeline
// renders. Not a reimplementation — the same files. That's why a scrubbed
// preview matches a ProRes master frame for frame.
//
// Stamp included: it takes its crest path as a prop rather than importing
// Remotion's staticFile(), so the identical component runs in both places.

export default function Studio() {
  const [entityId, setEntityId] = useState('hnm');
  const [template, setTemplate] = useState<TemplateKey>('intro');
  const [orientation, setOrientation] = useState<Orientation>('horizontal');
  const [audio, setAudio] = useState(false);
  const [frame, setFrame] = useState(40);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [toast, setToast] = useState('');
  const stageRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  const entity = ENTITIES.find((e) => e.id === entityId) ?? ENTITIES[0];
  const { W, H } = FRAME[orientation];

  useEffect(() => {
    if (!playing) return;
    let start: number | null = null, last = -1;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const f = Math.floor((((ts - start) / 1000) * FPS) % DURATION);
      if (f !== last) { last = f; setFrame(f); }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 2600); };

  const svgToCanvas = useCallback(async (scale = 1) => {
    const svg = stageRef.current?.querySelector('svg');
    if (!svg) return null;
    const vb = svg.viewBox.baseVal;
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res; img.onerror = rej;
      img.src = 'data:image/svg+xml;charset=utf-8,' +
        encodeURIComponent(new XMLSerializer().serializeToString(svg));
    });
    const c = document.createElement('canvas');
    c.width = vb.width * scale; c.height = vb.height * scale;
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }, []);

  const exportPNG = async () => {
    try {
      const c = await svgToCanvas(1);
      if (!c) return;
      const a = document.createElement('a');
      a.download = `${entity.id}-${template}-${orientation}-f${String(frame).padStart(3, '0')}.png`;
      a.href = c.toDataURL('image/png');
      a.click();
      flash('PNG exported');
    } catch { flash('PNG export failed'); }
  };

  const exportWebM = async () => {
    if (recording) return;
    setRecording(true); setPlaying(false);
    try {
      const first = await svgToCanvas(0.5);
      if (!first) throw new Error('no stage');
      const c = document.createElement('canvas');
      c.width = first.width; c.height = first.height;
      const ctx = c.getContext('2d')!;
      const rec = new MediaRecorder(c.captureStream(FPS), { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const stopped = new Promise((r) => { rec.onstop = r; });
      rec.start();
      for (let f = 0; f < DURATION; f++) {
        setFrame(f);
        await new Promise((r) => window.setTimeout(r, 1000 / FPS));
        const fc = await svgToCanvas(0.5);
        if (fc) ctx.drawImage(fc, 0, 0);
      }
      rec.stop(); await stopped;
      const a = document.createElement('a');
      a.download = `${entity.id}-${template}-${orientation}.webm`;
      a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
      a.click();
      flash('WebM exported — preview grade');
    } catch { flash('Recording unsupported in this browser'); }
    setRecording(false);
  };

  const queueRender = async (format: string) => {
    setQueueing(true);
    try {
      const res = await fetch('/api/render', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: entity.id, template, orientation,
          audio: audio ? 'sfx' : 'silent', format,
        }),
      });
      const data = await res.json();
      flash(res.ok ? `Queued — ${format}, ${entity.name} ${template}` : (data.error ?? 'Queue failed'));
    } catch { flash('Render worker unreachable'); }
    setQueueing(false);
  };

  const TREATMENTS = { glitch: Glitch, stamp: Stamp, editorial: Editorial, terminal: Terminal } as const;
  const Treatment = TREATMENTS[entity.treatment];

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="flex items-center gap-3 border-b border-white/10 px-6 py-4">
        <div className="flex h-7 w-7 flex-col justify-between" aria-hidden>
          <span className="block h-[5px] bg-paper" />
          <span className="block h-[5px] bg-signal" />
          <span className="block h-[5px] bg-paper" />
        </div>
        <h1 className="font-display text-xl tracking-wide">
          Hicks<span className="text-signal">New</span>Media<span className="text-signal">.</span> Assets
        </h1>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-white/30">
          {ENTITIES.length} brands · 16 idents
        </span>
      </header>

      <div className="grid gap-6 p-6 lg:grid-cols-[250px_1fr]">
        <aside>
          <div className="mb-6">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">Brand</div>
            <div className="flex flex-col gap-1">
              {ENTITIES.map((e) => (
                <button key={e.id} onClick={() => setEntityId(e.id)}
                  className={`flex items-center gap-2 border px-3 py-2 text-left text-sm transition-colors ${
                    e.id === entityId ? 'border-white/30 bg-white/[0.06]' : 'border-transparent hover:bg-white/[0.03]'}`}>
                  <span className="h-2.5 w-2.5 shrink-0" style={{ background: e.accent }} />
                  <span className="truncate">{e.name}</span>
                  <span className="ml-auto font-mono text-[9px] uppercase text-white/25">{e.treatment}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">Ident</div>
            <div className="flex gap-1">
              {(['intro', 'outro'] as TemplateKey[]).map((t) => (
                <button key={t} onClick={() => { setTemplate(t); setFrame(t === 'outro' ? 0 : 40); }}
                  className={`flex-1 border px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${
                    template === t ? 'border-signal text-signal' : 'border-white/15 text-white/45 hover:border-white/35'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">Orientation</div>
            <div className="flex gap-1">
              {(['horizontal', 'vertical'] as Orientation[]).map((o) => (
                <button key={o} onClick={() => setOrientation(o)}
                  className={`flex-1 border px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${
                    orientation === o ? 'border-signal text-signal' : 'border-white/15 text-white/45 hover:border-white/35'}`}>
                  {o === 'horizontal' ? '16:9' : '9:16'}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">Sound</div>
            <button onClick={() => setAudio(!audio)}
              className={`flex w-full items-center gap-2 border px-3 py-2 text-xs uppercase tracking-wider transition-colors ${
                audio ? 'border-signal text-signal' : 'border-white/15 text-white/45 hover:border-white/35'}`}>
              {audio ? <Volume2 size={13} /> : <VolumeX size={13} />}
              {audio ? 'With sound' : 'Silent'}
            </button>
            {audio && (
              <p className="mt-2 font-mono text-[10px] leading-relaxed text-white/25">
                Cue fires at frame {entity.cue[template]}. No sound file exists yet — renders stay silent.
              </p>
            )}
          </div>

          <div className="mb-6">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">Export from browser</div>
            <div className="flex flex-col gap-1">
              <button onClick={exportPNG}
                className="flex w-full items-center gap-2 border border-white/15 px-3 py-2 text-xs uppercase tracking-wider hover:border-white/40">
                <Download size={13} /> Frame as PNG
              </button>
              <button onClick={exportWebM} disabled={recording}
                className="flex w-full items-center gap-2 border border-white/15 px-3 py-2 text-xs uppercase tracking-wider hover:border-white/40 disabled:opacity-40">
                <Film size={13} /> {recording ? 'Recording…' : 'Clip as WebM'}
              </button>
            </div>
          </div>

          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">Queue a master</div>
            <div className="flex flex-col gap-1">
              {(['master', 'social'] as const).map((f) => (
                <button key={f} onClick={() => queueRender(f)} disabled={queueing}
                  className="flex w-full items-center gap-2 border border-white/15 px-3 py-2 text-xs uppercase tracking-wider hover:border-signal hover:text-signal disabled:opacity-40">
                  <Cloud size={13} /> {f}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main>
          <div ref={stageRef}
            className={`mx-auto overflow-hidden border border-white/10 ${
              orientation === 'vertical' ? 'aspect-[9/16] max-w-[300px]' : 'aspect-video w-full'}`}
            style={{ background: entity.bg }}>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <rect width={W} height={H} fill={entity.bg} />
              <Treatment frame={frame} entity={entity} template={template}
                orientation={orientation} markSrc="/marks/tns-crest.png" />
            </svg>
          </div>

          <div className="mx-auto mt-4 flex max-w-3xl items-center gap-3">
            <button onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Play'}
              className="border border-white/15 p-2 hover:border-white/40">
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <input type="range" min={0} max={DURATION - 1} step={1} value={frame} aria-label="Frame"
              onChange={(e) => { setPlaying(false); setFrame(Number(e.target.value)); }} className="flex-1" />
            <span className="w-24 text-right font-mono text-[11px] text-white/40">
              {String(frame).padStart(3, '0')} / {DURATION} · {(frame / FPS).toFixed(2)}s
            </span>
          </div>
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 border border-signal/40 bg-ink px-4 py-2 text-xs">
          <Check size={13} className="text-signal" /> {toast}
        </div>
      )}
    </div>
  );
}
