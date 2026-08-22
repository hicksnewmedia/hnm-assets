import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Upload, FolderPlus, Trash2, Download, GripVertical, Pencil, Check, X,
  FolderGit2, Unplug, RefreshCw, HardDrive,
} from 'lucide-react';
import {
  ensureSeeded, getItems, putItem, delItem, putSection, delSection, getSections,
  getMeta, putMeta, delMeta, uid, blobToBase64, humanSize, LibraryItem, LibrarySection,
} from './db';
import {
  fsSupported, pickRepo, looksLikeRepo, permissionState, requestPermission,
  writeLibraryFile, deleteLibraryFile, moveLibraryFile, composeManifest, writeManifest,
} from './fs';
import committed from '../src/brand/library.json';

// The library with the round-trip removed.
//
// Connect the repo folder once (Chromium's File System Access API) and every
// action mirrors to disk live: a dropped file is written into
// public/brand/library/<section>/ and src/brand/library.json is rewritten
// before the toast fades. The only remaining terminal step is git, because a
// web page cannot and should not run git.
//
// No connection (or Safari/Firefox): everything still works in-browser, with
// the export → `node render/import-assets.mjs --from <file>` fallback.

const HANDLE_KEY = 'repo-handle';

// The full publish chain. add stages, commit records locally, push is what
// actually updates the live site — showing only `git add` taught exactly the
// wrong lesson.
const PUBLISH_CMD =
  'git add public/brand/library src/brand/library.json && git commit -m "assets: library update" && git push';

type Repo =
  | { state: 'none' }
  | { state: 'prompt'; handle: FileSystemDirectoryHandle; name: string }
  | { state: 'connected'; handle: FileSystemDirectoryHandle; name: string };

export default function Library({ onToast }: { onToast: (m: string) => void }) {
  const [sections, setSections] = useState<LibrarySection[]>([]);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [repo, setRepo] = useState<Repo>({ state: 'none' });
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [newSection, setNewSection] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const targetSection = useRef<string>('unsorted');
  const dragItem = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const [s, i] = await Promise.all([getSections(), getItems()]);
    setSections(s.sort((a, b) => a.order - b.order));
    setItems(i.sort((a, b) => a.order - b.order));
  }, []);

  // Boot: seed sections, absorb the committed index, restore the repo handle.
  useEffect(() => {
    (async () => {
      const seeded = await ensureSeeded();
      // Committed sections/items from the last build become first-class
      // records here, so the library reads the same on every machine.
      const have = new Set((await getItems()).map((x) => `${x.sectionId}/${x.name}`));
      const haveSections = new Set(seeded.map((s) => s.id));
      for (const cs of committed.sections as LibrarySection[]) {
        if (!haveSections.has(cs.id)) await putSection(cs);
      }
      for (const ci of committed.items as Array<{ sectionId: string; name: string; file: string; size: number; order: number }>) {
        if (have.has(`${ci.sectionId}/${ci.name}`)) continue;
        try {
          const res = await fetch(ci.file);
          if (!res.ok) continue;
          const blob = await res.blob();
          await putItem({
            id: uid(), sectionId: ci.sectionId, name: ci.name, mime: blob.type,
            size: ci.size, order: ci.order, addedAt: Date.now(), blob, synced: true,
          });
        } catch { /* offline or file gone — skip, don't block boot */ }
      }
      await refresh();

      if (fsSupported()) {
        const saved = await getMeta<FileSystemDirectoryHandle>(HANDLE_KEY);
        if (saved) {
          const perm = await permissionState(saved);
          if (perm === 'granted') setRepo({ state: 'connected', handle: saved, name: saved.name });
          else if (perm === 'prompt') setRepo({ state: 'prompt', handle: saved, name: saved.name });
        }
      }
    })();
  }, [refresh]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const it of items) if (it.mime.startsWith('image/')) next[it.id] = URL.createObjectURL(it.blob);
    setUrls(next);
    return () => { for (const u of Object.values(next)) URL.revokeObjectURL(u); };
  }, [items]);

  const connected = repo.state === 'connected' ? repo.handle : null;

  /** Rewrite src/brand/library.json from current synced state. */
  const syncManifest = useCallback(async (handle: FileSystemDirectoryHandle) => {
    const [s, i] = await Promise.all([getSections(), getItems()]);
    await writeManifest(handle, composeManifest(
      s.map(({ id, title, order }) => ({ id, title, order })),
      i.filter((x) => x.synced).map(({ sectionId, name, size, order }) => ({ sectionId, name, size, order })),
    ));
  }, []);

  const copyPublish = async () => {
    try {
      await navigator.clipboard.writeText(PUBLISH_CMD);
      onToast('Publish command copied — run it in the repo terminal');
    } catch {
      onToast('Clipboard blocked by the browser');
    }
  };

  const connect = async () => {
    try {
      if (repo.state === 'prompt') {
        if (await requestPermission(repo.handle)) {
          setRepo({ state: 'connected', handle: repo.handle, name: repo.name });
          onToast(`Reconnected ${repo.name}`);
        }
        return;
      }
      const picked = await pickRepo();
      if (!(await looksLikeRepo(picked.handle))) {
        onToast(`"${picked.name}" doesn't look like the hnm-assets repo — pick the repo root`);
        return;
      }
      await putMeta(HANDLE_KEY, picked.handle);
      setRepo({ state: 'connected', handle: picked.handle, name: picked.name });
      onToast(`Connected ${picked.name} — drops now write straight to the repo`);
    } catch {
      /* user cancelled the picker */
    }
  };

  const disconnect = async () => {
    await delMeta(HANDLE_KEY);
    setRepo({ state: 'none' });
    onToast('Disconnected — files stay in the browser until you export');
  };

  const addFiles = async (files: FileList | File[], sectionId: string) => {
    setBusy(true);
    let n = 0, wrote = 0;
    const base = items.length;
    for (const f of Array.from(files)) {
      const item: LibraryItem = {
        id: uid(), sectionId, name: f.name, mime: f.type || 'application/octet-stream',
        size: f.size, order: base + n, addedAt: Date.now(), blob: f, synced: false,
      };
      if (connected) {
        try {
          await writeLibraryFile(connected, sectionId, f.name, f);
          item.synced = true;
          wrote++;
        } catch { /* falls back to browser-only for this file */ }
      }
      await putItem(item);
      n++;
    }
    if (connected && wrote) await syncManifest(connected);
    await refresh();
    setBusy(false);
    onToast(connected
      ? `${wrote}/${n} written to the repo — commit when ready`
      : `Added ${n} file${n === 1 ? '' : 's'} (browser only)`);
  };

  const moveItem = async (id: string, toSection: string) => {
    const it = items.find((x) => x.id === id);
    if (!it || it.sectionId === toSection) return;
    if (connected && it.synced) {
      try {
        await moveLibraryFile(connected, it.sectionId, toSection, it.name, it.blob);
      } catch { onToast(`Could not move ${it.name} on disk`); return; }
    }
    await putItem({ ...it, sectionId: toSection });
    if (connected && it.synced) await syncManifest(connected);
    await refresh();
    onToast(`Moved to ${sections.find((s) => s.id === toSection)?.title ?? toSection}`);
  };

  const removeItem = async (it: LibraryItem) => {
    if (connected && it.synced) await deleteLibraryFile(connected, it.sectionId, it.name);
    await delItem(it.id);
    if (connected && it.synced) await syncManifest(connected);
    await refresh();
    onToast(`Removed ${it.name}${connected && it.synced ? ' (repo too)' : ''}`);
  };

  const syncAll = async () => {
    if (!connected) return;
    setBusy(true);
    const pending = items.filter((i) => !i.synced);
    let wrote = 0;
    for (const it of pending) {
      try {
        await writeLibraryFile(connected, it.sectionId, it.name, it.blob);
        await putItem({ ...it, synced: true });
        wrote++;
      } catch { /* keep going; count tells the story */ }
    }
    await syncManifest(connected);
    await refresh();
    setBusy(false);
    onToast(pending.length
      ? `Synced ${wrote}/${pending.length} to the repo`
      : 'Manifest refreshed — everything was already synced');
  };

  const addSection = async () => {
    const t = newSection.trim();
    if (!t) { onToast('Name the section first'); return; }
    await putSection({ id: uid(), title: t, order: sections.length });
    setNewSection('');
    if (connected) await syncManifest(connected);
    await refresh();
    onToast(`Added "${t}"`);
  };

  const removeSection = async (s: LibrarySection) => {
    const inIt = items.filter((i) => i.sectionId === s.id);
    for (const it of inIt) {
      if (connected && it.synced) {
        try { await moveLibraryFile(connected, s.id, 'unsorted', it.name, it.blob); } catch { /* stays put on disk */ }
      }
      await putItem({ ...it, sectionId: 'unsorted' });
    }
    await delSection(s.id);
    if (connected) await syncManifest(connected);
    await refresh();
    onToast(inIt.length ? `Removed heading — ${inIt.length} moved to Unsorted` : 'Heading removed');
  };

  const saveRename = async (s: LibrarySection) => {
    const t = draftTitle.trim();
    if (t) {
      await putSection({ ...s, title: t });
      if (connected) await syncManifest(connected);
    }
    setRenaming(null);
    await refresh();
  };

  const exportAll = async () => {
    if (!items.length) { onToast('Nothing to export yet'); return; }
    setBusy(true);
    const payload = {
      exportedAt: new Date().toISOString(),
      sections: sections.map(({ id, title, order }) => ({ id, title, order })),
      items: [] as Array<Record<string, unknown>>,
    };
    for (const it of items) {
      payload.items.push({
        id: it.id, sectionId: it.sectionId, name: it.name, mime: it.mime,
        size: it.size, order: it.order, data: await blobToBase64(it.blob),
      });
    }
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'library-export.json';
    a.click();
    URL.revokeObjectURL(a.href);
    setBusy(false);
    onToast('Exported — run the import command next');
  };

  const pendingCount = items.filter((i) => !i.synced).length;
  const totalBytes = items.reduce((n, i) => n + i.size, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div>
          <h2 className="font-display text-3xl tracking-wide text-ink">Asset library</h2>
          <p className="text-sm text-muted">
            {items.length} file{items.length === 1 ? '' : 's'} · {humanSize(totalBytes)} · {sections.length} sections
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button onClick={() => { targetSection.current = 'unsorted'; fileInput.current?.click(); }}
            className="flex items-center gap-2 border border-ink/20 bg-paper-raised px-4 py-2 text-sm hover:border-ink/50">
            <Upload size={15} /> Add files
          </button>
          {connected && (
            <button onClick={syncAll} disabled={busy}
              className="flex items-center gap-2 border border-ink/20 bg-paper-raised px-4 py-2 text-sm hover:border-ink/50 disabled:opacity-40">
              <RefreshCw size={15} /> Sync{pendingCount ? ` (${pendingCount})` : ''}
            </button>
          )}
          {!connected && (
            <button onClick={exportAll} disabled={busy}
              className="flex items-center gap-2 border border-ink/20 bg-ink px-4 py-2 text-sm text-paper hover:bg-ink/85 disabled:opacity-40">
              <Download size={15} /> Export for repo
            </button>
          )}
        </div>
        <input ref={fileInput} type="file" multiple className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(e.target.files, targetSection.current); e.target.value = ''; }} />
      </div>

      {/* Connection strip — one line that tells you exactly where files go */}
      {fsSupported() ? (
        repo.state === 'connected' ? (
          <div className="mb-6 border border-ink/15 bg-paper-raised p-3">
            <div className="flex items-center gap-2">
              <FolderGit2 size={16} className="shrink-0 text-signal-deep" />
              <p className="text-sm text-muted">
                Connected to <strong className="text-ink">{repo.name}</strong> — drops write straight to{' '}
                <code className="bg-ink/5 px-1 font-mono text-[13px] text-ink">public/brand/library/</code>.
                {' '}A drop puts the file on disk; publishing it to the live site takes all three git steps:
              </p>
              <button onClick={disconnect} className="ml-auto shrink-0 text-faint hover:text-ink" title="Disconnect">
                <Unplug size={15} />
              </button>
            </div>
            <button
              onClick={() => copyPublish()}
              className="group mt-2 flex w-full items-center gap-2 border border-ink/15 bg-ink/[0.04] px-3 py-2 text-left hover:border-ink/40"
              title="Copy the full publish command">
              <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink">{PUBLISH_CMD}</code>
              <span className="shrink-0 font-mono text-[12px] uppercase tracking-wider text-ink/30 group-hover:text-ink/70">
                copy
              </span>
            </button>
          </div>
        ) : (
          <div className="mb-6 flex items-center gap-2 border border-signal/40 bg-signal/10 p-3">
            <HardDrive size={16} className="shrink-0 text-signal-deep" />
            <p className="text-sm text-muted">
              {repo.state === 'prompt'
                ? <>Repo folder remembered — the browser needs a click to re-grant access.</>
                : <>Connect your repo folder once and drops write <strong className="text-ink">straight into git's working tree</strong> — no export step.</>}
            </p>
            <button onClick={connect}
              className="ml-auto shrink-0 border border-ink/25 bg-paper-raised px-3 py-1.5 text-sm hover:border-ink/50">
              {repo.state === 'prompt' ? 'Reconnect' : 'Connect repo folder'}
            </button>
          </div>
        )
      ) : (
        <div className="mb-6 flex items-start gap-2 border border-ink/15 bg-paper-raised p-3">
          <HardDrive size={16} className="mt-0.5 shrink-0 text-faint" />
          <p className="text-sm leading-relaxed text-muted">
            This browser can't write to disk (Chrome and Edge can). Organize here, hit{' '}
            <strong className="text-ink">Export for repo</strong>, then run{' '}
            <code className="bg-ink/5 px-1 font-mono text-[13px] text-ink">node render/import-assets.mjs --from ~/Downloads/library-export.json</code>
          </p>
        </div>
      )}

      <div className="mb-6 flex gap-2">
        <input value={newSection} onChange={(e) => setNewSection(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addSection(); }}
          placeholder="New section heading"
          className="flex-1 border border-ink/20 bg-paper-raised px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-ink/50" />
        <button onClick={addSection}
          className="flex items-center gap-2 border border-ink/20 bg-paper-raised px-4 text-sm hover:border-ink/50">
          <FolderPlus size={15} /> Add section
        </button>
      </div>

      {sections.map((s) => {
        const mine = items.filter((i) => i.sectionId === s.id);
        return (
          <section key={s.id} className="mb-6"
            onDragOver={(e) => { e.preventDefault(); setDragOver(s.id); }}
            onDragLeave={() => setDragOver((d) => (d === s.id ? null : d))}
            onDrop={async (e) => {
              e.preventDefault();
              setDragOver(null);
              if (e.dataTransfer.files?.length) { await addFiles(e.dataTransfer.files, s.id); return; }
              if (dragItem.current) { await moveItem(dragItem.current, s.id); dragItem.current = null; }
            }}>
            <div className="mb-2 flex items-center gap-2">
              {renaming === s.id ? (
                <>
                  <input autoFocus value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveRename(s); if (e.key === 'Escape') setRenaming(null); }}
                    className="border border-ink/30 bg-paper-raised px-2 py-1 text-base outline-none" />
                  <button onClick={() => saveRename(s)} aria-label="Save"><Check size={16} className="text-signal-deep" /></button>
                  <button onClick={() => setRenaming(null)} aria-label="Cancel"><X size={16} className="text-faint" /></button>
                </>
              ) : (
                <>
                  <h3 className="font-display text-2xl tracking-wide text-ink">{s.title}</h3>
                  <span className="font-mono text-[13px] text-faint">{mine.length}</span>
                  <button onClick={() => { setRenaming(s.id); setDraftTitle(s.title); }}
                    className="text-faint hover:text-ink" aria-label="Rename section"><Pencil size={14} /></button>
                  {s.id !== 'unsorted' && (
                    <button onClick={() => removeSection(s)} className="text-faint hover:text-ink"
                      aria-label="Remove section"><Trash2 size={14} /></button>
                  )}
                  <button onClick={() => { targetSection.current = s.id; fileInput.current?.click(); }}
                    className="ml-auto font-mono text-[13px] uppercase tracking-wider text-faint hover:text-ink">
                    + add here
                  </button>
                </>
              )}
            </div>

            <div className={`min-h-[104px] border-2 border-dashed p-3 transition-colors ${
              dragOver === s.id ? 'border-signal bg-signal/10' : 'border-rule bg-paper-raised'}`}>
              {mine.length === 0 ? (
                <p className="py-6 text-center text-sm text-faint">
                  Drop files here, or drag items from another section
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {mine.map((it) => (
                    <div key={it.id} draggable
                      onDragStart={() => { dragItem.current = it.id; }}
                      onDragEnd={() => { dragItem.current = null; }}
                      className="group flex cursor-grab flex-col border border-ink/15 bg-paper active:cursor-grabbing">
                      <div className="relative flex h-24 items-center justify-center overflow-hidden bg-[#141414] p-2">
                        {urls[it.id]
                          ? <img src={urls[it.id]} alt={it.name} className="max-h-full max-w-full object-contain" />
                          : <span className="font-mono text-[13px] uppercase text-paper/40">
                              {it.name.split('.').pop()}
                            </span>}
                        <span className={`absolute right-1 top-1 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                          it.synced ? 'bg-signal text-ink' : 'bg-paper/20 text-paper/70'}`}>
                          {it.synced ? 'repo' : 'local'}
                        </span>
                      </div>
                      <div className="flex items-start gap-1 p-2">
                        <GripVertical size={13} className="mt-0.5 shrink-0 text-faint" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] text-ink" title={it.name}>{it.name}</div>
                          <div className="font-mono text-[12px] text-faint">{humanSize(it.size)}</div>
                        </div>
                        <button onClick={() => removeItem(it)}
                          className="shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink"
                          aria-label={`Remove ${it.name}`}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
