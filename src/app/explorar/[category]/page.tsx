import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ExploreFeed } from "@/components/explore/ExploreFeed";
import { DesignerDirectory } from "@/components/explore/DesignerDirectory";
import { CATEGORY_SLUGS } from "@/components/explore/categories";

export async function generateStaticParams(): Promise<{ category: string }[]> {
  return Object.keys(CATEGORY_SLUGS).map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const label = CATEGORY_SLUGS[category];

  return {
    title: label ? `Explorar · ${label}` : "Explorar Plataforma",
    description: "Descubre las herramientas y soluciones B2B disponibles.",
  };
}

export default async function ExplorarCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const label = CATEGORY_SLUGS[category];

  if (!label) notFound();

  if (category === "designerds") {
    return <DesignerDirectory />;
  }

  return <ExploreFeed initialCategory={label} />;
}
