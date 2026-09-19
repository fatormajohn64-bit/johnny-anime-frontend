import {
  searchAnime,
  getAnimeById,
  getSyncedAnime,
  syncAnime,
  getSeasons,
  getEpisodes,
  syncAnimeEpisodes,
  getVideoSources,
  addVideoSource,
  removeVideoSource
} from "./api.js";

/* =========================
   ELEMENTS
========================= */

const searchInput = document.getElementById("admin-search-input");
const searchButton = document.getElementById("admin-search-button");
const searchResults = document.getElementById("admin-search-results");

const anilistIdInput = document.getElementById("admin-anilist-id");
const loadAnimeButton = document.getElementById("admin-load-anime");
const animeStatus = document.getElementById("admin-anime-status");

const episodesSection = document.getElementById("admin-episodes-section");
const seasonList = document.getElementById("admin-season-list");
const syncEpisodesButton = document.getElementById("admin-sync-episodes");
const episodeList = document.getElementById("admin-episode-list");

const sourceSection = document.getElementById("admin-source-section");
const selectedEpisodeLabel = document.getElementById("admin-selected-episode");
const sourceUrlInput = document.getElementById("admin-source-url");
const sourceTypeSelect = document.getElementById("admin-source-type");
const sourceQualitySelect = document.getElementById("admin-source-quality");
const addSourceButton = document.getElementById("admin-add-source");
const sourceStatus = document.getElementById("admin-source-status");
const sourceList = document.getElementById("admin-source-list");

/* =========================
   STATE
========================= */

let currentAnilistId = null;
let currentLocalAnimeId = null;
let selectedEpisodeId = null;

/* =========================
   SEARCH
========================= */

searchButton?.addEventListener("click", runSearch);

searchInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    runSearch();
  }
});

async function runSearch() {
  const query = searchInput?.value.trim();

  if (!query) {
    return;
  }

  searchResults.innerHTML = `<p class="admin-hint">Searching...</p>`;

  try {
    const response = await searchAnime(query);
    const results = Array.isArray(response?.results) ? response.results : [];

    if (results.length === 0) {
      searchResults.innerHTML = `<p class="admin-hint">No results.</p>`;
      return;
    }

    searchResults.innerHTML = "";

    results.slice(0, 10).forEach((anime) => {
      const title = anime?.title?.english || anime?.title?.romaji || "Unknown";
      const cover = anime?.coverImage?.medium || anime?.coverImage?.large || "";
      const format = anime?.format || "";
      const year = anime?.seasonYear || "";

      const row = document.createElement("div");

      row.className = "admin-search-result";

      row.innerHTML = `
        ${cover ? `<img class="admin-search-result-cover" src="${escapeAttribute(cover)}" alt="">` : ""}
        <div class="admin-search-result-info">
          <div class="admin-search-result-title">${escapeHtml(title)}</div>
          <div class="admin-search-result-meta">${escapeHtml(format)} ${year ? `• ${escapeHtml(year)}` : ""} • ID ${escapeHtml(anime.id)}</div>
        </div>
      `;

      row.addEventListener("click", () => {
        anilistIdInput.value = anime.id;
        searchResults.innerHTML = "";
        searchInput.value = "";
        loadAnimeById(anime.id);
      });

      searchResults.appendChild(row);
    });
  } catch (error) {
    console.error("Admin search failed:", error);
    searchResults.innerHTML = `<p class="admin-hint">Search failed: ${escapeHtml(error.message)}</p>`;
  }
}

/* =========================
   STEP 1 — LOAD ANIME
========================= */

loadAnimeButton?.addEventListener("click", () => {
  const anilistId = anilistIdInput?.value.trim();

  if (!anilistId) {
    animeStatus.textContent = "Enter an AniList ID first.";
    return;
  }

  loadAnimeById(anilistId);
});

async function loadAnimeById(anilistId) {
  loadAnimeButton.disabled = true;
  animeStatus.textContent = "Loading...";

  episodesSection.hidden = true;
  sourceSection.hidden = true;

  try {
    const animeResponse = await getAnimeById(anilistId);
    const anime = animeResponse?.anime;

    const title = anime?.title?.english || anime?.title?.romaji || `AniList #${anilistId}`;

    currentAnilistId = anilistId;
    currentLocalAnimeId = await ensureLocalSync(anilistId);

    if (!currentLocalAnimeId) {
      animeStatus.textContent = `Loaded "${title}", but syncing it to the database failed. Try again.`;
      return;
    }

    animeStatus.textContent = `Loaded "${title}" (local id: ${currentLocalAnimeId})`;

    episodesSection.hidden = false;

    await loadSeasons();
  } catch (error) {
    console.error("Failed to load anime:", error);
    animeStatus.textContent = `Could not load that AniList ID: ${error.message}`;
  } finally {
    loadAnimeButton.disabled = false;
  }
}

async function ensureLocalSync(anilistId) {
  try {
    const existing = await getSyncedAnime(anilistId);

    if (existing?.anime?.id) {
      return existing.anime.id;
    }
  } catch {
    // Not synced yet.
  }

  try {
    const created = await syncAnime(anilistId);
    return created?.anime?.id || null;
  } catch (error) {
    console.warn("Sync failed:", error);
    return null;
  }
}

/* =========================
   STEP 2 — SEASONS / EPISODES
========================= */

async function loadSeasons() {
  seasonList.innerHTML = "";
  episodeList.innerHTML = "";
  syncEpisodesButton.hidden = true;

  const response = await getSeasons(currentLocalAnimeId).catch(() => null);
  const seasons = extractArray(response, "seasons");

  if (seasons.length === 0) {
    syncEpisodesButton.hidden = false;
    episodeList.innerHTML = `<p class="admin-hint">No seasons yet — sync episodes from AniList first.</p>`;
    return;
  }

  seasons.forEach((season, index) => {
    const button = document.createElement("button");

    button.className = "admin-season-button";

    if (index === 0) {
      button.classList.add("active");
    }

    button.textContent = season.title || `Season ${season.season_number ?? index + 1}`;
    button.type = "button";

    button.addEventListener("click", () => {
      document.querySelectorAll(".admin-season-button").forEach((el) => el.classList.remove("active"));
      button.classList.add("active");
      loadEpisodes(season.id);
    });

    seasonList.appendChild(button);
  });

  loadEpisodes(seasons[0].id);
}

syncEpisodesButton?.addEventListener("click", async () => {
  syncEpisodesButton.disabled = true;
  syncEpisodesButton.textContent = "Syncing...";

  try {
    await syncAnimeEpisodes(currentAnilistId);
    await loadSeasons();
  } catch (error) {
    console.warn("Episode sync failed:", error);
    episodeList.innerHTML = `<p class="admin-hint">Sync failed: ${escapeHtml(error.message)}</p>`;
  } finally {
    syncEpisodesButton.disabled = false;
    syncEpisodesButton.textContent = "Sync Episodes from AniList";
  }
});

async function loadEpisodes(seasonId) {
  episodeList.innerHTML = `<p class="admin-hint">Loading episodes...</p>`;

  const response = await getEpisodes(seasonId).catch(() => null);
  const episodes = extractArray(response, "episodes");

  if (episodes.length === 0) {
    episodeList.innerHTML = `<p class="admin-hint">No episodes in this season.</p>`;
    return;
  }

  episodeList.innerHTML = "";

  episodes.forEach((episode) => {
    const row = document.createElement("div");

    row.className = "admin-episode-row";

    const number = episode.episode_number ?? "—";
    const title = episode.title || `Episode ${number}`;

    row.innerHTML = `
      <span>Ep ${escapeHtml(number)} — ${escapeHtml(title)}</span>
      <span class="admin-episode-row-status"></span>
    `;

    row.addEventListener("click", () => selectEpisode(episode, row));

    episodeList.appendChild(row);
  });
}

function selectEpisode(episode, row) {
  document.querySelectorAll(".admin-episode-row").forEach((el) => el.classList.remove("selected"));
  row.classList.add("selected");

  selectedEpisodeId = episode.id;

  const number = episode.episode_number ?? "—";
  const title = episode.title || `Episode ${number}`;

  selectedEpisodeLabel.textContent = `Adding a source for: Episode ${number} — ${title} (episode id: ${episode.id})`;

  sourceSection.hidden = false;
  sourceStatus.textContent = "";
  sourceUrlInput.value = "";

  loadSources();
}

/* =========================
   STEP 3 — VIDEO SOURCES
========================= */

addSourceButton?.addEventListener("click", async () => {
  const sourceUrl = sourceUrlInput?.value.trim();

  if (!selectedEpisodeId) {
    sourceStatus.textContent = "Pick an episode first.";
    return;
  }

  if (!sourceUrl) {
    sourceStatus.textContent = "Paste a video URL first.";
    return;
  }

  addSourceButton.disabled = true;
  sourceStatus.textContent = "Saving...";

  try {
    await addVideoSource({
      episodeId: selectedEpisodeId,
      sourceType: sourceTypeSelect.value,
      sourceUrl,
      quality: sourceQualitySelect.value,
      format: guessFormat(sourceUrl)
    });

    sourceStatus.textContent = "Saved.";
    sourceUrlInput.value = "";

    await loadSources();
  } catch (error) {
    console.error("Could not save video source:", error);
    sourceStatus.textContent = `Could not save: ${error.message}`;
  } finally {
    addSourceButton.disabled = false;
  }
});

async function loadSources() {
  sourceList.innerHTML = `<p class="admin-hint">Loading...</p>`;

  const response = await getVideoSources(selectedEpisodeId).catch(() => null);
  const sources = extractArray(response, "sources");

  if (sources.length === 0) {
    sourceList.innerHTML = `<p class="admin-hint">No sources saved for this episode yet.</p>`;
    return;
  }

  sourceList.innerHTML = "";

  sources.forEach((source) => {
    const row = document.createElement("div");

    row.className = "admin-source-row";

    row.innerHTML = `
      <div class="admin-source-row-info">${escapeHtml(source.quality || "Auto")} — ${escapeHtml(source.source_url)}</div>
      <button class="admin-source-remove" type="button">Remove</button>
    `;

    row.querySelector(".admin-source-remove")?.addEventListener("click", async () => {
      try {
        await removeVideoSource(source.id);
        await loadSources();
      } catch (error) {
        console.warn("Could not remove source:", error);
      }
    });

    sourceList.appendChild(row);
  });
}

/* =========================
   HELPERS
========================= */

function guessFormat(url) {
  const match = url.split("?")[0].match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : "";
}

function extractArray(response, key) {
  if (!response) {
    return [];
  }

  if (Array.isArray(response[key])) {
    return response[key];
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
