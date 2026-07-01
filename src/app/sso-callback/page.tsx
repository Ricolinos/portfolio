import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { Column, Text } from "@once-ui-system/core";

export default function SSOCallbackPage() {
  return (
    <Column fillWidth paddingY="128" horizontal="center" gap="16">
      <Text variant="body-default-m" onBackground="neutral-weak">
        Completando el inicio de sesión…
      </Text>
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
      />
    </Column>
  );
}
