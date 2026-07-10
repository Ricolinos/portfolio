(function () {
  // Next.js 16.2's own <Script strategy="beforeInteractive"> siempre renderiza
  // un <script dangerouslySetInnerHTML> interno (bootstrap self.__next_s),
  // sin importar src= vs body inline — ver node_modules/next/dist/client/script.js.
  // React 19 marca cualquier <script> así con un warning de solo-desarrollo
  // (el string no existe en los builds *.production.min.js de react-dom, o
  // sea que nunca aparece en producción). No hay fix de Next.js a la fecha
  // (16.2.10 no lo toca); se filtra puntualmente aquí porque este script ya
  // corre antes de la hidratación, a tiempo para instalar el filtro.
  var originalConsoleError = console.error;
  console.error = function () {
    if (
      typeof arguments[0] === "string" &&
      arguments[0].indexOf("Encountered a script tag while rendering React component") !== -1
    ) {
      return;
    }
    return originalConsoleError.apply(console, arguments);
  };
})();

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
