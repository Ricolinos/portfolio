import Image from "next/image";
import { Column, Flex, Grid, Icon, IconName, Row, SmartLink, Text } from "@once-ui-system/core";
import styles from "./Footer.module.scss";

type FooterLink = { label: string; href: string };

const exploreLinks: FooterLink[] = [
  { label: "Animación", href: "/explorar/animacion" },
  { label: "Branding", href: "/explorar/branding" },
  { label: "Ilustración", href: "/explorar/ilustracion" },
];

const serviceLinks: FooterLink[] = [
  { label: "Cotiza tu proyecto", href: "/servicios/cotizador" },
  { label: "Diseño Estratégico", href: "/servicios/informacion" },
  { label: "Facturación", href: "/servicios/facturacion" },
];

const resourceLinks: FooterLink[] = [
  { label: "Plantillas", href: "/recursos/mockups" },
  { label: "Biblioteca de Recursos", href: "/recursos" },
];

const accountLinks: FooterLink[] = [
  { label: "Perfil", href: "/dashboard/client/perfil" },
  { label: "Proyectos", href: "/dashboard/client/projects" },
  { label: "Configuración", href: "/dashboard/client/settings" },
];

const socialLinks: { label: string; href: string; icon: IconName }[] = [
  { label: "LinkedIn", href: "#", icon: "linkedin" },
  { label: "Instagram", href: "#", icon: "instagram" },
  { label: "Behance", href: "#", icon: "behance" },
];

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <Column gap="16">
      <Text variant="label-strong-m">{title}</Text>
      <Column gap="12">
        {links.map((link) => (
          <SmartLink key={link.href} href={link.href}>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {link.label}
            </Text>
          </SmartLink>
        ))}
      </Column>
    </Column>
  );
}

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Flex
      as="footer"
      direction="column"
      paddingY="64"
      paddingX="32"
      background="surface"
      borderTop="neutral-alpha-weak"
      fillWidth
    >
      <Grid columns={5} m={{ columns: 2 }} s={{ columns: 1 }} gap="40" fillWidth paddingBottom="48">
        <Column gap="16">
          <Row>
            <Image
              src="/trademark/icon-dark.svg"
              alt="HUB-NERDS"
              width={32}
              height={35}
              className={styles.logoDark}
            />
            <Image
              src="/trademark/icon-light.svg"
              alt="HUB-NERDS"
              width={32}
              height={35}
              className={styles.logoLight}
            />
          </Row>
          <Text variant="body-default-s" onBackground="neutral-weak">
            La plataforma B2B donde marcas y estudios conectan con el mejor talento creativo de
            Latinoamérica.
          </Text>
        </Column>
        <FooterColumn title="Explorar" links={exploreLinks} />
        <FooterColumn title="Servicios" links={serviceLinks} />
        <FooterColumn title="Recursos" links={resourceLinks} />
        <FooterColumn title="Mi Cuenta" links={accountLinks} />
      </Grid>
      <Row
        horizontal="between"
        vertical="center"
        paddingTop="32"
        borderTop="neutral-alpha-weak"
        fillWidth
        gap="16"
        s={{ direction: "column" }}
      >
        <Text variant="body-default-xs" onBackground="neutral-weak">
          © {currentYear} HUB-NERDS. Todos los derechos reservados.
        </Text>
        <Row gap="20" vertical="center">
          {socialLinks.map((item) => (
            <SmartLink key={item.label} href={item.href}>
              <Row gap="8" vertical="center">
                <Icon name={item.icon} size="s" onBackground="neutral-weak" />
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  {item.label}
                </Text>
              </Row>
            </SmartLink>
          ))}
        </Row>
      </Row>
    </Flex>
  );
};
