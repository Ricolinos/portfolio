import { Column, Heading, Text } from "@once-ui-system/core";

export default function CollaboratorDashboardPage() {
  return (
    <Column fillWidth paddingY="128" horizontal="center" gap="l" maxWidth="m">
      <Heading variant="display-strong-s">Panel de Colaborador</Heading>
      <Text variant="body-default-l" onBackground="neutral-weak">
        Bienvenido a tu panel. Aquí podrás ver y gestionar los proyectos en los que colaboras.
      </Text>
    </Column>
  );
}
