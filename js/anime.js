import {
  getAnimeById
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

backButton?.addEventListener(
  "click",
  () => {
    window.location.hash =
      "search";
  }
);

libraryButton?.addEventListener(
  "click",
  () => {
    alert(
      "Library connection will be added next."
    );
  }
);

favoriteButton?.addEventListener(
  "click",
  () => {
    alert(
      "Favorites connection will be added next."
    );
  }
);

if (!animeId) {
  showError(
    "No anime was selected."
  );
} else {
  loadAnime(
    animeId
  );
}

async function loadAnime(
  id
) {
  try {
    const response =
      await getAnimeById(id);

    const anime =
      response?.result ||
      response?.data ||
      response;

    renderAnime(
      anime
    );

  } catch (error) {
    console.error(
      error
    );

    showError(
      error.message ||
      "Unable to load anime."
    );
  }
}

function renderAnime(
  anime
) {
  const title =
    anime?.title?.english ||
    anime?.title?.romaji ||
    anime?.title?.native ||
    "Unknown Anime";

  const format =
    anime?.format ||
    "ANIME";

  const episodes =
    anime?.episodes ||
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
  }

  renderSeasons(
    anime
  );
}

function renderSeasons(
  anime
) {
  seasonList.innerHTML = "";

  const seasonName =
    anime?.season ||
    "Season 1";

  const button =
    document.createElement(
      "button"
    );

  button.className =
    "season-button active";

  button.textContent =
    seasonName;

  seasonList.appendChild(
    button
  );

  renderEpisodes(
    anime
  );
}

function renderEpisodes(
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

    fragment.appendChild(
      card
    );
  }

  episodeList.innerHTML = "";

  episodeList.appendChild(
    fragment
  );
}

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

function escapeAttribute(
  value
) {
  return String(value)
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    );
}

function showError(
  message
) {
  titleElement.textContent =
    "Unable to load";

  descriptionElement.textContent =
    message;

  posterElement.innerHTML = "";

  seasonList.innerHTML = "";

  episodeList.innerHTML = `
    <div class="anime-error">
      ${escapeAttribute(
        message
      )}
    </div>
  `;
}
