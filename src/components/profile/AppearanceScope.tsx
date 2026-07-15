"use client";

import type { ReactNode } from "react";
import { Background, Column, useStyle, useTheme } from "@once-ui-system/core";
import type { ProfileAppearanceValue } from "./AppearancePanel";

interface AppearanceScopeProps {
  // Paleta guardada por el DUEÑO del contenido (perfil o caso de estudio);
  // null en cualquier campo = sin override, hereda la marca Hub-Nerds.
  appearance: ProfileAppearanceValue;
  children: ReactNode;
}

// Envoltura compartida entre ProfileView (perfil de un Partner) y el visor
// de proyecto (/[username]/proyecto/[slug]) que REPINTA el fondo de página
// con la paleta del dueño — antes solo se notaba en botones/acentos porque
// el fondo real vive en <html>/<body> (background="page" en layout.tsx) y
// nunca heredaba el override de un wrapper descendiente.
//
// Mismo hallazgo documentado en ProfileView/DesignerDirectory: los tokens
// SEMÁNTICOS (--neutral-background-weak, de donde sale --page-background;
// --brand-alpha-weak; --brand-solid-strong; etc.) se calculan UNA SOLA VEZ
// por selectores `[data-theme=x]` (algunos compuestos con `[data-solid=y]`)
// que solo hacen match en <html> por defecto. Un `data-brand/neutral`
// distinto en un descendiente cambia las variables de bajo nivel
// (--function-*) ahí mismo, pero NO revierte la resolución de los tokens
// semánticos que ya quedó fija arriba — hay que repetir data-theme (+
// data-solid/data-solid-style, fijos de marca) en ESTE wrapper para que el
// bloque semántico completo vuelva a resolver aquí, con el brand/accent/
// neutral locales, y así `background="page"` (y todo lo de abajo) herede
// los tokens correctos en vez de los globales del sitio.
export function AppearanceScope({ appearance, children }: AppearanceScopeProps) {
  const { resolvedTheme } = useTheme();
  const { solid, solidStyle } = useStyle();
  const hasOverride = Boolean(appearance.brand || appearance.accent || appearance.neutral);

  const dataAttrs: Record<string, string> = {
    ...(appearance.brand ? { "data-brand": appearance.brand } : {}),
    ...(appearance.accent ? { "data-accent": appearance.accent } : {}),
    ...(appearance.neutral ? { "data-neutral": appearance.neutral } : {}),
    ...(hasOverride
      ? {
          "data-theme": resolvedTheme,
          "data-solid": solid,
          "data-solid-style": solidStyle,
        }
      : {}),
  };

  return (
    <Column fillWidth background="page" {...dataAttrs}>
      {hasOverride && (
        // Tinte sutil de marca sobre el fondo neutro re-resuelto, solo
        // tokens (nada de hex/rgb ad-hoc). Capa decorativa absoluta según
        // el gotcha de Background: top/left "0" + fill + pointerEvents none.
        <Background
          position="absolute"
          top="0"
          left="0"
          fill
          pointerEvents="none"
          gradient={{
            display: true,
            opacity: 40,
            x: 50,
            y: 0,
            width: 150,
            height: 100,
            colorStart: "brand-alpha-weak",
            colorEnd: "static-transparent",
          }}
        />
      )}
      {children}
    </Column>
  );
}
