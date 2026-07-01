import { Card, Column, Heading, Icon, RevealFx, Row, Text } from "@once-ui-system/core";

export const metadata = {
  title: "Explorar Plataforma",
  description: "Descubre las herramientas y soluciones B2B disponibles.",
};

export default function ExplorarPage() {
  return (
    <Column fillWidth maxWidth="l" paddingY="80" paddingX="24" gap="48" horizontal="center">
      <RevealFx fillWidth translateY="8" horizontal="center">
        <Column fillWidth gap="16" horizontal="center" align="center" maxWidth="s">
          <Heading variant="display-strong-l" align="center">
            Explorar Plataforma
          </Heading>
          <Text onBackground="neutral-weak" variant="body-default-l" align="center">
            Descubre las herramientas y soluciones B2B disponibles.
          </Text>
        </Column>
      </RevealFx>

      <RevealFx fillWidth translateY="8" delay={0.1}>
        <Card fillWidth padding="48">
          <Column fillWidth gap="32" horizontal="center" align="center">
            <Row gap="24" wrap horizontal="center">
              {[
                { icon: "film",       label: "Animación"   },
                { icon: "sparkles",   label: "Branding"    },
                { icon: "paintBrush", label: "Ilustración" },
                { icon: "userGroup",  label: "Designerds"  },
              ].map(({ icon, label }) => (
                <Column key={label} gap="12" horizontal="center" align="center" padding="24"
                  style={{ minWidth: 140 }}>
                  <Icon
                    name={icon as any}
                    size="l"
                    padding="16"
                    radius="l"
                    background="neutral-alpha-weak"
                    border="neutral-alpha-weak"
                  />
                  <Text variant="label-strong-m" onBackground="neutral-strong">
                    {label}
                  </Text>
                </Column>
              ))}
            </Row>
            <Column maxWidth="xs" horizontal="center">
              <Text onBackground="neutral-weak" variant="body-default-s" align="center">
                Selecciona una categoría del menú para explorar el contenido disponible.
              </Text>
            </Column>
          </Column>
        </Card>
      </RevealFx>
    </Column>
  );
}
