"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Accordion, Button, Column, RevealFx } from "@once-ui-system/core";
import { RESOURCE_CATEGORY_SLUGS } from "./categories";

const CATEGORY_LINKS = [
  { label: "Todos", href: "/recursos" },
  ...Object.entries(RESOURCE_CATEGORY_SLUGS).map(([slug, label]) => ({
    label,
    href: `/recursos/${slug}`,
  })),
];

export function Sidebar() {
  const pathname = usePathname() ?? "/recursos";
  const [categoriesOpen, setCategoriesOpen] = useState(true);

  return (
    <Column radius="m" border="neutral-alpha-medium" style={{ width: 260, flexShrink: 0 }} s={{ hide: true }}>
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
      </RevealFx>
    </Column>
  );
}
