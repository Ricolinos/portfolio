"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ClientGrid,
  Column,
  Heading,
  Input,
  Row,
  Text,
} from "@once-ui-system/core";

interface ProfileForm {
  empresa: string;
  puesto: string;
  telefono: string;
  sitio: string;
}

export default function ClientProfilePage() {
  const { isLoaded, user } = useUser();

  const displayName = isLoaded && user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "Usuario"
    : "";
  const email = isLoaded && user ? (user.emailAddresses[0]?.emailAddress ?? "") : "";
  const initials = (displayName[0] ?? "U").toUpperCase();
  const avatarProps = isLoaded && user?.imageUrl
    ? { src: user.imageUrl }
    : { value: initials };

  const [form, setForm] = useState<ProfileForm>({
    empresa: "",
    puesto: "",
    telefono: "",
    sitio: "",
  });

  const set = (field: keyof ProfileForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <Column fillWidth paddingY="80" paddingX="24" gap="24" maxWidth="l" horizontal="center">

      {/* ── Cabecera de identidad ─────────────────────────────────────────────── */}
      <Card fillWidth padding="32">
        <Row gap="24" vertical="center" wrap>
          <Avatar {...avatarProps} size="xl" />
          <Column gap="8">
            <Heading variant="heading-strong-l">
              {isLoaded ? displayName : "—"}
            </Heading>
            <Text onBackground="neutral-weak" variant="body-default-m">
              {isLoaded ? email : "—"}
            </Text>
            <Badge title="Cliente" />
          </Column>
        </Row>
      </Card>

      {/* ── Formulario de perfil ──────────────────────────────────────────────── */}
      <ClientGrid columns="2" s={{ columns: 1 }} style={{ width: "100%", gap: "var(--static-space-24)" }}>

        {/* Campos de empresa y contacto */}
        <Card fillWidth padding="32">
          <Column gap="24">
            <Column gap="4">
              <Heading variant="heading-strong-m">Información Profesional</Heading>
              <Text variant="body-default-s" onBackground="neutral-weak">
                Datos asociados a tu cuenta de cliente.
              </Text>
            </Column>

            <Column gap="16">
              <Input
                id="empresa"
                label="Nombre de la Empresa"
                placeholder="Ej: Acme Corp"
                value={form.empresa}
                onChange={set("empresa")}
              />
              <Input
                id="puesto"
                label="Puesto / Rol"
                placeholder="Ej: Director de Marketing"
                value={form.puesto}
                onChange={set("puesto")}
              />
              <Input
                id="telefono"
                label="Teléfono de Contacto"
                placeholder="+52 55 1234 5678"
                value={form.telefono}
                onChange={set("telefono")}
              />
              <Input
                id="sitio"
                label="Sitio Web"
                placeholder="https://ejemplo.com"
                value={form.sitio}
                onChange={set("sitio")}
              />
            </Column>

            <Button variant="primary" size="m">Guardar Cambios</Button>
          </Column>
        </Card>

        {/* Columna de información de cuenta */}
        <Column gap="16" fillWidth>
          <Card fillWidth padding="32">
            <Column gap="16">
              <Heading variant="heading-strong-m">Cuenta</Heading>
              <Column gap="12">
                <Column gap="4">
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    Correo electrónico
                  </Text>
                  <Text variant="body-default-m">
                    {isLoaded ? email : "—"}
                  </Text>
                </Column>
                <Column gap="4">
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    Nombre completo
                  </Text>
                  <Text variant="body-default-m">
                    {isLoaded ? displayName : "—"}
                  </Text>
                </Column>
                <Column gap="4">
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    Rol
                  </Text>
                  <Badge title="Cliente" />
                </Column>
              </Column>
            </Column>
          </Card>
        </Column>

      </ClientGrid>
    </Column>
  );
}
