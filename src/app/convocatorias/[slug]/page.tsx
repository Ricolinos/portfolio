import { Column, Heading, Line, Row, Tag, Text } from "@once-ui-system/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomMDX } from "@/components";
import { ContestApplicationPanel } from "@/components/contests/ContestApplicationPanel";
import { canApplyToContest, getContestBySlug } from "@/lib/contests";
import { contestBlocksToMarkdown, toContestBlocks } from "@/lib/contestBrief";
import { contestPhaseTag, formatContestMoney } from "@/lib/contestPhaseUi";
import { getOrCreateUser } from "@/lib/syncUser";
import { formatDate } from "@/utils/formatDate";

// Consulta la BD (convocatoria + rol del viewer): evita congelar el fetch en build.
export const dynamic = "force-dynamic";

interface ContestPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ContestPageProps): Promise<Metadata> {
  const { slug } = await params;
  const contest = await getContestBySlug(slug);
  if (!contest) return {};
  return {
    title: contest.title,
    description: `Convocatoria de ${contest.client.name ?? contest.client.username ?? "un cliente"} en Hub-Nerds`,
  };
}

export default async function ContestDetailPage({ params }: ContestPageProps) {
  const { slug } = await params;
  const [contest, dbUser] = await Promise.all([getContestBySlug(slug), getOrCreateUser()]);
  if (!contest) notFound();

  const isOwner = dbUser?.id === contest.clientId;
  // Un borrador solo lo ve su dueño: mismo criterio de privacidad que
  // perfiles de cliente (404 a terceros, ver src/app/[username]/page.tsx).
  if (contest.status === "DRAFT" && !isOwner) notFound();

  const viewerApplication = dbUser
    ? (contest.applications.find((application) => application.partnerId === dbUser.id) ?? null)
    : null;

  const applyGuard = canApplyToContest(
    {
      status: contest.status,
      applyDeadline: new Date(contest.applyDeadline),
      submitDeadline: new Date(contest.submitDeadline),
      resultsDate: new Date(contest.resultsDate),
      maxApplicants: contest.maxApplicants,
      applicationCount: contest.applicationCount,
    },
    { role: dbUser?.role, hasExistingApplication: Boolean(viewerApplication) },
  );

  const phase = contestPhaseTag(contest.phase);
  const briefMarkdown = contestBlocksToMarkdown(toContestBlocks(contest.brief));
  const termsMarkdown = contestBlocksToMarkdown(toContestBlocks(contest.terms));
  const clientName = contest.client.name ?? contest.client.username ?? "Cliente";

  return (
    <Column fillWidth maxWidth="m" paddingY="48" paddingX="24" gap="32" horizontal="center">
      <Column gap="12" fillWidth>
        <Row gap="8" vertical="center" wrap>
          <Tag size="m" variant={phase.variant} label={phase.label} />
          {contest.projectType && <Tag size="m" variant="neutral" label={contest.projectType} />}
        </Row>
        <Heading variant="display-strong-xs">{contest.title}</Heading>
        <Text variant="body-default-m" onBackground="neutral-weak">
          Convocatoria de {clientName}
        </Text>
      </Column>

      <Row fillWidth gap="24" wrap background="neutral-alpha-weak" radius="l" padding="24">
        <Column gap="4" style={{ flex: 1, minWidth: 160 }}>
          <Text variant="label-default-s" onBackground="neutral-weak">
            Premio
          </Text>
          <Text variant="display-strong-xs" onBackground="brand-medium">
            {formatContestMoney(contest.prizeAmount, contest.currency)}
          </Text>
        </Column>
        <Column gap="4" style={{ flex: 1, minWidth: 160 }}>
          <Text variant="label-default-s" onBackground="neutral-weak">
            Fee de Terna (por finalista)
          </Text>
          <Text variant="heading-strong-m" onBackground="neutral-strong">
            {formatContestMoney(contest.shortlistFee, contest.currency)}
          </Text>
        </Column>
        <Column gap="4" style={{ flex: 1, minWidth: 160 }}>
          <Text variant="label-default-s" onBackground="neutral-weak">
            {contest.maxApplicants != null ? "Cupo" : "Postulaciones"}
          </Text>
          <Text variant="heading-strong-m" onBackground="neutral-strong">
            {contest.maxApplicants != null
              ? `${contest.applicationCount} / ${contest.maxApplicants}`
              : contest.applicationCount === 1
                ? "1 postulación"
                : `${contest.applicationCount} postulaciones`}
          </Text>
        </Column>
      </Row>

      <Row fillWidth gap="24" wrap>
        <Column gap="4" style={{ flex: 1, minWidth: 160 }}>
          <Text variant="label-default-s" onBackground="neutral-weak">
            Cierre de postulaciones
          </Text>
          <Text variant="body-default-m">{formatDate(contest.applyDeadline)}</Text>
        </Column>
        <Column gap="4" style={{ flex: 1, minWidth: 160 }}>
          <Text variant="label-default-s" onBackground="neutral-weak">
            Cierre de entrega (Terna)
          </Text>
          <Text variant="body-default-m">{formatDate(contest.submitDeadline)}</Text>
        </Column>
        <Column gap="4" style={{ flex: 1, minWidth: 160 }}>
          <Text variant="label-default-s" onBackground="neutral-weak">
            Fecha de resultados
          </Text>
          <Text variant="body-default-m">{formatDate(contest.resultsDate)}</Text>
        </Column>
      </Row>

      {contest.phase === "breached" && (
        <Row fillWidth background="danger-alpha-weak" radius="l" padding="16">
          <Text variant="body-default-s" onBackground="danger-strong">
            El fallo de esta convocatoria no se publicó a tiempo.
          </Text>
        </Row>
      )}

      <Column fillWidth background="brand-alpha-weak" radius="l" padding="16" gap="4">
        <Text variant="body-default-s" onBackground="neutral-strong">
          Solo el ganador cede derechos; los finalistas conservan su trabajo.
        </Text>
        <Text variant="body-default-s" onBackground="neutral-strong">
          Cada finalista de la Terna cobra el fee garantizado.
        </Text>
      </Column>

      <ContestApplicationPanel
        contestId={contest.id}
        canApply={applyGuard.ok}
        cannotApplyReason={applyGuard.ok ? null : applyGuard.error}
        isOwner={isOwner}
        applicationCount={contest.applicationCount}
        viewerApplication={
          viewerApplication
            ? { id: viewerApplication.id, status: viewerApplication.status, pitch: viewerApplication.pitch }
            : null
        }
        isLoggedOut={!dbUser}
      />

      <Line background="neutral-alpha-medium" />

      {briefMarkdown && (
        <Column fillWidth gap="12">
          <Heading variant="heading-strong-s">Brief</Heading>
          <Column as="article" gap="16">
            <CustomMDX source={briefMarkdown} />
          </Column>
        </Column>
      )}

      {termsMarkdown && (
        <Column fillWidth gap="12">
          <Heading variant="heading-strong-s">Cláusulas</Heading>
          <Column as="article" gap="16">
            <CustomMDX source={termsMarkdown} />
          </Column>
        </Column>
      )}

      {contest.rightsPolicy && (
        <Column fillWidth gap="12">
          <Heading variant="heading-strong-s">Política de derechos</Heading>
          <Text variant="body-default-m" onBackground="neutral-weak" style={{ whiteSpace: "pre-wrap" }}>
            {contest.rightsPolicy}
          </Text>
        </Column>
      )}
    </Column>
  );
}
