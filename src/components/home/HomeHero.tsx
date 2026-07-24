"use client";

import { Button, Column, Heading, Icon, LetterFx, RevealFx, Row, SmartLink, Text } from "@once-ui-system/core";
import { home } from "@/resources";
import { BoomerangVideoBackground } from "./BoomerangVideoBackground";

export function HomeHero() {
  return (
    <Column
      fillWidth
      overflow="hidden"
      radius="xl"
      border="neutral-alpha-weak"
      horizontal="center"
      style={{ minHeight: "42rem" }}
    >
      <BoomerangVideoBackground src="/videos/hero-boomerang.mp4" />

      <RevealFx translateY="12" fillWidth horizontal="center" paddingTop="64" paddingX="24">
        <Column zIndex={1} maxWidth={56} horizontal="center" align="center" gap="24">
          <Heading
            variant="display-strong-l"
            align="center"
            wrap="balance"
            onSolid="neutral-strong"
          >
            Donde el talento creativo{" "}
            <LetterFx trigger="instant" speed="medium">
              se encuentra con quien lo necesita
            </LetterFx>
          </Heading>
          <Text
            variant="body-default-l"
            onSolid="neutral-weak"
            align="center"
            wrap="balance"
            style={{ maxWidth: "34rem" }}
          >
            {home.description}
          </Text>
        </Column>
      </RevealFx>

      <RevealFx
        delay={0.15}
        translateY="12"
        zIndex={1}
        position="absolute"
        left="0"
        right="24"
        bottom="0"
        maxWidth={22}
      >
        <Column gap="12" padding="24">
          <Row gap="8" vertical="center">
            <Icon name="sparkle" onSolid="neutral-strong" size="s" />
            <Text variant="label-default-s" onSolid="neutral-strong">
              Hub-Nerds
            </Text>
          </Row>
          <Text variant="body-default-s" onSolid="neutral-weak" wrap="balance">
            Portafolios reales, sin intermediarios: encuentra al creativo indicado o el proyecto
            que buscas.
          </Text>
          <Row gap="12" wrap>
            <Button href="/explorar" size="m">
              Explorar trabajos
            </Button>
            <SmartLink href="/servicios" unstyled style={{ display: "flex", alignItems: "center" }}>
              <Text variant="label-default-m" onSolid="neutral-strong">
                Cómo funciona
              </Text>
            </SmartLink>
          </Row>
        </Column>
      </RevealFx>
    </Column>
  );
}
