import {
  getAnimeById,
  getSeasons,
  getEpisodes,
  syncAnimeEpisodes,
  getVideoSources,
  addToLibrary as addToBackendLibrary,
  addFavorite
} from "./api.js";

import {
  isInLibrary as isInLocalLibrary,
  addToLibrary as addToLocalLibrary,
  getDownloads,
  upsertDownload
} from "./storage.js";

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

const animeId = sessionStorage.getItem("selectedAnimeId");

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
   ADD TO LIBRARY
========================= */

libraryButton?.addEventListener("click", async () => {
  if (!currentAnime || !animeId || libraryButton.disabled) {
    return;
  }

  saveToLocalLibrary();

  libraryButton.disabled = true;
  libraryButton.textContent = "✓ In Library";

  try {
    await addToBackendLibrary({
      animeId,
      title: animeTitle(currentAnime),
      coverImage: animeCover(currentAnime)
    });
  } catch (error) {
    // Backend save failed, but the local library entry above
    // already succeeded, so the button stays "In Library".
    console.warn("Backend library save failed (kept local copy):", error);
  }
});

function saveToLocalLibrary() {
  if (!currentAnime || !animeId) {
    return;
  }

  addToLocalLibrary({
    animeId,
    title: animeTitle(currentAnime),
    coverImage: animeCover(currentAnime),
    format: currentAnime?.format || "ANIME",
    episodes: currentAnime?.episodes ?? null
  });
}

function animeTitle(anime) {
  return (
    anime?.title?.english ||
    anime?.title?.romaji ||
    anime?.title?.native ||
    "Unknown Anime"
  );
}

function animeCover(anime) {
  return anime?.coverImage?.large || anime?.coverImage?.medium || "";
}

/* =========================
   FAVORITE
========================= */

favoriteButton?.addEventListener("click", async () => {
  if (!animeId || favoriteButton.disabled) {
    return;
  }

  favoriteButton.disabled = true;

  try {
    await addFavorite(animeId);

    favoriteButton.textContent = "♥ Favorited";
  } catch (error) {
    console.warn("Could not add favorite:", error);

    favoriteButton.disabled = false;
  }
});

/* =========================
   START
========================= */

if (!animeId) {
  showError("No anime was selected.");
} else {
  loadAnime(animeId);
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

    if (isInLocalLibrary(id)) {
      libraryButton.disabled = true;
      libraryButton.textContent = "✓ In Library";
    }

    await loadBackendSeasons(id, anime);
  } catch (error) {
    console.error("Anime loading failed:", error);

    showError(error.message || "Unable to load anime.");
  }
}

/* =========================
   ANIME EXTRACTION
========================= */

function extractAnime(response) {
  const candidates = [
    response?.anime,
    response?.result,
    response?.data,
    response
  ];

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
   RENDER ANIME
========================= */

function renderAnime(anime) {
  const title =
    anime?.title?.english ||
    anime?.title?.romaji ||
    anime?.title?.native ||
    anime?.title_english ||
    anime?.title_romaji ||
    "Unknown Anime";

  const format = anime?.format || "ANIME";

  const episodes = anime?.episodes ?? "Unknown";

  const duration = anime?.duration ? `${anime.duration} min` : "Unknown duration";

  const status = anime?.status || "Unknown status";

  const year = anime?.seasonYear || "";

  const description = cleanDescription(
    anime?.description || "No description available."
  );

  const poster =
    anime?.coverImage?.extraLarge ||
    anime?.coverImage?.large ||
    anime?.coverImage?.medium ||
    anime?.cover_image ||
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

/* =========================
   ALTERNATE TITLES
========================= */

function renderAltTitles(anime, mainTitle) {
  if (!altTitlesElement) {
    return;
  }

  const alternates = [
    anime?.title?.romaji,
    anime?.title?.native
  ].filter((value) => value && value !== mainTitle);

  altTitlesElement.textContent = alternates.join(" • ");
}

/* =========================
   LOAD BACKEND SEASONS
========================= */

async function loadBackendSeasons(id, anime) {
  seasonList.innerHTML = `<div class="anime-loading">Loading seasons...</div>`;

  try {
    let response = await getSeasons(id);

    let seasons = extractArray(response);

    /*
      If the anime has not been synced to the
      local database yet, create its local
      season and episodes now.
    */

    if (seasons.length === 0) {
      seasonList.innerHTML = `<div class="anime-loading">Syncing episodes...</div>`;

      try {
        await syncAnimeEpisodes(id);

        response = await getSeasons(id);

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
      season.name || season.title || season.season_title || `Season ${index + 1}`;

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
   FALLBACK SEASON
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

    renderBackendEpisodes(episodes);
  } catch (error) {
    console.warn("Episode loading failed:", error);

    episodeList.innerHTML = `<div class="anime-error">Unable to load episodes.</div>`;
  }
}

/* =========================
   BACKEND EPISODES
========================= */

function renderBackendEpisodes(episodes) {
  episodeList.innerHTML = "";

  firstEpisode = episodes[0] || null;

  const existingDownloads = getDownloads();

  episodes.forEach((episode) => {
    const card = document.createElement("article");

    card.className = "episode-card";

    const episodeId = episode.id || episode.episode_id;

    const number =
      episode.number ?? episode.episode_number ?? episode.episodeNumber ?? "—";

    const title =
      episode.title || episode.name || episode.episode_title || `Episode ${number}`;

    const existingDownload = existingDownloads.find(
      (item) => String(item.episodeId) === String(episodeId)
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

      <div class="episode-status">${downloadStatusLabel(existingDownload)}</div>

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

function downloadStatusLabel(download) {
  if (!download) {
    return "—";
  }

  if (download.status === "downloaded") {
    return "✓";
  }

  if (download.status === "downloading") {
    return "...";
  }

  if (download.status === "failed") {
    return "⚠";
  }

  return "—";
}

/* =========================
   FALLBACK EPISODES
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

      <button class="episode-play" aria-label="Play episode ${i}">▶</button>
    `;

    const playButton = card.querySelector(".episode-play");

    playButton?.addEventListener("click", (event) => {
      event.stopPropagation();

      openEpisode({
        number: i,
        title: `Episode ${i}`
      });
    });

    fragment.appendChild(card);
  }

  episodeList.appendChild(fragment);
}

/* =========================
   OPEN EPISODE
========================= */

function openEpisode(episode) {
  const id = episode?.id || episode?.episode_id;

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
    selectAllCheckbox.checked =
      checkboxes.length > 0 && checkedCount === checkboxes.length;
  }
}

downloadSelectedButton?.addEventListener("click", () => {
  const selected = Array.from(document.querySelectorAll(".episode-checkbox:checked")).map(
    checkboxToEpisode
  );

  queueDownloads(selected);
});

downloadAllButton?.addEventListener("click", () => {
  const all = Array.from(document.querySelectorAll(".episode-checkbox")).map(
    checkboxToEpisode
  );

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

  isDownloadQueueRunning = true;

  downloadSelectedButton.disabled = true;
  downloadAllButton.disabled = true;

  saveToLocalLibrary();

  for (let i = 0; i < episodes.length; i++) {
    setDownloadStatusText(`Downloading ${i + 1} of ${episodes.length}...`);

    await downloadEpisode(episodes[i]);
  }

  setDownloadStatusText(`Finished downloading ${episodes.length} episode${episodes.length === 1 ? "" : "s"}.`);

  isDownloadQueueRunning = false;

  downloadAllButton.disabled = false;

  updateDownloadSelectedState();
}

async function downloadEpisode(episode) {
  const episodeId = episode?.id;

  if (!episodeId) {
    return;
  }

  updateEpisodeStatus(episodeId, "downloading");
  upsertDownload({
    episodeId,
    animeId,
    animeTitle: animeTitle(currentAnime),
    episodeNumber: episode.number,
    episodeTitle: episode.title,
    status: "downloading"
  });

  try {
    const sourcesResponse = await getVideoSources(episodeId);

    const sourceUrl = extractSourceUrl(sourcesResponse);

    if (!sourceUrl) {
      throw new Error("No authorized source available.");
    }

    triggerBrowserDownload(sourceUrl, episode);

    updateEpisodeStatus(episodeId, "downloaded");
    upsertDownload({
      episodeId,
      animeId,
      animeTitle: animeTitle(currentAnime),
      episodeNumber: episode.number,
      episodeTitle: episode.title,
      status: "downloaded",
      sourceUrl
    });
  } catch (error) {
    console.warn(`Download failed for episode ${episode.number}:`, error);

    updateEpisodeStatus(episodeId, "failed");
    upsertDownload({
      episodeId,
      animeId,
      animeTitle: animeTitle(currentAnime),
      episodeNumber: episode.number,
      episodeTitle: episode.title,
      status: "failed",
      error: error.message
    });
  }
}

function triggerBrowserDownload(url, episode) {
  const link = document.createElement("a");

  link.href = url;
  link.download = `${animeTitle(currentAnime)} - Episode ${episode.number}`.trim();
  link.target = "_blank";
  link.rel = "noopener";

  document.body.appendChild(link);
  link.click();
  link.remove();
}

function extractSourceUrl(response) {
  const list =
    (Array.isArray(response?.sources) && response.sources) ||
    (Array.isArray(response?.result) && response.result) ||
    (Array.isArray(response?.data) && response.data) ||
    (Array.isArray(response) && response) ||
    [];

  const first = list[0];

  return (
    first?.url ||
    first?.source ||
    first?.file ||
    response?.url ||
    response?.source ||
    null
  );
}

function updateEpisodeStatus(episodeId, status) {
  const checkbox = document.querySelector(
    `.episode-checkbox[data-episode-id="${CSS.escape(String(episodeId))}"]`
  );

  const statusElement = checkbox
    ?.closest(".episode-card")
    ?.querySelector(".episode-status");

  if (statusElement) {
    statusElement.textContent = downloadStatusLabel({ status });
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

function extractArray(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.result)) {
    return response.result;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.seasons)) {
    return response.seasons;
  }

  if (Array.isArray(response?.episodes)) {
    return response.episodes;
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
