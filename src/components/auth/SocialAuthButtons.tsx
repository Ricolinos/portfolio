"use client";

import { Button, Column, Line, Row, Text } from "@once-ui-system/core";

export type OAuthProviderStrategy = "oauth_google" | "oauth_facebook";

const PROVIDERS: { strategy: OAuthProviderStrategy; label: string; icon: "google" | "facebook" }[] = [
  { strategy: "oauth_google", label: "Google", icon: "google" },
  { strategy: "oauth_facebook", label: "Facebook", icon: "facebook" },
];

interface SocialAuthButtonsProps {
  onSelect: (strategy: OAuthProviderStrategy) => void;
  loading?: boolean;
  /** Deshabilita los botones mientras Clerk aún no carga (el clic se perdería en silencio) */
  disabled?: boolean;
  /** Proveedor con redirección en curso: muestra spinner en su botón */
  pending?: OAuthProviderStrategy | null;
}

export function SocialAuthButtons({
  onSelect,
  loading = false,
  disabled = false,
  pending = null,
}: SocialAuthButtonsProps) {
  return (
    <Column fillWidth gap="m">
      <Column fillWidth gap="8">
        {PROVIDERS.map(({ strategy, label, icon }) => (
          <Button
            key={strategy}
            type="button"
            variant="secondary"
            fillWidth
            prefixIcon={icon}
            loading={pending === strategy}
            disabled={disabled || loading || (pending !== null && pending !== strategy)}
            onClick={() => onSelect(strategy)}
          >
            Continuar con {label}
          </Button>
        ))}
      </Column>
      <Row fillWidth vertical="center" gap="12">
        <Line background="neutral-alpha-medium" style={{ flex: 1 }} />
        <Text variant="label-default-s" onBackground="neutral-weak">
          o
        </Text>
        <Line background="neutral-alpha-medium" style={{ flex: 1 }} />
      </Row>
    </Column>
  );
}
