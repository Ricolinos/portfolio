import { Column, Heading } from "@once-ui-system/core";
import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <Column fillWidth paddingY="128" horizontal="center">
      <Column maxWidth="xs" fillWidth gap="l">
        <Heading variant="display-strong-s">Iniciar sesión</Heading>
        <SignInForm />
      </Column>
    </Column>
  );
}
