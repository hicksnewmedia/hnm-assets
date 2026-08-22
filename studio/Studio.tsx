import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Download, Film, Check, Volume2, VolumeX } from 'lucide-react';
import { ENTITIES } from '../src/brand/entities';
import Brand from './Brand';
import Library from './Library';
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
  const [tab, setTab] = useState<'idents' | 'brand' | 'library'>('idents');
  const [entityId, setEntityId] = useState('hnm');
  const [template, setTemplate] = useState<TemplateKey>('intro');
  const [orientation, setOrientation] = useState<Orientation>('horizontal');
  const [audio, setAudio] = useState(false);
  const [frame, setFrame] = useState(40);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
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

  const TREATMENTS = { glitch: Glitch, stamp: Stamp, editorial: Editorial, terminal: Terminal } as const;
  const Treatment = TREATMENTS[entity.treatment];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="flex items-center gap-3 border-b border-rule px-6 py-4">
        <div className="flex h-7 w-7 flex-col justify-between" aria-hidden>
          <span className="block h-[5px] bg-ink" />
          <span className="block h-[5px] bg-signal" />
          <span className="block h-[5px] bg-ink" />
        </div>
        <h1 className="font-display text-2xl tracking-wide">
          Hicks<span className="text-signal">New</span>Media<span className="text-signal">.</span> Assets
        </h1>
        <nav className="ml-auto flex gap-1">
          {(['idents', 'brand', 'library'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`border px-3 py-1.5 font-mono text-[12px] uppercase tracking-widest transition-colors ${
                tab === t ? 'border-signal bg-signal/15 text-ink' : 'border-ink/20 text-muted hover:border-ink/50 hover:text-ink'}`}>
              {t}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'brand' ? (
        <div className="p-6"><Brand onToast={flash} /></div>
      ) : tab === 'library' ? (
        <div className="p-6"><Library onToast={flash} /></div>
      ) : (
      <div className="grid gap-6 p-6 lg:grid-cols-[250px_1fr]">
        <aside>
          <div className="mb-6">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Brand</div>
            <div className="flex flex-col gap-1">
              {ENTITIES.map((e) => (
                <button key={e.id} onClick={() => setEntityId(e.id)}
                  className={`flex items-center gap-2 border px-3 py-2 text-left text-[14px] transition-colors ${
                    e.id === entityId ? 'border-ink/35 bg-ink/[0.05]' : 'border-transparent hover:bg-ink/[0.04]'}`}>
                  <span className="h-2.5 w-2.5 shrink-0" style={{ background: e.accent }} />
                  <span className="truncate">{e.name}</span>
                  <span className="ml-auto font-mono text-[11px] uppercase text-faint">{e.treatment}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 font-mono text-[12px] uppercase tracking-[0.18em] text-muted">Ident</div>
            <div className="flex gap-1">
              {(['intro', 'outro'] as TemplateKey[]).map((t) => (
                <button key={t} onClick={() => { setTemplate(t); setFrame(t === 'outro' ? 0 : 40); }}
                  className={`flex-1 border px-3 py-1.5 text-[13px] uppercase tracking-wider transition-colors ${
                    template === t ? 'border-signal bg-signal/15 text-ink' : 'border-ink/20 text-muted hover:border-ink/50'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 font-mono text-[12px] uppercase tracking-[0.18em] text-muted">Orientation</div>
            <div className="flex gap-1">
              {(['horizontal', 'vertical'] as Orientation[]).map((o) => (
                <button key={o} onClick={() => setOrientation(o)}
                  className={`flex-1 border px-3 py-1.5 text-[13px] uppercase tracking-wider transition-colors ${
                    orientation === o ? 'border-signal bg-signal/15 text-ink' : 'border-ink/20 text-muted hover:border-ink/50'}`}>
                  {o === 'horizontal' ? '16:9' : '9:16'}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 font-mono text-[12px] uppercase tracking-[0.18em] text-muted">Sound</div>
            <button onClick={() => setAudio(!audio)}
              className={`flex w-full items-center gap-2 border px-3 py-2 text-xs uppercase tracking-wider transition-colors ${
                audio ? 'border-signal bg-signal/15 text-ink' : 'border-ink/20 text-muted hover:border-ink/50'}`}>
              {audio ? <Volume2 size={13} /> : <VolumeX size={13} />}
              {audio ? 'With sound' : 'Silent'}
            </button>
            {audio && (
              <p className="mt-2 font-mono text-[12px] leading-relaxed text-faint">
                Cue fires at frame {entity.cue[template]}. No sound file exists yet — renders stay silent.
              </p>
            )}
          </div>

          <div className="mb-6">
            <div className="mb-2 font-mono text-[12px] uppercase tracking-[0.18em] text-muted">Export from browser</div>
            <div className="flex flex-col gap-1">
              <button onClick={exportPNG}
                className="flex w-full items-center gap-2 border border-ink/20 bg-paper-raised px-3 py-2 text-[13px] uppercase tracking-wider hover:border-ink/50">
                <Download size={13} /> Frame as PNG
              </button>
              <button onClick={exportWebM} disabled={recording}
                className="flex w-full items-center gap-2 border border-ink/20 bg-paper-raised px-3 py-2 text-[13px] uppercase tracking-wider hover:border-ink/50 disabled:opacity-40">
                <Film size={13} /> {recording ? 'Recording…' : 'Clip as WebM'}
              </button>
            </div>
          </div>

        </aside>

        <main>
          <div ref={stageRef}
            className={`mx-auto overflow-hidden border border-ink/20 ${
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
              className="border border-ink/20 bg-paper-raised p-2 hover:border-ink/50">
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <input type="range" min={0} max={DURATION - 1} step={1} value={frame} aria-label="Frame"
              onChange={(e) => { setPlaying(false); setFrame(Number(e.target.value)); }} className="flex-1" />
            <span className="w-24 text-right font-mono text-[13px] text-muted">
              {String(frame).padStart(3, '0')} / {DURATION} · {(frame / FPS).toFixed(2)}s
            </span>
          </div>
        </main>
      </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 border border-ink/25 bg-ink px-4 py-2 text-[13px] text-paper shadow-lg">
          <Check size={14} className="text-signal" /> {toast}
        </div>
      )}
    </div>
  );
}
