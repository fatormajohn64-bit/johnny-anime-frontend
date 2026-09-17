const API_BASE_URL =
"https://johnny-anime-backend.onrender.com";

async function request(
endpoint,
options = {}
) {
let response;

try {
response = await fetch(
"${API_BASE_URL}${endpoint}",
{
...options,

    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  }
);

} catch (error) {
throw new Error(
"Could not connect to the Johnny Anime backend."
);
}

let data = null;

try {
data = await response.json();
} catch {
data = null;
}

if (!response.ok) {
const serverMessage =
data?.error ||
data?.message ||
data?.detail;

throw new Error(
  serverMessage ||
  `Request failed with HTTP ${response.status} ${response.statusText}`
);

}

return data;
}

/* =========================
HEALTH
========================= */

export async function checkHealth() {
return request(
"/api/health"
);
}

export async function checkDatabaseHealth() {
return request(
"/api/database/health"
);
}

/* =========================
ANIME
========================= */

export async function searchAnime(
query
) {
const cleanQuery =
String(query || "").trim();

if (!cleanQuery) {
throw new Error(
"Search query is required"
);
}

return request(
"/api/anime/search?q=${encodeURIComponent( cleanQuery )}"
);
}

export async function getAnimeById(
id
) {
return request(
"/api/anime/${encodeURIComponent( id )}"
);
}

/* =========================
LIBRARY
========================= */

export async function getLibrary() {
return request(
"/api/library"
);
}

export async function addToLibrary(
anime
) {
return request(
"/api/library",
{
method: "POST",

  body: JSON.stringify(
    anime
  )
}

);
}

export async function getLibraryItem(
id
) {
return request(
"/api/library/${encodeURIComponent( id )}"
);
}

export async function removeFromLibrary(
id
) {
return request(
"/api/library/${encodeURIComponent( id )}",
{
method: "DELETE"
}
);
}

/* =========================
SEASONS
========================= */

export async function getSeasons(
animeId
) {
return request(
"/api/anime/${encodeURIComponent( animeId )}/seasons"
);
}

export async function createSeason(
animeId,
season
) {
return request(
"/api/anime/${encodeURIComponent( animeId )}/seasons",
{
method: "POST",

  body: JSON.stringify(
    season
  )
}

);
}

/* =========================
EPISODE SYNC
========================= */

export async function syncAnimeEpisodes(
anilistId
) {
return request(
"/api/episode-sync/anilist/${encodeURIComponent( anilistId )}",
{
method: "POST"
}
);
}

/* =========================
EPISODES
========================= */

export async function getEpisodes(
seasonId
) {
return request(
"/api/season/${encodeURIComponent( seasonId )}/episodes"
);
}

export async function createEpisode(
seasonId,
episode
) {
return request(
"/api/season/${encodeURIComponent( seasonId )}/episodes",
{
method: "POST",

  body: JSON.stringify(
    episode
  )
}

);
}

export async function getEpisode(
episodeId
) {
return request(
"/api/episode/${encodeURIComponent( episodeId )}"
);
}

/* =========================
VIDEO SOURCES
========================= */

export async function getVideoSources(
episodeId
) {
return request(
"/api/episode/${encodeURIComponent( episodeId )}/video-sources"
);
}

/* =========================
WATCH PROGRESS
========================= */

export async function getWatchProgress(
episodeId
) {
return request(
"/api/watch-progress/${encodeURIComponent( episodeId )}"
);
}

export async function saveWatchProgress(
episodeId,
progress
) {
return request(
"/api/watch-progress/${encodeURIComponent( episodeId )}",
{
method: "POST",

  body: JSON.stringify(
    progress
  )
}

);
}

/* =========================
PLAYER
========================= */

export async function getPlayerData(
episodeId
) {
return request(
"/api/player/${encodeURIComponent( episodeId )}"
);
}

/* =========================
CONTINUE WATCHING
========================= */

export async function getContinueWatching() {
return request(
"/api/continue-watching"
);
}

/* =========================
WATCH HISTORY
========================= */

export async function getWatchHistory() {
return request(
"/api/watch-history"
);
}

/* =========================
RESUME
========================= */

export async function getResume(
episodeId
) {
return request(
"/api/resume/${encodeURIComponent( episodeId )}"
);
}

/* =========================
FAVORITES
========================= */

export async function getFavorites() {
return request(
"/api/favorites"
);
}

export async function addFavorite(
animeId
) {
return request(
"/api/favorites",
{
method: "POST",

  body: JSON.stringify({
    animeId
  })
}

);
}

export async function removeFavorite(
animeId
) {
return request(
"/api/favorites/${encodeURIComponent( animeId )}",
{
method: "DELETE"
}
);
}

/* =========================
DASHBOARD
========================= */

export async function getDashboard() {
return request(
"/api/dashboard"
);
}

/* =========================
DOWNLOADS
========================= */

export async function getDownloads() {
return request(
"/api/downloads"
);
}

export async function createDownload(
download
) {
return request(
"/api/downloads",
{
method: "POST",

  body: JSON.stringify(
    download
  )
}

);
}

/* =========================
SETTINGS
========================= */

export async function getSettings() {
return request(
"/api/settings"
);
}

export async function updateSettings(
settings
) {
return request(
"/api/settings",
{
method: "POST",

  body: JSON.stringify(
    settings
  )
}

);}
