import { getLibrary as getBackendLibrary } from "./api.js";
import { getLibrary, removeFromLibrary, getDownloadsForAnime } from "./storage.js";

const listElement = document.getElementById("library-list");
const statusElement = document.getElementById("library-status");

loadLibrary();

/* =========================
   LOAD LIBRARY
========================= */

async function loadLibrary() {
  const localLibrary = getLibrary();

  renderLibrary(localLibrary);

  // Best-effort backend sync. The local copy above is the
  // source of truth that's guaranteed to work; this just
  // adds anything the backend already knows about that
  // isn't in the local list yet.
  try {
    const response = await getBackendLibrary();

    const backendItems = extractArray(response);

    const merged = mergeLibraries(localLibrary, backendItems);

    renderLibrary(merged);
  } catch (error) {
    console.warn("Backend library unavailable, showing local library only:", error);
  }
}

function mergeLibraries(localLibrary, backendItems) {
  const knownIds = new Set(localLibrary.map((item) => String(item.animeId)));

  const extra = backendItems
    .map((item) => ({
      animeId: item.animeId || item.anime_id || item.id,
      title: item.title || item.name || "Unknown Anime",
      coverImage: item.coverImage || item.cover_image || "",
      format: item.format || "ANIME",
      episodes: item.episodes ?? null,
      addedAt: 0
    }))
    .filter((item) => item.animeId && !knownIds.has(String(item.animeId)));

  return [...localLibrary, ...extra];
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

      <button class="library-remove" aria-label="Remove from library">✕</button>
    `;

    card.addEventListener("click", () => {
      sessionStorage.setItem("selectedAnimeId", String(item.animeId));
      window.location.hash = "anime";
    });

    const removeButton = card.querySelector(".library-remove");

    removeButton?.addEventListener("click", (event) => {
      event.stopPropagation();

      const updated = removeFromLibrary(item.animeId);

      renderLibrary(updated);
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

  if (Array.isArray(response?.result)) {
    return response.result;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
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
