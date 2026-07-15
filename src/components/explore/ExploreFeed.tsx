"use client";

import type { DragEvent, MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Column,
  Grid,
  Icon,
  InfiniteScroll,
  Media,
  RevealFx,
  Row,
  SmartLink,
  Tag,
  Text,
  TiltFx,
} from "@once-ui-system/core";
import { coverKindOf, resolveCoverSrc } from "@/lib/coverMedia";
import { useExploreSearch } from "./SearchContext";

const ALL = "Todos";
// Lote de tarjetas que se agrega cada vez que el sentinel de InfiniteScroll
// entra en el viewport. No hay paginación de servidor: "filtered" ya vive
// completo en el cliente, solo se revela progresivamente.
const BATCH_SIZE = 8;

export interface Shout {
  id: string;
  author: string;
  avatar: string | null;
  category: string;
  description: string;
  image: string;
  likes: number;
  // Ruta al caso de estudio MDX (/<username>/proyecto/<slug>) cuando existe
  href?: string;
}

function ShoutCard({ shout }: { shout: Shout }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(shout.likes);
  const avatarProps = shout.avatar
    ? { src: shout.avatar }
    : { value: (shout.author[0] ?? "P").toUpperCase() };
  // La categoría puede venir como lista larga ("Branding, Motion Graphics, Graphic
  // Design"). El nombre del autor tiene prioridad: el Tag solo muestra la primera
  // categoría + un contador, con el listado completo disponible como tooltip nativo.
  const categories = shout.category.split(",").map((c) => c.trim()).filter(Boolean);
  const categoryLabel =
    categories.length > 1 ? `${categories[0]} +${categories.length - 1}` : shout.category;

  // Portada de video (URL con prefijo "video:", ver lib/coverMedia): sin
  // bucket de Storage no hay forma de extraer un primer frame como
  // thumbnail, y reproducir el video/embed de YouTube en cada tarjeta de
  // una grilla infinita sería caro (varios reproductores autoplay a la
  // vez) — se muestra un placeholder estático en vez de <Media>. GIF sí
  // llega a <Media> tal cual: es una data URL de imagen normal, se anima
  // sola en el <img> nativo que usa next/image por debajo.
  const isVideoCover = coverKindOf(shout.image) === "video";
  const coverSrc = resolveCoverSrc(shout.image);

  const cover = isVideoCover ? (
    <Column
      fillWidth
      radius="m"
      background="neutral-alpha-medium"
      horizontal="center"
      vertical="center"
      style={{ aspectRatio: "16 / 9" }}
    >
      <Icon name="video" size="l" onBackground="neutral-weak" />
    </Column>
  ) : (
    <Media
      src={coverSrc}
      alt={shout.description}
      radius="m"
      aspectRatio="16 / 9"
      sizes="(max-width: 768px) 100vw, 33vw"
      draggable={false}
      onDragStart={(event: DragEvent) => event.preventDefault()}
      onContextMenu={(event: MouseEvent) => event.preventDefault()}
    />
  );

  return (
    <TiltFx fillWidth radius="l">
      <Card fillWidth direction="column" radius="l" border="neutral-alpha-weak" background="neutral-alpha-weak">
        <Row fillWidth horizontal="between" vertical="center" paddingX="20" paddingY="16" gap="12">
          <Row gap="12" vertical="center" minWidth={0} flex={1}>
            <Avatar {...avatarProps} size="m" />
            <Text variant="label-strong-m" onBackground="neutral-strong" truncate>
              {shout.author}
            </Text>
          </Row>
          <Tag size="s" variant="brand" label={categoryLabel} title={shout.category} />
        </Row>

        <Column fillWidth paddingX="20" gap="16">
          <Text variant="body-default-m" onBackground="neutral-weak">
            {shout.description}
          </Text>
          {/* La imagen enlaza al caso de estudio; el like queda fuera del link */}
          {shout.href ? (
            <SmartLink unstyled fillWidth href={shout.href}>
              {cover}
            </SmartLink>
          ) : (
            cover
          )}
        </Column>

        <Row fillWidth horizontal="between" vertical="center" paddingX="20" paddingY="16">
          <Button
            variant="tertiary"
            size="s"
            prefixIcon="heart"
            onClick={() => {
              setLiked((prev) => !prev);
              setLikes((prev) => (liked ? prev - 1 : prev + 1));
            }}
          >
            {likes}
          </Button>
          {shout.href && (
            <SmartLink href={shout.href} suffixIcon="chevronRight">
              <Text variant="label-default-s">Ver proyecto</Text>
            </SmartLink>
          )}
        </Row>
      </Card>
    </TiltFx>
  );
}

interface ExploreFeedProps {
  initialCategory?: string;
  shouts: Shout[];
}

export function ExploreFeed({ initialCategory, shouts }: ExploreFeedProps) {
  const selected = initialCategory ?? ALL;
  const { query } = useExploreSearch();

  const filtered = useMemo(
    () =>
      shouts.filter((shout) => {
        if (selected !== ALL && shout.category !== selected) return false;
        if (query) {
          const q = query.trim().toLowerCase();
          if (!shout.author.toLowerCase().includes(q) && !shout.description.toLowerCase().includes(q)) {
            return false;
          }
        }
        return true;
      }),
    [shouts, selected, query],
  );

  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

  // Cualquier cambio de categoría o búsqueda reinicia el primer lote.
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
    <RevealFx key={selected} fillWidth direction="column" gap="24" translateY="8" speed="fast">
      {filtered.length === 0 ? (
        <Text onBackground="neutral-weak" variant="body-default-m">
          No encontramos publicaciones que coincidan con tu búsqueda.
        </Text>
      ) : (
        <Grid columns="2" s={{ columns: 1 }} gap="24" fillWidth>
          <InfiniteScroll
            items={visible}
            renderItem={(shout) => <ShoutCard key={shout.id} shout={shout} />}
            loadMore={loadMore}
            style={{ gridColumn: "1 / -1" }}
          />
        </Grid>
      )}
    </RevealFx>
  );
}
