import { Button, Column, Grid, Heading, Row, Text } from "@once-ui-system/core";
import { ContestApplicationCard } from "@/components/contests/ContestApplicationCard";
import { ContestCard } from "@/components/contests/ContestCard";
import { getApplicationsForPartner, getContestsForClient, getPublishedContests } from "@/lib/contests";
import { getOrCreateUser } from "@/lib/syncUser";

export const metadata = {
  title: "Convocatorias",
  description: "Concursos creativos justos: premio, fee de Terna garantizado y fechas transparentes.",
};

// Consulta la BD (convocatorias + rol del usuario logueado): evita congelar el fetch en build.
export const dynamic = "force-dynamic";

export default async function ContestsPage() {
  const dbUser = await getOrCreateUser();

  const [published, clientContests, myApplications] = await Promise.all([
    getPublishedContests(),
    dbUser?.role === "client" ? getContestsForClient(dbUser.id) : Promise.resolve([]),
    dbUser?.role === "collaborator" ? getApplicationsForPartner(dbUser.id) : Promise.resolve([]),
  ]);

  return (
    <Column fillWidth maxWidth="l" paddingY="48" paddingX="24" gap="40" horizontal="center">
      <Row fillWidth horizontal="between" vertical="center" wrap gap="16">
        <Column gap="4">
          <Heading variant="display-strong-xs">Convocatorias</Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            Concursos creativos justos: premio, fee de Terna garantizado y fechas claras desde el inicio.
          </Text>
        </Column>
        {dbUser?.role === "client" && (
          <Button variant="primary" size="m" prefixIcon="plus" href="/convocatorias/nueva">
            Nueva convocatoria
          </Button>
        )}
      </Row>

      {dbUser?.role === "client" && clientContests.length > 0 && (
        <Column fillWidth gap="16">
          <Heading variant="heading-strong-s">Mis convocatorias</Heading>
          <Grid columns="2" s={{ columns: 1 }} gap="24" fillWidth>
            {clientContests.map((contest) => (
              <ContestCard
                key={contest.id}
                contest={contest}
                client={{ id: dbUser.id, username: dbUser.username, name: dbUser.name, imageUrl: dbUser.imageUrl }}
              />
            ))}
          </Grid>
        </Column>
      )}

      {dbUser?.role === "collaborator" && myApplications.length > 0 && (
        <Column fillWidth gap="16">
          <Heading variant="heading-strong-s">Mis postulaciones</Heading>
          <Grid columns="2" s={{ columns: 1 }} gap="24" fillWidth>
            {myApplications.map((application) => (
              <ContestApplicationCard key={application.id} application={application} />
            ))}
          </Grid>
        </Column>
      )}

      <Column fillWidth gap="16">
        <Heading variant="heading-strong-s">Abiertas</Heading>
        {published.length === 0 ? (
          <Text variant="body-default-m" onBackground="neutral-weak">
            Todavía no hay convocatorias publicadas. Vuelve pronto.
          </Text>
        ) : (
          <Grid columns="2" s={{ columns: 1 }} gap="24" fillWidth>
            {published.map((contest) => (
              <ContestCard key={contest.id} contest={contest} />
            ))}
          </Grid>
        )}
      </Column>
    </Column>
  );
}
