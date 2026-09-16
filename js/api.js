const API_BASE_URL =
  "https://YOUR-RENDER-BACKEND-URL.onrender.com";

async function request(
  endpoint,
  options = {}
) {
  const response =
    await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        headers: {
          "Content-Type":
            "application/json",

          ...options.headers
        },

        ...options
      }
    );

  let data = null;

  try {
    data =
      await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
      data?.message ||
      `Request failed: ${response.status}`
    );
  }

  return data;
}

export async function checkHealth() {
  return request(
    "/api/health"
  );
}

export async function getLibrary() {
  return request(
    "/api/library"
  );
}

export async function searchAnime(
  query
) {
  return request(
    `/api/anime/search?search=${encodeURIComponent(query)}`
  );
}

export async function getDashboard() {
  return request(
    "/api/dashboard"
  );
}

export async function getContinueWatching() {
  return request(
    "/api/continue-watching"
  );
}

export async function getFavorites() {
  return request(
    "/api/favorites"
  );
}

export async function getSettings() {
  return request(
    "/api/settings"
  );
}
