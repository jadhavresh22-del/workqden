// frontend/theme.js
// Universal Theme Engine for WorqDen (Light & Dark Themes)

(function () {
  const THEME_KEY = "worqdenTheme";

  // Get current saved theme or default to "light"
  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    return "light"; // Default to light theme with dark major blocks
  }

  // Apply theme to document
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);

    // Update all theme toggle buttons on page
    document.querySelectorAll(".theme-toggle-btn").forEach((btn) => {
      const isDark = theme === "dark";
      btn.setAttribute("aria-label", isDark ? "Switch to Light Theme" : "Switch to Dark Theme");
      btn.innerHTML = isDark
        ? `<span class="theme-icon">☀️</span><span class="theme-text">Light Mode</span>`
        : `<span class="theme-icon">🌙</span><span class="theme-text">Dark Mode</span>`;
    });
  }

  // Toggle theme
  window.toggleTheme = function () {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
  };

  // Immediate execution before DOM ready to prevent theme flash
  const initialTheme = getPreferredTheme();
  document.documentElement.setAttribute("data-theme", initialTheme);

  // When DOM is loaded, inject toggle button into header if not present
  document.addEventListener("DOMContentLoaded", function () {
    applyTheme(document.documentElement.getAttribute("data-theme") || initialTheme);

    const nav = document.querySelector(".main-header nav") || document.querySelector("header nav");
    if (nav && !document.getElementById("themeToggleBtn")) {
      const toggleBtn = document.createElement("button");
      toggleBtn.id = "themeToggleBtn";
      toggleBtn.type = "button";
      toggleBtn.className = "theme-toggle-btn";
      toggleBtn.onclick = window.toggleTheme;
      nav.insertBefore(toggleBtn, nav.firstChild);
      applyTheme(document.documentElement.getAttribute("data-theme") || initialTheme);
    }
  });
})();
