"use client";

import { useUser } from "@clerk/nextjs";
import { IconButton, Row } from "@once-ui-system/core";
import { usePathname, useRouter } from "next/navigation";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LightMessenger } from "@/components/messages/LightMessenger";

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

// Tamaño del panel "Mensajes Light" en desktop; en móvil (<MOBILE_BREAKPOINT)
// el ancho se recalcula casi a pantalla completa con márgenes.
const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 480;
const MOBILE_BREAKPOINT = 480;
// Radio de la burbuja cerrada (círculo completo) vs. el panel abierto
// (equivalente al token Once UI radius="l" ~ 1rem, en px porque se anima
// junto con width/height vía inline style).
const BUBBLE_RADIUS = 9999;
const PANEL_RADIUS = 16;
// Fade-in del contenido tras el morph de apertura (evita texto aplastado
// durante la transición de tamaño); en cierre el contenido se desvanece
// primero y luego colapsa la forma.
const CONTENT_FADE_IN_MS = 260;
const CONTENT_FADE_OUT_MS = 140;

type Side = "left" | "right";

interface PanelRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

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

// Rectángulo del panel morphed, anclado al costado de reposo de la burbuja
// (crece hacia el lado contrario para no salirse del viewport) y hacia
// arriba desde la burbuja (bottom del panel ~= bottom de la burbuja). Ambos
// ejes se clampean contra el viewport real: si no hay espacio arriba, el
// panel queda ajustado al borde superior (debajo del header) en vez de
// desbordarse; en móvil el ancho es casi el del viewport completo.
function computePanelRect(pos: StoredPos): PanelRect {
  const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  const width = isMobile ? window.innerWidth - EDGE_MARGIN * 2 : PANEL_WIDTH;
  const headerBottom = getHeaderBottom();
  const maxHeight = window.innerHeight - headerBottom - EDGE_MARGIN * 2;
  const height = Math.min(PANEL_HEIGHT, Math.max(maxHeight, BUBBLE_SIZE));

  const bubbleLeft = restingLeft(pos.side);
  const rawLeft = pos.side === "left" ? bubbleLeft : bubbleLeft + BUBBLE_SIZE - width;
  const left = Math.min(Math.max(rawLeft, EDGE_MARGIN), window.innerWidth - width - EDGE_MARGIN);

  const minTop = headerBottom + EDGE_MARGIN;
  const maxTop = window.innerHeight - height - EDGE_MARGIN;
  const rawTop = pos.y + BUBBLE_SIZE - height;
  const top = Math.min(Math.max(rawTop, minTop), Math.max(minTop, maxTop));

  return { left, top, width, height };
}

/**
 * Burbuja flotante de mensajes, global al sitio pero solo para sesiones
 * autenticadas (Clerk) — visitantes anónimos nunca la montan. Se puede
 * arrastrar con Pointer Events; al soltar, se imanta con una transición
 * elástica al costado izquierdo o derecho más cercano y recuerda su
 * posición. Un click/tap (sin arrastre) hace un morph in-place hacia un
 * panel de "Mensajes Light" (LightMessenger) anclado a ese costado; el
 * botón "expandir" del panel navega a /mensajes.
 */
export const FloatingChatBubble = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [pos, setPos] = useState<StoredPos | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef<{ offsetX: number; offsetY: number; moved: boolean } | null>(null);
  const [open, setOpen] = useState(false);
  const [panelRect, setPanelRect] = useState<PanelRect | null>(null);
  const [contentVisible, setContentVisible] = useState(false);
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

  // Mientras el panel está abierto la burbuja no se arrastra: el pointerdown
  // se ignora por completo (se restaura al cerrar, `pos` sigue intacto).
  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pos || open) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      const rect = event.currentTarget.getBoundingClientRect();
      dragState.current = {
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        moved: false,
      };
      setDragPos({ x: rect.left, y: rect.top });
    },
    [pos, open],
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

  // Abre el morph in-place (círculo -> panel), anclado al costado de reposo
  // actual de la burbuja.
  const handleBubbleActivate = useCallback(() => {
    if (!pos) return;
    setPanelRect(computePanelRect(pos));
    setOpen(true);
  }, [pos]);

  // Cierra el morph (X del panel): el contenido se desvanece primero
  // (CONTENT_FADE_OUT_MS) y solo después colapsa la forma de vuelta a
  // burbuja, para no ver el panel encogerse con texto todavía dentro.
  const handleClose = useCallback(() => {
    setContentVisible(false);
    window.setTimeout(() => setOpen(false), CONTENT_FADE_OUT_MS);
  }, []);

  // Expandir a /mensajes: el morph se queda en tamaño panel (no anima a
  // pantalla completa) — /mensajes se abre como modal (@modal/(.)mensajes)
  // que ya hace su propia entrada a (casi) pantalla completa; encadenar
  // ambas animaciones (bubble -> pantalla completa -> modal) se sentía
  // redundante y con un salto de geometría, porque el modal cubre todo el
  // viewport mientras el expand-rect del bubble dejaba hueco bajo el header.
  // Solo se desvanece el contenido (mismo patrón que handleClose) y se
  // navega; el reset de `open`/`panelRect` al aterrizar en /mensajes lo hace
  // el efecto sobre `pathname` de más abajo.
  const handleExpand = useCallback(() => {
    setContentVisible(false);
    window.setTimeout(() => router.push("/mensajes"), CONTENT_FADE_OUT_MS);
  }, [router]);

  // Fade-in del contenido del panel una vez que el morph de apertura ya
  // avanzó lo suficiente (evita texto/lista aplastados a mitad de la
  // transición de tamaño).
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => setContentVisible(true), CONTENT_FADE_IN_MS);
    return () => window.clearTimeout(id);
  }, [open]);

  // Recalcula el anclaje/clamp del panel si el viewport cambia mientras está abierto.
  useEffect(() => {
    if (!open || !pos) return;
    const onResize = () => setPanelRect(computePanelRect(pos));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, pos]);

  // El componente sigue montado dentro de /mensajes (solo deja de renderizar
  // por el gate de más abajo), así que conserva open/panelRect/contentVisible
  // del morph de expansión. Sin este reset, al volver a cualquier otra
  // página reaparecería ya "montado" como el panel a pantalla completa en
  // vez de renacer como burbuja en reposo.
  useEffect(() => {
    const inMensajes = pathname === "/mensajes" || pathname?.startsWith("/mensajes/");
    if (!inMensajes) return;
    setOpen(false);
    setContentVisible(false);
    setPanelRect(null);
  }, [pathname]);

  // Solo sesiones Clerk válidas montan la burbuja; visitantes anónimos nunca la ven.
  // Dentro de /mensajes (o cualquier subruta) la burbuja es redundante: ya se está
  // en el centro de mensajes al que ella misma navega.
  const onMensajes = pathname === "/mensajes" || pathname?.startsWith("/mensajes/");
  if (!isLoaded || !isSignedIn || !pos || onMensajes) return null;

  const dragging = dragPos !== null;
  const rect = open && panelRect ? panelRect : null;
  const restingStyle: CSSProperties = dragging
    ? { left: dragPos.x, top: dragPos.y }
    : { left: restingLeft(pos.side), top: pos.y };
  const shapeStyle: CSSProperties = rect
    ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    : { ...restingStyle, width: BUBBLE_SIZE, height: BUBBLE_SIZE };

  // Imantación elástica al soltar: cubic-bezier con leve overshoot (back-out)
  // en vez de ease lineal, para que el "snap" a los bordes se sienta con
  // resorte en lugar de un desplazamiento plano.
  const ELASTIC_EASE = "cubic-bezier(0.34, 1.56, 0.64, 1)";
  // Easing del morph de tamaño: expo-out sin overshoot (menos "rebotón" que
  // ELASTIC_EASE) — el resorte se siente bien en un punto que se imanta,
  // pero se ve raro en un panel que cambia de forma.
  const SIZE_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

  return (
    <Row
      position="fixed"
      zIndex={8}
      shadow={open ? "xl" : "l"}
      background={open ? "surface" : undefined}
      border={open ? "neutral-alpha-weak" : undefined}
      style={{
        ...shapeStyle,
        borderRadius: rect ? PANEL_RADIUS : BUBBLE_RADIUS,
        overflow: open ? "hidden" : undefined,
        touchAction: open ? "auto" : "none",
        cursor: open ? "default" : dragging ? "grabbing" : "grab",
        transition: dragging
          ? "none"
          : [
              `left 0.42s ${ELASTIC_EASE}`,
              `top 0.32s ${ELASTIC_EASE}`,
              `width 0.4s ${SIZE_EASE}`,
              `height 0.4s ${SIZE_EASE}`,
              `border-radius 0.4s ${SIZE_EASE}`,
            ].join(", "),
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={() => {
        // Con el pointer capturado sobre este Row, el click sintético (tanto de
        // mouse/touch como el generado por activación de teclado del IconButton,
        // que burbujea hasta aquí) siempre se dispara sobre el Row — nunca sobre
        // el IconButton interno. Abrir el morph aquí, no en el IconButton.
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        if (!open) handleBubbleActivate();
      }}
    >
      {open ? (
        <Row
          fill
          style={{
            opacity: contentVisible ? 1 : 0,
            transition: `opacity ${contentVisible ? CONTENT_FADE_IN_MS : CONTENT_FADE_OUT_MS}ms ease`,
          }}
        >
          <LightMessenger viewerId={user?.id ?? ""} onExpand={handleExpand} onClose={handleClose} />
        </Row>
      ) : (
        <IconButton
          icon="chat"
          size="l"
          variant="primary"
          rounded
          aria-label="Mensajes"
          tooltip="Mensajes"
        />
      )}
    </Row>
  );
};
