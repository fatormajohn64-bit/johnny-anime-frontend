import {
  getEpisode,
  getVideoSources,
  getWatchProgress,
  saveWatchProgress,
  getEpisodeNavigation
} from "./api.js";

import { getSettings } from "./storage.js";


/* =========================
   ELEMENTS
========================= */

const video =
  document.getElementById(
    "anime-video"
  );

const placeholder =
  document.getElementById(
    "video-placeholder"
  );

const animeTitle =
  document.getElementById(
    "player-anime-title"
  );

const episodeTitle =
  document.getElementById(
    "player-episode-title"
  );

const episodeNumber =
  document.getElementById(
    "player-episode-number"
  );

const progressText =
  document.getElementById(
    "player-progress-text"
  );

const progressBar =
  document.getElementById(
    "player-progress-bar"
  );

const sourceList =
  document.getElementById(
    "video-source-list"
  );

const backButton =
  document.getElementById(
    "player-back"
  );

const previousButton =
  document.getElementById(
    "previous-episode"
  );

const nextButton =
  document.getElementById(
    "next-episode"
  );


/* =========================
   STATE
========================= */

let currentEpisodeId =
  sessionStorage.getItem(
    "selectedEpisodeId"
  );

let currentEpisode = null;
let currentProgress = 0;
let saveTimer = null;
let previousEpisodeId = null;
let nextEpisodeId = null;


/* =========================
   BACK
========================= */

backButton?.addEventListener(
  "click",
  () => {
    window.location.hash =
      "anime";
  }
);


/* =========================
   START
========================= */

if (!currentEpisodeId) {
  showPlaceholder(
    "No episode selected."
  );
} else {
  loadPlayer(
    currentEpisodeId
  );
}


/* =========================
   LOAD PLAYER
========================= */

async function loadPlayer(
  id
) {
  try {
    showLoading();

    currentEpisodeId = id;

    const episodeResponse =
      await getEpisode(
        id
      );

    currentEpisode =
      extractObject(
        episodeResponse
      );

    if (
      !currentEpisode
    ) {
      throw new Error(
        "Episode information was not found."
      );
    }

    renderEpisode(
      currentEpisode
    );


    await loadProgress(
      id
    );


    await loadSources(
      id
    );

    await loadNavigation(
      id
    );

  } catch (error) {
    console.error(
      "Player loading failed:",
      error
    );

    showError(
      error.message ||
      "Unable to load this episode."
    );
  }
}


/* =========================
   EPISODE INFO
========================= */

function renderEpisode(
  episode
) {
  const anime =
    episode?.anime ||
    episode?.anime_title ||
    episode?.series_title ||
    episode?.show_title ||
    "JohnnyTech × Naruto";

  const number =
    episode?.number ??
    episode?.episode_number ??
    episode?.episodeNumber ??
    "—";

  const title =
    episode?.title ||
    episode?.name ||
    `Episode ${number}`;


  animeTitle.textContent =
    anime;

  episodeTitle.textContent =
    title;

  episodeNumber.textContent =
    number;
}


/* =========================
   WATCH PROGRESS
========================= */

async function loadProgress(
  id
) {
  try {
    const response =
      await getWatchProgress(
        id
      );

    const progress =
      extractObject(
        response
      );

    if (!progress) {
      return;
    }


    const position =
      Number(
        progress.position ||
        progress.current_time ||
        progress.currentTime ||
        0
      );


    const duration =
      Number(
        progress.duration ||
        0
      );


    if (
      duration > 0
    ) {
      currentProgress =
        Math.min(
          position / duration,
          1
        );

      updateProgressUI(
        currentProgress
      );
    }


    video.dataset.resumeTime =
      String(
        position
      );

  } catch (error) {
    console.warn(
      "Could not load watch progress:",
      error
    );
  }
}


/* =========================
   SAVE PROGRESS
========================= */

async function saveCurrentProgress() {
  if (
    !currentEpisodeId ||
    !video ||
    !Number.isFinite(
      video.currentTime
    )
  ) {
    return;
  }


  try {
    await saveWatchProgress(
      currentEpisodeId,
      {
        position:
          video.currentTime,

        currentTime:
          video.currentTime,

        duration:
          Number.isFinite(
            video.duration
          )
            ? video.duration
            : 0,

        completed:
          Number.isFinite(
            video.duration
          ) &&
          video.duration > 0 &&
          video.currentTime /
            video.duration >=
            0.9
      }
    );

  } catch (error) {
    console.warn(
      "Could not save watch progress:",
      error
    );
  }
}


/* =========================
   VIDEO EVENTS
========================= */

video?.addEventListener(
  "loadedmetadata",
  () => {
    const resumeTime =
      Number(
        video.dataset.resumeTime ||
        0
      );


    if (
      resumeTime > 0 &&
      resumeTime <
        video.duration &&
      getSettings().autoResume
    ) {
      video.currentTime =
        resumeTime;
    }


    updateProgressUI(
      getVideoProgress()
    );
  }
);


video?.addEventListener(
  "timeupdate",
  () => {
    updateProgressUI(
      getVideoProgress()
    );
  }
);


video?.addEventListener(
  "play",
  () => {
    startProgressSaving();
  }
);


video?.addEventListener(
  "pause",
  () => {
    stopProgressSaving();

    saveCurrentProgress();
  }
);


video?.addEventListener(
  "ended",
  () => {
    stopProgressSaving();

    saveCurrentProgress();

    updateProgressUI(
      1
    );

    if (
      getSettings().autoplayNext &&
      nextEpisodeId
    ) {
      goToEpisode(
        nextEpisodeId
      );
    }
  }
);


window.addEventListener(
  "beforeunload",
  () => {
    stopProgressSaving();
  }
);


/* =========================
   PROGRESS TIMER
========================= */

function startProgressSaving() {
  stopProgressSaving();

  saveTimer =
    setInterval(
      () => {
        saveCurrentProgress();
      },
      10000
    );
}


function stopProgressSaving() {
  if (
    saveTimer
  ) {
    clearInterval(
      saveTimer
    );

    saveTimer =
      null;
  }
}


/* =========================
   PROGRESS UI
========================= */

function getVideoProgress() {
  if (
    !video ||
    !Number.isFinite(
      video.duration
    ) ||
    video.duration <= 0
  ) {
    return 0;
  }

  return Math.min(
    video.currentTime /
      video.duration,
    1
  );
}


function updateProgressUI(
  value
) {
  const percent =
    Math.round(
      Math.max(
        0,
        Math.min(
          value,
          1
        )
      ) * 100
    );


  currentProgress =
    percent / 100;


  if (
    progressBar
  ) {
    progressBar.style.width =
      `${percent}%`;
  }


  if (
    progressText
  ) {
    progressText.textContent =
      `${percent}%`;
  }
}


/* =========================
   EPISODE NAVIGATION
========================= */

async function loadNavigation(
  id
) {
  previousEpisodeId = null;
  nextEpisodeId = null;

  updateNavigationButtons();

  try {
    const response =
      await getEpisodeNavigation(
        id
      );

    const data =
      response?.result ||
      response?.data ||
      response ||
      {};

    previousEpisodeId =
      data.previousEpisodeId ||
      data.previous_episode_id ||
      data.previousEpisode?.id ||
      data.previous?.id ||
      null;

    nextEpisodeId =
      data.nextEpisodeId ||
      data.next_episode_id ||
      data.nextEpisode?.id ||
      data.next?.id ||
      null;

  } catch (error) {
    console.warn(
      "Episode navigation unavailable:",
      error
    );
  }

  updateNavigationButtons();
}


function updateNavigationButtons() {
  if (
    previousButton
  ) {
    previousButton.disabled =
      !previousEpisodeId;
  }

  if (
    nextButton
  ) {
    nextButton.disabled =
      !nextEpisodeId;
  }
}


async function goToEpisode(
  id
) {
  if (!id) {
    return;
  }

  stopProgressSaving();

  await saveCurrentProgress();

  video.pause();
  video.removeAttribute(
    "src"
  );
  video.load();

  sessionStorage.setItem(
    "selectedEpisodeId",
    String(id)
  );

  await loadPlayer(id);
}


previousButton?.addEventListener(
  "click",
  () => {
    goToEpisode(
      previousEpisodeId
    );
  }
);


nextButton?.addEventListener(
  "click",
  () => {
    goToEpisode(
      nextEpisodeId
    );
  }
);


/* =========================
   VIDEO SOURCES
========================= */

async function loadSources(
  id
) {
  sourceList.innerHTML = `
    <div class="player-loading">
      Loading video sources...
    </div>
  `;


  try {
    const response =
      await getVideoSources(
        id
      );

    const sources =
      extractArray(
        response
      );


    if (
      sources.length === 0
    ) {
      sourceList.innerHTML = `
        <div class="player-loading">
          No video source is available
          for this episode yet.
        </div>
      `;

      showPlaceholder(
        "No video source available."
      );

      return;
    }


    renderSources(
      sources
    );


    const playableSource =
      findPlayableSource(
        sources
      );


    if (
      playableSource
    ) {
      setVideoSource(
        playableSource
      );
    }

  } catch (error) {
    console.error(
      "Video source loading failed:",
      error
    );

    sourceList.innerHTML = `
      <div class="player-loading">
        Unable to load video sources.
      </div>
    `;
  }
}


/* =========================
   SOURCE LIST
========================= */

function renderSources(
  sources
) {
  sourceList.innerHTML = "";


  sources.forEach(
    (
      source,
      index
    ) => {
      const url =
        getSourceUrl(
          source
        );

      const name =
        source?.name ||
        source?.provider ||
        `Source ${index + 1}`;

      const quality =
        source?.quality ||
        source?.resolution ||
        "Auto";


      const item =
        document.createElement(
          "div"
        );

      item.className =
        "video-source";


      item.innerHTML = `
        <div class="video-source-info">

          <div class="video-source-name">
            ${escapeHtml(
              name
            )}
          </div>

          <div class="video-source-quality">
            ${escapeHtml(
              quality
            )}
          </div>

        </div>

        <button
          class="video-source-select"
          type="button"
        >
          Select
        </button>
      `;


      const selectButton =
        item.querySelector(
          ".video-source-select"
        );


      selectButton?.addEventListener(
        "click",
        () => {
          if (
            url
          ) {
            setVideoSource(
              source
            );
          }
        }
      );


      sourceList.appendChild(
        item
      );
    }
  );
}


/* =========================
   FIND SOURCE
========================= */

function findPlayableSource(
  sources
) {
  return (
    sources.find(
      (
        source
      ) =>
        Boolean(
          getSourceUrl(
            source
          )
        )
    ) ||
    null
  );
}


/* =========================
   SOURCE URL
========================= */

function getSourceUrl(
  source
) {
  return (
    source?.url ||
    source?.video_url ||
    source?.videoUrl ||
    source?.stream_url ||
    source?.streamUrl ||
    source?.src ||
    ""
  );
}


/* =========================
   SET VIDEO SOURCE
========================= */

function setVideoSource(
  source
) {
  const url =
    getSourceUrl(
      source
    );


  if (!url) {
    return;
  }


  video.src =
    url;

  video.load();


  placeholder?.classList.add(
    "hidden"
  );
}


/* =========================
   PLACEHOLDER
========================= */

function showPlaceholder(
  message
) {
  if (!placeholder) {
    return;
  }


  placeholder.classList.remove(
    "hidden"
  );


  const heading =
    placeholder.querySelector(
      "h2"
    );

  const paragraph =
    placeholder.querySelector(
      "p"
    );


  if (heading) {
    heading.textContent =
      "Video unavailable";
  }


  if (paragraph) {
    paragraph.textContent =
      message;
  }
}


/* =========================
   LOADING
========================= */

function showLoading() {
  if (
    sourceList
  ) {
    sourceList.innerHTML = `
      <div class="player-loading">
        Loading episode...
      </div>
    `;
  }


  if (
    episodeTitle
  ) {
    episodeTitle.textContent =
      "Loading...";
  }
}


/* =========================
   ERROR
========================= */

function showError(
  message
) {
  if (
    episodeTitle
  ) {
    episodeTitle.textContent =
      "Unable to load";
  }


  if (
    sourceList
  ) {
    sourceList.innerHTML = `
      <div class="player-loading">
        ${escapeHtml(
          message
        )}
      </div>
    `;
  }


  showPlaceholder(
    message
  );
}


/* =========================
   OBJECT EXTRACTION
========================= */

function extractObject(
  response
) {
  if (
    response?.result &&
    typeof response.result ===
      "object"
  ) {
    return response.result;
  }


  if (
    response?.data &&
    typeof response.data ===
      "object"
  ) {
    return response.data;
  }


  if (
    response &&
    typeof response ===
      "object" &&
    !Array.isArray(
      response
    )
  ) {
    return response;
  }


  return null;
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
      response?.sources
    )
  ) {
    return response.sources;
  }


  if (
    Array.isArray(
      response?.video_sources
    )
  ) {
    return response.video_sources;
  }


  return [];
}


/* =========================
   ESCAPE HTML
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
