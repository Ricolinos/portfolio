import { Card, Column, Heading, Row, Text } from "@once-ui-system/core";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/utils/formatDate";

// Contenido vivo en Supabase: siempre renderiza fresco, sin prerender de build
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ejercicios",
  description: "Ejercicios y apuntes en Markdown publicados desde Supabase.",
};

export default async function ExercisesPage() {
  const exercises = await prisma.markdownExercise.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, slug: true, createdAt: true },
  });

  return (
    <Row fillWidth horizontal="center">
      <Column as="section" maxWidth="m" gap="l" paddingTop="24" paddingX="l">
        <Column maxWidth="s" gap="16" horizontal="center" align="center" fillWidth>
          <Text variant="label-strong-m" onBackground="brand-weak">
            Ejercicios
          </Text>
          <Heading variant="display-strong-m">Ejercicios y apuntes</Heading>
          <Text variant="body-default-l" onBackground="neutral-weak">
            Una colección de ejercicios y notas publicadas para practicar y compartir.
          </Text>
        </Column>
        {exercises.length === 0 ? (
          <Column fillWidth horizontal="center">
            <Text variant="body-default-m" onBackground="neutral-weak">
              Aún no hay ejercicios publicados.
            </Text>
          </Column>
        ) : (
          <Column fillWidth gap="8">
            {exercises.map((exercise) => (
              <Card
                key={exercise.id}
                fillWidth
                href={`/ejercicios/${exercise.slug}`}
                transition="micro-medium"
                border="transparent"
                background="transparent"
                padding="l"
                radius="l"
                direction="column"
                gap="8"
              >
                <Text variant="heading-strong-l" wrap="balance">
                  {exercise.title}
                </Text>
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  {formatDate(exercise.createdAt.toISOString())}
                </Text>
              </Card>
            ))}
          </Column>
        )}
      </Column>
    </Row>
  );
}
