"use client";

import { useUser } from "@clerk/nextjs";
import { Column, Heading, IconButton, Row, Spinner } from "@once-ui-system/core";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { MessengerView } from "@/components/messages/MessengerView";

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

  const project = searchParams.get("project") ?? undefined;
  const channel = searchParams.get("channel") ?? undefined;

  // Solo sesiones válidas ven el centro de mensajes; sin sesión, se cierra el
  // modal y se manda a /sign-in (equivalente al redirect() de la página completa).
  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  const close = () => router.back();

  return (
    <Row
      position="fixed"
      top="0"
      left="0"
      fill
      zIndex={9}
      background="overlay"
      padding="16"
      horizontal="center"
      vertical="center"
      onClick={close}
    >
      <Column
        fill
        maxWidth={64}
        background="page"
        radius="l"
        shadow="xl"
        overflow="hidden"
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
    </Row>
  );
}
