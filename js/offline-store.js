/*
  True offline video storage.

  Downloaded episodes are saved as Blobs directly inside the
  browser (IndexedDB), not as files in the phone's Downloads
  folder. That's what lets the player load and play an episode
  with zero network requests once it's been downloaded.

  Browser storage quotas apply — this is fine for a handful of
  downloaded episodes, not for an entire 220-episode series.
*/

const DB_NAME = "johnny_anime_offline";
const DB_VERSION = 1;
const STORE_NAME = "episodes";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "episodeId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/* =========================
   SAVE
========================= */

export async function saveEpisode(episodeId, blob, meta = {}) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");

    tx.objectStore(STORE_NAME).put({
      episodeId: String(episodeId),
      blob,
      sizeBytes: blob.size,
      savedAt: Date.now(),
      ...meta
    });

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

/* =========================
   READ
========================= */

export async function getEpisodeBlob(episodeId) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");

    const request = tx.objectStore(STORE_NAME).get(String(episodeId));

    request.onsuccess = () => resolve(request.result?.blob || null);
    request.onerror = () => reject(request.error);
  });
}

export async function hasEpisode(episodeId) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");

    const request = tx.objectStore(STORE_NAME).getKey(String(episodeId));

    request.onsuccess = () => resolve(Boolean(request.result));
    request.onerror = () => reject(request.error);
  });
}

// Lightweight listing (no blobs) — safe to call often for UI badges.
export async function listEpisodes() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");

    const request = tx.objectStore(STORE_NAME).getAll();

    request.onsuccess = () => {
      const rows = request.result || [];

      resolve(rows.map(({ blob, ...meta }) => meta));
    };

    request.onerror = () => reject(request.error);
  });
}

/* =========================
   DELETE
========================= */

export async function deleteEpisode(episodeId) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");

    tx.objectStore(STORE_NAME).delete(String(episodeId));

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

/* =========================
   STORAGE ESTIMATE
========================= */

export async function getStorageEstimate() {
  if (!navigator.storage?.estimate) {
    return null;
  }

  try {
    return await navigator.storage.estimate();
  } catch {
    return null;
  }
}
