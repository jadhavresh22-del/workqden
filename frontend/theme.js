// frontend/theme.js
// Universal Theme Engine for WorqDen (Dark & Light Modes)

(function () {
  const THEME_KEY = "worqdenTheme";

  // Get current saved theme or default to "dark" to showcase the signature WorqDen dark navy theme
  function getPreferredTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") {
        return saved;
      }
    } catch (e) {}
    return "dark"; // Default to dark navy theme
  }

  // Apply theme to document element
  function applyTheme(theme) {
    const targetTheme = (theme === "light") ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", targetTheme);
    if (document.body) {
      document.body.setAttribute("data-theme", targetTheme);
    }
    try {
      localStorage.setItem(THEME_KEY, targetTheme);
    } catch (e) {}

    // Update all theme toggle buttons across the page
    const isDark = targetTheme === "dark";
    const buttons = document.querySelectorAll(".theme-toggle-btn");
    buttons.forEach((btn) => {
      btn.setAttribute("aria-label", isDark ? "Switch to Light Mode" : "Switch to Dark Mode");
      btn.title = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";
      btn.innerHTML = isDark
        ? `<span class="theme-icon">☀️</span><span class="theme-text">Light Mode</span>`
        : `<span class="theme-icon">🌙</span><span class="theme-text">Dark Mode</span>`;
    });
  }

  // Global toggle function accessible from onclick
  window.toggleTheme = function () {
    const current = document.documentElement.getAttribute("data-theme") || getPreferredTheme();
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
  };

  // Immediate execution before DOM render to prevent theme flashing
  const initialTheme = getPreferredTheme();
  document.documentElement.setAttribute("data-theme", initialTheme);

  // Sync state once DOM is ready
  document.addEventListener("DOMContentLoaded", function () {
    applyTheme(document.documentElement.getAttribute("data-theme") || initialTheme);

    // Fallback: If header has nav-actions or topbar-actions but no toggle button, inject one
    const navActions = document.querySelector(".nav-actions") || document.querySelector(".topbar-actions");
    if (navActions && !document.querySelector(".theme-toggle-btn")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "theme-toggle-btn";
      btn.onclick = window.toggleTheme;
      navActions.insertBefore(btn, navActions.firstChild);
      applyTheme(document.documentElement.getAttribute("data-theme") || initialTheme);
    }
  });
})();
