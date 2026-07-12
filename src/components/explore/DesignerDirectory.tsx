"use client";

import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Background,
  BlobFx,
  Column,
  Fade,
  Flex,
  FlipFx,
  Grid,
  Heading,
  HoloFx,
  IconButton,
  InfiniteScroll,
  Mask,
  MatrixFx,
  Media,
  RevealFx,
  Row,
  Text,
  TiltFx,
} from "@once-ui-system/core";
import { RoleTag } from "@/components/RoleTag";
import { ALL_SPECIALTIES, useExploreSearch } from "./SearchContext";
import styles from "./DesignerDirectory.module.scss";

// Usuarios reales de la plataforma (rol "collaborator") consultados vía Prisma en el Server Component.
export type PlatformDesigner = {
  id: string;
  name: string | null;
  username: string | null;
  imageUrl: string | null;
  featuredImageUrl: string | null;
  cardQuote: string | null;
  headline: string | null;
  bio: string | null;
  primaryRole: string | null;
  secondaryRoles: string[];
};

type Designer = {
  name: string;
  specialty: string;
  role: string;
  avatar: string;
  projectHref: string;
  projectTitle: string;
  featuredImageUrl: string | null;
  cardQuote: string | null;
  headline: string;
  bio: string | null;
  primaryRole: string | null;
  secondaryRoles: string[];
};

// La proporción vertical fija de la tarjeta (3/4) vive en
// DesignerDirectory.module.scss (.flipCard): FlipFx fija su altura por JS y
// esa clase la anula con !important, dejando que el aspect-ratio en CSS
// controle el alto de ambas caras (ver detalle en el .scss).
function DesignerFront({ designer, seed }: { designer: Designer; seed: number }) {
  const imageSrc = designer.featuredImageUrl || designer.avatar || null;

  return (
    <Column fillWidth fillHeight radius="l" overflow="hidden" background="neutral-alpha-weak">
      {imageSrc ? (
        // HoloFx es el wrapper absoluto full-bleed; la Media queda dentro,
        // sin posicionarse ella misma, rellenando el "base" de HoloFx al 100%.
        <HoloFx position="absolute" top="0" left="0" fill radius="l">
          <Media
            src={imageSrc}
            alt={designer.name}
            fill
            fillHeight
            objectFit="cover"
            sizes="(max-width: 1024px) 100vw, 33vw"
          />
        </HoloFx>
      ) : (
        <BlobFx seed={seed} position="absolute" top="0" left="0" fill fillHeight opacity={40} />
      )}

      {/* Franja de degradado (con patrón de puntos) que hace legible el
          nombre/rol sobre la imagen, ancla abajo y se desvanece hacia
          arriba. Se sube a ~40% para dar aire al nombre en dos líneas. */}
      <Fade
        to="top"
        base="page"
        pattern={{ display: true, size: "8" }}
        position="absolute"
        bottom="0"
        left="0"
        fillWidth
        zIndex={1}
        style={{ height: "40%" }}
      />

      <Column position="absolute" bottom="0" left="0" fillWidth padding="16" gap="4" zIndex={2}>
        <Heading variant="display-strong-xs" onBackground="neutral-strong" wrap="balance">
          {designer.name}
        </Heading>
        <Text variant="label-default-l" onBackground="neutral-medium">
          {designer.headline}
        </Text>
      </Column>
    </Column>
  );
}

// Duración de la onda de MatrixFx cronometrada sobre su propio ciclo
// (trigger="manual", ver dist/components/MatrixFx.js): con speed=1,
// revealProgress = elapsed^3 * speed * 3, capado a 2.0. Un dot alcanza su
// opacidad máxima cuando revealProgress supera introOffset + 0.125 (el
// "fadeIn" del código llega a 1). El dot más lejano del centro tiene
// introOffset ≈ 0.95 (normalizedDistance=1 * 0.8 + randomOffset máx. 0.15),
// así que el peor caso necesita revealProgress ≈ 1.075, es decir
// elapsed = (1.075 / 3) ** (1/3) ≈ 0.71s. Navegamos a los 900ms para dar
// margen (frame drops, bulge) y que la onda cubra visualmente toda la
// tarjeta antes de salir de ella.
const MATRIX_REVEAL_MS = 900;

function DesignerBack({
  designer,
  seed,
  onFlipBack,
}: {
  designer: Designer;
  seed: number;
  onFlipBack: () => void;
}) {
  const router = useRouter();
  const [revealing, setRevealing] = useState(false);

  useEffect(() => {
    if (!revealing) return;
    const timeout = setTimeout(() => {
      router.push(designer.projectHref);
    }, MATRIX_REVEAL_MS);
    return () => clearTimeout(timeout);
  }, [revealing, router, designer.projectHref]);

  // El click en el avatar dispara la onda de MatrixFx (trigger="manual",
  // active=revealing) y, cuando termina, navega al perfil. stopPropagation
  // evita que el mismo click burbujee hasta el onClick de FlipFx y vuelva a
  // voltear la tarjeta a mitad de la animación.
  const handleAvatarClick = (event: MouseEvent) => {
    event.stopPropagation();
    if (revealing) return;
    setRevealing(true);
  };

  // La flecha SOLO regresa al frente: nunca debe navegar ni dejar que el
  // click llegue al onClick de FlipFx.
  const handleUnflip = (event: MouseEvent) => {
    event.stopPropagation();
    onFlipBack();
  };

  const avatarProps = designer.avatar
    ? { src: designer.avatar }
    : { value: (designer.name[0] ?? "D").toUpperCase() };

  return (
    <Column
      fillWidth
      fillHeight
      radius="l"
      border="neutral-alpha-weak"
      background="neutral-alpha-weak"
      overflow="hidden"
    >
      {/* Capa base: patrón de puntos en toda la superficie + glow radial
          suave detrás del centro. Solo tokens globales (mismo recipe que
          HomeHero), respeta light/dark. */}
      <Background
        position="absolute"
        top="0"
        left="0"
        fill
        pointerEvents="none"
        zIndex={0}
        dots={{ display: true, opacity: 30 }}
        gradient={{
          display: true,
          opacity: 60,
          x: 50,
          y: 42,
          width: 120,
          height: 100,
          colorStart: "brand-background-strong",
          colorEnd: "static-transparent",
        }}
      />

      {/* Blob con movimiento propio, recortado por Mask con cursor=true: solo
          se revela en un círculo alrededor del puntero. En touch (sin mouse)
          Mask nunca activa el seguimiento y el blob queda oculto por la
          máscara, degradando sin romper nada. */}
      <Mask cursor radius={26} position="absolute" top="0" left="0" fill pointerEvents="none" zIndex={1}>
        <BlobFx seed={seed} fill opacity={60} />
      </Mask>

      {/* Contenido: avatar grande → nombre → roles, centrado verticalmente
          (el avatar queda algo arriba del centro real por el peso del resto
          de la columna debajo). */}
      <Column fillWidth fillHeight padding="24" gap="12" center zIndex={2}>
        <Avatar {...avatarProps} size="xl" cursor="interactive" onClick={handleAvatarClick} />
        <Heading variant="display-strong-xs" onBackground="neutral-strong" align="center" wrap="balance">
          {designer.name}
        </Heading>
        {(designer.primaryRole || designer.secondaryRoles.length > 0) && (
          <Row gap="8" wrap horizontal="center" vertical="center">
            {designer.primaryRole && <RoleTag role={designer.primaryRole} variant="primary" />}
            {designer.secondaryRoles.map((role) => (
              <RoleTag key={role} role={role} variant="secondary" />
            ))}
          </Row>
        )}
      </Column>

      {/* Onda expansiva de MatrixFx: overlay absoluto de toda la tarjeta,
          activado por estado (trigger="manual") desde el click en el avatar.
          pointerEvents="none" para no bloquear el click del avatar antes de
          activarse. */}
      <MatrixFx
        trigger="manual"
        active={revealing}
        revealFrom="center"
        bulge={{ type: "ripple", intensity: 8, duration: 1, repeat: false }}
        position="absolute"
        top="0"
        left="0"
        fill
        pointerEvents="none"
        zIndex={3}
      />

      {/* Flecha para des-voltear sin navegar; siempre visible, esquina superior
          derecha, por encima de todo lo demás (incluida la onda MatrixFx) para
          seguir siendo clickeable durante la animación. Va dentro de un Flex
          absoluto propio: con `tooltip`, IconButton se envuelve en un wrapper
          relative y un absolute en su `style` se anclaría a ese wrapper (que
          fluye al fondo de la columna), no a la tarjeta. */}
      <Flex position="absolute" top="12" right="12" zIndex={4}>
        <IconButton
          icon="refresh"
          variant="secondary"
          size="m"
          tooltip="Voltear tarjeta"
          aria-label="Voltear tarjeta"
          onClick={handleUnflip}
        />
      </Flex>
    </Column>
  );
}

// TiltFx se autodesactiva en dispositivos táctiles (detecta "ontouchstart" y
// no aplica el efecto), así que convive sin estorbar con el tap-to-flip.
function DesignerCard({ designer, seed }: { designer: Designer; seed: number }) {
  // Estado levantado: FlipFx queda controlado para que la flecha del reverso
  // pueda des-voltear la tarjeta.
  const [flipped, setFlipped] = useState(false);

  return (
    <TiltFx fillWidth radius="l" intensity={3}>
      <FlipFx
        fillWidth
        radius="l"
        className={styles.flipCard}
        flipped={flipped}
        onFlip={setFlipped}
        front={<DesignerFront designer={designer} seed={seed} />}
        back={<DesignerBack designer={designer} seed={seed} onFlipBack={() => setFlipped(false)} />}
      />
    </TiltFx>
  );
}

// Mismo lote que ExploreFeed: sin paginación de servidor, InfiniteScroll solo
// revela progresivamente el array "filtered" ya cargado en el cliente.
const BATCH_SIZE = 8;

export function DesignerDirectory({ platformDesigners = [] }: { platformDesigners?: PlatformDesigner[] }) {
  const { query, specialty } = useExploreSearch();

  const designers = useMemo<Designer[]>(() => {
    return platformDesigners.map((user) => ({
      name: user.name ?? user.username ?? "Colaborador",
      specialty: "Diseñador de Marca",
      role: user.headline ?? "Colaborador de la plataforma Designerds",
      avatar: user.imageUrl ?? "",
      projectHref: user.username ? `/${user.username}` : "/explorar",
      projectTitle: "Perfil de colaborador",
      featuredImageUrl: user.featuredImageUrl,
      cardQuote: user.cardQuote,
      headline: user.headline ?? "Diseñador de Marca",
      bio: user.bio,
      primaryRole: user.primaryRole,
      secondaryRoles: user.secondaryRoles ?? [],
    }));
  }, [platformDesigners]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return designers.filter((designer) => {
      if (specialty !== ALL_SPECIALTIES && designer.specialty !== specialty) return false;
      if (q && !designer.name.toLowerCase().includes(q) && !designer.role.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [designers, query, specialty]);

  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [filtered]);

  const visible = filtered.slice(0, visibleCount);

  const loadMore = async () => {
    const next = visibleCount + BATCH_SIZE;
    setVisibleCount(next);
    return next < filtered.length;
  };

  return (
    <RevealFx fillWidth direction="column" gap="24" translateY="8" speed="fast">
      <Column fillWidth gap="8">
        <Heading variant="display-strong-l">Designerds</Heading>
        <Text onBackground="neutral-weak" variant="body-default-l">
          Conoce a los diseñadores colaboradores de la plataforma.
        </Text>
      </Column>

      {filtered.length === 0 ? (
        <Text onBackground="neutral-weak" variant="body-default-m">
          No encontramos diseñadores que coincidan con tu búsqueda.
        </Text>
      ) : (
        <Grid columns={3} m={{ columns: 2 }} s={{ columns: 1 }} gap="24" fillWidth>
          <InfiniteScroll
            items={visible}
            renderItem={(designer) => (
              <DesignerCard key={designer.name} designer={designer} seed={designers.indexOf(designer)} />
            )}
            loadMore={loadMore}
            style={{ gridColumn: "1 / -1" }}
          />
        </Grid>
      )}
    </RevealFx>
  );
}
