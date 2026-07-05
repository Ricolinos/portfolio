import { Column, Heading, Row, Text } from "@once-ui-system/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import remarkGfm from "remark-gfm";
import { CustomMDX, ScrollToHash } from "@/components";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/utils/formatDate";

// Contenido vivo en Supabase: siempre renderiza fresco, sin prerender de build
export const dynamic = "force-dynamic";

const getExercise = cache((slug: string) =>
  prisma.markdownExercise.findUnique({ where: { slug: slug } }),
);

interface ExercisePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ExercisePageProps): Promise<Metadata> {
  const { slug } = await params;
  const exercise = await getExercise(slug);
  if (!exercise) return {};
  return { title: exercise.title };
}

export default async function ExercisePage({ params }: ExercisePageProps) {
  const { slug } = await params;
  const exercise = await getExercise(slug);

  if (!exercise) {
    notFound();
  }

  return (
    <Row fillWidth horizontal="center">
      <Column as="section" maxWidth="m" horizontal="center" gap="l" paddingTop="24" paddingX="l">
        <Column maxWidth="s" gap="16" horizontal="center" align="center">
          <Text variant="label-strong-m" onBackground="brand-weak">
            Ejercicio
          </Text>
          <Text variant="body-default-xs" onBackground="neutral-weak">
            {formatDate(exercise.createdAt.toISOString())}
          </Text>
          <Heading variant="display-strong-m">{exercise.title}</Heading>
        </Column>
        <Column as="article" maxWidth="s" fillWidth>
          <CustomMDX
            source={exercise.content}
            options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
          />
        </Column>
        <ScrollToHash />
      </Column>
    </Row>
  );
}
