import type { IconName } from "@once-ui-system/core";
import { Column, Grid, Heading, Icon, RevealFx, Row, Text } from "@once-ui-system/core";

export const metadata = {
  title: "Información",
  description: "Cómo trabajamos y qué servicios de diseño cubre el estudio.",
};

const PROCESS_STEPS: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "document",
    title: "Brief",
    description: "Nos cuentas tu proyecto, objetivos y referencias.",
  },
  {
    icon: "edit",
    title: "Propuesta",
    description: "Preparamos alcance, tiempos y una cotización a medida.",
  },
  {
    icon: "paintBrush",
    title: "Producción",
    description: "Diseñamos, iteramos contigo y afinamos cada detalle.",
  },
  {
    icon: "check",
    title: "Entrega",
    description: "Recibes los archivos finales listos para usar.",
  },
];

const SERVICES: { icon: IconName; label: string }[] = [
  { icon: "sparkles", label: "Branding" },
  { icon: "film", label: "Motion graphics" },
  { icon: "carousel", label: "Plecas" },
  { icon: "shapes", label: "Videobugs" },
  { icon: "refreshCw", label: "Wippers" },
  { icon: "paintBrush", label: "Ilustración" },
];

export default function InformacionPage() {
  return (
    <Column fillWidth maxWidth="l" paddingY="80" paddingX="24" gap="48" horizontal="center">
      <RevealFx fillWidth translateY="8" horizontal="center">
        <Column fillWidth gap="16" horizontal="center" align="center" maxWidth="s">
          <Heading variant="display-strong-l" align="center">
            Información
          </Heading>
          <Text onBackground="neutral-weak" variant="body-default-l" align="center">
            Cómo trabajamos y qué cubre el estudio, sin letras chiquitas.
          </Text>
        </Column>
      </RevealFx>

      <RevealFx fillWidth translateY="8" delay={0.1}>
        <Column fillWidth gap="24">
          <Heading variant="display-strong-xs">Cómo trabajamos</Heading>
          <Grid columns={4} m={{ columns: 2 }} s={{ columns: 1 }} gap="16" fillWidth>
            {PROCESS_STEPS.map((step) => (
              <Column
                key={step.title}
                gap="12"
                padding="24"
                background="surface"
                border="neutral-alpha-weak"
                radius="l"
              >
                <Icon
                  name={step.icon}
                  size="l"
                  padding="16"
                  radius="l"
                  background="neutral-alpha-weak"
                  border="neutral-alpha-weak"
                />
                <Text variant="label-strong-m" onBackground="neutral-strong">
                  {step.title}
                </Text>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {step.description}
                </Text>
              </Column>
            ))}
          </Grid>
        </Column>
      </RevealFx>

      <RevealFx fillWidth translateY="8" delay={0.2}>
        <Column fillWidth gap="24">
          <Heading variant="display-strong-xs">Qué cubre el estudio</Heading>
          <Row gap="16" wrap>
            {SERVICES.map((service) => (
              <Row
                key={service.label}
                gap="8"
                vertical="center"
                padding="16"
                background="surface"
                border="neutral-alpha-weak"
                radius="l"
              >
                <Icon name={service.icon} size="s" onBackground="neutral-weak" />
                <Text variant="label-default-m" onBackground="neutral-strong">
                  {service.label}
                </Text>
              </Row>
            ))}
          </Row>
        </Column>
      </RevealFx>

      <RevealFx fillWidth translateY="8" delay={0.3}>
        <Row
          fillWidth
          gap="16"
          vertical="center"
          padding="24"
          background="surface"
          border="neutral-alpha-weak"
          radius="l"
        >
          <Icon
            name="briefcase"
            size="l"
            padding="16"
            radius="l"
            background="neutral-alpha-weak"
            border="neutral-alpha-weak"
          />
          <Column gap="4">
            <Text variant="label-strong-m" onBackground="neutral-strong">
              Cobramos por proyecto
            </Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Sin tarifas por hora: cada cotización cubre el proyecto completo, de principio a fin.
            </Text>
          </Column>
        </Row>
      </RevealFx>
    </Column>
  );
}
