"use client";

import { useMemo, useState } from "react";
import { Avatar, Button, Card, Column, Grid, Media, RevealFx, Row, SmartLink, Tag, Text, TiltFx } from "@once-ui-system/core";
import { useExploreSearch } from "./SearchContext";

const ALL = "Todos";

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

  return (
    <TiltFx fillWidth radius="l">
      <Card fillWidth direction="column" radius="l" border="neutral-alpha-weak" background="neutral-alpha-weak">
        <Row fillWidth horizontal="between" vertical="center" paddingX="20" paddingY="16" gap="12">
          <Row gap="12" vertical="center" minWidth={0}>
            <Avatar {...avatarProps} size="m" />
            <Text variant="label-strong-m" onBackground="neutral-strong" truncate>
              {shout.author}
            </Text>
          </Row>
          <Tag size="s" variant="brand" label={shout.category} style={{ flexShrink: 0 }} />
        </Row>

        <Column fillWidth paddingX="20" gap="16">
          <Text variant="body-default-m" onBackground="neutral-weak">
            {shout.description}
          </Text>
          {/* La imagen enlaza al caso de estudio; el like queda fuera del link */}
          {shout.href ? (
            <SmartLink unstyled fillWidth href={shout.href}>
              <Media
                src={shout.image}
                alt={shout.description}
                radius="m"
                aspectRatio="16 / 9"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </SmartLink>
          ) : (
            <Media
              src={shout.image}
              alt={shout.description}
              radius="m"
              aspectRatio="16 / 9"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
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

  return (
    <RevealFx key={selected} fillWidth direction="column" gap="24" translateY="8" speed="fast">
      {filtered.length === 0 ? (
        <Text onBackground="neutral-weak" variant="body-default-m">
          No encontramos publicaciones que coincidan con tu búsqueda.
        </Text>
      ) : (
        <Grid columns="2" s={{ columns: 1 }} gap="24" fillWidth>
          {filtered.map((shout) => (
            <ShoutCard key={shout.id} shout={shout} />
          ))}
        </Grid>
      )}
    </RevealFx>
  );
}
