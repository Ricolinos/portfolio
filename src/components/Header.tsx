"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  Avatar,
  Button,
  Column,
  Fade,
  Icon,
  Line,
  NavIcon,
  Option,
  Row,
  SmartLink,
  Text,
  UserMenu,
} from "@once-ui-system/core";

import { display } from "@/resources";
import { ThemeToggle } from "./ThemeToggle";
import { MegaMenu, type MenuGroup } from "./MegaMenu";
import { MobileMegaMenu } from "./MobileMegaMenu";
import { AuthModal, type AuthMode } from "./auth/AuthModal";
import styles from "./Header.module.scss";

// ─── Navegación ───────────────────────────────────────────────────────────────
const menuGroups: MenuGroup[] = [
  {
    id: "explorar",
    label: "Explorar",
    href: "/explorar",
    suffixIcon: "chevronDown",
    sections: [
      {
        links: [
          { label: "Animación",   href: "/explorar/animacion",   icon: "film" },
          { label: "Branding",    href: "/explorar/branding",    icon: "sparkles" },
          { label: "Ilustración", href: "/explorar/ilustracion", icon: "paintBrush" },
          { divider: true },
          { label: "Designerds",  href: "/explorar/designerds",  icon: "userGroup" },
        ],
      },
    ],
  },
  {
    id: "recursos",
    label: "Recursos",
    href: "/recursos",
    suffixIcon: "chevronDown",
    sections: [
      {
        links: [
          { label: "Mockups",  href: "/recursos/mockups",  icon: "mockup" },
          { label: "Plug-ins", href: "/recursos/plugins",  icon: "plugin" },
          { label: "Imágenes", href: "/recursos/imagenes", icon: "images" },
          { label: "Fotos",    href: "/recursos/fotos",    icon: "camera" },
          { label: "Iconos",   href: "/recursos/iconos",   icon: "shapes" },
        ],
      },
    ],
  },
  {
    id: "servicios",
    label: "Servicios",
    href: "/servicios",
    suffixIcon: "chevronDown",
    sections: [
      {
        links: [
          { label: "Cotiza tu proyecto de Diseño", href: "/servicios/cotiza",      icon: "rocket" },
          { label: "Información",                  href: "/servicios/informacion",  icon: "infoCircle" },
          { label: "Facturación",                  href: "/servicios/facturacion",  icon: "creditCard" },
        ],
      },
    ],
  },
];

const signedInMenuGroups: MenuGroup[] = [
  {
    id: "mis-proyectos",
    label: "Mis proyectos",
    suffixIcon: "chevronDown",
    sections: [
      {
        links: [
          { label: "Nuevo",                   href: "/dashboard/client/projects/new",     icon: "plus"       },
          { label: "Últimas actualizaciones",  href: "/dashboard/client/projects/updates", icon: "refreshCw"  },
          { label: "Contactar a soporte",      href: "/dashboard/client/support",          icon: "helpCircle" },
        ],
      },
    ],
  },
  {
    id: "panel-clientes",
    label: "Panel de clientes",
    suffixIcon: "chevronDown",
    sections: [
      {
        links: [
          { label: "Facturación y Contratos", href: "/dashboard/client/billing",  icon: "creditCard" },
          { label: "Biblioteca de Recursos",  href: "/dashboard/client/assets",   icon: "folder"     },
          { label: "Agendar Reunión",         href: "/dashboard/client/schedule", icon: "calendar"   },
        ],
      },
    ],
  },
];

const spring = { type: "spring", stiffness: 320, damping: 32 } as const;

// ─── SearchBar ────────────────────────────────────────────────────────────────
const SearchBar = ({ fillWidth }: { fillWidth?: boolean }) => (
  <Row
    vertical="center"
    gap="8"
    paddingX="12"
    paddingY="4"
    radius="m"
    border="neutral-alpha-weak"
    background="neutral-alpha-weak"
    style={{ width: fillWidth ? "100%" : undefined, minWidth: fillWidth ? undefined : 180 }}
  >
    <Icon name="search" size="s" onBackground="neutral-weak" />
    <input
      type="search"
      placeholder="Buscar…"
      aria-label="Buscar"
      style={{
        background: "transparent",
        border: "none",
        outline: "none",
        color: "inherit",
        font: "inherit",
        fontSize: "var(--font-size-body-s)",
        flex: 1,
        minWidth: 0,
      }}
    />
  </Row>
);

// ─── AuthZone ─────────────────────────────────────────────────────────────────
const AuthZone = ({ mobile = false, onOpenAuth }: { mobile?: boolean; onOpenAuth: (mode: AuthMode) => void }) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) {
    if (mobile) return null;
    return (
      <Row gap="8" vertical="center" style={{ opacity: 0, pointerEvents: "none" }} aria-hidden="true">
        <Button variant="secondary" size="s" tabIndex={-1}>Iniciar sesión</Button>
        <Button variant="primary"   size="s" tabIndex={-1}>Registrarse</Button>
        {display.themeSwitcher && (
          <>
            <Line background="neutral-alpha-medium" vert maxHeight="24" />
            <ThemeToggle />
          </>
        )}
      </Row>
    );
  }

  if (isSignedIn && user) {
    const displayName =
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.emailAddresses[0]?.emailAddress ||
      "Usuario";
    const initials = (user.firstName?.[0] ?? user.emailAddresses[0]?.emailAddress?.[0] ?? "U").toUpperCase();
    const avatarProps = { ...(user.imageUrl ? { src: user.imageUrl } : { value: initials }) };

    if (mobile) {
      return (
        <Column gap="4" fillWidth>
          <Row gap="12" paddingX="8" paddingY="8" vertical="center">
            <Avatar {...avatarProps} size="m" />
            <Column gap="2">
              <Text variant="label-strong-s" onBackground="neutral-strong">{displayName}</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {user.emailAddresses[0]?.emailAddress}
              </Text>
            </Column>
          </Row>
          <Line background="neutral-alpha-medium" />
          <Option href="/dashboard/client/perfil" label="Perfil" value="perfil"
            hasPrefix={<Icon name="person" size="s" onBackground="neutral-weak" />} />
          <Option href="/dashboard/client/settings" label="Configuración" value="settings"
            hasPrefix={<Icon name="settings" size="s" onBackground="neutral-weak" />} />
          {display.themeSwitcher && (
            <>
              <Line background="neutral-alpha-weak" />
              <Row paddingX="12" paddingY="8" vertical="center" horizontal="between" fillWidth>
                <Text variant="label-default-s" onBackground="neutral-weak">Tema</Text>
                <ThemeToggle />
              </Row>
            </>
          )}
          <Line background="neutral-alpha-weak" />
          <Option label="Salir" value="signout"
            onClick={() => signOut({ redirectUrl: "/" })}
            hasPrefix={<Icon name="logOut" size="s" onBackground="neutral-weak" />} />
        </Column>
      );
    }

    return (
      <UserMenu
        name={displayName}
        subline={user.emailAddresses[0]?.emailAddress}
        avatarProps={{ ...avatarProps, size: "s" }}
        placement="bottom-end"
        dropdown={
          <Column minWidth={12} padding="4" gap="2">
            <Option href="/dashboard/client/perfil" label="Perfil" value="perfil"
              hasPrefix={<Icon name="person" size="s" onBackground="neutral-weak" />} />
            <Option href="/dashboard/client/settings" label="Configuración" value="settings"
              hasPrefix={<Icon name="settings" size="s" onBackground="neutral-weak" />} />
            {display.themeSwitcher && (
              <>
                <Line background="neutral-alpha-weak" />
                <Row paddingX="12" paddingY="8" vertical="center" horizontal="between" fillWidth>
                  <Text variant="label-default-s" onBackground="neutral-weak">Tema</Text>
                  <ThemeToggle />
                </Row>
              </>
            )}
            <Line background="neutral-alpha-weak" />
            <Option label="Salir" value="signout"
              onClick={() => signOut({ redirectUrl: "/" })}
              hasPrefix={<Icon name="logOut" size="s" onBackground="neutral-weak" />} />
          </Column>
        }
      />
    );
  }

  if (mobile) {
    return (
      <Column gap="8">
        <Button variant="secondary" size="m" onClick={() => onOpenAuth("sign-in")} fillWidth>Iniciar sesión</Button>
        <Button variant="primary"   size="m" onClick={() => onOpenAuth("sign-up")} fillWidth>Registrarse</Button>
        {display.themeSwitcher && (
          <Row horizontal="center" paddingTop="4"><ThemeToggle /></Row>
        )}
      </Column>
    );
  }

  return (
    <>
      <Button variant="secondary" size="s" onClick={() => onOpenAuth("sign-in")}>Iniciar sesión</Button>
      <Button variant="primary"   size="s" onClick={() => onOpenAuth("sign-up")}>Registrarse</Button>
      {display.themeSwitcher && (
        <>
          <Line background="neutral-alpha-medium" vert maxHeight="24" />
          <ThemeToggle />
        </>
      )}
    </>
  );
};

// ─── Logo compartido (layoutId anima la posición entre móvil y escritorio) ────
const SiteLogo = ({ onClick }: { onClick?: () => void }) => (
  <SmartLink href="/" onClick={onClick}>
    <Image src="/trademark/type-dark.svg"  alt="Logo" height={24} width={120} className={styles.logoDark}  priority />
    <Image src="/trademark/type-light.svg" alt="Logo" height={24} width={120} className={styles.logoLight} priority />
  </SmartLink>
);

// ─── Header ───────────────────────────────────────────────────────────────────
export const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile]     = useState(false);
  const [authMode, setAuthMode]     = useState<AuthMode | null>(null);
  const pathname   = usePathname() ?? "/";
  const isHome     = pathname === "/";
  const isRecursos = pathname.startsWith("/recursos");
  const isExplorar = pathname.startsWith("/explorar");
  const { isLoaded, isSignedIn } = useUser();

  const allMenuGroups = useMemo(
    () => isLoaded && isSignedIn ? [...menuGroups, ...signedInMenuGroups] : menuGroups,
    [isLoaded, isSignedIn],
  );

  // Detectar breakpoint móvil via matchMedia (905px = breakpoint "s" de Once UI)
  // Reemplaza s={{ hide }} CSS para que AnimatePresence + layoutId puedan animar
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 904px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Cerrar panel al navegar o al pasar a escritorio
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => { if (!isMobile) setMobileOpen(false); }, [isMobile]);

  // Scroll lock cuando el panel está abierto
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <Fade fillWidth position="fixed" height="80" zIndex={9} style={{ pointerEvents: "none" }} />

      {/* Header: fade entre escritorio ↔ móvil. layoutId="site-logo" anima
          la posición del logo entre los dos headers sin salto. */}
      <AnimatePresence initial={false}>
        {!isMobile ? (
          <motion.div
            key="desktop-header"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ width: "100%", display: "block" }}
          >
            <Row
              as="header"
              position="sticky"
              zIndex={10}
              fillWidth
              padding="8"
              horizontal="between"
              vertical="center"
              data-border="rounded"
            >
              <Row vertical="center" gap="4" style={{ flexShrink: 0 }}>
                <Row vertical="center" paddingLeft="4" paddingRight="8">
                  <motion.div layoutId="site-logo">
                    <SiteLogo />
                  </motion.div>
                </Row>
                <Row vertical="center" gap="4">
                  <LayoutGroup id="header-left">
                    <AnimatePresence initial={false}>
                      {!isHome && !isRecursos && !isExplorar && (
                        <motion.div
                          key="searchbar"
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -16 }}
                          transition={spring}
                          style={{ flexShrink: 0 }}
                        >
                          <SearchBar />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div style={{ flexShrink: 0, position: "relative" }}>
                      <MegaMenu menuGroups={allMenuGroups} position="relative" />
                    </div>
                  </LayoutGroup>
                </Row>
              </Row>
              <Row vertical="center" gap="8" paddingRight="4">
                <AuthZone onOpenAuth={setAuthMode} />
              </Row>
            </Row>
          </motion.div>
        ) : (
          <motion.div
            key="mobile-header"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ width: "100%", display: "block" }}
          >
            <Row
              as="header"
              position="fixed"
              top="0"
              left="0"
              fillWidth
              zIndex={10}
              paddingX="24"
              paddingY="12"
              horizontal="between"
              vertical="center"
              background="page"
              className={styles.mobileBar}
            >
              <motion.div layoutId="site-logo">
                <SiteLogo onClick={() => setMobileOpen(false)} />
              </motion.div>
              <NavIcon
                isActive={mobileOpen}
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
              />
            </Row>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel móvil */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <Column
              position="fixed"
              zIndex={9}
              top="0"
              left="0"
              right="0"
              bottom="0"
              background="surface"
              paddingX="20"
              paddingBottom="40"
              gap="24"
              overflowY="auto"
              style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 64px)" }}
            >
              {!isRecursos && !isExplorar && (
                <>
                  <SearchBar fillWidth />
                  <Line background="neutral-alpha-weak" />
                </>
              )}
              <MobileMegaMenu
                menuGroups={allMenuGroups}
                onClose={() => setMobileOpen(false)}
              />
              <Line background="neutral-alpha-weak" />
              <AuthZone mobile={true} onOpenAuth={setAuthMode} />
            </Column>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onModeChange={setAuthMode} />
    </>
  );
};
