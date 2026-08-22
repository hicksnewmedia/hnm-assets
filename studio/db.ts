// Storage for the asset library.
//
// IndexedDB, not localStorage: localStorage caps around 5MB and only holds
// strings, so a handful of logo files would blow past it. IndexedDB stores
// Blobs directly and gets a far larger quota.
//
// Important: this lives in YOUR browser on THIS machine. It is a staging and
// organizing surface, not the repository. Export to disk and run
// `node render/import-assets.mjs` to move things into git.

const DB_NAME = 'hnm-assets-library';
const DB_VERSION = 2;
const ITEMS = 'items';
const SECTIONS = 'sections';
const META = 'meta';

export interface LibraryItem {
  id: string;
  sectionId: string;
  name: string;
  mime: string;
  size: number;
  order: number;
  addedAt: number;
  blob: Blob;
  /** True once the file has been written into the repo folder. */
  synced?: boolean;
}

export interface LibrarySection {
  id: string;
  title: string;
  order: number;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ITEMS)) db.createObjectStore(ITEMS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(SECTIONS)) db.createObjectStore(SECTIONS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
    t.oncomplete = () => db.close();
  });
}

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const getSections = () => tx<LibrarySection[]>(SECTIONS, 'readonly', (s) => s.getAll());
export const putSection = (v: LibrarySection) => tx<IDBValidKey>(SECTIONS, 'readwrite', (s) => s.put(v));
export const delSection = (id: string) => tx<undefined>(SECTIONS, 'readwrite', (s) => s.delete(id));

export const getItems = () => tx<LibraryItem[]>(ITEMS, 'readonly', (s) => s.getAll());

// Meta store — persists the FileSystemDirectoryHandle across reloads.
// Handles are structured-cloneable in Chromium, so IndexedDB can hold them.
export const putMeta = (key: string, value: unknown) =>
  tx<IDBValidKey>(META, 'readwrite', (s) => s.put({ key, value }));
export const getMeta = async <T>(key: string): Promise<T | undefined> => {
  const row = await tx<{ key: string; value: T } | undefined>(META, 'readonly', (s) => s.get(key));
  return row?.value;
};
export const delMeta = (key: string) => tx<undefined>(META, 'readwrite', (s) => s.delete(key));
export const putItem = (v: LibraryItem) => tx<IDBValidKey>(ITEMS, 'readwrite', (s) => s.put(v));
export const delItem = (id: string) => tx<undefined>(ITEMS, 'readwrite', (s) => s.delete(id));

/** Default structure on first run, so the page is never an empty void. */
export const SEED_SECTIONS: LibrarySection[] = [
  { id: 'logos', title: 'Logos & Marks', order: 0 },
  { id: 'social', title: 'Social & Thumbnails', order: 1 },
  { id: 'overlays', title: 'Stream Overlays', order: 2 },
  { id: 'unsorted', title: 'Unsorted', order: 99 },
];

export async function ensureSeeded(): Promise<LibrarySection[]> {
  const existing = await getSections();
  if (existing.length) return existing.sort((a, b) => a.order - b.order);
  for (const s of SEED_SECTIONS) await putSection(s);
  return [...SEED_SECTIONS];
}

/** Base64 for the export manifest, which the import CLI unpacks into git. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export const humanSize = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B`
    : bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
