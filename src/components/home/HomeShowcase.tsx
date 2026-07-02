"use client";

import {
  Animation,
  Avatar,
  Card,
  Column,
  DropdownWrapper,
  Grid,
  Heading,
  Icon,
  Media,
  Option,
  RevealFx,
  Row,
  SegmentedControl,
  Tag,
  Text,
} from "@once-ui-system/core";
import { useMemo, useState } from "react";
import { SearchBarShell } from "@/components/explore/SearchBarShell";

const SUGGESTED_SEARCHES = ["Diseño Gráfico", "Animación", "Branding"];

const FEED_TABS = ["Para ti", "Descubrir", "Proyectos"];

const ORDER_OPTIONS = ["Más valorados", "Más recientes", "Más vistos"] as const;

type MockProject = {
  id: string;
  title: string;
  designer: string;
  initials: string;
  location: string;
  tag: string;
  image: string;
  likes: number;
  views: number;
};

const MOCK_PROJECTS: MockProject[] = [
  {
    id: "aurora-branding",
    title: "Aurora — Identidad Visual",
    designer: "Mara Ibáñez",
    initials: "MI",
    location: "Buenos Aires, AR",
    tag: "Branding",
    image: "/images/gallery/img-01.jpg",
    likes: 2380,
    views: 18400,
  },
  {
    id: "nocturna-editorial",
    title: "Nocturna — Serie Editorial",
    designer: "Tomás Reyes",
    initials: "TR",
    location: "Ciudad de México, MX",
    tag: "Ilustración",
    image: "/images/gallery/img-02.jpg",
    likes: 1420,
    views: 9800,
  },
  {
    id: "kinetic-type",
    title: "Kinetic Type — Sistema Tipográfico Animado",
    designer: "Lucía Fernández",
    initials: "LF",
    location: "Bogotá, CO",
    tag: "Motion",
    image: "/images/gallery/img-03.jpg",
    likes: 1890,
    views: 14200,
  },
  {
    id: "sabor-local",
    title: "Sabor Local — Branding & Packaging",
    designer: "Diego Salas",
    initials: "DS",
    location: "Madrid, ES",
    tag: "Packaging",
    image: "/images/gallery/img-04.jpg",
    likes: 980,
    views: 7200,
  },
  {
    id: "voltra-app",
    title: "Voltra — UI/UX Fintech",
    designer: "Valentina Cruz",
    initials: "VC",
    location: "Lima, PE",
    tag: "UI/UX",
    image: "/images/gallery/img-05.jpg",
    likes: 2140,
    views: 16700,
  },
  {
    id: "estudio-ceramica",
    title: "Estudio Cerámica — Fotografía de Producto",
    designer: "Emilio Duarte",
    initials: "ED",
    location: "Santiago, CL",
    tag: "Fotografía",
    image: "/images/gallery/img-06.jpg",
    likes: 760,
    views: 5100,
  },
  {
    id: "mundo-submarino",
    title: "Mundo Submarino — Arte 3D",
    designer: "Sofía Ramos",
    initials: "SR",
    location: "São Paulo, BR",
    tag: "3D Art",
    image: "/images/gallery/img-07.jpg",
    likes: 3050,
    views: 21300,
  },
  {
    id: "rio-sonoro",
    title: "Río Sonoro — Identidad para Festival",
    designer: "Nicolás Vidal",
    initials: "NV",
    location: "Montevideo, UY",
    tag: "Branding",
    image: "/images/gallery/img-08.jpg",
    likes: 1275,
    views: 8900,
  },
];

const ALL_LOCATIONS = "Todas las ubicaciones";
const LOCATION_OPTIONS = [ALL_LOCATIONS, ...MOCK_PROJECTS.map((p) => p.location)];

const ALL_CATEGORIES = "Todas las categorías";
const CATEGORY_OPTIONS = [ALL_CATEGORIES, ...Array.from(new Set(MOCK_PROJECTS.map((p) => p.tag)))];

function formatMetric(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`;
}

function CategoryDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownWrapper
      isOpen={open}
      onOpenChange={setOpen}
      trigger={
        <Row vertical="center" gap="4" paddingX="4" style={{ cursor: "pointer" }}>
          <Text variant="label-default-s" onBackground="neutral-strong">
            {value}
          </Text>
          <Icon name="chevronDown" size="xs" onBackground="neutral-weak" />
        </Row>
      }
      dropdown={
        <Column minWidth={10} padding="4" gap="2">
          {CATEGORY_OPTIONS.map((option) => (
            <Option
              key={option}
              label={option}
              value={option}
              selected={value === option}
              onClick={(selected) => {
                onChange(selected);
                setOpen(false);
              }}
            />
          ))}
        </Column>
      }
    />
  );
}

function OrderDropdown({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownWrapper
      isOpen={open}
      onOpenChange={setOpen}
      trigger={
        <Row vertical="center" gap="4" paddingX="4" style={{ cursor: "pointer" }}>
          <Text variant="label-default-s" onBackground="neutral-strong">
            {value}
          </Text>
          <Icon name="chevronDown" size="xs" onBackground="neutral-weak" />
        </Row>
      }
      dropdown={
        <Column minWidth={10} padding="4" gap="2">
          {ORDER_OPTIONS.map((option) => (
            <Option
              key={option}
              label={option}
              value={option}
              selected={value === option}
              onClick={(selected) => {
                onChange(selected);
                setOpen(false);
              }}
            />
          ))}
        </Column>
      }
    />
  );
}

function LocationDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownWrapper
      isOpen={open}
      onOpenChange={setOpen}
      trigger={
        <Row vertical="center" gap="4" paddingX="4" style={{ cursor: "pointer" }}>
          <Text variant="label-default-s" onBackground="neutral-strong">
            {value}
          </Text>
          <Icon name="chevronDown" size="xs" onBackground="neutral-weak" />
        </Row>
      }
      dropdown={
        <Column minWidth={12} padding="4" gap="2">
          {LOCATION_OPTIONS.map((option) => (
            <Option
              key={option}
              label={option}
              value={option}
              selected={value === option}
              onClick={(selected) => {
                onChange(selected);
                setOpen(false);
              }}
            />
          ))}
        </Column>
      }
    />
  );
}

function ShowcaseCard({ project }: { project: MockProject }) {
  return (
    <Card fillWidth direction="column" gap="12" padding="12" radius="l" border="neutral-alpha-weak">
      <Column fillWidth radius="m" overflow="hidden">
        <Animation triggerType="hover" scale={1.03} fade={1} reverse easing="ease" fillWidth>
          <Media
            src={project.image}
            alt={project.title}
            aspectRatio="4 / 3"
            sizes="(max-width: 768px) 100vw, 25vw"
          />
        </Animation>
      </Column>
      <Column fillWidth gap="8" paddingX="4" paddingBottom="4">
        <Row fillWidth horizontal="between" vertical="start" gap="8">
          <Text variant="heading-strong-s" onBackground="neutral-strong" wrap="balance">
            {project.title}
          </Text>
          <Tag size="s" label={project.tag} variant="neutral" />
        </Row>
        <Row fillWidth horizontal="between" vertical="center">
          <Row gap="8" vertical="center">
            <Avatar value={project.initials} size="s" />
            <Text variant="label-default-s" onBackground="neutral-weak">
              {project.designer}
            </Text>
          </Row>
          <Row gap="12" vertical="center">
            <Row gap="4" vertical="center">
              <Icon name="eye" size="xs" onBackground="neutral-weak" />
              <Text variant="label-default-s" onBackground="neutral-weak">
                {formatMetric(project.views)}
              </Text>
            </Row>
            <Row gap="4" vertical="center">
              <Icon name="sparkle" size="xs" onBackground="neutral-weak" />
              <Text variant="label-default-s" onBackground="neutral-weak">
                {formatMetric(project.likes)}
              </Text>
            </Row>
          </Row>
        </Row>
      </Column>
    </Card>
  );
}

export function HomeShowcase() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [feedTab, setFeedTab] = useState(FEED_TABS[0]);
  const [order, setOrder] = useState<string>(ORDER_OPTIONS[0]);
  const [location, setLocation] = useState(ALL_LOCATIONS);

  const projects = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = MOCK_PROJECTS.filter((project) => {
      const matchesSearch =
        !query ||
        project.title.toLowerCase().includes(query) ||
        project.designer.toLowerCase().includes(query) ||
        project.tag.toLowerCase().includes(query);
      const matchesCategory = category === ALL_CATEGORIES || project.tag === category;
      const matchesLocation = location === ALL_LOCATIONS || project.location === location;
      return matchesSearch && matchesCategory && matchesLocation;
    });

    const sorted = [...filtered];
    if (order === "Más valorados") {
      sorted.sort((a, b) => b.likes - a.likes);
    } else if (order === "Más vistos") {
      sorted.sort((a, b) => b.views - a.views);
    }

    return sorted;
  }, [search, category, order, location]);

  return (
    <Column fillWidth gap="0">
      <RevealFx fillWidth>
        <Column fillWidth horizontal="center" align="center" paddingY="64" gap="24">
          <Heading
            variant="display-strong-l"
            align="center"
            wrap="balance"
            style={{ maxWidth: "40rem" }}
          >
            Busca en el mundo el mejor trabajo creativo
          </Heading>
          <Row fillWidth horizontal="center">
            <SearchBarShell
              leading={<CategoryDropdown value={category} onChange={setCategory} />}
              query={search}
              onQueryChange={setSearch}
              placeholder="Buscar proyectos, diseñadores, estilos…"
              ariaLabel="Buscar en el home"
            />
          </Row>
          <Row gap="12" horizontal="center" wrap>
            {SUGGESTED_SEARCHES.map((suggestion) => (
              <Tag key={suggestion} variant="neutral" label={suggestion} />
            ))}
          </Row>
        </Column>
      </RevealFx>

      <RevealFx fillWidth delay={0.1}>
        <Row
          fillWidth
          gap="16"
          horizontal="between"
          vertical="center"
          paddingY="16"
          borderBottom="neutral-alpha-weak"
          s={{ direction: "column", horizontal: "start" }}
        >
          <SegmentedControl
            selected={feedTab}
            onToggle={setFeedTab}
            buttons={FEED_TABS.map((tab) => ({ value: tab, label: tab }))}
          />
          <Row gap="24" vertical="center">
            <OrderDropdown value={order} onChange={setOrder} />
            <LocationDropdown value={location} onChange={setLocation} />
          </Row>
        </Row>
      </RevealFx>

      <RevealFx fillWidth delay={0.2}>
        <Grid
          columns={4}
          l={{ columns: 3 }}
          m={{ columns: 2 }}
          s={{ columns: 1 }}
          gap="24"
          paddingY="32"
          fillWidth
        >
          {projects.map((project) => (
            <ShowcaseCard key={project.id} project={project} />
          ))}
        </Grid>
      </RevealFx>
    </Column>
  );
}
