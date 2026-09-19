import { getSettings, saveSettings, clearAllDownloadsAndLibrary } from "./storage.js";

const autoplayCheckbox = document.getElementById("setting-autoplay-next");
const autoResumeCheckbox = document.getElementById("setting-auto-resume");
const clearButton = document.getElementById("clear-local-data");
const openAdminButton = document.getElementById("open-admin");

/* =========================
   LOAD CURRENT SETTINGS
========================= */

const settings = getSettings();

if (autoplayCheckbox) {
  autoplayCheckbox.checked = settings.autoplayNext;
}

if (autoResumeCheckbox) {
  autoResumeCheckbox.checked = settings.autoResume;
}

/* =========================
   SAVE ON CHANGE
========================= */

autoplayCheckbox?.addEventListener("change", () => {
  saveSettings({
    ...getSettings(),
    autoplayNext: autoplayCheckbox.checked
  });
});

autoResumeCheckbox?.addEventListener("change", () => {
  saveSettings({
    ...getSettings(),
    autoResume: autoResumeCheckbox.checked
  });
});

/* =========================
   OPEN ADMIN
========================= */

openAdminButton?.addEventListener("click", () => {
  window.location.hash = "admin";
});

/* =========================
   CLEAR LOCAL DATA
========================= */

clearButton?.addEventListener("click", () => {
  const confirmed = window.confirm(
    "Remove everything saved to your Library and Downloads on this device?"
  );

  if (!confirmed) {
    return;
  }

  clearAllDownloadsAndLibrary();

  clearButton.textContent = "Cleared";

  setTimeout(() => {
    clearButton.textContent = "Clear Local Downloads & Library";
  }, 1500);
});
