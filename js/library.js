import { getLibrary as getBackendLibrary } from "./api.js";
import { getLibrary as getLocalLibrary, getDownloadsForAnime } from "./storage.js";

const listElement = document.getElementById("library-list");
const statusElement = document.getElementById("library-status");

loadLibrary();

/* =========================
   LOAD LIBRARY
========================= */

async function loadLibrary() {
  try {
    const response = await getBackendLibrary();

    const items = extractArray(response).map(normalizeBackendItem);

    // Fold in anything saved locally that the backend doesn't
    // know about yet (e.g. a save that happened while offline).
    const merged = mergeWithLocal(items);

    renderLibrary(merged);
  } catch (error) {
    console.warn("Backend library unavailable, showing local library only:", error);

    renderLibrary(getLocalLibrary());
  }
}

function normalizeBackendItem(item) {
  return {
    // The AniList ID — this is what the anime detail page
    // needs to load live AniList data.
    animeId: item.anilist_id,

    // The local database ID — used to look up downloads.
    localAnimeId: item.id,

    title: item.title_english || item.title_romaji || item.title_native || "Unknown Anime",
    coverImage: item.cover_image || "",
    format: item.format || "ANIME",
    episodes: item.total_episodes ?? null,
    addedAt: item.added_at ? new Date(item.added_at).getTime() : 0
  };
}

function mergeWithLocal(backendItems) {
  const knownIds = new Set(backendItems.map((item) => String(item.animeId)));

  const extra = getLocalLibrary().filter((item) => !knownIds.has(String(item.animeId)));

  return [...backendItems, ...extra];
}

/* =========================
   RENDER
========================= */

function renderLibrary(items) {
  if (items.length === 0) {
    listElement.innerHTML = `
      <div class="library-empty">
        Your library is empty.<br>
        Search for an anime and tap "Add to Library" to save it here.
      </div>
    `;

    statusElement.textContent = "";

    return;
  }

  statusElement.textContent = `${items.length} anime saved`;

  listElement.innerHTML = "";

  items.forEach((item) => {
    const card = document.createElement("article");

    card.className = "library-card";

    const downloads = getDownloadsForAnime(item.animeId);
    const downloadedCount = downloads.filter((d) => d.status === "downloaded").length;

    const coverMarkup = item.coverImage
      ? `<img src="${escapeAttribute(item.coverImage)}" alt="${escapeAttribute(item.title)}">`
      : "";

    card.innerHTML = `
      <div class="library-cover">${coverMarkup}</div>

      <div class="library-info">
        <div class="library-title">${escapeHtml(item.title)}</div>

        <div class="library-meta">
          ${escapeHtml(item.format || "ANIME")}
          ${item.episodes ? ` • ${escapeHtml(item.episodes)} episodes` : ""}
        </div>

        ${
          downloadedCount > 0
            ? `<div class="library-downloads">${downloadedCount} downloaded</div>`
            : ""
        }
      </div>
    `;

    card.addEventListener("click", () => {
      sessionStorage.setItem("selectedAnimeId", String(item.animeId));
      window.location.hash = "anime";
    });

    listElement.appendChild(card);
  });
}

/* =========================
   ARRAY EXTRACTION
========================= */

function extractArray(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.library)) {
    return response.library;
  }

  return [];
}

/* =========================
   SAFE HTML
========================= */

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
