import { Card, Column, Heading, Icon, RevealFx, Row, Text } from "@once-ui-system/core";

export const metadata = {
  title: "Recursos y Plantillas",
  description: "Librería de recursos para potenciar tu marca.",
};

export default function RecursosPage() {
  return (
    <Column fillWidth maxWidth="l" paddingY="80" paddingX="24" gap="48" horizontal="center">
      <RevealFx fillWidth translateY="8" horizontal="center">
        <Column fillWidth gap="16" horizontal="center" align="center" maxWidth="s">
          <Heading variant="display-strong-l" align="center">
            Recursos y Plantillas
          </Heading>
          <Text onBackground="neutral-weak" variant="body-default-l" align="center">
            Librería de recursos para potenciar tu marca.
          </Text>
        </Column>
      </RevealFx>

      <RevealFx fillWidth translateY="8" delay={0.1}>
        <Card fillWidth padding="48">
          <Column fillWidth gap="32" horizontal="center" align="center">
            <Row gap="24" wrap horizontal="center">
              {[
                { icon: "book",        label: "Introducción"          },
                { icon: "codeBracket", label: "Para Designerds"       },
                { icon: "briefcase",   label: "Proyectos por encargo" },
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
                Accede a nuestra librería completa de recursos desde el menú de navegación.
              </Text>
            </Column>
          </Column>
        </Card>
      </RevealFx>
    </Column>
  );
}
