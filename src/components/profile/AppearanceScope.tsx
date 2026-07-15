"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { ProfileAppearanceValue } from "./AppearancePanel";

interface AppearanceScopeProps {
  // Paleta guardada por el DUEÑO del contenido (perfil o caso de estudio);
  // null en cualquier campo = sin override, hereda la marca Hub-Nerds.
  appearance: ProfileAppearanceValue;
  children: ReactNode;
}

const OVERRIDE_ATTRS = ["data-brand", "data-accent", "data-neutral"] as const;
type OverrideAttr = (typeof OVERRIDE_ATTRS)[number];

// Componente "sin render" (solo efecto) compartido entre ProfileView (perfil
// de un Partner) y el visor de proyecto (/[username]/proyecto/[slug]): mientras
// el visitante está DENTRO del perfil/proyecto de un dueño con paleta propia,
// aplica sus overrides de brand/accent/neutral en <html> — el mismo elemento
// donde layout.tsx ya escribe los data-* de la marca del sitio (y donde
// ThemeProvider los reaplica) — para que TODO lo que cuelga de ahí (fondo de
// página, Header, MegaMenu, burbuja de mensajes) re-resuelva con la paleta del
// dueño, no solo el subárbol de contenido. Al desmontar (navegar fuera del
// perfil) restaura los valores que había antes de aplicar el override.
//
// Ya NO hace falta repetir data-theme/data-solid/data-solid-style aquí (ese
// gotcha era solo para wrappers DESCENDIENTES que necesitaban forzar que el
// bloque de tokens semánticos volviera a resolver bajo ellos): al escribir
// directo en <html>, es el MISMO elemento que ya trae data-theme/data-solid
// correctos, así que solo hace falta tocar las 3 claves que sí cambian.
//
// Convivencia con ThemeProvider (@once-ui-system/core): su propio useEffect
// reescribe brand/accent/neutral (los de la config global, vía `style` en
// Providers.tsx) en <html> cada vez que cambia `theme` (p. ej. al usar el
// ThemeSwitcher) o se llama `setStyle`. Por vivir en un ANCESTRO de este
// componente, ese efecto corre DESPUÉS del nuestro dentro del mismo commit
// (confirmado en Edge real — ver el comentario de `clearLegacyStyleOverrides`
// en Providers.tsx sobre el mismo patrón), así que reaplicar el override en
// un useEffect normal, reactivo a cambios de tema, perdería la carrera. Un
// MutationObserver corre en un microtask aparte, DESPUÉS de que el commit
// completo (incluido el efecto de ThemeProvider) ya terminó de forma
// síncrona, así que siempre puede reafirmar el override por última vez.
export function AppearanceScope({ appearance, children }: AppearanceScopeProps) {
  const prevValuesRef = useRef<Partial<Record<OverrideAttr, string | null>> | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    const desired: Partial<Record<OverrideAttr, string>> = {};
    if (appearance.brand) desired["data-brand"] = appearance.brand;
    if (appearance.accent) desired["data-accent"] = appearance.accent;
    if (appearance.neutral) desired["data-neutral"] = appearance.neutral;

    const overriddenKeys = Object.keys(desired) as OverrideAttr[];
    if (overriddenKeys.length === 0) return;

    // Captura los valores previos (los de la marca del sitio) UNA sola vez,
    // antes de pisarlos, para poder restaurarlos en el cleanup.
    if (!prevValuesRef.current) {
      prevValuesRef.current = {};
      overriddenKeys.forEach((key) => {
        prevValuesRef.current![key] = root.getAttribute(key);
      });
    }

    const applyOverride = () => {
      overriddenKeys.forEach((key) => {
        const value = desired[key];
        if (value && root.getAttribute(key) !== value) {
          root.setAttribute(key, value);
        }
      });
    };

    applyOverride();

    const observer = new MutationObserver(applyOverride);
    observer.observe(root, { attributes: true, attributeFilter: [...overriddenKeys] });

    return () => {
      observer.disconnect();
      const prev = prevValuesRef.current;
      if (prev) {
        overriddenKeys.forEach((key) => {
          const previous = prev[key];
          if (previous === null || previous === undefined) {
            root.removeAttribute(key);
          } else {
            root.setAttribute(key, previous);
          }
        });
      }
      prevValuesRef.current = null;
    };
  }, [appearance.brand, appearance.accent, appearance.neutral]);

  return <>{children}</>;
}
