"use client";

import { useEffect, useState } from "react";

/**
 * Clerk monta el widget de Cloudflare Turnstile dentro de #clerk-captcha
 * recién cuando se llama a signUp.create(). Este hook detecta cuándo el
 * widget aparece para poder avisarle al usuario y llevarlo a la vista
 * (dentro del Modal suele quedar fuera de pantalla).
 */
export function useClerkCaptcha(active: boolean) {
  const [captchaVisible, setCaptchaVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setCaptchaVisible(false);
      return;
    }
    const el = document.getElementById("clerk-captcha");
    if (!el) return;

    const update = () => {
      const hasWidget = el.childElementCount > 0;
      setCaptchaVisible((prev) => {
        if (!prev && hasWidget) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return hasWidget;
      });
    };

    update();
    const observer = new MutationObserver(update);
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [active]);

  return captchaVisible;
}
