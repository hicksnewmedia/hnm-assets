// Direct repo access from the browser via the File System Access API.
//
// Chromium browsers let a page request a directory handle once; the handle
// persists in IndexedDB and survives reloads. With it granted, every Library
// action writes straight into public/brand/library/ and rewrites
// src/brand/library.json — no export file, no import CLI, no second step.
// The only thing left for the terminal is `git add` and commit, because a
// page still cannot (and should not) run git.
//
// Safari and Firefox don't ship this API. They fall back to the export →
// `node render/import-assets.mjs --from <file>` path, which stays supported.

export interface RepoConnection {
  handle: FileSystemDirectoryHandle;
  name: string;
}

// --- ambient declarations: TS's dom lib doesn't cover all of this yet ---
declare global {
  interface Window {
    showDirectoryPicker?: (opts?: { mode?: 'read' | 'readwrite'; id?: string }) => Promise<FileSystemDirectoryHandle>;
  }
}
interface HandleWithPerms extends FileSystemDirectoryHandle {
  queryPermission?: (d: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (d: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
}

export const fsSupported = (): boolean =>
  typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';

/** One-time picker. Throws if the user cancels. */
export async function pickRepo(): Promise<RepoConnection> {
  if (!window.showDirectoryPicker) throw new Error('File System Access not supported');
  const handle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'hnm-assets-repo' });
  return { handle, name: handle.name };
}

/**
 * Sanity-check the picked folder is actually the repo — writing a library
 * into somebody's Documents folder because they mis-picked would be rude.
 */
export async function looksLikeRepo(handle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    await handle.getDirectoryHandle('src');
    await handle.getDirectoryHandle('public');
    await handle.getDirectoryHandle('render');
    return true;
  } catch {
    return false;
  }
}

/** 'granted' | 'prompt' | 'denied' — re-request must come from a user gesture. */
export async function permissionState(handle: FileSystemDirectoryHandle): Promise<PermissionState> {
  const h = handle as HandleWithPerms;
  if (!h.queryPermission) return 'granted';
  return h.queryPermission({ mode: 'readwrite' });
}

export async function requestPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const h = handle as HandleWithPerms;
  if (!h.requestPermission) return true;
  return (await h.requestPermission({ mode: 'readwrite' })) === 'granted';
}

async function dirAt(root: FileSystemDirectoryHandle, path: string[], create = true) {
  let d = root;
  for (const seg of path) d = await d.getDirectoryHandle(seg, { create });
  return d;
}

/** Matches render/import-assets.mjs exactly, so both paths agree on names. */
export const sanitizeName = (s: string): string =>
  s.split('/').pop()!.split('\\').pop()!.replace(/[^a-zA-Z0-9._-]/g, '_');

export async function writeLibraryFile(
  repo: FileSystemDirectoryHandle, sectionId: string, name: string, blob: Blob,
): Promise<string> {
  const dir = await dirAt(repo, ['public', 'brand', 'library', sectionId]);
  const safe = sanitizeName(name);
  const fh = await dir.getFileHandle(safe, { create: true });
  const w = await fh.createWritable();
  await w.write(blob);
  await w.close();
  return `/brand/library/${sectionId}/${safe}`;
}

export async function deleteLibraryFile(
  repo: FileSystemDirectoryHandle, sectionId: string, name: string,
): Promise<void> {
  try {
    const dir = await dirAt(repo, ['public', 'brand', 'library', sectionId], false);
    await dir.removeEntry(sanitizeName(name));
  } catch {
    // Already gone is fine — the goal is "not on disk", and it isn't.
  }
}

export async function readLibraryFile(
  repo: FileSystemDirectoryHandle, sectionId: string, name: string,
): Promise<Blob | null> {
  try {
    const dir = await dirAt(repo, ['public', 'brand', 'library', sectionId], false);
    const fh = await dir.getFileHandle(sanitizeName(name));
    return await fh.getFile();
  } catch {
    return null;
  }
}

export async function moveLibraryFile(
  repo: FileSystemDirectoryHandle, fromSection: string, toSection: string, name: string, blob: Blob | null,
): Promise<string> {
  const data = blob ?? (await readLibraryFile(repo, fromSection, name));
  if (!data) throw new Error(`Cannot read ${name} to move it`);
  const path = await writeLibraryFile(repo, toSection, name, data);
  await deleteLibraryFile(repo, fromSection, name);
  return path;
}

// --- manifest ---

export interface ManifestSection { id: string; title: string; order: number; }
export interface ManifestItem {
  sectionId: string; name: string; file: string; ext: string; size: number; order: number;
}

/** Pure: composes the committed index. Unit-tested in render/spec.test.mjs. */
export function composeManifest(
  sections: ManifestSection[],
  items: Array<{ sectionId: string; name: string; size: number; order: number }>,
): { generatedAt: string; sections: ManifestSection[]; items: ManifestItem[] } {
  const known = new Set(sections.map((s) => s.id));
  return {
    generatedAt: new Date().toISOString(),
    sections: [...sections].sort((a, b) => a.order - b.order),
    items: items
      .filter((i) => known.has(i.sectionId))
      .map((i) => {
        const safe = sanitizeName(i.name);
        return {
          sectionId: i.sectionId,
          name: safe,
          file: `/brand/library/${i.sectionId}/${safe}`,
          ext: (safe.split('.').pop() ?? '').toLowerCase(),
          size: i.size,
          order: i.order,
        };
      })
      .sort((a, b) => a.sectionId.localeCompare(b.sectionId) || a.order - b.order),
  };
}

export async function writeManifest(
  repo: FileSystemDirectoryHandle,
  manifest: ReturnType<typeof composeManifest>,
): Promise<void> {
  const dir = await dirAt(repo, ['src', 'brand']);
  const fh = await dir.getFileHandle('library.json', { create: true });
  const w = await fh.createWritable();
  await w.write(JSON.stringify(manifest, null, 2) + '\n');
  await w.close();
}
