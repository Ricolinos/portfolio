import { Column, Heading, RevealFx, Text } from "@once-ui-system/core";
import { Cotizador } from "@/components/servicios/Cotizador";

export const metadata = {
  title: "Cotiza tu proyecto",
  description: "Calcula una estimación al instante para tu proyecto de diseño, ilustración o animación.",
};

export default function CotizadorPage() {
  return (
    <Column fillWidth maxWidth="l" paddingY="80" paddingX="24" gap="48" horizontal="center">
      <RevealFx fillWidth translateY="8" horizontal="center">
        <Column fillWidth gap="16" horizontal="center" align="center" maxWidth="s">
          <Heading variant="display-strong-l" align="center">
            Cotiza tu proyecto
          </Heading>
          <Text onBackground="neutral-weak" variant="body-default-l" align="center">
            Diseño gráfico, ilustración digital o animación: configura tu proyecto y obtén una
            estimación al instante, sin tablas ni letras chiquitas.
          </Text>
        </Column>
      </RevealFx>

      <RevealFx fillWidth translateY="8" delay={0.1}>
        <Cotizador />
      </RevealFx>
    </Column>
  );
}
