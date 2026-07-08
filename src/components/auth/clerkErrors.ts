const MESSAGES: Record<string, string> = {
  form_identifier_exists: "Ya existe una cuenta con ese correo o nombre de usuario.",
  form_username_invalid_length: "El nombre de usuario debe tener entre 4 y 64 caracteres.",
  form_username_invalid_character: "El nombre de usuario solo puede tener letras, números, guiones y guiones bajos.",
  form_password_pwned: "Esa contraseña apareció en filtraciones de datos. Usa una diferente.",
  form_password_length_too_short: "La contraseña es demasiado corta (mínimo 8 caracteres).",
  form_password_not_strong_enough: "La contraseña es demasiado débil. Combina letras, números y símbolos.",
  form_param_format_invalid: "Revisa el formato de los campos marcados.",
  form_identifier_not_found: "No encontramos una cuenta con esos datos.",
  form_password_incorrect: "Contraseña incorrecta.",
  form_code_incorrect: "Código incorrecto.",
  verification_expired: "El código expiró. Solicita uno nuevo.",
  session_exists: "Ya tienes una sesión activa. Recarga la página.",
  captcha_invalid:
    "No pudimos verificar que no eres un robot. Recarga la página e inténtalo de nuevo.",
  captcha_missing_token:
    "No pudimos verificar que no eres un robot. Recarga la página e inténtalo de nuevo.",
  captcha_unavailable:
    "La verificación anti-bots no pudo cargarse. Desactiva bloqueadores de anuncios e inténtalo de nuevo.",
  too_many_requests: "Demasiados intentos. Espera un momento y vuelve a intentarlo.",
};

export function translateClerkError(err: unknown, fallback: string): string {
  const first = (err as { errors?: { code?: string; longMessage?: string; message?: string }[] })
    ?.errors?.[0];
  if (!first) return fallback;
  return MESSAGES[first.code ?? ""] || first.longMessage || first.message || fallback;
}
