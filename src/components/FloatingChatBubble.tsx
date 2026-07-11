"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { IconButton, Row } from "@once-ui-system/core";

// Ancho/alto real de IconButton size="l" (--static-space-40 = 2.5rem = 40px),
// usado para clampear la burbuja dentro del viewport.
const BUBBLE_SIZE = 40;
const EDGE_MARGIN = 16;
// Header desktop es sticky (altura variable con scroll); header móvil es fixed
// de ~48px. 64px + margen cubre ambos casos como piso de seguridad si el
// querySelector("header") todavía no midió nada (SSR/primer paint).
const HEADER_BOTTOM_FALLBACK = 64;
const DRAG_THRESHOLD = 6;
const STORAGE_KEY = "hub-chat-bubble-pos";

type Side = "left" | "right";

interface StoredPos {
  side: Side;
  y: number;
}

function isStoredPos(value: unknown): value is StoredPos {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.side === "left" || candidate.side === "right") && typeof candidate.y === "number"
  );
}

// Bottom real del header del sitio (sticky en desktop, fixed en móvil) medido
// en runtime; nunca se permite que la burbuja quede por encima de ese borde.
function getHeaderBottom(): number {
  if (typeof document === "undefined") return HEADER_BOTTOM_FALLBACK;
  const header = document.querySelector("header");
  const bottom = header?.getBoundingClientRect().bottom ?? 0;
  return bottom > 0 ? bottom : HEADER_BOTTOM_FALLBACK;
}

function clampY(y: number): number {
  const minY = getHeaderBottom() + EDGE_MARGIN;
  const maxY = window.innerHeight - BUBBLE_SIZE - EDGE_MARGIN;
  return Math.min(Math.max(y, minY), Math.max(minY, maxY));
}

function clampX(x: number): number {
  return Math.min(Math.max(x, EDGE_MARGIN), window.innerWidth - BUBBLE_SIZE - EDGE_MARGIN);
}

function defaultPos(): StoredPos {
  // Costado derecho, ~24px arriba del borde inferior del viewport.
  return { side: "right", y: clampY(window.innerHeight - BUBBLE_SIZE - EDGE_MARGIN - 24) };
}

// Coordenada `left` de reposo para cada costado. Se posiciona SIEMPRE con
// `left` (nunca alternando left/right): CSS no puede animar la transición
// entre `left: auto` y `right: Npx`, así que imantar hacia la derecha
// cambiando de propiedad se veía sin animación.
function restingLeft(side: Side): number {
  return side === "left" ? EDGE_MARGIN : window.innerWidth - BUBBLE_SIZE - EDGE_MARGIN;
}

/**
 * Burbuja flotante de mensajes, global al sitio pero solo para sesiones
 * autenticadas (Clerk) — visitantes anónimos nunca la montan. El click/tap
 * navega al centro de mensajes (/mensajes). Se puede arrastrar con Pointer
 * Events; al soltar, se imanta con una transición elástica al costado
 * izquierdo o derecho más cercano y recuerda su posición.
 */
export const FloatingChatBubble = () => {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [pos, setPos] = useState<StoredPos | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef<{ offsetX: number; offsetY: number; moved: boolean } | null>(null);
  // Tras un arrastre real, el navegador dispara igualmente el click sintético
  // sobre el botón: se suprime para que soltar la burbuja no navegue.
  const suppressClick = useRef(false);

  // Restaura la posición guardada (re-clampeada contra el viewport actual) o
  // cae a la posición por defecto si no hay nada guardado / localStorage falla.
  useEffect(() => {
    let restored: StoredPos | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (isStoredPos(parsed)) restored = parsed;
    } catch {
      // localStorage no disponible o valor corrupto: se usa la posición por defecto.
    }
    setPos(restored ? { side: restored.side, y: clampY(restored.y) } : defaultPos());
  }, []);

  // Re-clampea en resize de ventana (nunca detrás del header, nunca fuera del viewport).
  useEffect(() => {
    const onResize = () => {
      setPos((prev) => (prev ? { side: prev.side, y: clampY(prev.y) } : prev));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const persist = useCallback((next: StoredPos) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Sin persistencia disponible: la posición sigue funcionando solo en esta sesión.
    }
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pos) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      const rect = event.currentTarget.getBoundingClientRect();
      dragState.current = {
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        moved: false,
      };
      setDragPos({ x: rect.left, y: rect.top });
    },
    [pos],
  );

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragState.current;
    if (!drag) return;
    const nextX = event.clientX - drag.offsetX;
    const nextY = event.clientY - drag.offsetY;
    setDragPos((prev) => {
      if (!prev) return prev;
      if (!drag.moved) {
        const dx = nextX - prev.x;
        const dy = nextY - prev.y;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) drag.moved = true;
      }
      // Clamp vertical SIEMPRE durante el arrastre (nunca tapa el header, nunca
      // sale del viewport); horizontal libre dentro del viewport mientras arrastra.
      return { x: clampX(nextX), y: clampY(nextY) };
    });
  }, []);

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragState.current;
      const drop = dragPos;
      dragState.current = null;
      setDragPos(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (!drag || !drop) return;
      if (!drag.moved) return; // Click simple: navega (onClick), no re-snapea ni persiste.
      suppressClick.current = true;
      const side: Side = drop.x + BUBBLE_SIZE / 2 < window.innerWidth / 2 ? "left" : "right";
      const next: StoredPos = { side, y: clampY(drop.y) };
      setPos(next);
      persist(next);
    },
    [dragPos, persist],
  );

  // Solo sesiones Clerk válidas montan la burbuja; visitantes anónimos nunca la ven.
  if (!isLoaded || !isSignedIn || !pos) return null;

  const dragging = dragPos !== null;
  const sideStyle: React.CSSProperties = dragging
    ? { left: dragPos.x, top: dragPos.y }
    : { left: restingLeft(pos.side), top: pos.y };

  // Imantación elástica al soltar: cubic-bezier con leve overshoot (back-out)
  // en vez de ease lineal, para que el "snap" a los bordes se sienta con
  // resorte en lugar de un desplazamiento plano.
  const ELASTIC_EASE = "cubic-bezier(0.34, 1.56, 0.64, 1)";

  return (
    <Row
      position="fixed"
      zIndex={8}
      radius="full"
      shadow="l"
      style={{
        ...sideStyle,
        touchAction: "none",
        cursor: dragging ? "grabbing" : "grab",
        transition: dragging
          ? "none"
          : `left 0.42s ${ELASTIC_EASE}, top 0.32s ${ELASTIC_EASE}`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={() => {
        // Con el pointer capturado sobre este Row, el click sintético (tanto de
        // mouse/touch como el generado por activación de teclado del IconButton,
        // que burbujea hasta aquí) siempre se dispara sobre el Row — nunca sobre
        // el IconButton interno. Navegar aquí, no en el IconButton.
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        router.push("/mensajes");
      }}
    >
      <IconButton
        icon="chat"
        size="l"
        variant="primary"
        rounded
        aria-label="Mensajes"
        tooltip="Mensajes"
      />
    </Row>
  );
};
