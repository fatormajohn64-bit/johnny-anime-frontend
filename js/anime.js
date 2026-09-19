import {
  getAnimeById,
  getSyncedAnime,
  syncAnime,
  syncAnimeToLibrary,
  getSeasons,
  getEpisodes,
  syncAnimeEpisodes,
  getVideoSources,
  getLibraryAnime,
  addFavorite,
  checkFavorite,
  getEpisodeDownloads,
  createDownload
} from "./api.js";

import {
  addToLibrary as addToLocalLibrary,
  getDownloads as getLocalDownloads,
  upsertDownload as upsertLocalDownload
} from "./storage.js";

import {
  saveEpisode as saveOfflineEpisode,
  listEpisodes as listOfflineEpisodes
} from "./offline-store.js";

/* =========================
   ELEMENTS
========================= */

const titleElement = document.getElementById("anime-title");
const formatElement = document.getElementById("anime-format");
const metaElement = document.getElementById("anime-meta");
const descriptionElement = document.getElementById("anime-description");
const posterElement = document.getElementById("anime-poster");
const bannerElement = document.getElementById("anime-banner");
const altTitlesElement = document.getElementById("anime-alt-titles");
const seasonList = document.getElementById("season-list");
const episodeList = document.getElementById("episode-list");
const backButton = document.getElementById("anime-back");
const libraryButton = document.getElementById("add-library");
const favoriteButton = document.getElementById("favorite-anime");
const watchButton = document.getElementById("watch-anime");
const selectAllCheckbox = document.getElementById("select-all-episodes");
const downloadSelectedButton = document.getElementById("download-selected");
const downloadAllButton = document.getElementById("download-all");
const downloadStatusElement = document.getElementById("download-status");

/* =========================
   STATE
========================= */

// The AniList ID, passed in from search results.
const anilistId = sessionStorage.getItem("selectedAnimeId");

// The local database ID, resolved once the anime is synced.
// Seasons, episodes, library, favorites, and downloads all
// key off this — NOT the AniList ID.
let localAnimeId = null;

let currentAnime = null;
let firstEpisode = null;
let isDownloadQueueRunning = false;

/* =========================
   BACK
========================= */

backButton?.addEventListener("click", () => {
  window.location.hash = "search";
});

/* =========================
   WATCH
========================= */

watchButton?.addEventListener("click", () => {
  if (firstEpisode) {
    openEpisode(firstEpisode);
    return;
  }

  episodeList?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

/* =========================
   START
========================= */

if (!anilistId) {
  showError("No anime was selected.");
} else {
  loadAnime(anilistId);
}

/* =========================
   LOAD ANIME
========================= */

async function loadAnime(id) {
  showLoading();

  try {
    const response = await getAnimeById(id);

    const anime = extractAnime(response);

    if (!anime) {
      throw new Error("Anime information was not found.");
    }

    currentAnime = anime;

    renderAnime(anime);

    // Resolve (or create) the local database row for this
    // anime. Seasons, episodes, favorites, library, and
    // downloads all depend on this local id existing.
    localAnimeId = await ensureLocalSync(id);

    if (localAnimeId) {
      await refreshLibraryButtonState();
      await refreshFavoriteButtonState();
      await loadBackendSeasons(localAnimeId, id, anime);
    } else {
      seasonList.innerHTML = `
        <div class="anime-error">
          Could not sync this anime to the backend, so seasons,
          episodes, and downloads aren't available right now.
        </div>
      `;

      renderFallbackEpisodes(anime);
    }
  } catch (error) {
    console.error("Anime loading failed:", error);

    showError(error.message || "Unable to load anime.");
  }
}

/* =========================
   ANIME EXTRACTION (AniList shape)
========================= */

function extractAnime(response) {
  const candidates = [response?.anime, response?.result, response?.data, response];

  return (
    candidates.find(
      (candidate) =>
        candidate &&
        typeof candidate === "object" &&
        (candidate.title || candidate.coverImage || candidate.id)
    ) || null
  );
}

/* =========================
   LOCAL SYNC
========================= */

async function ensureLocalSync(id) {
  try {
    const existing = await getSyncedAnime(id);
    const local = existing?.anime;

    if (local?.id) {
      return local.id;
    }
  } catch (error) {
    // Not synced yet — fall through and sync it now.
  }

  try {
    const created = await syncAnime(id);
    return created?.anime?.id || null;
  } catch (error) {
    console.warn("Anime sync failed:", error);
    return null;
  }
}

/* =========================
   RENDER ANIME
========================= */

function renderAnime(anime) {
  const title =
    anime?.title?.english ||
    anime?.title?.romaji ||
    anime?.title?.native ||
    "Unknown Anime";

  const format = anime?.format || "ANIME";

  const episodes = anime?.episodes ?? "Unknown";

  const duration = anime?.duration ? `${anime.duration} min` : "Unknown duration";

  const status = anime?.status || "Unknown status";

  const year = anime?.seasonYear || "";

  const description = cleanDescription(anime?.description || "No description available.");

  const poster =
    anime?.coverImage?.extraLarge ||
    anime?.coverImage?.large ||
    anime?.coverImage?.medium ||
    "";

  const banner = anime?.bannerImage || "";

  titleElement.textContent = title;
  formatElement.textContent = format;

  metaElement.textContent = [`${episodes} episodes`, duration, status, year]
    .filter(Boolean)
    .join(" • ");

  descriptionElement.textContent = description;

  renderAltTitles(anime, title);

  if (poster) {
    posterElement.innerHTML = `<img src="${escapeAttribute(poster)}" alt="${escapeAttribute(title)}">`;
  } else {
    posterElement.innerHTML = `<div class="anime-poster-placeholder">${escapeHtml(title)}</div>`;
  }

  if (bannerElement) {
    bannerElement.style.backgroundImage = banner
      ? `url("${banner.replaceAll('"', "")}")`
      : "none";
  }
}

function renderAltTitles(anime, mainTitle) {
  if (!altTitlesElement) {
    return;
  }

  const alternates = [anime?.title?.romaji, anime?.title?.native].filter(
    (value) => value && value !== mainTitle
  );

  altTitlesElement.textContent = alternates.join(" • ");
}

/* =========================
   ADD TO LIBRARY
========================= */

libraryButton?.addEventListener("click", async () => {
  if (!anilistId || libraryButton.disabled) {
    return;
  }

  libraryButton.disabled = true;
  libraryButton.textContent = "Adding...";

  try {
    const response = await syncAnimeToLibrary(anilistId);

    // This call also syncs the anime, so pick up the local id
    // now if we didn't already have it.
    localAnimeId = localAnimeId || response?.anime?.id || null;

    if (currentAnime) {
      addToLocalLibrary({
        animeId: anilistId,
        title: animeTitle(currentAnime),
        coverImage: animeCover(currentAnime),
        format: currentAnime?.format || "ANIME",
        episodes: currentAnime?.episodes ?? null
      });
    }

    libraryButton.textContent = "✓ In Library";
  } catch (error) {
    console.warn("Could not add to library:", error);

    libraryButton.disabled = false;
    libraryButton.textContent = "＋ Add to Library";
  }
});

async function refreshLibraryButtonState() {
  if (!localAnimeId || !libraryButton) {
    return;
  }

  try {
    await getLibraryAnime(localAnimeId);

    libraryButton.disabled = true;
    libraryButton.textContent = "✓ In Library";
  } catch {
    // Not in the library yet — leave the button as-is.
  }
}

/* =========================
   FAVORITE
========================= */

favoriteButton?.addEventListener("click", async () => {
  if (favoriteButton.disabled) {
    return;
  }

  if (!localAnimeId) {
    localAnimeId = await ensureLocalSync(anilistId);
  }

  if (!localAnimeId) {
    console.warn("Cannot favorite: anime is not synced to the backend.");
    return;
  }

  favoriteButton.disabled = true;

  try {
    await addFavorite(localAnimeId);

    favoriteButton.textContent = "♥ Favorited";
  } catch (error) {
    console.warn("Could not add favorite:", error);

    favoriteButton.disabled = false;
  }
});

async function refreshFavoriteButtonState() {
  if (!localAnimeId || !favoriteButton) {
    return;
  }

  try {
    const response = await checkFavorite(localAnimeId);

    if (response?.favorite) {
      favoriteButton.textContent = "♥ Favorited";
    }
  } catch (error) {
    console.warn("Could not check favorite state:", error);
  }
}

function animeTitle(anime) {
  return anime?.title?.english || anime?.title?.romaji || anime?.title?.native || "Unknown Anime";
}

function animeCover(anime) {
  return anime?.coverImage?.large || anime?.coverImage?.medium || "";
}

/* =========================
   LOAD BACKEND SEASONS
   (localAnimeId, NOT the AniList id)
========================= */

async function loadBackendSeasons(localId, anilistIdForSync, anime) {
  seasonList.innerHTML = `<div class="anime-loading">Loading seasons...</div>`;

  try {
    let response = await getSeasons(localId);

    let seasons = extractArray(response);

    if (seasons.length === 0) {
      seasonList.innerHTML = `<div class="anime-loading">Syncing episodes...</div>`;

      try {
        await syncAnimeEpisodes(anilistIdForSync);

        response = await getSeasons(localId);

        seasons = extractArray(response);
      } catch (syncError) {
        console.warn("Episode sync failed:", syncError);

        renderFallbackSeason(anime);

        return;
      }
    }

    if (seasons.length > 0) {
      renderBackendSeasons(seasons);

      const firstSeason = seasons[0];

      const firstSeasonId = firstSeason?.id || firstSeason?.seasonId;

      if (firstSeasonId) {
        await loadSeasonEpisodes(firstSeasonId);
      } else {
        episodeList.innerHTML = `<div class="anime-error">Season ID is missing.</div>`;
      }

      return;
    }

    renderFallbackSeason(anime);
  } catch (error) {
    console.warn("Backend seasons unavailable:", error);

    renderFallbackSeason(anime);
  }
}

/* =========================
   BACKEND SEASONS
========================= */

function renderBackendSeasons(seasons) {
  seasonList.innerHTML = "";

  seasons.forEach((season, index) => {
    const button = document.createElement("button");

    button.className = "season-button";

    if (index === 0) {
      button.classList.add("active");
    }

    button.textContent =
      season.title || season.season_title || `Season ${season.season_number ?? index + 1}`;

    button.addEventListener("click", async () => {
      document.querySelectorAll(".season-button").forEach((item) => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      const seasonId = season.id || season.seasonId;

      if (seasonId) {
        await loadSeasonEpisodes(seasonId);
      }
    });

    seasonList.appendChild(button);
  });
}

/* =========================
   FALLBACK SEASON (no local sync available)
========================= */

function renderFallbackSeason(anime) {
  seasonList.innerHTML = "";

  const button = document.createElement("button");

  button.className = "season-button active";
  button.textContent = anime?.season || "Season 1";

  seasonList.appendChild(button);

  renderFallbackEpisodes(anime);
}

/* =========================
   LOAD EPISODES
========================= */

async function loadSeasonEpisodes(seasonId) {
  episodeList.innerHTML = `<div class="anime-loading">Loading episodes...</div>`;

  try {
    const response = await getEpisodes(seasonId);

    const episodes = extractArray(response);

    if (episodes.length === 0) {
      episodeList.innerHTML = `
        <div class="anime-loading">
          No episodes have been added yet.
        </div>
      `;

      return;
    }

    await renderBackendEpisodes(episodes);
  } catch (error) {
    console.warn("Episode loading failed:", error);

    episodeList.innerHTML = `<div class="anime-error">Unable to load episodes.</div>`;
  }
}

/* =========================
   BACKEND EPISODES
========================= */

async function renderBackendEpisodes(episodes) {
  episodeList.innerHTML = "";

  firstEpisode = episodes[0] || null;

  // The real truth for "downloaded" is: is it actually saved
  // offline in this browser? Backend/local records are just
  // secondary signals in case that check fails.
  const offlineList = await listOfflineEpisodes().catch(() => []);
  const offlineIds = new Set(offlineList.map((item) => String(item.episodeId)));

  const backendDownloads = await fetchAllDownloadsForEpisodes(episodes).catch(() => []);

  const localDownloads = getLocalDownloads();

  episodes.forEach((episode) => {
    const card = document.createElement("article");

    card.className = "episode-card";

    const episodeId = episode.id;

    const number = episode.episode_number ?? episode.episodeNumber ?? "—";

    const title = episode.title || `Episode ${number}`;

    const hasDownload =
      offlineIds.has(String(episodeId)) ||
      backendDownloads.some((d) => String(d.episode_id) === String(episodeId)) ||
      localDownloads.some(
        (d) => String(d.episodeId) === String(episodeId) && d.status === "downloaded"
      );

    const checkboxMarkup = episodeId
      ? `<input
          type="checkbox"
          class="episode-checkbox"
          data-episode-id="${escapeAttribute(episodeId)}"
          data-episode-number="${escapeAttribute(number)}"
          data-episode-title="${escapeAttribute(title)}"
        >`
      : "";

    card.innerHTML = `
      ${checkboxMarkup}

      <div class="episode-number">${escapeHtml(number)}</div>

      <div class="episode-info">
        <div class="episode-title">${escapeHtml(title)}</div>

        <div class="episode-progress">
          <div class="episode-progress-bar" style="width: 0%"></div>
        </div>
      </div>

      <div class="episode-status">${hasDownload ? "✓" : "—"}</div>

      <button class="episode-play" aria-label="Play episode ${escapeAttribute(number)}">
        ▶
      </button>
    `;

    const playButton = card.querySelector(".episode-play");

    playButton?.addEventListener("click", (event) => {
      event.stopPropagation();
      openEpisode(episode);
    });

    const checkbox = card.querySelector(".episode-checkbox");

    checkbox?.addEventListener("change", updateDownloadSelectedState);

    episodeList.appendChild(card);
  });

  updateDownloadSelectedState();
}

async function fetchAllDownloadsForEpisodes(episodes) {
  const results = await Promise.all(
    episodes.map((episode) =>
      episode.id
        ? getEpisodeDownloads(episode.id)
            .then((response) => extractArray(response, "downloads"))
            .catch(() => [])
        : Promise.resolve([])
    )
  );

  return results.flat();
}

/* =========================
   FALLBACK EPISODES
   (no local sync — numbered placeholders, no downloads)
========================= */

function renderFallbackEpisodes(anime) {
  firstEpisode = null;

  const totalEpisodes = Number(anime?.episodes || 0);

  if (!totalEpisodes) {
    episodeList.innerHTML = `<div class="anime-loading">Episode information is not available yet.</div>`;
    return;
  }

  episodeList.innerHTML = "";

  const fragment = document.createDocumentFragment();

  for (let i = 1; i <= totalEpisodes; i++) {
    const card = document.createElement("article");

    card.className = "episode-card";

    card.innerHTML = `
      <div class="episode-number">${i}</div>

      <div class="episode-info">
        <div class="episode-title">Episode ${i}</div>

        <div class="episode-progress">
          <div class="episode-progress-bar" style="width: 0%"></div>
        </div>
      </div>

      <div class="episode-status">—</div>

      <button class="episode-play" aria-label="Episode ${i} unavailable" disabled>▶</button>
    `;

    fragment.appendChild(card);
  }

  episodeList.appendChild(fragment);
}

/* =========================
   OPEN EPISODE
========================= */

function openEpisode(episode) {
  const id = episode?.id;

  if (!id) {
    console.log("Episode has no database ID:", episode);
    return;
  }

  sessionStorage.setItem("selectedEpisodeId", String(id));

  window.location.hash = "player";
}

/* =========================
   DOWNLOAD TOOLBAR
========================= */

selectAllCheckbox?.addEventListener("change", () => {
  document.querySelectorAll(".episode-checkbox").forEach((checkbox) => {
    checkbox.checked = selectAllCheckbox.checked;
  });

  updateDownloadSelectedState();
});

function updateDownloadSelectedState() {
  const checkboxes = Array.from(document.querySelectorAll(".episode-checkbox"));

  const checkedCount = checkboxes.filter((checkbox) => checkbox.checked).length;

  if (downloadSelectedButton) {
    downloadSelectedButton.disabled = checkedCount === 0 || isDownloadQueueRunning;
  }

  if (selectAllCheckbox) {
    selectAllCheckbox.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
  }
}

downloadSelectedButton?.addEventListener("click", () => {
  const selected = Array.from(document.querySelectorAll(".episode-checkbox:checked")).map(
    checkboxToEpisode
  );

  queueDownloads(selected);
});

downloadAllButton?.addEventListener("click", () => {
  const all = Array.from(document.querySelectorAll(".episode-checkbox")).map(checkboxToEpisode);

  queueDownloads(all);
});

function checkboxToEpisode(checkbox) {
  return {
    id: checkbox.dataset.episodeId,
    number: checkbox.dataset.episodeNumber,
    title: checkbox.dataset.episodeTitle
  };
}

async function queueDownloads(episodes) {
  if (isDownloadQueueRunning || episodes.length === 0) {
    return;
  }

  if (!localAnimeId) {
    setDownloadStatusText("This anime isn't synced to the backend, so downloads aren't available.");
    return;
  }

  isDownloadQueueRunning = true;

  downloadSelectedButton.disabled = true;
  downloadAllButton.disabled = true;

  if (currentAnime) {
    addToLocalLibrary({
      animeId: anilistId,
      title: animeTitle(currentAnime),
      coverImage: animeCover(currentAnime),
      format: currentAnime?.format || "ANIME",
      episodes: currentAnime?.episodes ?? null
    });
  }

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < episodes.length; i++) {
    setDownloadStatusText(`Downloading ${i + 1} of ${episodes.length}...`);

    const ok = await downloadEpisode(episodes[i]);

    if (ok) {
      succeeded++;
    } else {
      failed++;
    }
  }

  setDownloadStatusText(
    failed > 0
      ? `${succeeded} downloaded, ${failed} failed (no authorized source available).`
      : `Finished downloading ${succeeded} episode${succeeded === 1 ? "" : "s"}.`
  );

  isDownloadQueueRunning = false;

  downloadAllButton.disabled = false;

  updateDownloadSelectedState();
}

async function downloadEpisode(episode) {
  const episodeId = episode?.id;

  if (!episodeId) {
    return false;
  }

  updateEpisodeStatusBadge(episodeId, "...");

  try {
    const sourcesResponse = await getVideoSources(episodeId);

    const sourceUrl = extractSourceUrl(sourcesResponse);

    if (!sourceUrl) {
      throw new Error("No authorized source available.");
    }

    const blob = await fetchWithProgress(sourceUrl, (percent) => {
      setDownloadStatusText(`Downloading Episode ${episode.number}... ${percent}%`);
    });

    await saveOfflineEpisode(episodeId, blob, {
      animeId: anilistId,
      animeTitle: animeTitle(currentAnime),
      episodeNumber: episode.number,
      episodeTitle: episode.title
    });

    // Also record it on the backend so "downloaded" shows up
    // even from other devices — this is metadata only, the
    // actual playable file lives in this browser's storage.
    try {
      await createDownload({
        episodeId,
        storageKey: sourceUrl,
        fileName: `${animeTitle(currentAnime)} - Episode ${episode.number}`.trim(),
        sizeBytes: blob.size,
        status: "ready"
      });
    } catch (backendError) {
      // Most likely a duplicate storageKey, meaning this episode
      // was already recorded as downloaded — not a real failure.
      console.warn("Backend download record not created:", backendError);
    }

    upsertLocalDownload({
      episodeId,
      animeId: anilistId,
      animeTitle: animeTitle(currentAnime),
      episodeNumber: episode.number,
      episodeTitle: episode.title,
      status: "downloaded",
      sourceUrl
    });

    updateEpisodeStatusBadge(episodeId, "✓");

    return true;
  } catch (error) {
    console.warn(`Download failed for episode ${episode.number}:`, error);

    upsertLocalDownload({
      episodeId,
      animeId: anilistId,
      animeTitle: animeTitle(currentAnime),
      episodeNumber: episode.number,
      episodeTitle: episode.title,
      status: "failed",
      error: error.message
    });

    updateEpisodeStatusBadge(episodeId, "⚠");

    return false;
  }
}

// Streams the response body so we can report real byte-level
// progress, then assembles the chunks into a single Blob that
// gets stored in IndexedDB (offline-store.js).
async function fetchWithProgress(url, onProgress) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Could not fetch video (HTTP ${response.status}).`);
  }

  if (!response.body) {
    // Streaming isn't supported here — fall back to a plain blob.
    return response.blob();
  }

  const contentLength = Number(response.headers.get("content-length") || 0);

  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    chunks.push(value);
    received += value.length;

    if (contentLength > 0) {
      onProgress(Math.min(100, Math.round((received / contentLength) * 100)));
    }
  }

  return new Blob(chunks);
}

function extractSourceUrl(response) {
  const list = Array.isArray(response?.sources) ? response.sources : [];

  const first = list[0];

  return first?.source_url || first?.url || null;
}

function updateEpisodeStatusBadge(episodeId, label) {
  const checkbox = document.querySelector(
    `.episode-checkbox[data-episode-id="${CSS.escape(String(episodeId))}"]`
  );

  const statusElement = checkbox?.closest(".episode-card")?.querySelector(".episode-status");

  if (statusElement) {
    statusElement.textContent = label;
  }
}

function setDownloadStatusText(text) {
  if (downloadStatusElement) {
    downloadStatusElement.textContent = text;
  }
}

/* =========================
   ARRAY EXTRACTION
========================= */

function extractArray(response, preferredKey) {
  if (Array.isArray(response)) {
    return response;
  }

  if (preferredKey && Array.isArray(response?.[preferredKey])) {
    return response[preferredKey];
  }

  if (Array.isArray(response?.seasons)) {
    return response.seasons;
  }

  if (Array.isArray(response?.episodes)) {
    return response.episodes;
  }

  if (Array.isArray(response?.downloads)) {
    return response.downloads;
  }

  if (Array.isArray(response?.result)) {
    return response.result;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
}

/* =========================
   LOADING
========================= */

function showLoading() {
  titleElement.textContent = "Loading...";
  formatElement.textContent = "ANIME";
  metaElement.textContent = "";
  descriptionElement.textContent = "Loading anime information...";

  posterElement.innerHTML = `<div class="anime-loading">Loading...</div>`;
  seasonList.innerHTML = `<div class="anime-loading">Loading seasons...</div>`;
  episodeList.innerHTML = `<div class="anime-loading">Loading episodes...</div>`;
}

/* =========================
   ERROR
========================= */

function showError(message) {
  titleElement.textContent = "Unable to load";
  formatElement.textContent = "ERROR";
  metaElement.textContent = "";
  descriptionElement.textContent = message;

  posterElement.innerHTML = "";
  seasonList.innerHTML = "";

  episodeList.innerHTML = `<div class="anime-error">${escapeHtml(message)}</div>`;
}

/* =========================
   DESCRIPTION CLEANUP
========================= */

function cleanDescription(value) {
  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/~!|!~/g, "")
    .trim();
}

/* =========================
   SAFE HTML
========================= */

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
