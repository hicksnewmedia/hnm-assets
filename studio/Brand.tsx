import { useState } from 'react';
import { Download, Copy, Check, Terminal as TerminalIcon } from 'lucide-react';
import { BRAND_KITS, TYPE_STACK, IDENT_MATRIX } from '../src/brand/assets';

// The reference half of the repository: marks to download, per-brand palettes
// to copy, the type stack, and every render command in one place.

export default function Brand({ onToast }: { onToast: (m: string) => void }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      onToast(`Copied ${label}`);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      onToast('Clipboard blocked by the browser');
    }
  };

  // Near-white swatches need a visible edge against a paper background.
  const needsEdge = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const l = (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
    return l > 225;
  };

  return (
    <div className="mx-auto max-w-5xl">
      {BRAND_KITS.map((kit) => (
        <section key={kit.entityId} className="mb-14">
          <div className="flex items-baseline gap-3 border-b border-rule pb-2">
            <h2 className="font-display text-3xl tracking-wide text-ink">{kit.name}</h2>
            <span className="font-mono text-[13px] text-faint">{kit.tagline}</span>
          </div>

          <h3 className="mb-3 mt-6 font-mono text-[12px] uppercase tracking-[0.18em] text-muted">Palette</h3>
          <div className="mb-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {kit.palette.map((sw) => (
              <button key={sw.hex + sw.name} onClick={() => copy(sw.hex, sw.hex)}
                className="group flex items-center gap-3 border border-ink/15 bg-paper-raised p-3 text-left transition-colors hover:border-ink/40">
                <span className={`h-12 w-12 shrink-0 ${needsEdge(sw.hex) ? 'border border-ink/25' : ''}`}
                  style={{ background: sw.hex }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-ink">{sw.name}</span>
                  <span className="block font-mono text-[13px] text-muted">{sw.hex}</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-faint">{sw.role}</span>
                </span>
                {copied === sw.hex
                  ? <Check size={15} className="shrink-0 text-signal-deep" />
                  : <Copy size={15} className="shrink-0 text-ink/20 group-hover:text-ink/60" />}
              </button>
            ))}
          </div>

          <h3 className="mb-3 font-mono text-[12px] uppercase tracking-[0.18em] text-muted">Marks</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {kit.assets.map((a) => (
              <div key={a.file} className="flex flex-col overflow-hidden border border-ink/15 bg-paper-raised">
                <div className="flex h-28 items-center justify-center p-5"
                  style={{ background: a.on === 'light' ? '#FFFFFF' : '#141414' }}>
                  <img src={a.file} alt={a.label} className="max-h-full max-w-full object-contain" />
                </div>
                <div className="flex flex-1 flex-col gap-1 border-t border-ink/10 p-3">
                  <div className="text-[14px] font-medium text-ink">{a.label}</div>
                  <div className="text-[12px] leading-snug text-faint">{a.note}</div>
                  <a href={a.file} download
                    className="mt-2 flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-wider text-muted hover:text-ink">
                    <Download size={13} /> {a.file.split('.').pop()}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="mb-14">
        <h2 className="mb-4 border-b border-rule pb-2 font-display text-3xl tracking-wide text-ink">Type</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {TYPE_STACK.map((f) => (
            <div key={f.role} className="border border-ink/15 bg-paper-raised p-4">
              <div className="font-mono text-[12px] uppercase tracking-widest text-faint">{f.role}</div>
              <div className="mt-1 text-2xl text-ink"
                style={{
                  fontFamily: `'${f.family}', sans-serif`,
                  fontStyle: f.family === 'Fraunces' ? 'italic' : 'normal',
                }}>
                {f.family}
              </div>
              <div className="mt-1 text-[13px] leading-snug text-muted">{f.note}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 border-b border-rule pb-2 font-display text-3xl tracking-wide text-ink">All 16 idents</h2>
        <p className="mb-4 max-w-2xl text-[14px] leading-relaxed text-muted">
          Masters render locally in about nine seconds each. Click a row to copy its command,
          run it from the repo root, and the file lands in{' '}
          <code className="bg-ink/5 px-1 font-mono text-[13px] text-ink">out/</code>. Swap{' '}
          <code className="bg-ink/5 px-1 font-mono text-[13px] text-ink">master</code> for{' '}
          <code className="bg-ink/5 px-1 font-mono text-[13px] text-ink">social</code> to get H.264
          instead of ProRes.
        </p>
        <div className="border border-ink/15 bg-paper-raised">
          {IDENT_MATRIX.map((r, i) => (
            <button key={r.command}
              onClick={() => copy(r.command, `${r.entity} ${r.template} ${r.orientation}`)}
              className={`group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-ink/[0.04] ${
                i ? 'border-t border-ink/10' : ''}`}>
              <TerminalIcon size={14} className="shrink-0 text-ink/25 group-hover:text-signal-deep" />
              <span className="w-24 shrink-0 font-mono text-[13px] text-ink">{r.entity}</span>
              <span className="w-16 shrink-0 font-mono text-[13px] text-muted">{r.template}</span>
              <span className="w-20 shrink-0 font-mono text-[13px] text-muted">
                {r.orientation === 'horizontal' ? '16:9' : '9:16'}
              </span>
              <span className="ml-auto shrink-0 font-mono text-[12px] uppercase tracking-wider text-ink/25 group-hover:text-ink/60">
                {copied === r.command ? 'copied' : 'copy'}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
