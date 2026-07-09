"use client";

import type { MouseEvent } from "react";
import { useMemo } from "react";
import {
  Avatar,
  BlobFx,
  Button,
  Column,
  FlipFx,
  Grid,
  Heading,
  Line,
  RevealFx,
  Tag,
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
};

type Designer = {
  name: string;
  specialty: string;
  role: string;
  avatar: string;
  projectHref: string;
  projectTitle: string;
};

const CARD_MIN_HEIGHT = 18;

function DesignerFront({ designer, seed }: { designer: Designer; seed: number }) {
  return (
    <Column
      fillWidth
      minHeight={CARD_MIN_HEIGHT}
      radius="l"
      overflow="hidden"
      background="neutral-alpha-weak"
      style={{ position: "relative" }}
    >
      <BlobFx seed={seed} position="absolute" top="0" left="0" opacity={40} />
      <Column
        fillWidth
        fillHeight
        gap="12"
        padding="24"
        horizontal="center"
        align="center"
        vertical="center"
        style={{ position: "relative", zIndex: 1 }}
      >
        <Avatar src={designer.avatar} size="xl" />
        <Column gap="4" horizontal="center" align="center">
          <Text variant="heading-strong-m" onBackground="neutral-strong">
            {designer.name}
          </Text>
          <Tag size="s" variant="brand" label={designer.specialty} />
        </Column>
      </Column>
    </Column>
  );
}

function DesignerBack({ designer }: { designer: Designer }) {
  return (
    <Column
      fillWidth
      minHeight={CARD_MIN_HEIGHT}
      radius="l"
      border="neutral-alpha-weak"
      background="neutral-alpha-weak"
      padding="24"
      gap="12"
      horizontal="center"
      align="center"
      vertical="center"
      overflow="auto"
    >
      <Text variant="body-default-s" onBackground="neutral-weak" align="center">
        {designer.role}
      </Text>
      <Line background="neutral-alpha-medium" />
      <Text variant="label-default-s" onBackground="neutral-medium" align="center">
        {designer.projectTitle}
      </Text>
      <Button
        href={designer.projectHref}
        variant="secondary"
        size="s"
        suffixIcon="arrowUpRight"
        onClick={(event: MouseEvent) => event.stopPropagation()}
      >
        Ver proyecto
      </Button>
    </Column>
  );
}

function DesignerCard({ designer, seed }: { designer: Designer; seed: number }) {
  return (
    <TiltFx fillWidth radius="l">
      <FlipFx
        fillWidth
        radius="l"
        front={<DesignerFront designer={designer} seed={seed} />}
        back={<DesignerBack designer={designer} />}
      />
    </TiltFx>
  );
}

export function DesignerDirectory({ platformDesigners = [] }: { platformDesigners?: PlatformDesigner[] }) {
  const { query, specialty } = useExploreSearch();

  const designers = useMemo<Designer[]>(() => {
    return platformDesigners.map((user) => ({
      name: user.name ?? user.username ?? "Colaborador",
      specialty: "Diseñador de Marca",
      role: "Colaborador de la plataforma Designerds",
      avatar: user.imageUrl ?? "",
      projectHref: user.username ? `/${user.username}` : "/explorar",
      projectTitle: "Perfil de colaborador",
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
        <Grid columns="2" s={{ columns: 1 }} gap="24" fillWidth>
          {filtered.map((designer) => (
            <DesignerCard key={designer.name} designer={designer} seed={designers.indexOf(designer)} />
          ))}
        </Grid>
      )}
    </RevealFx>
  );
}
