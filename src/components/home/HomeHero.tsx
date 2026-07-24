"use client";

import { Button, Column, Fade, Heading, Icon, LetterFx, RevealFx, Row, SmartLink, Text } from "@once-ui-system/core";
import { home } from "@/resources";
import { BoomerangVideoBackground } from "./BoomerangVideoBackground";

export function HomeHero() {
  return (
    <Column fillWidth overflow="hidden" style={{ minHeight: "80vh" }}>
      <BoomerangVideoBackground src="/videos/hero-boomerang.mp4" />
      <Fade
        position="absolute"
        bottom="0"
        left="0"
        fillWidth
        to="top"
        height={40}
        base="page"
        pointerEvents="none"
      />

      {/* Texto repartido a los lados: el centro (donde corre el video) queda
          libre para que la escena se lea sin texto encima. */}
      <Row
        zIndex={1}
        fillWidth
        fillHeight
        horizontal="between"
        wrap
        gap="40"
        paddingTop="80"
        paddingBottom="128"
        paddingX="40"
        s={{ direction: "column" }}
      >
        <RevealFx translateY="12" maxWidth={30}>
          <Column gap="16" horizontal="start">
            <Row gap="8" vertical="center">
              <Icon name="sparkle" onSolid="neutral-strong" size="s" />
              <Text variant="label-default-s" onSolid="neutral-strong">
                Hub-Nerds
              </Text>
            </Row>
            <Heading variant="display-strong-l" align="start" wrap="balance" onSolid="neutral-strong">
              Donde el talento creativo{" "}
              <LetterFx trigger="instant" speed="medium">
                se encuentra con quien lo necesita
              </LetterFx>
            </Heading>
          </Column>
        </RevealFx>

        <RevealFx delay={0.15} translateY="12" maxWidth={22}>
          <Column gap="20" horizontal="start" paddingTop="8">
            <Text variant="body-default-m" onSolid="neutral-weak" wrap="balance">
              {home.description}
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
      </Row>
    </Column>
  );
}
