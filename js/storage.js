/*
  Local persistence layer.

  This runs entirely in the browser (localStorage) so
  Library and Downloads work immediately and reliably,
  regardless of whether the backend's /api/library and
  /api/downloads routes are wired up yet.
*/

const LIBRARY_KEY = "jav_library";
const DOWNLOADS_KEY = "jav_downloads";
const SETTINGS_KEY = "jav_settings";

const DEFAULT_SETTINGS = {
  autoplayNext: true,
  autoResume: true
};

/* =========================
   CORE READ/WRITE
========================= */

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Could not read "${key}" from storage:`, error);
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Could not write "${key}" to storage:`, error);
  }
}

/* =========================
   LIBRARY
========================= */

export function getLibrary() {
  return readJson(LIBRARY_KEY, []);
}

export function isInLibrary(animeId) {
  return getLibrary().some((item) => String(item.animeId) === String(animeId));
}

export function addToLibrary(entry) {
  const library = getLibrary();

  if (isInLibrary(entry.animeId)) {
    return library;
  }

  library.unshift({
    ...entry,
    addedAt: Date.now()
  });

  writeJson(LIBRARY_KEY, library);

  return library;
}

export function removeFromLibrary(animeId) {
  const library = getLibrary().filter(
    (item) => String(item.animeId) !== String(animeId)
  );

  writeJson(LIBRARY_KEY, library);

  return library;
}

/* =========================
   DOWNLOADS
========================= */

export function getDownloads() {
  return readJson(DOWNLOADS_KEY, []);
}

export function getDownloadsForAnime(animeId) {
  return getDownloads().filter(
    (item) => String(item.animeId) === String(animeId)
  );
}

export function upsertDownload(entry) {
  const downloads = getDownloads();

  const index = downloads.findIndex(
    (item) => String(item.episodeId) === String(entry.episodeId)
  );

  if (index >= 0) {
    downloads[index] = {
      ...downloads[index],
      ...entry
    };
  } else {
    downloads.unshift({
      ...entry,
      addedAt: Date.now()
    });
  }

  writeJson(DOWNLOADS_KEY, downloads);

  return downloads;
}

export function removeDownload(episodeId) {
  const downloads = getDownloads().filter(
    (item) => String(item.episodeId) !== String(episodeId)
  );

  writeJson(DOWNLOADS_KEY, downloads);

  return downloads;
}

export function clearAllDownloadsAndLibrary() {
  localStorage.removeItem(LIBRARY_KEY);
  localStorage.removeItem(DOWNLOADS_KEY);
}

/* =========================
   SETTINGS
========================= */

export function getSettings() {
  return {
    ...DEFAULT_SETTINGS,
    ...readJson(SETTINGS_KEY, {})
  };
}

export function saveSettings(settings) {
  writeJson(SETTINGS_KEY, settings);
}
