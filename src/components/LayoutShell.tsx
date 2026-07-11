"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Flex } from "@once-ui-system/core";

// Rutas full-bleed: ocupan todo el ancho/alto disponible entre el Header y el
// fondo del viewport, sin el padding/centrado ni el Footer de página normal.
// /mensajes = layout tipo Messenger (scroll interno por panel, no del body).
const FULL_BLEED_ROUTES = ["/mensajes"];

export function LayoutShell({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isFullBleed = FULL_BLEED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isFullBleed) {
    // Sin padding ni horizontal="center": el contenido llena el ancho.
    // minHeight: 0 anula el min-height:auto por defecto de los flex items,
    // así este contenedor se acota al espacio restante del body (flex column,
    // minHeight 100dvh) en vez de crecer con el contenido — los paneles
    // internos (MessengerView) scrollean solos, el body no.
    return (
      <Flex zIndex={0} fillWidth flex={1} overflow="hidden" style={{ minHeight: 0 }}>
        {children}
      </Flex>
    );
  }

  return (
    <>
      <Flex zIndex={0} fillWidth padding="l" horizontal="center" flex={1}>
        <Flex horizontal="center" fillWidth>
          {children}
        </Flex>
      </Flex>
      {footer}
    </>
  );
}
