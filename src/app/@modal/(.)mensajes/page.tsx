"use client";

import { useUser } from "@clerk/nextjs";
import { Column, Heading, IconButton, Row, Spinner } from "@once-ui-system/core";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { MessengerView } from "@/components/messages/MessengerView";

// Margen uniforme por lado del panel (reducido en móvil) y separación entre
// el borde inferior del header del sitio y el borde superior del panel, para
// que la barra de menú siga visible y clickeable con el modal abierto — mismos
// valores que el estado "full" de la burbuja flotante (FloatingChatBubble).
const PANEL_MARGIN = 30;
const PANEL_MARGIN_MOBILE = 16;
const MOBILE_BREAKPOINT = 480;
const HEADER_GAP = 16;
const HEADER_BOTTOM_FALLBACK = 64;

interface PanelRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function getHeaderBottom(): number {
  if (typeof document === "undefined") return HEADER_BOTTOM_FALLBACK;
  const header = document.querySelector("header");
  const bottom = header?.getBoundingClientRect().bottom ?? 0;
  return bottom > 0 ? bottom : HEADER_BOTTOM_FALLBACK;
}

function computeFullRect(): PanelRect {
  const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  const margin = isMobile ? PANEL_MARGIN_MOBILE : PANEL_MARGIN;
  const headerBottom = getHeaderBottom();
  const top = headerBottom + HEADER_GAP;
  const left = margin;
  const width = window.innerWidth - margin * 2;
  const height = window.innerHeight - top - margin;
  return { left, top, width, height };
}

// Ruta interceptada (.)mensajes: navegación client-side a /mensajes abre esto
// como overlay encima de la página previa (que sigue montada en el slot
// `children`, sin recargar). Entrada directa/refresh a /mensajes nunca pasa
// por aquí — Next.js sirve src/app/mensajes/page.tsx completa. Reutiliza el
// mismo MessengerView; project/channel llegan por query string igual que en
// la página completa, pero aquí se leen client-side (useSearchParams) porque
// searchParams de una ruta interceptada llega como Promise en un server
// component y este wrapper necesita ser cliente para el overlay/cierre.
// useSearchParams exige un límite de Suspense al prerenderizar (el build de
// producción falla sin él), por eso el export default solo envuelve.
export default function MensajesModalPage() {
  return (
    <Suspense fallback={null}>
      <MensajesModal />
    </Suspense>
  );
}

function MensajesModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn, user } = useUser();
  const [rect, setRect] = useState<PanelRect | null>(null);

  const project = searchParams.get("project") ?? undefined;
  const channel = searchParams.get("channel") ?? undefined;

  // Solo sesiones válidas ven el centro de mensajes; sin sesión, se cierra el
  // modal y se manda a /sign-in (equivalente al redirect() de la página completa).
  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  // Calcula el rect del panel (casi pantalla completa, debajo del header) al
  // montar y lo recalcula en resize — mismo cómputo que el estado "full" de
  // la burbuja flotante (FloatingChatBubble/computeFullRect).
  useEffect(() => {
    setRect(computeFullRect());
    const onResize = () => setRect(computeFullRect());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Bloquea el scroll del body mientras el modal está montado (mismo patrón
  // de overflow hidden + compensación de scrollbar de FloatingChatBubble),
  // con cleanup al desmontar.
  useEffect(() => {
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, []);

  const close = () => router.back();

  return (
    <>
      {/* Backdrop con blur + tinte suave detrás del panel: zIndex 7, por debajo
          del header del sitio (zIndex 9), que sigue clickeable por encima del
          blur. Click aquí = cerrar (mismo tratamiento que el estado full de la
          burbuja flotante). */}
      <Row
        position="fixed"
        top="0"
        left="0"
        right="0"
        bottom="0"
        zIndex={7}
        aria-hidden
        onClick={close}
        style={{
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          background: "var(--neutral-alpha-weak)",
        }}
      />
      {rect && (
        <Column
          background="surface"
          radius="l"
          shadow="xl"
          overflow="hidden"
          position="fixed"
          zIndex={8}
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <Row
            fillWidth
            gap="8"
            vertical="center"
            horizontal="between"
            padding="12"
            borderBottom="neutral-alpha-weak"
          >
            <Heading variant="heading-strong-s">Mensajes</Heading>
            <IconButton
              icon="close"
              size="s"
              variant="tertiary"
              tooltip="Cerrar"
              tooltipPosition="bottom"
              aria-label="Cerrar mensajes"
              onClick={close}
            />
          </Row>
          {isLoaded && isSignedIn && user ? (
            <Row flex={1} style={{ minWidth: 0, minHeight: 0 }}>
              <MessengerView
                viewerId={user.id}
                initialProjectId={project}
                initialChannelId={channel}
              />
            </Row>
          ) : (
            <Row flex={1} horizontal="center" vertical="center" style={{ minHeight: 0 }}>
              <Spinner size="m" />
            </Row>
          )}
        </Column>
      )}
    </>
  );
}
