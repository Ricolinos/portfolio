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
  id: string;
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

  // Fade (tinte) + textos: se reutilizan tal cual dentro o fuera del HoloFx
  // según haya imagen, para no duplicar el JSX.
  const overlay = (
    <>
      {/* Tinte de degradado que hace legible el nombre/rol sobre la imagen:
          ancla abajo, sin patrón de puntos (pattern.display=false). El blur
          real lo aporta el duplicado de imagen (zIndex 1, solo cuando hay
          imagen); este Fade solo suma color/contraste con opacity baja para
          dejar ver más imagen. */}
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
    </>
  );

  return (
    <Column fillWidth fillHeight radius="l" overflow="hidden" background="neutral-alpha-weak">
      {imageSrc ? (
        // HoloFx envuelve TODO el frente (imagen base + duplicado blurreado +
        // Fade + textos), no solo la imagen: en dist/components/HoloFx.js
        // pinta "base" (los children tal cual) y luego 3 capas overlay
        // (burn/shine/texture) que REPITEN los mismos children con blend
        // modes/máscara distintos, apiladas encima. Si HoloFx solo envolvía
        // la imagen, el shine/burn quedaba tapado por el duplicado/Fade/texto
        // que estaban fuera y por encima; como wrapper raíz, el brillo cubre
        // toda la tarjeta. OJO — en dist/components/HoloFx.module.scss las 3
        // capas overlay arrancan en `opacity: 0` y solo se revelan en
        // `.holoFx:hover` (más `m: { hide: true }` hardcodeado, sin prop para
        // desactivarlo): es un efecto de HOVER por diseño del componente, no
        // se ve en una captura estática ni en viewport "m" (tablet); subimos
        // `shine`/`burn` por encima de su opacity default (30) para que el
        // brillo se note más al pasar el mouse.
        <HoloFx fill radius="l" shine={{ opacity: 50 }} burn={{ opacity: 45 }}>
          <Media
            src={imageSrc}
            alt={designer.name}
            fill
            fillHeight
            objectFit="cover"
            sizes="(max-width: 1024px) 100vw, 33vw"
          />

          {/* Duplicado blurreado de la MISMA imagen (mismo src) para simular
              el blur progresivo de la base. NO se puede usar backdrop-filter
              aquí: dentro de las caras de FlipFx (contexto 3D con
              perspective + preserve-3d + backface-visibility hidden, capas
              promovidas al compositor) Chromium vuelve inerte cualquier
              backdrop-filter de un descendiente. `filter` + `mask-image`
              sobre contenido propio sí funcionan en ese contexto, así que
              este layer trae su propio blur(16px) recortado por un
              mask-image que va opaco en la base y desaparece a la mitad de
              la tarjeta (mismos stops que el Fade de abajo). scale(1.1)
              evita el halo transparente que el blur deja en los bordes de
              la imagen. */}
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

          {overlay}
        </HoloFx>
      ) : (
        <>
          <BlobFx seed={seed} position="absolute" top="0" left="0" fill fillHeight opacity={40} />
          {overlay}
        </>
      )}
    </Column>
  );
}

function DesignerBack({
  designer,
  seed,
  matrixActive,
  onFlipBack,
}: {
  designer: Designer;
  seed: number;
  matrixActive: boolean;
  onFlipBack: () => void;
}) {
  const router = useRouter();

  // El click en CUALQUIER parte del cuerpo del reverso navega al perfil;
  // stopPropagation evita que el mismo click burbujee hasta el onClick de
  // FlipFx y vuelva a voltear la tarjeta justo cuando estamos navegando. La
  // ÚNICA excepción es la flecha (handleUnflip abajo), que también hace
  // stopPropagation antes de llegar aquí. El MatrixFx ya no espera a ningún
  // ciclo: corre de fondo mientras la tarjeta está volteada (ver
  // `matrixActive`), así que no hay animación que cronometrar en el click.
  const goToProfile = (event: MouseEvent) => {
    event.stopPropagation();
    router.push(designer.projectHref);
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
      cursor="interactive"
      onClick={goToProfile}
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

      {/* Onda de MatrixFx: overlay absoluto de toda la tarjeta, DETRÁS de los
          datos y el avatar (zIndex 2 < 3), corriendo de fondo mientras la
          tarjeta está volteada (trigger="manual", active=matrixActive viene
          del `flipped` de DesignerCard, no del click). pointerEvents="none"
          para no interceptar clicks. bulge tipo ripple con repeat:true cicla
          continuamente mientras `matrixActive` esté encendido; revealFrom
          "center" queda concéntrico con el avatar, que también está
          centrado en la tarjeta. fps más bajo (30) porque puede haber 8+
          tarjetas con el canvas corriendo en simultáneo. */}
      <MatrixFx
        trigger="manual"
        active={matrixActive}
        revealFrom="center"
        colors={["accent-solid-strong"]}
        bulge={{ type: "ripple", duration: 1.2, intensity: 15, repeat: true }}
        fps={30}
        position="absolute"
        top="0"
        left="0"
        fill
        pointerEvents="none"
        zIndex={2}
      />

      {/* Contenido, todo posicionado absoluto y centrado respecto a la
          tarjeta completa (el padding de este Column no afecta ese cálculo:
          el containing block de un hijo absoluto es la padding box del
          ancestro posicionado, que sin border/margin coincide con el tamaño
          total de la tarjeta). */}
      <Column fillWidth fillHeight zIndex={3}>
        {/* Avatar centrado en AMBOS ejes al centro geométrico de la tarjeta:
            top/left 50% + translateX/translateY -50% son props nativas de
            Flex (parsePosition en dist/components/ServerFlex.js las pasa tal
            cual como CSS y arma `transform: translate(...)`), sin CSS manual.
            Diámetro ≈ 33% del ancho de la tarjeta: el `style` de Avatar se
            mergea último y gana sobre sus anchos fijos en rem (ver
            sizeInRem en dist/components/Avatar.js), así que forzamos
            width:"33%" + aspectRatio:"1" (height:"auto" para que aspectRatio
            controle el alto); la Media interna ya usa fill+aspectRatio "1" y
            llena ese círculo. `size={8}` solo queda como pista para el
            `sizes` de next/image, no define el layout. El MatrixFx con
            revealFrom="center" queda concéntrico con este mismo punto. Sin
            onClick propio: un click aquí burbujea al onClick del Column
            contenedor (goToProfile), que ya cubre toda la tarjeta. */}
        <Avatar
          {...avatarProps}
          size={8}
          position="absolute"
          top="50%"
          left="50%"
          translateX="-50%"
          translateY="-50%"
          style={{ width: "33%", height: "auto", minWidth: "0", minHeight: "0", aspectRatio: "1" }}
        />

        {/* Nombre + rol principal debajo del avatar. Solo el rol principal
            (sin secundarios): con 2 líneas de nombre, una fila de tags
            secundarios quedaba pegada al borde inferior de la tarjeta. La
            tarjeta es 3/4 (ancho:alto = 3:4, ver .flipCard en el .scss): un
            avatar de 33% de ANCHO mide, en % de ALTO, 33% * 3/4 ≈ 24.75%
            (radio ≈ 12.4%). Arrancamos el bloque a 50% + 12.5% (borde del
            avatar) + 16px de aire. */}
        <Column
          position="absolute"
          left="0"
          fillWidth
          paddingX="24"
          gap="8"
          horizontal="center"
          align="center"
          style={{ top: "calc(50% + 12.5% + 16px)" }}
        >
          <Heading variant="display-strong-xs" onBackground="neutral-strong" align="center" wrap="balance">
            {designer.name}
          </Heading>
          {designer.primaryRole && (
            <Row horizontal="center">
              <RoleTag role={designer.primaryRole} variant="primary" />
            </Row>
          )}
        </Column>
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
// `flipped`/`onFlip` vienen de DesignerDirectory (estado levantado un nivel
// más arriba, compartido entre todas las tarjetas del grid) para que solo
// una tarjeta pueda mostrar el reverso a la vez: FlipFx queda controlado
// tanto para que la flecha del reverso pueda des-voltear la tarjeta como
// para que voltear OTRA tarjeta cierre automáticamente la que estaba abierta.
function DesignerCard({
  designer,
  seed,
  flipped,
  onFlip,
}: {
  designer: Designer;
  seed: number;
  flipped: boolean;
  onFlip: (flipped: boolean) => void;
}) {
  return (
    <TiltFx fillWidth radius="l" intensity={3}>
      <FlipFx
        fillWidth
        radius="l"
        className={styles.flipCard}
        flipped={flipped}
        onFlip={onFlip}
        front={<DesignerFront designer={designer} seed={seed} />}
        back={
          <DesignerBack
            designer={designer}
            seed={seed}
            matrixActive={flipped}
            onFlipBack={() => onFlip(false)}
          />
        }
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
      id: user.id,
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

  // Un solo id volteado a la vez en todo el grid: voltear una tarjeta nueva
  // reemplaza el id anterior, así que la tarjeta previamente abierta recibe
  // `flipped=false` y FlipFx la regresa sola al frente.
  const [flippedId, setFlippedId] = useState<string | null>(null);

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
              <DesignerCard
                key={designer.id}
                designer={designer}
                seed={designers.indexOf(designer)}
                flipped={flippedId === designer.id}
                onFlip={(next) => setFlippedId(next ? designer.id : null)}
              />
            )}
            loadMore={loadMore}
            style={{ gridColumn: "1 / -1" }}
          />
        </Grid>
      )}
    </RevealFx>
  );
}
