"use client";

import { useSignIn } from "@clerk/nextjs/legacy";
import { useState } from "react";
import { Column, Row, Input, Button, Heading, Text } from "@once-ui-system/core";

type Step = "credentials" | "verify";

export default function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const result = await signIn.create({ identifier: email, password });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        window.location.href = "/dashboard";
        return;
      }

      if (result.status === "needs_client_trust") {
        await signIn.prepareSecondFactor({ strategy: "email_code" });
        setStep("verify");
        return;
      }

      setErrorMsg(`Error inesperado (${result.status}). Intenta de nuevo.`);
    } catch (err: any) {
      setErrorMsg(
        err?.errors?.[0]?.longMessage ||
          err?.errors?.[0]?.message ||
          "Credenciales incorrectas"
      );
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
      const result = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        window.location.href = "/dashboard";
        return;
      }

      setErrorMsg(`Error inesperado (${result.status}). Intenta de nuevo.`);
    } catch (err: any) {
      setErrorMsg(
        err?.errors?.[0]?.longMessage ||
          err?.errors?.[0]?.message ||
          "Código incorrecto"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Column fillWidth paddingY="128" horizontal="center">
      <Column maxWidth="xs" fillWidth gap="l">
        <Column gap="xs">
          <Heading variant="display-strong-s">Iniciar sesión</Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            {step === "credentials"
              ? "Accede a tu cuenta para continuar."
              : `Ingresa el código de verificación enviado a ${email}.`}
          </Text>
        </Column>

        {step === "credentials" ? (
          <form onSubmit={handleCredentials} style={{ width: "100%" }}>
            <Column gap="m">
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
              {errorMsg && (
                <Text variant="body-default-s" onBackground="danger-weak">
                  {errorMsg}
                </Text>
              )}
              <div id="clerk-captcha" />
              <Button type="submit" fillWidth loading={loading}>
                Entrar
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
                Verificar
              </Button>
              <Button
                type="button"
                variant="secondary"
                fillWidth
                onClick={() => setStep("credentials")}
              >
                Volver
              </Button>
            </Column>
          </form>
        )}

        {step === "credentials" && (
          <Row horizontal="center">
            <Text variant="body-default-s" onBackground="neutral-weak">
              ¿No tienes cuenta?{" "}
              <a href="/sign-up" style={{ color: "inherit", textDecoration: "underline" }}>
                Regístrate
              </a>
            </Text>
          </Row>
        )}
      </Column>
    </Column>
  );
}
