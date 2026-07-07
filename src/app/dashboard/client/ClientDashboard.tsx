"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Column,
  Grid,
  Heading,
  Icon,
  Input,
  Row,
  Text,
} from "@once-ui-system/core";

interface FormState {
  empresa: string;
  sitio: string;
  industria: string;
}

interface ClientDashboardProps {
  activeProjects: number;
  pendingQuotes: number;
}

export default function ClientDashboard({ activeProjects, pendingQuotes }: ClientDashboardProps) {
  const { isLoaded, user } = useUser();
  const [form, setForm] = useState<FormState>({ empresa: "", sitio: "", industria: "" });

  const metrics = [
    { label: "Proyectos Activos",       value: String(activeProjects), icon: "briefcase" },
    { label: "Cotizaciones Pendientes", value: String(pendingQuotes),  icon: "document"  },
    // Sin modelo de mensajes en el schema aún; se deja fijo en 0.
    { label: "Mensajes",                value: "0",                    icon: "email"     },
  ] as const;

  const displayName = isLoaded && user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "Usuario"
    : "";
  const email  = isLoaded && user ? (user.emailAddresses[0]?.emailAddress ?? "") : "";
  const initials = (displayName[0] ?? "U").toUpperCase();
  const avatarProps = isLoaded && user?.imageUrl
    ? { src: user.imageUrl }
    : { value: initials };

  return (
    <Column fillWidth paddingY="80" paddingX="24" gap="24" maxWidth="l" horizontal="center">

      {/* ── Cabecera de identidad ────────────────────────────────────────────── */}
      <Card fillWidth padding="32">
        <Row gap="24" vertical="center" wrap>
          <Avatar {...avatarProps} size="xl" />
          <Column gap="8">
            <Heading variant="heading-strong-l">
              {isLoaded ? displayName : "—"}
            </Heading>
            <Text onBackground="neutral-weak" variant="body-default-m">
              {email}
            </Text>
            <Badge title="Cliente" />
          </Column>
        </Row>
      </Card>

      {/* ── Contenido principal: 2 col en desktop, 1 en mobile ───────────────── */}
      <Grid columns="2" s={{ columns: 1 }} fillWidth gap="24">

        {/* Columna izquierda: formulario de empresa ───────────────────────── */}
        <Card fillWidth padding="32">
          <Column gap="24">
            <Column gap="4">
              <Heading variant="heading-strong-m">Empresa & Contacto</Heading>
              <Text variant="body-default-s" onBackground="neutral-weak">
                Información asociada a tu perfil de cliente.
              </Text>
            </Column>

            <Column gap="16">
              <Input
                id="empresa"
                label="Nombre de la Empresa"
                placeholder="Ej: Acme Corp"
                value={form.empresa}
                onChange={(e) => setForm((f) => ({ ...f, empresa: e.target.value }))}
              />
              <Input
                id="sitio"
                label="Sitio Web (Opcional)"
                placeholder="https://ejemplo.com"
                value={form.sitio}
                onChange={(e) => setForm((f) => ({ ...f, sitio: e.target.value }))}
              />
              <Input
                id="industria"
                label="Industria / Sector"
                placeholder="Ej: Tecnología, Salud, Educación…"
                value={form.industria}
                onChange={(e) => setForm((f) => ({ ...f, industria: e.target.value }))}
              />
            </Column>

            <Button variant="primary" size="m">Guardar Cambios</Button>
          </Column>
        </Card>

        {/* Columna derecha: tarjetas de métricas ──────────────────────────── */}
        <Column gap="16" fillWidth>
          {metrics.map(({ label, value, icon }) => (
            <Card key={label} fillWidth padding="24">
              <Column gap="12">
                <Row gap="8" vertical="center">
                  <Icon name={icon} size="s" onBackground="neutral-weak" />
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    {label}
                  </Text>
                </Row>
                <Heading variant="display-strong-m">{value}</Heading>
              </Column>
            </Card>
          ))}
        </Column>

      </Grid>
    </Column>
  );
}
