(function () {
  try {
    var root = document.documentElement;

    var resolveTheme = function (themeValue) {
      if (!themeValue || themeValue === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      return themeValue;
    };

    var savedTheme = localStorage.getItem("data-theme");
    root.setAttribute("data-theme", resolveTheme(savedTheme));

    var styleKeys = [
      "brand",
      "accent",
      "neutral",
      "solid",
      "solid-style",
      "border",
      "surface",
      "transition",
      "scaling",
      "viz-style",
    ];
    styleKeys.forEach(function (key) {
      var value = localStorage.getItem("data-" + key);
      if (value) {
        root.setAttribute("data-" + key, value);
      }
    });
  } catch (e) {
    console.error("Failed to initialize theme:", e);
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
