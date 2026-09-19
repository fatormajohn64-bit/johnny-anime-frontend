const API_BASE_URL = "https://johnny-anime-backend.onrender.com";

/* =========================
   REQUEST
========================= */

async function request(endpoint, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
  } catch (error) {
    throw new Error("Could not connect to the Johnny Anime backend.");
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const serverMessage = data?.error || data?.message;

    throw new Error(
      serverMessage || `Request failed with HTTP ${response.status} ${response.statusText}`
    );
  }

  return data;
}

/* =========================
   HEALTH
========================= */

export async function checkHealth() {
  return request("/api/health");
}

/* =========================
   ANIME (live AniList data)
========================= */

export async function searchAnime(query) {
  const cleanQuery = String(query || "").trim();

  if (!cleanQuery) {
    throw new Error("Search query is required");
  }

  return request(`/api/anime/search?q=${encodeURIComponent(cleanQuery)}`);
}

// Live AniList lookup by AniList ID. Response: { success, anime }
export async function getAnimeById(anilistId) {
  return request(`/api/anime/${encodeURIComponent(anilistId)}`);
}

/* =========================
   ANIME SYNC
   (AniList metadata -> local database row)
========================= */

// Response: { success, anime } — anime.id is the LOCAL database id.
export async function getSyncedAnime(anilistId) {
  return request(`/api/anime-sync/${encodeURIComponent(anilistId)}`);
}

export async function syncAnime(anilistId) {
  return request(`/api/anime-sync/${encodeURIComponent(anilistId)}`, {
    method: "POST"
  });
}

// Syncs the anime AND adds it to the library in one call.
export async function syncAnimeToLibrary(anilistId) {
  return request(`/api/anime-sync/${encodeURIComponent(anilistId)}/library`, {
    method: "POST"
  });
}

/* =========================
   SEASONS & EPISODES
   (all IDs here are LOCAL database ids)
========================= */

export async function getSeasons(localAnimeId) {
  return request(`/api/anime/${encodeURIComponent(localAnimeId)}/seasons`);
}

export async function getEpisodes(seasonId) {
  return request(`/api/season/${encodeURIComponent(seasonId)}/episodes`);
}

// Response: { success, episode }
export async function getEpisode(episodeId) {
  return request(`/api/episode/${encodeURIComponent(episodeId)}`);
}

/* =========================
   EPISODE SYNC
   (generates local seasons/episodes for a synced anime)
========================= */

export async function syncAnimeEpisodes(anilistId) {
  return request(`/api/episode-sync/anilist/${encodeURIComponent(anilistId)}`, {
    method: "POST"
  });
}

/* =========================
   EPISODE NAVIGATION
   Response: { success, navigation: { anime, season, current, previous, next } }
========================= */

export async function getEpisodeNavigation(episodeId) {
  return request(`/api/episode-navigation/${encodeURIComponent(episodeId)}`);
}

/* =========================
   VIDEO SOURCES
   Response: { success, count, sources }
========================= */

export async function getVideoSources(episodeId) {
  return request(`/api/video-sources/episode/${encodeURIComponent(episodeId)}`);
}

export async function addVideoSource({ episodeId, sourceType, sourceUrl, quality, format, sizeBytes }) {
  return request("/api/video-sources", {
    method: "POST",
    body: JSON.stringify({ episodeId, sourceType, sourceUrl, quality, format, sizeBytes })
  });
}

export async function removeVideoSource(sourceId) {
  return request(`/api/video-sources/${encodeURIComponent(sourceId)}`, {
    method: "DELETE"
  });
}

/* =========================
   WATCH PROGRESS
   Requires positionSeconds / durationSeconds (numbers).
   Save uses PUT, not POST.
========================= */

export async function getWatchProgress(episodeId) {
  return request(`/api/watch-progress/episode/${encodeURIComponent(episodeId)}`);
}

export async function saveWatchProgress(episodeId, { positionSeconds, durationSeconds, completed }) {
  return request(`/api/watch-progress/episode/${encodeURIComponent(episodeId)}`, {
    method: "PUT",
    body: JSON.stringify({
      positionSeconds,
      durationSeconds,
      completed: completed === true
    })
  });
}

/* =========================
   LIBRARY
   (local ids)
========================= */

export async function getLibrary() {
  return request("/api/library");
}

export async function getLibraryAnime(localAnimeId) {
  return request(`/api/library/${encodeURIComponent(localAnimeId)}`);
}

export async function removeFromLibrary(localAnimeId) {
  return request(`/api/library/${encodeURIComponent(localAnimeId)}`, {
    method: "DELETE"
  });
}

/* =========================
   FAVORITES
   (local anime id, in the URL, no body)
========================= */

export async function addFavorite(localAnimeId) {
  return request(`/api/favorites/anime/${encodeURIComponent(localAnimeId)}`, {
    method: "POST"
  });
}

export async function removeFavorite(localAnimeId) {
  return request(`/api/favorites/anime/${encodeURIComponent(localAnimeId)}`, {
    method: "DELETE"
  });
}

export async function checkFavorite(localAnimeId) {
  return request(`/api/favorites/anime/${encodeURIComponent(localAnimeId)}/check`);
}

/* =========================
   DOWNLOADS
   storageKey is required + unique per record.
========================= */

export async function getDownloads() {
  return request("/api/downloads");
}

export async function getEpisodeDownloads(episodeId) {
  return request(`/api/downloads/episode/${encodeURIComponent(episodeId)}`);
}

export async function createDownload(download) {
  return request("/api/downloads", {
    method: "POST",
    body: JSON.stringify(download)
  });
}

export async function updateDownloadStatus(downloadId, status) {
  return request(`/api/downloads/${encodeURIComponent(downloadId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

/* =========================
   SETTINGS
========================= */

export async function getSettings() {
  return request("/api/settings");
}

export async function updateSettings(settings) {
  return request("/api/settings", {
    method: "POST",
    body: JSON.stringify(settings)
  });
}
