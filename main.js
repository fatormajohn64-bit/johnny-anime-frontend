const pages = {
  home: {
    html: "./pages/home.html"
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
    const response =
      await fetch(page.html);

    if (!response.ok) {
      throw new Error(
        `Failed to load ${pageName}`
      );
    }

    mainScreen.innerHTML =
      await response.text();

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
        loadPage(
          item.dataset.page
        );
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
