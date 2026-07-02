"use client";

import { useState, type FormEvent } from "react";
import { useSignIn } from "@clerk/nextjs/legacy";
import { Column, Row, Input, Button, Text } from "@once-ui-system/core";
import { SocialAuthButtons, type OAuthProviderStrategy } from "./SocialAuthButtons";

type Step = "credentials" | "verify";

interface SignInFormProps {
  onSuccess?: () => void;
  onSwitchToSignUp?: () => void;
}

export function SignInForm({ onSuccess, onSwitchToSignUp }: SignInFormProps) {
  const { isLoaded, signIn, setActive } = useSignIn();

  const [step, setStep] = useState<Step>("credentials");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCredentials = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const result = await signIn.create({ identifier, password });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        onSuccess?.();
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

  const handleOAuth = async (strategy: OAuthProviderStrategy) => {
    if (!isLoaded) return;
    setErrorMsg("");

    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      });
    } catch (err: any) {
      setErrorMsg(
        err?.errors?.[0]?.longMessage ||
          err?.errors?.[0]?.message ||
          "No se pudo iniciar sesión con este proveedor"
      );
    }
  };

  const handleVerify = async (e: FormEvent) => {
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
        onSuccess?.();
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
    <Column fillWidth gap="l">
      <Text variant="body-default-m" onBackground="neutral-weak" align="center">
        {step === "credentials"
          ? "Accede a tu cuenta para continuar."
          : "Ingresa el código de verificación enviado a tu correo."}
      </Text>

      {step === "credentials" && <SocialAuthButtons onSelect={handleOAuth} loading={loading} />}

      {step === "credentials" ? (
        <form onSubmit={handleCredentials} style={{ width: "100%" }}>
          <Column gap="m">
            <Input
              id="signin-identifier"
              label="Email o nombre de usuario"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
            <Input
              id="signin-password"
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
              id="signin-code"
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
            {onSwitchToSignUp ? (
              <button
                type="button"
                onClick={onSwitchToSignUp}
                style={{
                  color: "inherit",
                  textDecoration: "underline",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  font: "inherit",
                  padding: 0,
                }}
              >
                Regístrate
              </button>
            ) : (
              <a href="/sign-up" style={{ color: "inherit", textDecoration: "underline" }}>
                Regístrate
              </a>
            )}
          </Text>
        </Row>
      )}
    </Column>
  );
}
