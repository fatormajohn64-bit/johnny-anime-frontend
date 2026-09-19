const pages = {
  home: {
    html: "./pages/home.html"
  },

  search: {
    html: "./pages/search.html",
    css: "./css/search.css",
    js: "./js/search.js"
  },

  anime: {
    html: "./pages/anime.html",
    css: "./css/anime.css",
    js: "./js/anime.js"
  },

  player: {
    html: "./pages/player.html",
    css: "./css/player.css",
    js: "./js/player.js"
  },

  library: {
    html: "./pages/library.html",
    css: "./css/library.css",
    js: "./js/library.js"
  },

  settings: {
    html: "./pages/settings.html",
    css: "./css/settings.css",
    js: "./js/settings.js"
  },

  admin: {
    html: "./pages/admin.html",
    css: "./css/admin.css",
    js: "./js/admin.js"
  }
};


const mainScreen =
  document.getElementById(
    "main-screen"
  );


const navItems =
  document.querySelectorAll(
    ".nav-item"
  );


const navCenter =
  document.querySelector(
    ".nav-center"
  );


const searchButton =
  document.getElementById(
    "search-button"
  );


let currentPageCss = null;
let currentPageScript = null;
let currentPage = null;


/* =========================
   LOAD PAGE
========================= */

async function loadPage(
  pageName
) {
  const page =
    pages[pageName];

  if (!page) {
    console.error(
      `Page "${pageName}" does not exist.`
    );

    return;
  }


  if (
    currentPage === pageName
  ) {
    return;
  }


  currentPage =
    pageName;


  try {
    removePageCss();


    const response =
      await fetch(
        page.html
      );


    if (!response.ok) {
      throw new Error(
        `Failed to load ${pageName} page.`
      );
    }


    mainScreen.innerHTML =
      await response.text();


    if (page.css) {
      loadPageCss(
        page.css
      );
    }


    setActiveNavigation(
      pageName
    );


    window.dispatchEvent(
      new CustomEvent(
        "page-loaded",
        {
          detail: {
            page: pageName
          }
        }
      )
    );


    if (page.js) {
      await loadPageScript(
        page.js
      );
    }

  } catch (error) {
    console.error(
      "Page loading error:",
      error
    );


    mainScreen.innerHTML = `
      <section class="error-screen">

        <h2>
          Something went wrong
        </h2>

        <p>
          ${escapeHtml(
            error.message
          )}
        </p>

      </section>
    `;
  }
}


/* =========================
   PAGE CSS
========================= */

function loadPageCss(
  cssPath
) {
  const link =
    document.createElement(
      "link"
    );


  link.rel =
    "stylesheet";


  link.href =
    cssPath;


  link.dataset.pageCss =
    "true";


  document.head.appendChild(
    link
  );


  currentPageCss =
    link;
}


function removePageCss() {
  if (
    currentPageCss
  ) {
    currentPageCss.remove();

    currentPageCss =
      null;
  }
}


/* =========================
   PAGE SCRIPT
========================= */

async function loadPageScript(
  scriptPath
) {
  if (
    currentPageScript
  ) {
    currentPageScript.remove();

    currentPageScript =
      null;
  }


  const script =
    document.createElement(
      "script"
    );


  script.type =
    "module";


  script.src =
    `${scriptPath}?t=${Date.now()}`;


  document.body.appendChild(
    script
  );


  currentPageScript =
    script;
}


/* =========================
   NAVIGATION STATE
========================= */

function setActiveNavigation(
  pageName
) {
  navItems.forEach(
    (
      item
    ) => {
      item.classList.toggle(
        "active",
        item.dataset.page ===
          pageName
      );
    }
  );


  if (
    navCenter
  ) {
    navCenter.classList.toggle(
      "active",
      navCenter.dataset.page ===
        pageName
    );
  }
}


/* =========================
   NAVIGATE
========================= */

function navigateTo(
  pageName
) {
  if (
    !pages[pageName]
  ) {
    console.error(
      `Unknown page: ${pageName}`
    );

    return;
  }


  const newHash =
    `#${pageName}`;


  if (
    window.location.hash ===
    newHash
  ) {
    loadPage(
      pageName
    );

    return;
  }


  window.location.hash =
    pageName;
}


/* =========================
   BOTTOM NAV ITEMS
========================= */

navItems.forEach(
  (
    item
  ) => {
    item.addEventListener(
      "click",
      () => {
        const page =
          item.dataset.page;


        if (
          pages[page]
        ) {
          navigateTo(
            page
          );
        }
      }
    );
  }
);


/* =========================
   CENTER PLAYER BUTTON
========================= */

navCenter?.addEventListener(
  "click",
  () => {
    navigateTo(
      "player"
    );
  }
);


/* =========================
   SEARCH BUTTON
========================= */

searchButton?.addEventListener(
  "click",
  () => {
    navigateTo(
      "search"
    );
  }
);


/* =========================
   HASH CHANGE
========================= */

window.addEventListener(
  "hashchange",
  () => {
    const pageName =
      window.location.hash
        .replace(
          "#",
          ""
        )
        .trim() ||
      "home";


    if (
      pages[pageName]
    ) {
      loadPage(
        pageName
      );

      return;
    }


    navigateTo(
      "home"
    );
  }
);


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


/* =========================
   INITIAL PAGE
========================= */

const initialPage =
  window.location.hash
    .replace(
      "#",
      ""
    )
    .trim() ||
  "home";


loadPage(
  pages[initialPage]
    ? initialPage
    : "home"
);
