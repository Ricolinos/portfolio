import { Card, Column, Heading } from "@once-ui-system/core";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <Column fillWidth paddingY="80" paddingX="24" horizontal="center">
      <Card maxWidth="xs" fillWidth radius="xl" border="neutral-alpha-weak" shadow="xl" padding="32">
        <Column fillWidth gap="l" horizontal="center">
          <Heading variant="display-strong-s" align="center">
            Crear cuenta
          </Heading>
          <SignUpForm />
        </Column>
      </Card>
    </Column>
  );
}
