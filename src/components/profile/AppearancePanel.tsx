"use client";

import { Column, Row, Scroller, Text, ThemeSwitcher, useStyle } from "@once-ui-system/core";
import classNames from "classnames";
import styles from "./AppearancePanel.module.scss";

// Subconjunto del StylePanel de Once UI: solo Tema, Forma y esquemas de color
// (Brand/Accent/Neutral). setStyle persiste solo (localStorage + data-attrs).

// BorderStyle tipado del ThemeProvider (el "sharp" del StylePanel compilado no existe en el tipo)
const SHAPES = ["conservative", "playful", "rounded"] as const;
const SCHEMES = [
  "blue",
  "indigo",
  "violet",
  "magenta",
  "pink",
  "red",
  "orange",
  "yellow",
  "moss",
  "green",
  "emerald",
  "aqua",
  "cyan",
] as const;
const NEUTRALS = ["gray", "sand", "slate", "dusk", "mint", "rose"] as const;

function ColorRow({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onSelect: (color: string) => void;
}) {
  return (
    <Row
      fillWidth
      horizontal="between"
      vertical="center"
      paddingX="20"
      paddingY="12"
      gap="24"
      borderBottom="neutral-alpha-medium"
    >
      <Text variant="label-default-s" onBackground="neutral-strong" style={{ minWidth: 48 }}>
        {label}
      </Text>
      <Scroller minWidth={0} fitWidth>
        {options.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`${label}: ${color}`}
            className={classNames(styles.select, value === color && styles.selected)}
            onClick={() => onSelect(color)}
          >
            <div
              className={styles.swatch}
              style={{
                background: `var(--scheme-${color}-500)`,
                borderColor: `var(--scheme-${color}-700)`,
              }}
            />
          </button>
        ))}
      </Scroller>
    </Row>
  );
}

export function AppearancePanel() {
  const { border, brand, accent, neutral, setStyle } = useStyle();

  return (
    <Column fillWidth gap="16">
      <Column fillWidth gap="4">
        <Text variant="heading-strong-s" onBackground="neutral-strong">
          Página
        </Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          Personaliza el tema de la plataforma.
        </Text>
      </Column>
      <Column fillWidth border="neutral-alpha-medium" radius="l">
        <Row
          fillWidth
          horizontal="between"
          vertical="center"
          paddingX="20"
          paddingY="12"
          borderBottom="neutral-alpha-medium"
        >
          <Text variant="label-default-s" onBackground="neutral-strong">
            Tema
          </Text>
          <ThemeSwitcher />
        </Row>
        <Row fillWidth horizontal="between" vertical="center" paddingX="20" paddingY="12">
          <Text variant="label-default-s" onBackground="neutral-strong">
            Forma
          </Text>
          <Row gap="4">
            {SHAPES.map((radius) => (
              <span key={radius} data-border={radius}>
                <button
                  type="button"
                  aria-label={`Forma: ${radius}`}
                  className={classNames(styles.select, border === radius && styles.selected)}
                  onClick={() => setStyle({ border: radius })}
                >
                  <div className={classNames(styles.swatch, styles.neutralSwatch)} />
                </button>
              </span>
            ))}
          </Row>
        </Row>
      </Column>

      <Column fillWidth gap="4" paddingTop="8">
        <Text variant="heading-strong-s" onBackground="neutral-strong">
          Color
        </Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          Personaliza los esquemas de color.
        </Text>
      </Column>
      <Column fillWidth border="neutral-alpha-medium" radius="l">
        <ColorRow label="Marca" options={SCHEMES} value={brand} onSelect={(c) => setStyle({ brand: c as never })} />
        <ColorRow label="Acento" options={SCHEMES} value={accent} onSelect={(c) => setStyle({ accent: c as never })} />
        <Row
          fillWidth
          horizontal="between"
          vertical="center"
          paddingX="20"
          paddingY="12"
          gap="24"
        >
          <Text variant="label-default-s" onBackground="neutral-strong" style={{ minWidth: 48 }}>
            Neutro
          </Text>
          <Row gap="4">
            {NEUTRALS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Neutro: ${color}`}
                className={classNames(styles.select, neutral === color && styles.selected)}
                onClick={() => setStyle({ neutral: color as never })}
              >
                <div
                  className={styles.swatch}
                  style={{
                    background: `var(--scheme-${color}-500)`,
                    borderColor: `var(--scheme-${color}-700)`,
                  }}
                />
              </button>
            ))}
          </Row>
        </Row>
      </Column>
    </Column>
  );
}
