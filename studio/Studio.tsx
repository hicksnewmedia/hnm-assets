import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Download, Film, Plus, Check, Cloud, Copy } from 'lucide-react';
import { GlitchFrame, TemplateKey, Orientation } from '../src/templates/GlitchFrame';
import { ENTITIES, BrandEntity } from '../src/brand/entities';
import { TIMING, FPS } from '../src/motion/core';

// The Studio renders the exact same GlitchFrame component the Remotion
// pipeline renders. Not a reimplementation — the same file. That is the
// whole reason a preview here matches a master out of the render worker.

const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  intro: 'Intro',
  outro: 'Outro',
  lowerThird: 'Lower third',
};

export default function Studio() {
  const [entities, setEntities] = useState<BrandEntity[]>(ENTITIES);
  const [entityId, setEntityId] = useState('hnm');
  const [templateKey, setTemplateKey] = useState<TemplateKey>('intro');
  const [orientation, setOrientation] = useState<Orientation>('horizontal');
  const [frame, setFrame] = useState(32);
  const [playing, setPlaying] = useState(true);
  const [name, setName] = useState('Montell');
  const [role, setRole] = useState('Co-host · Team No Sleep');
  const [recording, setRecording] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [toast, setToast] = useState('');
  const [newName, setNewName] = useState('');
  const stageRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const entity = entities.find((e) => e.id === entityId) ?? entities[0];
  const timing = TIMING[templateKey];

  useEffect(() => {
    if (!playing) return;
    let start: number | null = null;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      setFrame(Math.floor((((ts - start) / 1000) * FPS) % timing.duration));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, timing.duration]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  const svgToCanvas = useCallback(async (scale = 1): Promise<HTMLCanvasElement | null> => {
    const svg = stageRef.current?.querySelector('svg');
    if (!svg) return null;
    const vb = svg.viewBox.baseVal;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res; img.onerror = rej;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
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
      a.download = `${entity.id}-${templateKey}-${orientation}-f${String(frame).padStart(3, '0')}.png`;
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
      const stopped = new Promise((res) => { rec.onstop = res; });
      rec.start();
      for (let f = 0; f < timing.duration; f++) {
        setFrame(f);
        await new Promise((r) => setTimeout(r, 1000 / FPS));
        const fc = await svgToCanvas(0.5);
        if (fc) ctx.drawImage(fc, 0, 0);
      }
      rec.stop(); await stopped;
      const a = document.createElement('a');
      a.download = `${entity.id}-${templateKey}-${orientation}.webm`;
      a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
      a.click();
      flash('WebM exported — preview grade');
    } catch { flash('Recording unsupported in this browser'); }
    setRecording(false);
  };

  // Hands off to the render worker for true masters.
  const queueRender = async (format: string) => {
    setQueueing(true);
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: entity.id, template: templateKey, orientation, format }),
      });
      const data = await res.json();
      flash(res.ok ? `Queued — ${format} for ${entity.name}` : (data.error ?? 'Queue failed'));
    } catch { flash('Render worker unreachable'); }
    setQueueing(false);
  };

  const addEntity = () => {
    const n = newName.trim();
    if (!n) { flash('Name the show first'); return; }
    const id = n.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
    if (entities.some((e) => e.id === id)) { flash('That show already exists'); return; }
    const w = n.split(' ');
    const mid = Math.floor(w.length / 2);
    setEntities([...entities, {
      id, name: n, accent: '#F48022', mark: '#F5F1EB', bg: '#0A0A0A',
      url: 'hicksnewmedia.com',
      parts: w.length > 1
        ? [w.slice(0, mid).join(' ') + ' ', w[mid], ' ' + w.slice(mid + 1).join(' ')]
        : [n.slice(0, 2), n.slice(2, 4), n.slice(4)],
    }]);
    setEntityId(id); setNewName('');
    flash(`${n} added — copy the config to make it permanent`);
  };

  // Session state isn't persistence. This is how a new show becomes real:
  // paste the object into src/brand/entities.ts and commit it. Git is the
  // database — you get full history of every brand change for free.
  const copyConfig = async () => {
    const cfg = `  {
    id: '${entity.id}', name: '${entity.name}',
    parts: ['${entity.parts[0]}', '${entity.parts[1]}', '${entity.parts[2]}'],
    accent: '${entity.accent}', mark: '${entity.mark}', bg: '${entity.bg}',
    url: '${entity.url}',
  },`;
    try {
      await navigator.clipboard.writeText(cfg);
      flash('Config copied — paste into src/brand/entities.ts');
    } catch { flash('Clipboard blocked — check the console'); console.log(cfg); }
  };

  const patch = (k: keyof BrandEntity, v: string) =>
    setEntities(entities.map((e) => (e.id === entityId ? { ...e, [k]: v } : e)));

  const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }> =
    ({ active, children, ...p }) => (
      <button {...p} className={`px-3 py-1.5 text-xs uppercase tracking-wider border transition-colors ${
        active ? 'border-signal text-signal' : 'border-white/15 text-white/45 hover:border-white/35 hover:text-white/75'}`}>
        {children}
      </button>
    );

  const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="mb-6">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">{label}</div>
      {children}
    </div>
  );

  const input = 'w-full border border-white/15 bg-transparent px-2 py-1.5 text-xs outline-none placeholder:text-white/25 focus:border-white/40';

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
          {entities.length} shows · {Object.keys(TIMING).length} templates
        </span>
      </header>

      <div className="grid gap-6 p-6 lg:grid-cols-[264px_1fr]">
        <aside>
          <Section label="Show">
            <div className="flex flex-col gap-1">
              {entities.map((e) => (
                <button key={e.id} onClick={() => setEntityId(e.id)}
                  className={`flex items-center gap-2 border px-3 py-2 text-left text-sm transition-colors ${
                    e.id === entityId ? 'border-white/30 bg-white/[0.06]' : 'border-transparent hover:bg-white/[0.03]'}`}>
                  <span className="h-2.5 w-2.5 shrink-0" style={{ background: e.accent }} />
                  <span className="truncate">{e.name}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-1">
              <input value={newName} onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addEntity()}
                placeholder="New show name" className={input + ' min-w-0 flex-1'} />
              <button onClick={addEntity} aria-label="Add show"
                className="border border-white/15 px-2 hover:border-white/40"><Plus size={14} /></button>
            </div>
          </Section>

          <Section label="Accent">
            <div className="flex items-center gap-2">
              <input type="color" value={entity.accent} onChange={(e) => patch('accent', e.target.value)}
                className="h-8 w-10 cursor-pointer border border-white/15 bg-transparent" />
              <span className="font-mono text-xs text-white/50">{entity.accent.toUpperCase()}</span>
              <button onClick={copyConfig} title="Copy config for entities.ts"
                className="ml-auto border border-white/15 p-1.5 hover:border-white/40"><Copy size={13} /></button>
            </div>
          </Section>

          <Section label="Template">
            <div className="flex flex-wrap gap-1">
              {(Object.keys(TEMPLATE_LABELS) as TemplateKey[]).map((k) => (
                <Btn key={k} active={templateKey === k}
                  onClick={() => { setTemplateKey(k); setFrame(0); }}>{TEMPLATE_LABELS[k]}</Btn>
              ))}
            </div>
          </Section>

          <Section label="Orientation">
            <div className="flex gap-1">
              <Btn active={orientation === 'horizontal'} onClick={() => setOrientation('horizontal')}>16:9</Btn>
              <Btn active={orientation === 'vertical'} onClick={() => setOrientation('vertical')}>9:16</Btn>
            </div>
          </Section>

          {templateKey === 'lowerThird' && (
            <Section label="Data">
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Guest name" className={input + ' mb-1'} />
              <input value={role} onChange={(e) => setRole(e.target.value)}
                placeholder="Role or title" className={input} />
            </Section>
          )}

          <Section label="Export from browser">
            <button onClick={exportPNG}
              className="mb-1 flex w-full items-center gap-2 border border-white/15 px-3 py-2 text-xs uppercase tracking-wider hover:border-white/40">
              <Download size={13} /> Frame as PNG
            </button>
            <button onClick={exportWebM} disabled={recording}
              className="flex w-full items-center gap-2 border border-white/15 px-3 py-2 text-xs uppercase tracking-wider hover:border-white/40 disabled:opacity-40">
              <Film size={13} /> {recording ? 'Recording…' : 'Clip as WebM'}
            </button>
            <p className="mt-2 font-mono text-[10px] leading-relaxed text-white/25">Preview grade. No alpha.</p>
          </Section>

          <Section label="Queue a master">
            <div className="flex flex-col gap-1">
              {(['master', 'overlay', 'social'] as const).map((f) => (
                <button key={f} onClick={() => queueRender(f)} disabled={queueing}
                  className="flex w-full items-center gap-2 border border-white/15 px-3 py-2 text-xs uppercase tracking-wider hover:border-signal hover:text-signal disabled:opacity-40">
                  <Cloud size={13} /> {f}
                </button>
              ))}
            </div>
            <p className="mt-2 font-mono text-[10px] leading-relaxed text-white/25">
              Runs on the render worker. Takes a few minutes.
            </p>
          </Section>
        </aside>

        <main>
          <div ref={stageRef}
            className={`mx-auto overflow-hidden border border-white/10 bg-black ${
              orientation === 'vertical' ? 'aspect-[9/16] max-w-[300px]' : 'aspect-video w-full'}`}>
            <GlitchFrame frame={frame} entity={entity} templateKey={templateKey}
              orientation={orientation} name={name} role={role} />
          </div>

          <div className="mx-auto mt-4 flex max-w-3xl items-center gap-3">
            <button onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Play'}
              className="border border-white/15 p-2 hover:border-white/40">
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <input type="range" min={0} max={timing.duration - 1} step={1} value={frame}
              onChange={(e) => { setPlaying(false); setFrame(+e.target.value); }} className="flex-1" />
            <span className="w-24 text-right font-mono text-[11px] text-white/40">
              {String(frame).padStart(3, '0')} / {timing.duration} · {(frame / FPS).toFixed(2)}s
            </span>
          </div>

          <div className="mx-auto mt-3 flex max-w-3xl flex-wrap gap-1.5 font-mono text-[10px] uppercase tracking-wider">
            {([['Glitch', timing.glitchIn], ['Lock', timing.lock], ['Text', timing.wordIn], ['Cut', timing.cut]] as const).map(
              ([l, f]) => (
                <button key={l} onClick={() => { setPlaying(false); setFrame(f); }}
                  className={`border px-2 py-1 transition-colors ${
                    frame === f ? 'border-signal text-signal' : 'border-white/10 text-white/35 hover:border-white/30'}`}>
                  {l} · {f}
                </button>
              ))}
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
