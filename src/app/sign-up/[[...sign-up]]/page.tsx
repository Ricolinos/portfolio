import { Column, Heading } from "@once-ui-system/core";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <Column fillWidth paddingY="128" horizontal="center">
      <Column maxWidth="xs" fillWidth gap="l">
        <Heading variant="display-strong-s">Crear cuenta</Heading>
        <SignUpForm />
      </Column>
    </Column>
  );
}
