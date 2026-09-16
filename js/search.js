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

let lastQuery = "";

/*
|--------------------------------------------------------------------------
| Search input
|--------------------------------------------------------------------------
*/

input?.addEventListener(
  "input",
  () => {
    const value =
      input.value.trim();

    clearButton?.classList.toggle(
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

      lastQuery = "";

      return;
    }

    if (
      value === lastQuery
    ) {
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

/*
|--------------------------------------------------------------------------
| Clear search
|--------------------------------------------------------------------------
*/

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

    lastQuery = "";

    input.focus();
  }
);

/*
|--------------------------------------------------------------------------
| Back button
|--------------------------------------------------------------------------
*/

backButton?.addEventListener(
  "click",
  () => {
    navigateHome();
  }
);

/*
|--------------------------------------------------------------------------
| Perform search
|--------------------------------------------------------------------------
*/

async function performSearch(
  query
) {
  const cleanQuery =
    query.trim();

  if (!cleanQuery) {
    return;
  }

  lastQuery =
    cleanQuery;

  status.textContent =
    "Searching...";

  results.innerHTML = `
    <div class="search-loading">
      Searching anime...
    </div>
  `;

  try {
    const response =
      await searchAnime(
        cleanQuery
      );

    const animeList =
      extractAnimeResults(
        response
      );

    renderResults(
      animeList
    );

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

/*
|--------------------------------------------------------------------------
| Extract results
|--------------------------------------------------------------------------
*/

function extractAnimeResults(
  response
) {
  if (
    Array.isArray(
      response
    )
  ) {
    return response;
  }

  if (
    Array.isArray(
      response?.result
    )
  ) {
    return response.result;
  }

  if (
    Array.isArray(
      response?.data
    )
  ) {
    return response.data;
  }

  if (
    Array.isArray(
      response?.data?.Page?.media
    )
  ) {
    return response.data.Page.media;
  }

  if (
    Array.isArray(
      response?.Page?.media
    )
  ) {
    return response.Page.media;
  }

  return [];
}

/*
|--------------------------------------------------------------------------
| Render results
|--------------------------------------------------------------------------
*/

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
        (
          anime
        ) =>
          createAnimeCard(
            anime
          )
      )
      .join("");

  attachCardEvents();
}

/*
|--------------------------------------------------------------------------
| Anime card
|--------------------------------------------------------------------------
*/

function createAnimeCard(
  anime
) {
  const id =
    anime?.id ||
    anime?.anilist_id ||
    "";

  const title =
    anime?.title?.english ||
    anime?.title?.romaji ||
    anime?.title?.native ||
    anime?.title_english ||
    anime?.title_romaji ||
    anime?.title_native ||
    "Unknown Anime";

  const cover =
    anime?.coverImage?.large ||
    anime?.coverImage?.medium ||
    anime?.cover_image ||
    "";

  const format =
    anime?.format ||
    "UNKNOWN";

  const episodes =
    anime?.episodes ??
    anime?.total_episodes ??
    "—";

  const year =
    anime?.seasonYear ||
    anime?.season_year ||
    "";

  const posterMarkup =
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
      : `
        <div
          class="anime-cover-placeholder"
        >
          <span>
            ${escapeHtml(
              title
            )}
          </span>
        </div>
      `;

  return `
    <article
      class="anime-card"
      data-anilist-id="${escapeAttribute(
        id
      )}"
    >

      <div class="anime-cover">

        ${posterMarkup}

        <span class="anime-format">
          ${escapeHtml(
            format
          )}
        </span>

      </div>

      <div class="anime-card-info">

        <h3
          class="anime-card-title"
        >
          ${escapeHtml(
            title
          )}
        </h3>

        <p
          class="anime-card-meta"
        >
          ${escapeHtml(
            String(
              episodes
            )
          )}
          episodes
          ${
            year
              ? ` • ${escapeHtml(
                  year
                )}`
              : ""
          }
        </p>

      </div>

    </article>
  `;
}

/*
|--------------------------------------------------------------------------
| Card click events
|--------------------------------------------------------------------------
*/

function attachCardEvents() {
  document
    .querySelectorAll(
      ".anime-card"
    )
    .forEach(
      (
        card
      ) => {
        card.addEventListener(
          "click",
          () => {
            const id =
              card.dataset
                .anilistId;

            if (!id) {
              return;
            }

            sessionStorage.setItem(
              "selectedAnimeId",
              id
            );

            window.location.hash =
              "anime";
          }
        );
      }
    );
}

/*
|--------------------------------------------------------------------------
| Navigation
|--------------------------------------------------------------------------
*/

function navigateHome() {
  window.location.hash =
    "home";
}

/*
|--------------------------------------------------------------------------
| HTML escaping
|--------------------------------------------------------------------------
*/

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
