import {
searchAnime
} from "./api.js?v=4";

/* =========================
ELEMENTS
========================= */

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

/* =========================
STATE
========================= */

let searchTimer = null;
let lastQuery = "";

/* =========================
SEARCH INPUT
========================= */

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

/* =========================
CLEAR SEARCH
========================= */

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

/* =========================
BACK
========================= */

backButton?.addEventListener(
"click",
() => {
navigateHome();
}
);

/* =========================
PERFORM SEARCH
========================= */

async function performSearch(
query
) {
const cleanQuery =
String(
query || ""
).trim();

if (!cleanQuery) {
return;
}

lastQuery =
cleanQuery;

status.textContent =
"Searching...";

results.innerHTML = "<div class="search-loading"> Searching anime... </div>";

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
        error?.message ||
        "Unable to search right now."
      )}
    </p>

    <button
      id="retry-search"
      class="retry-search"
      type="button"
    >
      Try Again
    </button>

  </div>
`;

status.textContent =
  "Unable to complete search.";

attachRetryButton();

}
}

/* =========================
RETRY
========================= */

function attachRetryButton() {
const retryButton =
document.getElementById(
"retry-search"
);

retryButton?.addEventListener(
"click",
() => {
const query =
input?.value.trim();

  if (query) {
    performSearch(
      query
    );
  } else {
    input?.focus();
  }
}

);
}

/* =========================
EXTRACT RESULTS
========================= */

function extractAnimeResults(
response
) {
/*
Current backend response:

{
  success: true,
  query: "Naruto",
  count: 20,
  results: [...]
}

*/

if (
Array.isArray(
response?.results
)
) {
return response.results;
}

/*
Support a direct array response.
*/

if (
Array.isArray(
response
)
) {
return response;
}

/*
Support older response formats.
*/

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

/* =========================
RENDER RESULTS
========================= */

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
"${animeList.length} result${ animeList.length === 1 ? "" : "s" } found";

results.innerHTML =
animeList
.map(
(
anime
) => {
return createAnimeCard(
anime
);
}
)
.join("");

attachCardEvents();
}

/* =========================
ANIME CARD
========================= */

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

let posterMarkup = "";

if (cover) {
posterMarkup = "<img src="${escapeAttribute( cover )}" alt="${escapeAttribute( title )}" loading="lazy" >";

} else {
posterMarkup = "<div class="anime-cover-placeholder" > <span> ${escapeHtml( title )} </span> </div>";
}

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

/* =========================
CARD EVENTS
========================= */

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

/* =========================
NAVIGATION
========================= */

function navigateHome() {
window.location.hash =
"home";
}

/* =========================
ESCAPE HTML
========================= */

function escapeHtml(
value
) {
return String(
value ?? ""
)
.replaceAll(
"&",
"&"
)
.replaceAll(
"<",
"<"
)
.replaceAll(
">",
">"
)
.replaceAll(
'"',
"""
)
.replaceAll(
"'",
"'"
);
}

/* =========================
ESCAPE ATTRIBUTE
========================= */

function escapeAttribute(
value
) {
return escapeHtml(
value
);
}
