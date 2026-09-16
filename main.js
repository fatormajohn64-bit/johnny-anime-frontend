const pages = {
  home: {
    html: "./pages/home.html"
  },

  search: {
    html: "./pages/search.html",
    css: "./css/search.css",
    js: "./js/search.js"
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

let currentPageCss = null;

let currentPageScript = null;

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

  try {
    removePageCss();

    const response =
      await fetch(page.html);

    if (!response.ok) {
      throw new Error(
        `Failed to load ${pageName}`
      );
    }

    mainScreen.innerHTML =
      await response.text();

    if (page.css) {
      loadPageCss(page.css);
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
    console.error(error);

    mainScreen.innerHTML = `
      <section class="error-screen">
        <h2>Something went wrong</h2>
        <p>
          The page could not be loaded.
        </p>
      </section>
    `;
  }
}

function loadPageCss(
  cssPath
) {
  const link =
    document.createElement(
      "link"
    );

  link.rel = "stylesheet";
  link.href = cssPath;
  link.dataset.pageCss = "true";

  document.head.appendChild(
    link
  );

  currentPageCss = link;
}

function removePageCss() {
  if (currentPageCss) {
    currentPageCss.remove();
    currentPageCss = null;
  }
}

async function loadPageScript(
  scriptPath
) {
  if (
    currentPageScript
  ) {
    currentPageScript.remove();
    currentPageScript = null;
  }

  const script =
    document.createElement(
      "script"
    );

  script.type = "module";
  script.src =
    `${scriptPath}?t=${Date.now()}`;

  document.body.appendChild(
    script
  );

  currentPageScript =
    script;
}

function setActiveNavigation(
  pageName
) {
  navItems.forEach(
    (item) => {
      item.classList.toggle(
        "active",
        item.dataset.page ===
          pageName
      );
    }
  );
}

navItems.forEach(
  (item) => {
    item.addEventListener(
      "click",
      () => {
        const page =
          item.dataset.page;

        if (
          pages[page]
        ) {
          loadPage(page);
        }
      }
    );
  }
);

document
  .getElementById(
    "search-button"
  )
  .addEventListener(
    "click",
    () => {
      loadPage("search");
    }
  );

loadPage("home");
