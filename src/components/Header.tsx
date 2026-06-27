"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  Avatar,
  Button,
  Column,
  DropdownWrapper,
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
import styles from "./Header.module.scss";

// ─── Navegación ───────────────────────────────────────────────────────────────
const menuGroups: MenuGroup[] = [
  {
    id: "explorar",
    label: "Explorar",
    suffixIcon: "chevronDown",
    sections: [
      {
        links: [
          { label: "Animación",   href: "/explorar/animacion",   icon: "film" },
          { label: "Branding",    href: "/explorar/branding",    icon: "sparkles" },
          { label: "Ilustración", href: "/explorar/ilustracion", icon: "paintBrush" },
          { label: "Designerds",  href: "/explorar/designerds",  icon: "userGroup" },
        ],
      },
    ],
  },
  {
    id: "recursos",
    label: "Recursos",
    suffixIcon: "chevronDown",
    sections: [
      {
        links: [
          { label: "Introducción",          href: "/recursos/introduccion",          icon: "book" },
          { label: "Para Designerds",       href: "/recursos/para-designerds",       icon: "codeBracket" },
          { label: "Proyectos por encargo", href: "/recursos/proyectos-por-encargo", icon: "briefcase" },
        ],
      },
    ],
  },
  {
    id: "servicios",
    label: "Servicios",
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

// ─── Menús exclusivos para usuarios autenticados ─────────────────────────────
const signedInMenuGroups: MenuGroup[] = [
  {
    id: "mis-proyectos",
    label: "Mis proyectos",
    suffixIcon: "chevronDown",
    sections: [
      {
        links: [
          { label: "Nuevo",                   href: "/dashboard/client/projects/new",     icon: "plus"          },
          { label: "Últimas actualizaciones",  href: "/dashboard/client/projects/updates", icon: "refreshCw"     },
          { label: "Contactar a soporte",      href: "/dashboard/client/support",          icon: "helpCircle"    },
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
          { label: "Facturación y Contratos", href: "/dashboard/client/billing",   icon: "creditCard"    },
          { label: "Biblioteca de Recursos",  href: "/dashboard/client/assets",    icon: "folder"        },
          { label: "Agendar Reunión",         href: "/dashboard/client/schedule",  icon: "calendar"      },
        ],
      },
    ],
  },
];

// ─── Spring para layout animations ───────────────────────────────────────────
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
// Renders auth buttons (signed out) or UserMenu (signed in).
// `mobile` switches to full-width buttons and top-end dropdown placement.
const AuthZone = ({ mobile = false }: { mobile?: boolean }) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) return null;

  if (isSignedIn && user) {
    const displayName =
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.emailAddresses[0]?.emailAddress ||
      "Usuario";
    const initials = (user.firstName?.[0] ?? user.emailAddresses[0]?.emailAddress?.[0] ?? "U").toUpperCase();
    const avatarProps = {
      ...(user.imageUrl ? { src: user.imageUrl } : { value: initials }),
    };

    // Mobile: opciones directamente visibles (sin dropdown anidado)
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
          <Option
            href="/dashboard/client/perfil"
            label="Perfil"
            value="perfil"
            hasPrefix={<Icon name="person" size="s" onBackground="neutral-weak" />}
          />
          <Option
            href="/dashboard/client/settings"
            label="Configuración"
            value="settings"
            hasPrefix={<Icon name="settings" size="s" onBackground="neutral-weak" />}
          />
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
          <Option
            label="Salir"
            value="signout"
            onClick={() => signOut({ redirectUrl: "/" })}
            hasPrefix={<Icon name="logOut" size="s" onBackground="neutral-weak" />}
          />
        </Column>
      );
    }

    // Desktop: UserMenu con dropdown flotante
    return (
      <UserMenu
        name={displayName}
        subline={user.emailAddresses[0]?.emailAddress}
        avatarProps={{ ...avatarProps, size: "s" }}
        placement="bottom-end"
        dropdown={
          <Column minWidth={12} padding="4" gap="2">
            <Option
              href="/dashboard/client/perfil"
              label="Perfil"
              value="perfil"
              hasPrefix={<Icon name="person" size="s" onBackground="neutral-weak" />}
            />
            <Option
              href="/dashboard/client/settings"
              label="Configuración"
              value="settings"
              hasPrefix={<Icon name="settings" size="s" onBackground="neutral-weak" />}
            />
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
            <Option
              label="Salir"
              value="signout"
              onClick={() => signOut({ redirectUrl: "/" })}
              hasPrefix={<Icon name="logOut" size="s" onBackground="neutral-weak" />}
            />
          </Column>
        }
      />
    );
  }

  if (mobile) {
    return (
      <Column gap="8">
        <Button variant="secondary" size="m" href="/sign-in" fillWidth>
          Iniciar sesión
        </Button>
        <Button variant="primary" size="m" href="/sign-up" fillWidth>
          Registrarse
        </Button>
        {display.themeSwitcher && (
          <Row horizontal="center" paddingTop="4">
            <ThemeToggle />
          </Row>
        )}
      </Column>
    );
  }

  return (
    <>
      <Button variant="secondary" size="s" href="/sign-in">
        Iniciar sesión
      </Button>
      <Button variant="primary" size="s" href="/sign-up">
        Registrarse
      </Button>
      {display.themeSwitcher && (
        <>
          <Line background="neutral-alpha-medium" vert maxHeight="24" />
          <ThemeToggle />
        </>
      )}
    </>
  );
};

// ─── Header ──────────────────────────────────────────────────────────────────
export const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname() ?? "/";
  const isHome = pathname === "/";
  const { isSignedIn } = useUser();

  const allMenuGroups = isSignedIn
    ? [...menuGroups, ...signedInMenuGroups]
    : menuGroups;

  return (
    <>
      <Fade s={{ hide: true }} fillWidth position="fixed" height="80" zIndex={9} />
      <Fade
        hide
        s={{ hide: false }}
        fillWidth
        position="fixed"
        bottom="0"
        to="top"
        height="80"
        zIndex={9}
      />

      <Row
        fitHeight
        className={styles.position}
        position="sticky"
        as="header"
        zIndex={9}
        fillWidth
        padding="8"
        horizontal="between"
        vertical="center"
        data-border="rounded"
        s={{ position: "fixed" }}
      >
        {/* ══ GRUPO IZQUIERDO: Logo + (desktop) SearchBar + MegaMenu ══════════ */}
        <Row vertical="center" gap="4" style={{ flexShrink: 0 }}>
          {/* Logo — siempre visible */}
          <Row vertical="center" paddingLeft="4" paddingRight="8">
            <SmartLink href="/">
              <Image
                src="/trademark/type-dark.svg"
                alt="Logo"
                height={24}
                width={120}
                className={styles.logoDark}
                priority
              />
              <Image
                src="/trademark/type-light.svg"
                alt="Logo"
                height={24}
                width={120}
                className={styles.logoLight}
                priority
              />
            </SmartLink>
          </Row>

          {/* SearchBar + MegaMenu — solo desktop.
           *  Sin style={{ display }} para que s={{ hide: true }} no sea sobreescrito. */}
          <Row s={{ hide: true }} vertical="center" gap="4">
            <LayoutGroup id="header-left">
              <AnimatePresence initial={false}>
                {!isHome && (
                  <motion.div
                    key="searchbar"
                    layout
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

              <motion.div
                layout
                transition={spring}
                style={{ flexShrink: 0, position: "relative" }}
              >
                <MegaMenu menuGroups={allMenuGroups} position="relative" />
              </motion.div>
            </LayoutGroup>
          </Row>
        </Row>

        {/* ══ GRUPO DERECHO: Auth + Theme — solo desktop ════════════════════════ */}
        <Row s={{ hide: true }} vertical="center" gap="8" paddingRight="4">
          <AuthZone />
        </Row>

        {/* ══ MOBILE: hamburger con panel completo ══════════════════════════════ */}
        <Row hide s={{ hide: false }} paddingRight="4">
          <DropdownWrapper
            trigger={<NavIcon isActive={mobileOpen} />}
            dropdown={
              <Column
                gap="12"
                padding="16"
                style={{ width: "min(320px, calc(100vw - 32px))" }}
              >
                <SearchBar fillWidth />
                <MobileMegaMenu
                  menuGroups={allMenuGroups}
                  onClose={() => setMobileOpen(false)}
                />
                <Line background="neutral-alpha-medium" />
                <AuthZone mobile />
              </Column>
            }
            isOpen={mobileOpen}
            onOpenChange={setMobileOpen}
            placement="bottom-end"
          />
        </Row>
      </Row>
    </>
  );
};
