import {
  searchAnime
} from "./api.js";

const input =
  document.getElementById(
    "anime-search-input"
  );

const results =
  document.getElementById(
    "search-results"
  );

const status =
  document.getElementById(
    "search-status"
  );

const clearButton =
  document.getElementById(
    "clear-search"
  );

const backButton =
  document.getElementById(
    "search-back"
  );

let searchTimer = null;

input?.addEventListener(
  "input",
  () => {
    const value =
      input.value.trim();

    clearButton.classList.toggle(
      "visible",
      value.length > 0
    );

    clearTimeout(
      searchTimer
    );

    if (!value) {
      results.innerHTML = "";

      status.textContent =
        "Search for an anime to begin.";

      return;
    }

    searchTimer =
      setTimeout(
        () => {
          performSearch(
            value
          );
        },
        500
      );
  }
);

clearButton?.addEventListener(
  "click",
  () => {
    input.value = "";

    clearButton.classList.remove(
      "visible"
    );

    results.innerHTML = "";

    status.textContent =
      "Search for an anime to begin.";

    input.focus();
  }
);

backButton?.addEventListener(
  "click",
  () => {
    window.location.hash =
      "home";
  }
);

async function performSearch(
  query
) {
  status.textContent =
    "Searching...";

  results.innerHTML = `
    <div class="search-loading">
      Searching AniList...
    </div>
  `;

  try {
    const response =
      await searchAnime(
        query
      );

    const anime =
      response?.result ||
      response?.data ||
      [];

    renderResults(anime);

  } catch (error) {
    console.error(
      "Anime search failed:",
      error
    );

    results.innerHTML = `
      <div class="search-empty">
        <div class="search-empty-icon">
          ⚠
        </div>

        <h3>
          Search failed
        </h3>

        <p>
          ${escapeHtml(
            error.message ||
            "Unable to search right now."
          )}
        </p>
      </div>
    `;

    status.textContent =
      "Unable to complete search.";
  }
}

function renderResults(
  animeList
) {
  if (
    !Array.isArray(
      animeList
    ) ||
    animeList.length === 0
  ) {
    results.innerHTML = `
      <div class="search-empty">
        <div class="search-empty-icon">
          🔎
        </div>

        <h3>
          No anime found
        </h3>

        <p>
          Try another title or search term.
        </p>
      </div>
    `;

    status.textContent =
      "No results.";

    return;
  }

  status.textContent =
    `${animeList.length} result${
      animeList.length === 1
        ? ""
        : "s"
    } found`;

  results.innerHTML =
    animeList
      .map(
        (anime) =>
          createAnimeCard(
            anime
          )
      )
      .join("");
}

function createAnimeCard(
  anime
) {
  const title =
    anime?.title?.english ||
    anime?.title?.romaji ||
    anime?.title?.native ||
    "Unknown Anime";

  const cover =
    anime?.coverImage?.large ||
    anime?.cover_image ||
    "";

  const format =
    anime?.format ||
    "UNKNOWN";

  const episodes =
    anime?.episodes ||
    "—";

  return `
    <article
      class="anime-card"
      data-anilist-id="${
        anime?.id || ""
      }"
    >

      <div class="anime-cover">

        ${
          cover
            ? `
              <img
                src="${escapeAttribute(
                  cover
                )}"
                alt="${escapeAttribute(
                  title
                )}"
                loading="lazy"
              >
            `
            : ""
        }

        <span class="anime-format">
          ${escapeHtml(
            format
          )}
        </span>

      </div>

      <div class="anime-card-info">

        <h3 class="anime-card-title">
          ${escapeHtml(
            title
          )}
        </h3>

        <p class="anime-card-meta">
          ${escapeHtml(
            String(episodes)
          )}
          episodes
        </p>

      </div>

    </article>
  `;
}

function escapeHtml(
  value
) {
  return String(value)
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

function escapeAttribute(
  value
) {
  return escapeHtml(
    value
  );
}
