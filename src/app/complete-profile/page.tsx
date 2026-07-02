"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Column, Heading, Text, Row, ToggleButton, Button } from "@once-ui-system/core";
import { setUserRole } from "@/app/actions/setRole";

type Role = "client" | "collaborator";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const handleContinue = () => {
    if (!role) return;
    setErrorMsg("");
    startTransition(async () => {
      try {
        await setUserRole(role);
        router.push("/dashboard");
      } catch {
        setErrorMsg("No se pudo guardar tu selección. Intenta de nuevo.");
      }
    });
  };

  return (
    <Column fillWidth paddingY="128" horizontal="center">
      <Column maxWidth="xs" fillWidth gap="l">
        <Column gap="xs">
          <Heading variant="display-strong-s">Completa tu perfil</Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            Cuéntanos cómo vas a usar la plataforma para personalizar tu panel.
          </Text>
        </Column>

        <Column gap="s">
          <Text variant="label-default-s" onBackground="neutral-weak">
            Selecciona tu rol
          </Text>
          <Row gap="m">
            <ToggleButton fillWidth size="l" selected={role === "client"} onClick={() => setRole("client")}>
              Cliente
            </ToggleButton>
            <ToggleButton
              fillWidth
              size="l"
              selected={role === "collaborator"}
              onClick={() => setRole("collaborator")}
            >
              Colaborador
            </ToggleButton>
          </Row>
        </Column>

        {errorMsg && (
          <Text variant="body-default-s" onBackground="danger-weak">
            {errorMsg}
          </Text>
        )}

        <Button fillWidth loading={isPending} disabled={!role} onClick={handleContinue}>
          Continuar
        </Button>
      </Column>
    </Column>
  );
}
