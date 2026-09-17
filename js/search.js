import { searchAnime } from "./api.js";

const form = document.getElementById("anime-search-form");
const input = document.getElementById("anime-search-input");
const results = document.getElementById("search-results");
const status = document.getElementById("search-status");
const clearButton = document.getElementById("clear-search");
const backButton = document.getElementById("search-back");

function setStatus(message) {
  if (status) {
    status.textContent = message;
  }
}

/* =========================
   RUN SEARCH
========================= */

async function runSearch() {
  const query = input?.value.trim();

  if (!query) {
    results.innerHTML = "";
    setStatus("Search for an anime to begin.");
    return;
  }

  setStatus("Searching...");

  results.innerHTML = `<div class="search-loading">Searching anime...</div>`;

  try {
    const response = await searchAnime(query);

    const animeList = Array.isArray(response?.results) ? response.results : [];

    if (animeList.length === 0) {
      results.innerHTML = `
        <div class="search-empty">
          <div class="search-empty-icon">🔎</div>
          <h3>No anime found</h3>
          <p>Try another search.</p>
        </div>
      `;

      setStatus("No results.");
      return;
    }

    setStatus(`${animeList.length} result${animeList.length === 1 ? "" : "s"} found`);

    results.innerHTML = animeList.map(createAnimeCard).join("");

    attachCardEvents();
  } catch (error) {
    console.error("Search error:", error);

    results.innerHTML = `
      <div class="search-empty">
        <div class="search-empty-icon">⚠</div>
        <h3>Search failed</h3>
        <p>${escapeHtml(error.message || "Unable to search.")}</p>
        <button id="retry-search" class="retry-search" type="button">
          Try Again
        </button>
      </div>
    `;

    setStatus("Unable to complete search.");

    document.getElementById("retry-search")?.addEventListener("click", runSearch);
  }
}

/* =========================
   ANIME CARD
========================= */

function createAnimeCard(anime) {
  const id = anime?.id;

  const title =
    anime?.title?.english || anime?.title?.romaji || anime?.title?.native || "Unknown Anime";

  const cover = anime?.coverImage?.large || anime?.coverImage?.medium || "";

  const format = anime?.format || "UNKNOWN";

  const episodes = anime?.episodes ?? "—";

  const year = anime?.seasonYear ?? "";

  const coverMarkup = cover
    ? `<img src="${escapeAttribute(cover)}" alt="${escapeAttribute(title)}" loading="lazy">`
    : `<div class="anime-cover-placeholder"><span>${escapeHtml(title)}</span></div>`;

  return `
    <article class="anime-card" data-anilist-id="${escapeAttribute(id)}">
      <div class="anime-cover">
        ${coverMarkup}
        <span class="anime-format">${escapeHtml(format)}</span>
      </div>

      <div class="anime-card-info">
        <h3 class="anime-card-title">${escapeHtml(title)}</h3>

        <p class="anime-card-meta">
          ${escapeHtml(episodes)} episodes
          ${year ? ` • ${escapeHtml(year)}` : ""}
        </p>
      </div>
    </article>
  `;
}

function attachCardEvents() {
  document.querySelectorAll(".anime-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.anilistId;

      if (!id) {
        return;
      }

      sessionStorage.setItem("selectedAnimeId", id);
      window.location.hash = "anime";
    });
  });
}

/* =========================
   FORM SUBMIT (Search button + Enter)
========================= */

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch();
});

/* =========================
   INPUT (clear button visibility only)
========================= */

input?.addEventListener("input", () => {
  const query = input.value.trim();

  clearButton?.classList.toggle("visible", query.length > 0);

  if (!query) {
    results.innerHTML = "";
    setStatus("Search for an anime to begin.");
  }
});

/* =========================
   CLEAR
========================= */

clearButton?.addEventListener("click", () => {
  input.value = "";
  results.innerHTML = "";

  clearButton.classList.remove("visible");

  setStatus("Search for an anime to begin.");

  input.focus();
});

/* =========================
   BACK
========================= */

backButton?.addEventListener("click", () => {
  window.location.hash = "home";
});

/* =========================
   ESCAPE HTML
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
