"use client";

import { useSignUp } from "@clerk/nextjs/legacy";
import { useState } from "react";
import { Column, Row, Input, Button, Heading, Text, ToggleButton } from "@once-ui-system/core";

type Role = "client" | "collaborator";
type Step = "register" | "verify";

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp();

  const [step, setStep] = useState<Step>("register");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !role) return;
    setLoading(true);
    setErrorMsg("");

    try {
      await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
        unsafeMetadata: { role },
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err: any) {
      setErrorMsg(err.errors?.[0]?.message || "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setErrorMsg(err.errors?.[0]?.message || "Código incorrecto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Column fillWidth paddingY="128" horizontal="center">
      <Column maxWidth="xs" fillWidth gap="l">
        <Column gap="xs">
          <Heading variant="display-strong-s">Crear cuenta</Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            {step === "register"
              ? "Completa tus datos para registrarte."
              : `Ingresa el código enviado a ${email}.`}
          </Text>
        </Column>

        {step === "register" ? (
          <form onSubmit={handleRegister} style={{ width: "100%" }}>
            <Column gap="m">
              <Row gap="m">
                <Input
                  id="firstName"
                  label="Nombre"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                <Input
                  id="lastName"
                  label="Apellido"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </Row>

              <Input
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                id="password"
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Column gap="s">
                <Text variant="label-default-s" onBackground="neutral-weak">
                  Selecciona tu rol
                </Text>
                <Row gap="m">
                  <ToggleButton
                    fillWidth
                    size="l"
                    selected={role === "client"}
                    onClick={() => setRole("client")}
                  >
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

              <div id="clerk-captcha" />
              <Button type="submit" fillWidth loading={loading} disabled={!role}>
                Continuar
              </Button>
            </Column>
          </form>
        ) : (
          <form onSubmit={handleVerify} style={{ width: "100%" }}>
            <Column gap="m">
              <Input
                id="code"
                label="Código de verificación"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />

              {errorMsg && (
                <Text variant="body-default-s" onBackground="danger-weak">
                  {errorMsg}
                </Text>
              )}

              <Button type="submit" fillWidth loading={loading}>
                Verificar y continuar
              </Button>

              <Button
                type="button"
                variant="secondary"
                fillWidth
                onClick={() => setStep("register")}
              >
                Volver
              </Button>
            </Column>
          </form>
        )}

        {step === "register" && (
          <Row horizontal="center">
            <Text variant="body-default-s" onBackground="neutral-weak">
              ¿Ya tienes cuenta?{" "}
              <a href="/sign-in" style={{ color: "inherit", textDecoration: "underline" }}>
                Inicia sesión
              </a>
            </Text>
          </Row>
        )}
      </Column>
    </Column>
  );
}
