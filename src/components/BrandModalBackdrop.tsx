"use client";

import { Flex } from "@once-ui-system/core";

// Capa decorativa para la prop `backdrop` del Modal de Once UI: tinte brand
// radial sobre el overlay difuminado que el propio Modal ya aplica.
export const BrandModalBackdrop = () => (
  <Flex
    position="fixed"
    aria-hidden
    style={{
      inset: 0,
      pointerEvents: "none",
      background: "radial-gradient(60% 40% at 50% 0%, var(--brand-alpha-weak), transparent)",
    }}
  />
);
