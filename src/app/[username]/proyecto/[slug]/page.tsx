import { auth } from "@clerk/nextjs/server";
import {
  Avatar,
  Badge,
  Column,
  Heading,
  Line,
  Media,
  Meta,
  Row,
  Schema,
  SmartLink,
  Tag,
  Text,
} from "@once-ui-system/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CustomMDX, ScrollToHash } from "@/components";
import { AppearanceScope } from "@/components/profile/AppearanceScope";
import { getCaseStudy, slugifyTitle } from "@/lib/caseStudies";
import { categoryExploreHref, softwareTagVariant } from "@/lib/pieceCategories";
import { prisma } from "@/lib/prisma";
import { baseURL } from "@/resources";
import { formatDate } from "@/utils/formatDate";

// Cabecera del visor (tarea "rediseño del editor", parte 2): fecha →
// categoría (Badge clickeable a /explorar) → subcategorías (Tags, tope 5 +
// "+X más") → software (Tags de color, más discreto) → título → usuario.
// Piezas viejas sin subcategories/software (arreglo vacío, ver
// utils/utils.ts y loadCaseStudy) simplemente no muestran esas filas — sin
// huecos, cada fila es condicional a tener contenido real.
const MAX_VISIBLE_SUBCATEGORIES = 5;

interface CaseStudyPageProps {
  params: Promise<{ username: string; slug: string }>;
}

// Resuelve autor y caso de estudio respetando visibilidad: si la pieza en BD
// está en borrador, solo el dueño puede verla. cache() dedupe entre
// generateMetadata y la página.
//
// Dos fuentes de contenido, mismo shape de salida ({post, author}):
// 1. BD (piece.markdownContent): piezas creadas desde el editor propio.
// 2. Archivo .mdx en src/content/portfolio (legado, fixtures de seed).
// La BD tiene prioridad; el archivo es fallback para piezas antiguas que
// nunca tuvieron fila con markdownContent.
const loadCaseStudy = cache(async (username: string, slug: string) => {
  const author = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      // Apariencia del perfil del dueño (marca/acento/neutro): el visor de
      // proyecto también repinta su fondo con la paleta guardada, mismo
      // patrón que /[username] (ver ProfileView.tsx / AppearanceScope.tsx).
      profileBrand: true,
      profileAccent: true,
      profileNeutral: true,
      portfolio: {
        select: {
          title: true,
          category: true,
          subcategories: true,
          software: true,
          coverUrl: true,
          gallery: true,
          markdownContent: true,
          releaseDate: true,
          createdAt: true,
          isPublic: true,
        },
      },
    },
  });
  if (!author) return null;

  const piece = author.portfolio.find((p) => slugifyTitle(p.title) === slug);

  if (piece && !piece.isPublic) {
    const { userId } = await auth();
    if (userId !== author.id) return null;
  }

  if (piece?.markdownContent) {
    const gallery = Array.isArray(piece.gallery) ? (piece.gallery as string[]) : [];
    const post = {
      slug,
      metadata: {
        title: piece.title,
        publishedAt: (piece.releaseDate ?? piece.createdAt).toISOString(),
        summary: "",
        image: piece.coverUrl ?? "",
        images: piece.coverUrl ? [piece.coverUrl, ...gallery] : gallery,
        tag: piece.category,
        subcategories: piece.subcategories,
        software: piece.software,
        team: [],
      },
      content: piece.markdownContent,
    };
    return { post, author };
  }

  const post = getCaseStudy(username, slug);
  if (!post) return null;

  return { post, author };
});

export async function generateMetadata({ params }: CaseStudyPageProps): Promise<Metadata> {
  const { username, slug } = await params;
  const result = await loadCaseStudy(username, slug);
  if (!result) return {};
  const { post, author } = result;
  const authorName = author.name ?? username;

  // Piezas creadas desde el editor propio siempre traen summary vacío (ver
  // loadCaseStudy): sin este fallback el og:description queda vacío y
  // muchos clientes de link preview (WhatsApp, Twitter/X) directamente
  // omiten la tarjeta si no hay descripción.
  const description = post.metadata.summary?.trim()
    ? post.metadata.summary
    : `Proyecto de ${authorName} (@${username}) en Hub-Nerds`;

  // coverUrl puede ser una data: URL (piezas viejas, antes de moverse a
  // Supabase Storage): Meta.generate solo distingue http(s) vs relativa, así
  // que una data: URL termina concatenada tras baseURL y produce una imagen
  // rota fuera del sitio. Data URL no sirve para OG → usa el generador.
  const image =
    post.metadata.image && !post.metadata.image.startsWith("data:")
      ? post.metadata.image
      : `/api/og/generate?title=${encodeURIComponent(post.metadata.title)}`;

  return Meta.generate({
    title: post.metadata.title,
    description,
    baseURL: baseURL,
    image,
    path: `/${username}/proyecto/${slug}`,
  });
}

export default async function PartnerCaseStudy({ params }: CaseStudyPageProps) {
  const { username, slug } = await params;

  const result = await loadCaseStudy(username, slug);
  if (!result) {
    notFound();
  }
  const { post, author } = result;

  const category = post.metadata.tag?.trim();
  const subcategories = (post.metadata.subcategories ?? []).filter((s) => s.trim());
  const software = (post.metadata.software ?? []).filter((s) => s.trim());
  const visibleSubcategories = subcategories.slice(0, MAX_VISIBLE_SUBCATEGORIES);
  const hiddenSubcategoriesCount = subcategories.length - visibleSubcategories.length;

  return (
    <AppearanceScope
      appearance={{
        brand: author.profileBrand,
        accent: author.profileAccent,
        neutral: author.profileNeutral,
      }}
    >
    <Column as="section" maxWidth="m" horizontal="center" gap="l">
      <Schema
        as="blogPosting"
        baseURL={baseURL}
        path={`/${username}/proyecto/${slug}`}
        title={post.metadata.title}
        description={post.metadata.summary}
        datePublished={post.metadata.publishedAt}
        dateModified={post.metadata.publishedAt}
        image={
          post.metadata.image || `/api/og/generate?title=${encodeURIComponent(post.metadata.title)}`
        }
        author={{
          name: author.name ?? username,
          url: `${baseURL}/${username}`,
          image: author.imageUrl ? `${baseURL}${author.imageUrl}` : undefined,
        }}
      />
      <Column maxWidth="s" gap="16" horizontal="center" align="center">
        <SmartLink href={`/${username}`}>
          <Text variant="label-strong-m">Proyectos</Text>
        </SmartLink>
        <Text variant="body-default-xs" onBackground="neutral-weak">
          {post.metadata.publishedAt && formatDate(post.metadata.publishedAt)}
        </Text>
        {category && <Badge title={category} href={categoryExploreHref(category)} />}
        {visibleSubcategories.length > 0 && (
          <Row gap="8" wrap horizontal="center">
            {visibleSubcategories.map((subcategory) => (
              <Tag key={subcategory} size="m" variant="neutral" label={subcategory} />
            ))}
            {hiddenSubcategoriesCount > 0 && (
              <Tag size="m" variant="brand" label={`+${hiddenSubcategoriesCount} más`} />
            )}
          </Row>
        )}
        {software.length > 0 && (
          <Row gap="8" wrap horizontal="center">
            {software.map((name) => (
              <Tag key={name} size="s" variant={softwareTagVariant(name)} label={name} />
            ))}
          </Row>
        )}
        <Heading variant="display-strong-m">{post.metadata.title}</Heading>
      </Column>
      <Row marginBottom="32" horizontal="center">
        <Row gap="12" vertical="center">
          <Avatar src={author.imageUrl ?? undefined} size="s" />
          <SmartLink href={`/${username}`}>
            <Text variant="label-default-m" onBackground="brand-weak">
              {author.name ?? username}
            </Text>
          </SmartLink>
        </Row>
      </Row>
      {post.metadata.images.length > 0 && (
        <Media
          priority
          aspectRatio="16 / 9"
          radius="m"
          alt={post.metadata.title}
          src={post.metadata.images[0]}
        />
      )}
      {/* `gap` separa los bloques de nivel superior que arma el editor
          (texto/imagen/carousel/tag/badge/status/progress/avatares/logos/
          tira/masonry). Varios de esos bloques se serializan a JSX "pelón"
          (Tag, Badge, StatusIndicator, ProgressBar, Scroller, MasonryGrid,
          Row/Column crudos) sin margen propio —a diferencia de p/headings/
          img, que ya traen su propio marginTop/marginBottom en los
          overrides de mdx.tsx—, así que sin este gap quedan pegados entre
          sí. Verificado en pantalla que un `gap` aquí no rompe el
          contenido legado (los .mdx viejos ya traían su propio margen,
          simplemente ganan un poco más de aire) y evita depender de que el
          usuario agregue un bloque "Divisor" a mano entre cada sección. */}
      <Column style={{ margin: "auto" }} as="article" maxWidth="xs" gap="16">
        <CustomMDX source={post.content} />
      </Column>
      <Column fillWidth horizontal="center" marginTop="40" gap="24">
        <Line maxWidth="40" />
        <SmartLink href={`/${username}`}>
          <Text variant="label-strong-m">Ver más proyectos de {author.name ?? username}</Text>
        </SmartLink>
      </Column>
      <ScrollToHash />
    </Column>
    </AppearanceScope>
  );
}
