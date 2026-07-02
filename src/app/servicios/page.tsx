import { Card, Column, Heading, Icon, RevealFx, Row, Text } from "@once-ui-system/core";

export const metadata = {
  title: "Nuestros Servicios",
  description: "Diseño estratégico adaptado a tus necesidades.",
};

export default function ServiciosPage() {
  return (
    <Column fillWidth maxWidth="l" paddingY="80" paddingX="24" gap="48" horizontal="center">
      <RevealFx fillWidth translateY="8" horizontal="center">
        <Column fillWidth gap="16" horizontal="center" align="center" maxWidth="s">
          <Heading variant="display-strong-l" align="center">
            Nuestros Servicios
          </Heading>
          <Text onBackground="neutral-weak" variant="body-default-l" align="center">
            Diseño estratégico adaptado a tus necesidades.
          </Text>
        </Column>
      </RevealFx>

      <RevealFx fillWidth translateY="8" delay={0.1}>
        <Card fillWidth padding="48">
          <Column fillWidth gap="32" horizontal="center" align="center">
            <Row gap="24" wrap horizontal="center">
              {[
                { icon: "rocket",     label: "Cotiza tu proyecto" },
                { icon: "infoCircle", label: "Información"        },
                { icon: "creditCard", label: "Facturación"        },
              ].map(({ icon, label }) => (
                <Column key={label} gap="12" horizontal="center" align="center" padding="24"
                  style={{ minWidth: 160 }}>
                  <Icon
                    name={icon as any}
                    size="l"
                    padding="16"
                    radius="l"
                    background="neutral-alpha-weak"
                    border="neutral-alpha-weak"
                  />
                  <Text variant="label-strong-m" onBackground="neutral-strong" align="center">
                    {label}
                  </Text>
                </Column>
              ))}
            </Row>
            <Column maxWidth="xs" horizontal="center">
              <Text onBackground="neutral-weak" variant="body-default-s" align="center">
                Explora nuestros servicios de diseño y cotiza tu proyecto desde el menú.
              </Text>
            </Column>
          </Column>
        </Card>
      </RevealFx>
    </Column>
  );
}
