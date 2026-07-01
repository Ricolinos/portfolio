import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ResourceFeed } from "@/components/resources/ResourceFeed";
import { RESOURCE_CATEGORY_SLUGS } from "@/components/resources/categories";

export async function generateStaticParams(): Promise<{ category: string }[]> {
  return Object.keys(RESOURCE_CATEGORY_SLUGS).map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const label = RESOURCE_CATEGORY_SLUGS[category];

  return {
    title: label ? `Recursos · ${label}` : "Recursos y Plantillas",
    description: "Mockups, plug-ins, imágenes, fotos e iconos para potenciar tus proyectos de diseño.",
  };
}

export default async function RecursosCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const label = RESOURCE_CATEGORY_SLUGS[category];

  if (!label) notFound();

  return <ResourceFeed initialCategory={label} />;
}
