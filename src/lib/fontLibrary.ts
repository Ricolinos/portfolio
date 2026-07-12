// FEATURE (herramienta de texto amigable, controles universales del bloque
// "text" — ver ContentBlocks.tsx/mdx.tsx): biblioteca de fuentes de uso libre
// para el CONTENIDO de las piezas (el selector "Fuente" de la toolbar),
// totalmente independiente de las 4 fuentes del TEMA del sitio (heading/
// body/label/code, ver src/resources/once-ui.config.ts) — este módulo NUNCA
// toca esas 4 variables ni el `FontsConfig` del tema.
//
// Dos tipos de entradas, mismo criterio que un procesador de texto real:
// - Stacks de SISTEMA (Arial/Helvetica, Times New Roman, Georgia, Courier
//   New): cero descarga, el navegador ya las trae instaladas.
// - GOOGLE FONTS de uso libre (SIL Open Font License / Apache — Roboto, Open
//   Sans, Montserrat, Lato, Poppins, Playfair Display, Merriweather, Oswald),
//   cargadas vía `next/font/google` con el MISMO patrón que ya usa
//   `once-ui.config.ts` (CSS variable + autohospedado por Next, sin llamada a
//   fonts.googleapis.com en runtime del visitante).
//
// COSTO DE BUNDLE (decisión documentada, ver reporte de la tarea): solo
// `subsets: ["latin"]` y `weight: ["400", "700"]` por familia (no variable-
// font completo, no subsets adicionales) — cada familia agrega ~2 archivos
// woff2 (~15-25KB c/u con latin+400/700 recortado), ~8 familias ⇒ ~250-350KB
// TOTAL si el visitante ve una pieza que use las 8 (caso improbable: la
// mayoría de piezas usa como mucho 1-2 fuentes de la biblioteca, o ninguna).
// `preload: false` en las 8 (a diferencia de las 4 fuentes del TEMA, que sí
// preloadean porque se usan en CADA página): estas son de uso condicional
// dentro de piezas MDX, preloadearlas en el <html> raíz (necesario para que
// la CSS variable resuelva en cualquier parte del sitio, ver layout.tsx)
// descargaría las 16 archivos en TODA página aunque la pieza visitada no use
// ninguna. Con `preload: false` + `display: "swap"` el archivo solo se pide
// cuando el navegador encuentra un elemento con ese `font-family` en su CSS
// computado (la pieza real que lo usa).
import {
  Lato,
  Merriweather,
  Montserrat,
  Open_Sans,
  Oswald,
  Playfair_Display,
  Poppins,
  Roboto,
} from "next/font/google";

// GOTCHA (verificado en pantalla — la página caía en 500 al arrancar):
// el macro de `next/font/google` (transform de SWC) exige que CADA opción
// del objeto pasado a la función sea un LITERAL escrito directamente ahí
// ("Font loader values must be explicitly written literals") — una
// referencia a una constante externa (`variable: ROBOTO_VAR`) NO sirve,
// aunque el valor final sea el mismo string. Los 8 nombres de variable CSS
// se repiten como literales tanto en la llamada al loader como en
// `FONT_LIBRARY` de abajo (duplicado intencional, no hay forma de
// compartirlos vía constante en el lado de la llamada).
const roboto = Roboto({
  variable: "--font-lib-roboto",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
const openSans = Open_Sans({
  variable: "--font-lib-open-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
const montserrat = Montserrat({
  variable: "--font-lib-montserrat",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
const lato = Lato({
  variable: "--font-lib-lato",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
const poppins = Poppins({
  variable: "--font-lib-poppins",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
const playfairDisplay = Playfair_Display({
  variable: "--font-lib-playfair-display",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
const merriweather = Merriweather({
  variable: "--font-lib-merriweather",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
const oswald = Oswald({
  variable: "--font-lib-oswald",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});

// Clases `.variable` a inyectar UNA vez en el <html> del layout raíz (ver
// src/app/layout.tsx, mismo `classNames(...)` que ya aplica
// `fonts.heading.variable` etc.) — sin esto, las CSS custom properties
// `--font-lib-*` no existen en ningún lado y `var(--font-lib-roboto)`
// resolvería a nada (fallback silencioso a la siguiente fuente del stack).
export const LIBRARY_FONT_VARIABLES: string[] = [
  roboto.variable,
  openSans.variable,
  montserrat.variable,
  lato.variable,
  poppins.variable,
  playfairDisplay.variable,
  merriweather.variable,
  oswald.variable,
];

export type FontLibraryKind = "system" | "google";

export interface FontLibraryEntry {
  name: string;
  cssValue: string;
  kind: FontLibraryKind;
}

// Nombre = lo que ve/elige el usuario en el dropdown "Fuente" (reconocible,
// ver objetivo de la tarea); cssValue = el stack real que se aplica vía
// `style.fontFamily` (editor en vivo, ContentBlocks.tsx) o el wrapper de
// `Text` en mdx.tsx (visor publicado) — mismo valor en ambos lados por
// construcción (una sola fuente de verdad, ver `resolveFontStack`).
export const FONT_LIBRARY: FontLibraryEntry[] = [
  { name: "Arial", cssValue: "Arial, Helvetica, sans-serif", kind: "system" },
  { name: "Times New Roman", cssValue: "'Times New Roman', Times, serif", kind: "system" },
  { name: "Georgia", cssValue: "Georgia, 'Times New Roman', serif", kind: "system" },
  { name: "Courier New", cssValue: "'Courier New', Courier, monospace", kind: "system" },
  { name: "Roboto", cssValue: "var(--font-lib-roboto), sans-serif", kind: "google" },
  { name: "Open Sans", cssValue: "var(--font-lib-open-sans), sans-serif", kind: "google" },
  { name: "Montserrat", cssValue: "var(--font-lib-montserrat), sans-serif", kind: "google" },
  { name: "Lato", cssValue: "var(--font-lib-lato), sans-serif", kind: "google" },
  { name: "Poppins", cssValue: "var(--font-lib-poppins), sans-serif", kind: "google" },
  {
    name: "Playfair Display",
    cssValue: "var(--font-lib-playfair-display), serif",
    kind: "google",
  },
  { name: "Merriweather", cssValue: "var(--font-lib-merriweather), serif", kind: "google" },
  { name: "Oswald", cssValue: "var(--font-lib-oswald), sans-serif", kind: "google" },
];

const FONT_LIBRARY_BY_NAME = new Map(FONT_LIBRARY.map((entry) => [entry.name, entry]));

// `undefined`/`"default"`/nombre desconocido ⇒ `undefined` (sin override: el
// bloque hereda `--font-body` del tema, mismo comportamiento que siempre —
// ver `resolveTextOverrideStyle` en mdx.tsx y el preview del contentEditable
// en ContentBlocks.tsx, ambos consumen esta misma función).
export function resolveFontStack(name?: string | null): string | undefined {
  if (!name || name === "default") return undefined;
  return FONT_LIBRARY_BY_NAME.get(name)?.cssValue;
}

// Conversión pt→px (tamaño por puntaje, control "Tamaño" de la toolbar):
// 1pt = 4/3 px es la conversión CSS estándar (96dpi / 72pt) — la misma que
// usa cualquier navegador para `font-size` en unidades `pt`. Se resuelve a
// `px` explícito (en vez de dejar `pt` crudo en el `style`) para que el
// redondeo sea IDÉNTICO en el editor (preview en vivo) y en el visor
// publicado (wrapper de `Text` en mdx.tsx), sin depender de que el motor de
// render del navegador interprete `pt` igual en ambos contextos.
const PT_TO_PX_RATIO = 4 / 3;

export function ptToPx(pt: number): number {
  return Math.round(pt * PT_TO_PX_RATIO);
}

// Presets curados del control "Tamaño" (NumberInput libre + estos como
// referencia rápida de los valores más comunes en un documento).
export const TEXT_SIZE_PRESETS: number[] = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48];

// Tamaño mostrado por defecto en el NumberInput cuando el bloque no tiene
// `pt` propio todavía (12pt ≈ el cuerpo de texto estándar de cualquier
// procesador de texto) — puramente de despliegue: no se escribe en
// `block.pt` hasta que el usuario interactúa con el control.
export const DEFAULT_TEXT_PT = 12;
