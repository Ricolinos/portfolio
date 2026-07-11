"use client";

import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Background,
  Badge,
  BlobFx,
  Button,
  Column,
  Fade,
  Flex,
  FlipFx,
  Grid,
  Heading,
  HoloFx,
  IconButton,
  InfiniteScroll,
  Media,
  RevealFx,
  Row,
  Text,
  TiltFx,
} from "@once-ui-system/core";
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

      {/* Franja de degradado (con patrón de puntos) que hace legible la cita
          sobre la imagen, ancla abajo y se desvanece hacia arriba. Se mantiene
          angosta (~30%) para no tapar demasiada imagen. */}
      <Fade
        to="top"
        base="page"
        pattern={{ display: true, size: "8" }}
        position="absolute"
        bottom="0"
        left="0"
        fillWidth
        zIndex={1}
        style={{ height: "30%" }}
      />

      <Column position="absolute" bottom="0" left="0" fillWidth padding="16" zIndex={2}>
        {designer.cardQuote ? (
          <Text
            as="blockquote"
            variant="heading-default-s"
            onBackground="neutral-strong"
            wrap="balance"
            style={{
              fontStyle: "italic",
              // Limita a 3 líneas para que la cita quede contenida dentro de
              // la franja del Fade, incluso con el máximo de 180 caracteres.
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            “{designer.cardQuote}”
          </Text>
        ) : (
          <Text variant="label-default-s" onBackground="neutral-weak">
            {designer.name || "Diseñador de la plataforma"}
          </Text>
        )}
      </Column>
    </Column>
  );
}

function DesignerBack({
  designer,
  onFlipBack,
}: {
  designer: Designer;
  onFlipBack: () => void;
}) {
  const router = useRouter();

  // El tap/click en el cuerpo del reverso navega al perfil; stopPropagation
  // evita que el mismo click burbujee hasta el onClick de FlipFx y vuelva a
  // voltear la tarjeta justo cuando estamos navegando.
  const goToProfile = (event: MouseEvent) => {
    event.stopPropagation();
    router.push(designer.projectHref);
  };

  // La flecha SOLO regresa al frente: nunca debe navegar ni dejar que el
  // click llegue al onClick del contenedor (goToProfile) ni al de FlipFx.
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
      overflow="auto"
      cursor="interactive"
      onClick={goToProfile}
    >
      {/* Decoración de fondo, detrás de todo: patrón de puntos con un
          spotlight circular estático (mask), solo tokens globales, sin
          interceptar clicks. */}
      <Background
        position="absolute"
        top="0"
        left="0"
        fill
        pointerEvents="none"
        dots={{ display: true }}
        mask={{ x: 50, y: 30, radius: 18 }}
      />

      {/* Mismo Fade con patrón de puntos que el frente, decorativo, debajo
          del contenido (zIndex 1 < 2) para que nunca lo tape. */}
      <Fade
        to="top"
        base="page"
        pattern={{ display: true, size: "8" }}
        position="absolute"
        bottom="0"
        left="0"
        fillWidth
        pointerEvents="none"
        zIndex={1}
        style={{ height: "30%" }}
      />

      {/* Contenido directamente visible al voltear, sin efecto de revelado. */}
      <Column fillWidth fillHeight padding="24" gap="12" center zIndex={2}>
        <Avatar {...avatarProps} size="l" />
        <Column gap="4" horizontal="center" align="center">
          <Text variant="heading-strong-s" onBackground="neutral-strong" align="center">
            {designer.name}
          </Text>
          <Text variant="label-default-s" onBackground="neutral-medium" align="center">
            {designer.headline}
          </Text>
        </Column>
        {(designer.primaryRole || designer.secondaryRoles.length > 0) && (
          <Row gap="8" wrap horizontal="center" vertical="center">
            {designer.primaryRole && (
              <Badge
                background="brand-alpha-weak"
                onBackground="brand-strong"
                border="brand-alpha-medium"
                textVariant="label-strong-s"
                effect
              >
                {designer.primaryRole}
              </Badge>
            )}
            {designer.secondaryRoles.map((role) => (
              <Badge
                key={role}
                background="neutral-alpha-weak"
                onBackground="neutral-medium"
                border="neutral-alpha-medium"
                textVariant="label-default-s"
                effect={false}
              >
                {role}
              </Badge>
            ))}
          </Row>
        )}
        {designer.bio && (
          <Text variant="body-default-s" onBackground="neutral-weak" align="center" wrap="balance">
            {designer.bio}
          </Text>
        )}
        <Button
          href={designer.projectHref}
          variant="secondary"
          size="s"
          suffixIcon="arrowUpRight"
          onClick={(event: MouseEvent) => event.stopPropagation()}
        >
          Ver perfil
        </Button>
      </Column>

      {/* Flecha para des-voltear sin navegar; siempre visible, esquina superior
          derecha, por encima de todo lo demás. Va dentro de un Flex absoluto
          propio: con `tooltip`, IconButton se envuelve en un wrapper relative
          y un absolute en su `style` se anclaría a ese wrapper (que fluye al
          fondo de la columna), no a la tarjeta. */}
      <Flex position="absolute" top="12" right="12" zIndex={3}>
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
    <TiltFx fillWidth radius="l">
      <FlipFx
        fillWidth
        radius="l"
        className={styles.flipCard}
        flipped={flipped}
        onFlip={setFlipped}
        front={<DesignerFront designer={designer} seed={seed} />}
        back={<DesignerBack designer={designer} onFlipBack={() => setFlipped(false)} />}
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
