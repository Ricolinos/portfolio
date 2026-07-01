"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Accordion, Avatar, Button, Column, Icon, Line, RevealFx, Row, SmartLink } from "@once-ui-system/core";
import { FEED_CATEGORY_SLUGS } from "./categories";

const CATEGORY_LINKS = [
  { label: "Todos", href: "/explorar" },
  ...Object.entries(FEED_CATEGORY_SLUGS).map(([slug, label]) => ({
    label,
    href: `/explorar/${slug}`,
  })),
];

// Datos ilustrativos: miembros de la comunidad Designerds.
const DESIG_NERDS = [
  { name: "Julián", avatar: "/images/projects/project-nba-cup-2025/Julian-01.jpg" },
  { name: "Rodrigo", avatar: "/images/projects/project-nba-style/Rodrigo-01.jpg" },
  { name: "Armando", avatar: "/images/projects/project-nba-cup-2025/Armando-01.png" },
  { name: "Andrés", avatar: "/images/projects/project-nba-cup-2025/Andres-01.jpg" },
  { name: "MC" },
  { name: "SG" },
];

export function Sidebar() {
  const pathname = usePathname() ?? "/explorar";
  const [categoriesOpen, setCategoriesOpen] = useState(true);

  return (
    <Column
      radius="m"
      border="neutral-alpha-medium"
      style={{ width: 260, flexShrink: 0 }}
      s={{ hide: true }}
    >
      <RevealFx fillWidth direction="column" translateY="8">
        <Accordion title="Categorías" open={categoriesOpen} onToggle={() => setCategoriesOpen((prev) => !prev)}>
          <Column gap="4" paddingTop="8">
            {CATEGORY_LINKS.map(({ label, href }) => (
              <Button
                key={href}
                href={href}
                variant={pathname === href ? "secondary" : "tertiary"}
                size="s"
                fillWidth
                horizontal="start"
              >
                {label}
              </Button>
            ))}
          </Column>
        </Accordion>
        <Line background="neutral-alpha-medium" />
        <Column>
          <SmartLink href="/explorar/designerds" unstyled style={{ width: "100%" }}>
            <Row
              fillWidth
              vertical="center"
              horizontal="between"
              paddingY="12"
              paddingX="16"
              radius="m"
              cursor="interactive"
              transition="macro-medium"
            >
              <Row fillWidth textVariant="heading-strong-s">
                Designerds
              </Row>
              <Icon name="arrowUpRightFromSquare" size="s" onBackground="neutral-weak" />
            </Row>
          </SmartLink>
          <Row wrap gap="8" paddingX="16" paddingTop="8" paddingBottom="16">
            {DESIG_NERDS.map((nerd) => (
              <Avatar key={nerd.name} src={nerd.avatar} value={!nerd.avatar ? nerd.name : undefined} size="m" />
            ))}
          </Row>
        </Column>
      </RevealFx>
    </Column>
  );
}
