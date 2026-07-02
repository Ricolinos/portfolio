"use client";

import { useMemo, useState } from "react";
import { Avatar, Button, Card, Column, Grid, Media, RevealFx, Row, Tag, Text, TiltFx } from "@once-ui-system/core";
import { useExploreSearch } from "./SearchContext";

const ALL = "Todos";

// Datos ilustrativos: aún no existe un feed real de shouts en la plataforma.
const MOCK_SHOUTS = [
  {
    id: "shout-01",
    author: "Julián",
    avatar: "/images/projects/project-nba-cup-2025/Julian-01.jpg",
    specialty: "Animador",
    category: "Animación",
    description: "Nueva secuencia de intro animado para la NBA Cup 2025, explorando transiciones de logo en 3D.",
    image: "/images/projects/project-NBA/cover-01.png",
    likes: 128,
  },
  {
    id: "shout-02",
    author: "Rodrigo",
    avatar: "/images/projects/project-nba-style/Rodrigo-01.jpg",
    specialty: "Diseñador de Marca",
    category: "Branding",
    description: "Refresh de identidad visual para la temporada NBA 2024, con un sistema tipográfico renovado.",
    image: "/images/projects/project-Helvex/img-01.jpg",
    likes: 64,
  },
  {
    id: "shout-03",
    author: "Armando",
    avatar: "/images/projects/project-nba-cup-2025/Armando-01.png",
    specialty: "Ilustrador",
    category: "Ilustración",
    description: "Set de ilustraciones editoriales para acompañar la cobertura de la NBA Dunkmania 2024.",
    image: "/images/projects/project-01/cover-02.jpg",
    likes: 41,
  },
];

function ShoutCard({ shout }: { shout: (typeof MOCK_SHOUTS)[number] }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(shout.likes);

  return (
    <TiltFx fillWidth radius="l">
      <Card fillWidth direction="column" radius="l" border="neutral-alpha-weak" background="neutral-alpha-weak">
        <Row fillWidth horizontal="between" vertical="center" paddingX="20" paddingY="16" gap="12">
          <Row gap="12" vertical="center" minWidth={0}>
            <Avatar src={shout.avatar} size="m" />
            <Text variant="label-strong-m" onBackground="neutral-strong" truncate>
              {shout.author}
            </Text>
          </Row>
          <Tag size="s" variant="brand" label={shout.specialty} style={{ flexShrink: 0 }} />
        </Row>

        <Column fillWidth paddingX="20" gap="16">
          <Text variant="body-default-m" onBackground="neutral-weak">
            {shout.description}
          </Text>
          <Media
            src={shout.image}
            alt={shout.description}
            radius="m"
            aspectRatio="16 / 9"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
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
        </Row>
      </Card>
    </TiltFx>
  );
}

interface ExploreFeedProps {
  initialCategory?: string;
}

export function ExploreFeed({ initialCategory }: ExploreFeedProps) {
  const selected = initialCategory ?? ALL;
  const { query } = useExploreSearch();

  const filtered = useMemo(
    () =>
      MOCK_SHOUTS.filter((shout) => {
        if (selected !== ALL && shout.category !== selected) return false;
        if (query) {
          const q = query.trim().toLowerCase();
          if (!shout.author.toLowerCase().includes(q) && !shout.description.toLowerCase().includes(q)) {
            return false;
          }
        }
        return true;
      }),
    [selected, query],
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
