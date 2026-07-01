"use client";

import { useState, type FormEvent } from "react";
import { useSignUp } from "@clerk/nextjs/legacy";
import { Column, Row, Input, Button, Text, ToggleButton } from "@once-ui-system/core";
import { SocialAuthButtons, type OAuthProviderStrategy } from "./SocialAuthButtons";

type Role = "client" | "collaborator";
type Step = "register" | "verify";

interface SignUpFormProps {
  onSuccess?: () => void;
  onSwitchToSignIn?: () => void;
}

export function SignUpForm({ onSuccess, onSwitchToSignIn }: SignUpFormProps) {
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

  const handleRegister = async (e: FormEvent) => {
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

  const handleOAuth = async (strategy: OAuthProviderStrategy) => {
    if (!isLoaded) return;
    setErrorMsg("");

    try {
      await signUp.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      });
    } catch (err: any) {
      setErrorMsg(err.errors?.[0]?.message || "No se pudo continuar con este proveedor");
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        onSuccess?.();
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setErrorMsg(err.errors?.[0]?.message || "Código incorrecto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Column fillWidth gap="l">
      <Text variant="body-default-m" onBackground="neutral-weak">
        {step === "register"
          ? "Completa tus datos para registrarte."
          : `Ingresa el código enviado a ${email}.`}
      </Text>

      {step === "register" && <SocialAuthButtons onSelect={handleOAuth} loading={loading} />}

      {step === "register" ? (
        <form onSubmit={handleRegister} style={{ width: "100%" }}>
          <Column gap="m">
            <Row gap="m">
              <Input
                id="signup-firstName"
                label="Nombre"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <Input
                id="signup-lastName"
                label="Apellido"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </Row>

            <Input
              id="signup-email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              id="signup-password"
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
              id="signup-code"
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
            {onSwitchToSignIn ? (
              <button
                type="button"
                onClick={onSwitchToSignIn}
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
                Inicia sesión
              </button>
            ) : (
              <a href="/sign-in" style={{ color: "inherit", textDecoration: "underline" }}>
                Inicia sesión
              </a>
            )}
          </Text>
        </Row>
      )}
    </Column>
  );
}
