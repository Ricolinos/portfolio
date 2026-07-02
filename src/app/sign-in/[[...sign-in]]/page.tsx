import { Card, Column, Heading } from "@once-ui-system/core";
import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <Column fillWidth paddingY="80" paddingX="24" horizontal="center">
      <Card maxWidth="xs" fillWidth radius="xl" border="neutral-alpha-weak" shadow="xl" padding="32">
        <Column fillWidth gap="l" horizontal="center">
          <Heading variant="display-strong-s" align="center">
            Iniciar sesión
          </Heading>
          <SignInForm />
        </Column>
      </Card>
    </Column>
  );
}
