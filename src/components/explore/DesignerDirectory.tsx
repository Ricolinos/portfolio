"use client";

import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Background,
  BlobFx,
  Column,
  Fade,
  Flex,
  FlipFx,
  Grid,
  Heading,
  HoloFx,
  IconButton,
  InfiniteScroll,
  Mask,
  MatrixFx,
  Media,
  RevealFx,
  Row,
  Text,
  TiltFx,
} from "@once-ui-system/core";
import { RoleTag } from "@/components/RoleTag";
import { ALL_SPECIALTIES, useExploreSearch } from "./SearchContext";
import styles from "./DesignerDirectory.module.scss";

// Usuarios reales de la plataforma (rol "collaborator") consultados vía Prisma en el Server Component.
export type PlatformDesigner = {
  id: string;
  name: string | null;
  username: string | null;
  imageUrl: string | null;
  featuredImageUrl: string | null;
  cardQuote: string | null;
  headline: string | null;
  bio: string | null;
  primaryRole: string | null;
  secondaryRoles: string[];
};

type Designer = {
  name: string;
  specialty: string;
  role: string;
  avatar: string;
  projectHref: string;
  projectTitle: string;
  featuredImageUrl: string | null;
  cardQuote: string | null;
  headline: string;
  bio: string | null;
  primaryRole: string | null;
  secondaryRoles: string[];
};

// La proporción vertical fija de la tarjeta (3/4) vive en
// DesignerDirectory.module.scss (.flipCard): FlipFx fija su altura por JS y
// esa clase la anula con !important, dejando que el aspect-ratio en CSS
// controle el alto de ambas caras (ver detalle en el .scss).
function DesignerFront({ designer, seed }: { designer: Designer; seed: number }) {
  const imageSrc = designer.featuredImageUrl || designer.avatar || null;

  return (
    <Column fillWidth fillHeight radius="l" overflow="hidden" background="neutral-alpha-weak">
      {imageSrc ? (
        // HoloFx es el wrapper absoluto full-bleed; la Media queda dentro,
        // sin posicionarse ella misma, rellenando el "base" de HoloFx al 100%.
        <HoloFx position="absolute" top="0" left="0" fill radius="l">
          <Media
            src={imageSrc}
            alt={designer.name}
            fill
            fillHeight
            objectFit="cover"
            sizes="(max-width: 1024px) 100vw, 33vw"
          />
        </HoloFx>
      ) : (
        <BlobFx seed={seed} position="absolute" top="0" left="0" fill fillHeight opacity={40} />
      )}

      {imageSrc && (
        // Duplicado blurreado de la MISMA imagen (mismo src) para simular el
        // blur progresivo de la base. NO se puede usar backdrop-filter aquí:
        // dentro de las caras de FlipFx (contexto 3D con perspective +
        // preserve-3d + backface-visibility hidden, capas promovidas al
        // compositor) Chromium vuelve inerte cualquier backdrop-filter de un
        // descendiente. `filter` + `mask-image` sobre contenido propio sí
        // funcionan en ese contexto, así que este layer trae su propio
        // blur(16px) recortado por un mask-image que va opaco en la base y
        // desaparece a la mitad de la tarjeta (mismos stops que el fade de
        // abajo). scale(1.1) evita el halo transparente que el blur deja en
        // los bordes de la imagen.
        <Flex
          position="absolute"
          top="0"
          left="0"
          fill
          pointerEvents="none"
          overflow="hidden"
          zIndex={1}
          style={{
            WebkitMaskImage: "linear-gradient(to top, black 0%, black 18%, transparent 50%)",
            maskImage: "linear-gradient(to top, black 0%, black 18%, transparent 50%)",
          }}
        >
          <Media
            aria-hidden
            src={imageSrc}
            alt=""
            fill
            fillHeight
            objectFit="cover"
            sizes="(max-width: 1024px) 100vw, 33vw"
            style={{ filter: "blur(16px)", transform: "scale(1.1)" }}
          />
        </Flex>
      )}

      {/* Tinte de degradado que hace legible el nombre/rol sobre la imagen:
          ancla abajo, sin patrón de puntos (pattern.display=false). El blur
          real ya lo aporta el duplicado de arriba (zIndex 1); este Fade solo
          suma color/contraste con opacity baja para dejar ver más imagen. */}
      <Fade
        to="top"
        base="page"
        pattern={{ display: false }}
        opacity={50}
        position="absolute"
        bottom="0"
        left="0"
        fillWidth
        zIndex={2}
        style={{ height: "50%" }}
      />

      <Column position="absolute" bottom="0" left="0" fillWidth padding="16" gap="4" zIndex={3}>
        <Heading variant="display-strong-xs" onBackground="neutral-strong" wrap="balance">
          {designer.name}
        </Heading>
        <Text variant="label-default-l" onBackground="neutral-medium">
          {designer.headline}
        </Text>
      </Column>
    </Column>
  );
}

// Duración de la onda de MatrixFx cronometrada sobre su propio ciclo
// (trigger="manual", ver dist/components/MatrixFx.js): con speed=1,
// revealProgress = elapsed^3 * speed * 3, capado a 2.0. Un dot alcanza su
// opacidad máxima cuando revealProgress supera introOffset + 0.125 (el
// "fadeIn" del código llega a 1). El dot más lejano del centro tiene
// introOffset ≈ 0.95 (normalizedDistance=1 * 0.8 + randomOffset máx. 0.15),
// así que el peor caso necesita revealProgress ≈ 1.075, es decir
// elapsed = (1.075 / 3) ** (1/3) ≈ 0.71s. El `bulge` (ripple) no cambia esta
// cuenta: en el branch de trigger click/manual/hover, bulgeOpacity solo
// multiplica el alpha ya calculado por el reveal (no gatea la aparición del
// dot), así que el "cubrir toda la tarjeta" sigue dependiendo únicamente de
// revealProgress. Con bulge.duration=1.2s, a los 1000ms el ripple ya
// completó ~80% de un ciclo (visible con claridad) y el reveal ya cubrió de
// sobra la tarjeta; navegamos a ese margen.
const MATRIX_REVEAL_MS = 1000;

function DesignerBack({
  designer,
  seed,
  onFlipBack,
}: {
  designer: Designer;
  seed: number;
  onFlipBack: () => void;
}) {
  const router = useRouter();
  const [revealing, setRevealing] = useState(false);

  useEffect(() => {
    if (!revealing) return;
    const timeout = setTimeout(() => {
      router.push(designer.projectHref);
    }, MATRIX_REVEAL_MS);
    return () => clearTimeout(timeout);
  }, [revealing, router, designer.projectHref]);

  // El click en el avatar dispara la onda de MatrixFx (trigger="manual",
  // active=revealing) y, cuando termina, navega al perfil. stopPropagation
  // evita que el mismo click burbujee hasta el onClick de FlipFx y vuelva a
  // voltear la tarjeta a mitad de la animación.
  const handleAvatarClick = (event: MouseEvent) => {
    event.stopPropagation();
    if (revealing) return;
    setRevealing(true);
  };

  // La flecha SOLO regresa al frente: nunca debe navegar ni dejar que el
  // click llegue al onClick de FlipFx.
  const handleUnflip = (event: MouseEvent) => {
    event.stopPropagation();
    onFlipBack();
  };

  const avatarProps = designer.avatar
    ? { src: designer.avatar }
    : { value: (designer.name[0] ?? "D").toUpperCase() };

  return (
    <Column
      fillWidth
      fillHeight
      radius="l"
      border="neutral-alpha-weak"
      background="neutral-alpha-weak"
      overflow="hidden"
    >
      {/* Capa base: solo el glow radial suave detrás del centro (sin patrón
          de puntos). Tokens globales, mismo esquema de color que HomeHero,
          respeta light/dark. */}
      <Background
        position="absolute"
        top="0"
        left="0"
        fill
        pointerEvents="none"
        zIndex={0}
        gradient={{
          display: true,
          opacity: 60,
          x: 50,
          y: 42,
          width: 120,
          height: 100,
          colorStart: "brand-background-strong",
          colorEnd: "static-transparent",
        }}
      />

      {/* Blob con movimiento propio, recortado por Mask con cursor=true: solo
          se revela en un círculo alrededor del puntero. En touch (sin mouse)
          Mask nunca activa el seguimiento y el blob queda oculto por la
          máscara, degradando sin romper nada. */}
      <Mask cursor radius={26} position="absolute" top="0" left="0" fill pointerEvents="none" zIndex={1}>
        <BlobFx seed={seed} fill opacity={60} />
      </Mask>

      {/* Onda expansiva de MatrixFx: overlay absoluto de toda la tarjeta,
          pero DETRÁS de los datos y el avatar (zIndex 2 < 3), activado por
          estado (trigger="manual") desde el click en el avatar. pointerEvents
          "none" para no bloquear el click del avatar antes de activarse.
          bulge tipo ripple repite mientras `active` esté encendido; se corta
          al navegar (ver MATRIX_REVEAL_MS). */}
      <MatrixFx
        trigger="manual"
        active={revealing}
        revealFrom="center"
        colors={["accent-solid-strong"]}
        bulge={{ type: "ripple", duration: 1.2, intensity: 15, repeat: true }}
        position="absolute"
        top="0"
        left="0"
        fill
        pointerEvents="none"
        zIndex={2}
      />

      {/* Contenido: avatar grande → nombre → roles, centrado verticalmente
          (el avatar queda algo arriba del centro real por el peso del resto
          de la columna debajo). */}
      <Column fillWidth fillHeight padding="24" gap="12" center zIndex={3}>
        {/* Diámetro ≈ 1/3 del ancho de la tarjeta y responsivo: Avatar con
            `size` string/número solo trae anchos fijos en rem (ver
            Avatar.module.scss / sizeInRem en dist/components/Avatar.js). El
            `style` de Avatar se mergea último y gana sobre esos valores fijos,
            así que forzamos width:"33%" + aspectRatio:"1" (height:"auto" para
            que aspectRatio controle el alto); la Media interna ya usa
            fill+aspectRatio "1" y llena ese círculo. `size={8}` solo queda
            como pista para el `sizes` de next/image, no define el layout. */}
        <Avatar
          {...avatarProps}
          size={8}
          cursor="interactive"
          onClick={handleAvatarClick}
          style={{ width: "33%", height: "auto", minWidth: "0", minHeight: "0", aspectRatio: "1" }}
        />
        <Heading variant="display-strong-xs" onBackground="neutral-strong" align="center" wrap="balance">
          {designer.name}
        </Heading>
        {(designer.primaryRole || designer.secondaryRoles.length > 0) && (
          <Column gap="8" horizontal="center" align="center">
            {designer.primaryRole && (
              <Row horizontal="center">
                <RoleTag role={designer.primaryRole} variant="primary" />
              </Row>
            )}
            {designer.secondaryRoles.length > 0 && (
              <Row gap="8" wrap horizontal="center" vertical="center">
                {designer.secondaryRoles.map((role) => (
                  <RoleTag key={role} role={role} variant="secondary" />
                ))}
              </Row>
            )}
          </Column>
        )}
      </Column>

      {/* Flecha para des-voltear sin navegar; siempre visible, esquina superior
          derecha, por encima de todo lo demás (incluida la onda MatrixFx) para
          seguir siendo clickeable durante la animación. Va dentro de un Flex
          absoluto propio: con `tooltip`, IconButton se envuelve en un wrapper
          relative y un absolute en su `style` se anclaría a ese wrapper (que
          fluye al fondo de la columna), no a la tarjeta. */}
      <Flex position="absolute" top="12" right="12" zIndex={4}>
        <IconButton
          icon="refresh"
          variant="secondary"
          size="m"
          tooltip="Voltear tarjeta"
          aria-label="Voltear tarjeta"
          onClick={handleUnflip}
        />
      </Flex>
    </Column>
  );
}

// TiltFx se autodesactiva en dispositivos táctiles (detecta "ontouchstart" y
// no aplica el efecto), así que convive sin estorbar con el tap-to-flip.
function DesignerCard({ designer, seed }: { designer: Designer; seed: number }) {
  // Estado levantado: FlipFx queda controlado para que la flecha del reverso
  // pueda des-voltear la tarjeta.
  const [flipped, setFlipped] = useState(false);

  return (
    <TiltFx fillWidth radius="l" intensity={3}>
      <FlipFx
        fillWidth
        radius="l"
        className={styles.flipCard}
        flipped={flipped}
        onFlip={setFlipped}
        front={<DesignerFront designer={designer} seed={seed} />}
        back={<DesignerBack designer={designer} seed={seed} onFlipBack={() => setFlipped(false)} />}
      />
    </TiltFx>
  );
}

// Mismo lote que ExploreFeed: sin paginación de servidor, InfiniteScroll solo
// revela progresivamente el array "filtered" ya cargado en el cliente.
const BATCH_SIZE = 8;

export function DesignerDirectory({ platformDesigners = [] }: { platformDesigners?: PlatformDesigner[] }) {
  const { query, specialty } = useExploreSearch();

  const designers = useMemo<Designer[]>(() => {
    return platformDesigners.map((user) => ({
      name: user.name ?? user.username ?? "Colaborador",
      specialty: "Diseñador de Marca",
      role: user.headline ?? "Colaborador de la plataforma Designerds",
      avatar: user.imageUrl ?? "",
      projectHref: user.username ? `/${user.username}` : "/explorar",
      projectTitle: "Perfil de colaborador",
      featuredImageUrl: user.featuredImageUrl,
      cardQuote: user.cardQuote,
      headline: user.headline ?? "Diseñador de Marca",
      bio: user.bio,
      primaryRole: user.primaryRole,
      secondaryRoles: user.secondaryRoles ?? [],
    }));
  }, [platformDesigners]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return designers.filter((designer) => {
      if (specialty !== ALL_SPECIALTIES && designer.specialty !== specialty) return false;
      if (q && !designer.name.toLowerCase().includes(q) && !designer.role.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [designers, query, specialty]);

  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [filtered]);

  const visible = filtered.slice(0, visibleCount);

  const loadMore = async () => {
    const next = visibleCount + BATCH_SIZE;
    setVisibleCount(next);
    return next < filtered.length;
  };

  return (
    <RevealFx fillWidth direction="column" gap="24" translateY="8" speed="fast">
      <Column fillWidth gap="8">
        <Heading variant="display-strong-l">Designerds</Heading>
        <Text onBackground="neutral-weak" variant="body-default-l">
          Conoce a los diseñadores colaboradores de la plataforma.
        </Text>
      </Column>

      {filtered.length === 0 ? (
        <Text onBackground="neutral-weak" variant="body-default-m">
          No encontramos diseñadores que coincidan con tu búsqueda.
        </Text>
      ) : (
        <Grid columns={3} m={{ columns: 2 }} s={{ columns: 1 }} gap="24" fillWidth>
          <InfiniteScroll
            items={visible}
            renderItem={(designer) => (
              <DesignerCard key={designer.name} designer={designer} seed={designers.indexOf(designer)} />
            )}
            loadMore={loadMore}
            style={{ gridColumn: "1 / -1" }}
          />
        </Grid>
      )}
    </RevealFx>
  );
}
