"use client";

import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  BlobFx,
  Button,
  Column,
  Fade,
  FlipFx,
  Grid,
  Heading,
  HoloFx,
  InfiniteScroll,
  Media,
  RevealFx,
  Text,
  TiltFx,
} from "@once-ui-system/core";
import { ALL_SPECIALTIES, useExploreSearch } from "./SearchContext";

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
};

// Proporción vertical fija de la tarjeta (frente y reverso miden lo mismo:
// FlipFx ajusta su alto al mayor de los dos, así que ambas caras comparten
// este aspect ratio para no "saltar" al voltear).
const CARD_ASPECT = "3 / 4";

function DesignerFront({ designer, seed }: { designer: Designer; seed: number }) {
  const imageSrc = designer.featuredImageUrl || designer.avatar || null;

  return (
    <Column
      fillWidth
      aspectRatio={CARD_ASPECT}
      radius="l"
      overflow="hidden"
      background="neutral-alpha-weak"
      style={{ alignSelf: "flex-start" }}
    >
      {imageSrc ? (
        // HoloFx es el wrapper absoluto full-bleed (evita romper el aspect
        // ratio + alignSelf de la Column padre); la Media queda dentro, sin
        // posicionarse ella misma, rellenando el "base" de HoloFx al 100%.
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

function DesignerBack({ designer }: { designer: Designer }) {
  const router = useRouter();

  // El tap/click en el reverso navega al perfil; stopPropagation evita que
  // el mismo click burbujee hasta el onClick de FlipFx y vuelva a voltear.
  const goToProfile = (event: MouseEvent) => {
    event.stopPropagation();
    router.push(designer.projectHref);
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
      padding="24"
      gap="12"
      horizontal="center"
      align="center"
      vertical="center"
      overflow="auto"
      cursor="interactive"
      onClick={goToProfile}
    >
      <Avatar {...avatarProps} size="l" />
      <Column gap="4" horizontal="center" align="center">
        <Text variant="heading-strong-s" onBackground="neutral-strong" align="center">
          {designer.name}
        </Text>
        <Text variant="label-default-s" onBackground="neutral-medium" align="center">
          {designer.headline}
        </Text>
      </Column>
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
  );
}

// TiltFx se autodesactiva en dispositivos táctiles (detecta "ontouchstart" y
// no aplica el efecto), así que convive sin estorbar con el tap-to-flip.
function DesignerCard({ designer, seed }: { designer: Designer; seed: number }) {
  return (
    <TiltFx fillWidth radius="l">
      <FlipFx
        fillWidth
        aspectRatio={CARD_ASPECT}
        radius="l"
        front={<DesignerFront designer={designer} seed={seed} />}
        back={<DesignerBack designer={designer} />}
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
