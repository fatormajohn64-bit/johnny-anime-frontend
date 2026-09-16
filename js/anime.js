import {
  getAnimeById,
  getSeasons,
  getEpisodes
} from "./api.js";


const titleElement =
  document.getElementById(
    "anime-title"
  );

const formatElement =
  document.getElementById(
    "anime-format"
  );

const metaElement =
  document.getElementById(
    "anime-meta"
  );

const descriptionElement =
  document.getElementById(
    "anime-description"
  );

const posterElement =
  document.getElementById(
    "anime-poster"
  );

const seasonList =
  document.getElementById(
    "season-list"
  );

const episodeList =
  document.getElementById(
    "episode-list"
  );

const backButton =
  document.getElementById(
    "anime-back"
  );

const libraryButton =
  document.getElementById(
    "add-library"
  );

const favoriteButton =
  document.getElementById(
    "favorite-anime"
  );


const animeId =
  sessionStorage.getItem(
    "selectedAnimeId"
  );


/* =========================
   BACK
========================= */

backButton?.addEventListener(
  "click",
  () => {
    window.location.hash =
      "search";
  }
);


/* =========================
   START
========================= */

if (!animeId) {
  showError(
    "No anime was selected."
  );
} else {
  loadAnime(
    animeId
  );
}


/* =========================
   LOAD ANIME
========================= */

async function loadAnime(
  id
) {
  showLoading();

  try {
    const response =
      await getAnimeById(id);

    const anime =
      response?.result ||
      response?.data ||
      response;

    if (!anime) {
      throw new Error(
        "Anime information was not found."
      );
    }

    renderAnime(
      anime
    );

    await loadBackendSeasons(
      id,
      anime
    );

  } catch (error) {
    console.error(
      "Anime loading failed:",
      error
    );

    showError(
      error.message ||
      "Unable to load anime."
    );
  }
}


/* =========================
   RENDER ANIME
========================= */

function renderAnime(
  anime
) {
  const title =
    anime?.title?.english ||
    anime?.title?.romaji ||
    anime?.title?.native ||
    anime?.title_english ||
    anime?.title_romaji ||
    "Unknown Anime";

  const format =
    anime?.format ||
    "ANIME";

  const episodes =
    anime?.episodes ??
    "Unknown";

  const duration =
    anime?.duration
      ? `${anime.duration} min`
      : "Unknown duration";

  const status =
    anime?.status ||
    "Unknown status";

  const description =
    cleanDescription(
      anime?.description ||
      "No description available."
    );

  const poster =
    anime?.coverImage?.extraLarge ||
    anime?.coverImage?.large ||
    anime?.coverImage?.medium ||
    anime?.cover_image ||
    "";


  titleElement.textContent =
    title;

  formatElement.textContent =
    format;

  metaElement.textContent =
    `${episodes} episodes • ${duration} • ${status}`;

  descriptionElement.textContent =
    description;


  if (poster) {
    posterElement.innerHTML = `
      <img
        src="${escapeAttribute(
          poster
        )}"
        alt="${escapeAttribute(
          title
        )}"
      >
    `;
  } else {
    posterElement.innerHTML = `
      <div class="anime-poster-placeholder">
        ${escapeHtml(
          title
        )}
      </div>
    `;
  }
}


/* =========================
   LOAD BACKEND SEASONS
========================= */

async function loadBackendSeasons(
  id,
  anime
) {
  seasonList.innerHTML = `
    <div class="anime-loading">
      Loading seasons...
    </div>
  `;

  try {
    const response =
      await getSeasons(id);

    const seasons =
      extractArray(
        response
      );

    if (
      seasons.length > 0
    ) {
      renderBackendSeasons(
        seasons
      );

      await loadSeasonEpisodes(
        seasons[0].id
      );

      return;
    }

    /*
     * If the backend does not
     * have seasons yet, show the
     * AniList season as a fallback.
     */

    renderFallbackSeason(
      anime
    );

  } catch (error) {
    console.warn(
      "Backend seasons unavailable:",
      error
    );

    renderFallbackSeason(
      anime
    );
  }
}


/* =========================
   BACKEND SEASONS
========================= */

function renderBackendSeasons(
  seasons
) {
  seasonList.innerHTML = "";

  seasons.forEach(
    (
      season,
      index
    ) => {
      const button =
        document.createElement(
          "button"
        );

      button.className =
        "season-button";

      if (
        index === 0
      ) {
        button.classList.add(
          "active"
        );
      }

      button.textContent =
        season.name ||
        season.title ||
        `Season ${
          index + 1
        }`;

      button.addEventListener(
        "click",
        async () => {
          document
            .querySelectorAll(
              ".season-button"
            )
            .forEach(
              (
                item
              ) => {
                item.classList.remove(
                  "active"
                );
              }
            );

          button.classList.add(
            "active"
          );

          if (
            season.id
          ) {
            await loadSeasonEpisodes(
              season.id
            );
          }
        }
      );

      seasonList.appendChild(
        button
      );
    }
  );
}


/* =========================
   FALLBACK SEASON
========================= */

function renderFallbackSeason(
  anime
) {
  seasonList.innerHTML = "";

  const button =
    document.createElement(
      "button"
    );

  button.className =
    "season-button active";

  button.textContent =
    anime?.season ||
    "Season 1";

  seasonList.appendChild(
    button
  );

  renderFallbackEpisodes(
    anime
  );
}


/* =========================
   LOAD EPISODES
========================= */

async function loadSeasonEpisodes(
  seasonId
) {
  episodeList.innerHTML = `
    <div class="anime-loading">
      Loading episodes...
    </div>
  `;

  try {
    const response =
      await getEpisodes(
        seasonId
      );

    const episodes =
      extractArray(
        response
      );

    if (
      episodes.length === 0
    ) {
      episodeList.innerHTML = `
        <div class="anime-loading">
          No episodes have been
          added yet.
        </div>
      `;

      return;
    }

    renderBackendEpisodes(
      episodes
    );

  } catch (error) {
    console.warn(
      "Episode loading failed:",
      error
    );

    episodeList.innerHTML = `
      <div class="anime-error">
        Unable to load episodes.
      </div>
    `;
  }
}


/* =========================
   BACKEND EPISODES
========================= */

function renderBackendEpisodes(
  episodes
) {
  episodeList.innerHTML = "";

  episodes.forEach(
    (
      episode
    ) => {
      const card =
        document.createElement(
          "article"
        );

      card.className =
        "episode-card";

      const number =
        episode.number ??
        episode.episode_number ??
        episode.episodeNumber ??
        "—";

      const title =
        episode.title ||
        episode.name ||
        `Episode ${number}`;

      card.innerHTML = `
        <div class="episode-number">
          ${escapeHtml(
            number
          )}
        </div>

        <div class="episode-info">

          <div class="episode-title">
            ${escapeHtml(
              title
            )}
          </div>

          <div class="episode-progress">
            <div
              class="episode-progress-bar"
              style="width: 0%"
            ></div>
          </div>

        </div>

        <div class="episode-status">
          —
        </div>

        <button
          class="episode-play"
          aria-label="Play episode ${escapeAttribute(
            number
          )}"
        >
          ▶
        </button>
      `;

      const playButton =
        card.querySelector(
          ".episode-play"
        );

      playButton?.addEventListener(
        "click",
        (
          event
        ) => {
          event.stopPropagation();

          openEpisode(
            episode
          );
        }
      );

      episodeList.appendChild(
        card
      );
    }
  );
}


/* =========================
   FALLBACK EPISODES
========================= */

function renderFallbackEpisodes(
  anime
) {
  const totalEpisodes =
    Number(
      anime?.episodes || 0
    );

  if (
    !totalEpisodes
  ) {
    episodeList.innerHTML = `
      <div class="anime-loading">
        Episode information
        is not available yet.
      </div>
    `;

    return;
  }

  episodeList.innerHTML = "";

  const fragment =
    document.createDocumentFragment();

  for (
    let i = 1;
    i <= totalEpisodes;
    i++
  ) {
    const card =
      document.createElement(
        "article"
      );

    card.className =
      "episode-card";

    card.innerHTML = `
      <div class="episode-number">
        ${i}
      </div>

      <div class="episode-info">

        <div class="episode-title">
          Episode ${i}
        </div>

        <div class="episode-progress">
          <div
            class="episode-progress-bar"
            style="width: 0%"
          ></div>
        </div>

      </div>

      <div class="episode-status">
        —
      </div>

      <button
        class="episode-play"
        aria-label="Play episode ${i}"
      >
        ▶
      </button>
    `;

    const playButton =
      card.querySelector(
        ".episode-play"
      );

    playButton?.addEventListener(
      "click",
      (
        event
      ) => {
        event.stopPropagation();

        openEpisode({
          number: i,
          title:
            `Episode ${i}`
        });
      }
    );

    fragment.appendChild(
      card
    );
  }

  episodeList.appendChild(
    fragment
  );
}


/* =========================
   OPEN EPISODE
========================= */

function openEpisode(
  episode
) {
  if (
    !episode?.id
  ) {
    console.log(
      "Episode selected:",
      episode
    );

    return;
  }

  sessionStorage.setItem(
    "selectedEpisodeId",
    episode.id
  );

  window.location.hash =
    "player";
}


/* =========================
   ARRAY EXTRACTION
========================= */

function extractArray(
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
      response?.seasons
    )
  ) {
    return response.seasons;
  }

  if (
    Array.isArray(
      response?.episodes
    )
  ) {
    return response.episodes;
  }

  return [];
}


/* =========================
   LOADING
========================= */

function showLoading() {
  titleElement.textContent =
    "Loading...";

  formatElement.textContent =
    "ANIME";

  metaElement.textContent =
    "";

  descriptionElement.textContent =
    "Loading anime information...";

  posterElement.innerHTML = `
    <div class="anime-loading">
      Loading...
    </div>
  `;

  seasonList.innerHTML = `
    <div class="anime-loading">
      Loading seasons...
    </div>
  `;

  episodeList.innerHTML = `
    <div class="anime-loading">
      Loading episodes...
    </div>
  `;
}


/* =========================
   ERROR
========================= */

function showError(
  message
) {
  titleElement.textContent =
    "Unable to load";

  formatElement.textContent =
    "ERROR";

  metaElement.textContent =
    "";

  descriptionElement.textContent =
    message;

  posterElement.innerHTML = "";

  seasonList.innerHTML = "";

  episodeList.innerHTML = `
    <div class="anime-error">
      ${escapeHtml(
        message
      )}
    </div>
  `;
}


/* =========================
   DESCRIPTION CLEANUP
========================= */

function cleanDescription(
  value
) {
  return String(value)
    .replace(
      /<[^>]*>/g,
      ""
    )
    .replace(
      /~!|!~/g,
      ""
    )
    .trim();
}


/* =========================
   SAFE HTML
========================= */

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
