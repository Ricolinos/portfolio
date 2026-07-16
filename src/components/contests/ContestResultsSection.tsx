import { Avatar, Column, Row, SmartLink, Tag, Text } from "@once-ui-system/core";
import { ContestEntryView } from "@/components/contests/ContestEntryView";
import type { ContestApplicationDetail } from "@/lib/contests";

/* ══ Resultados públicos (fase "awarded") ═════════════════════════════════
   Solo la entrega del GANADOR se renderiza públicamente; los runner-ups
   (FINALIST) se listan por nombre pero su propuesta nunca se expone —
   conservan sus derechos (mismo criterio que el aviso de "Solo el ganador
   cede derechos" ya mostrado en fase 2). ═══════════════════════════════ */

export function ContestResultsSection({ applications }: { applications: ContestApplicationDetail[] }) {
  const winner = applications.find((application) => application.entry?.placement === "WINNER");
  const finalists = applications.filter((application) => application.entry?.placement === "FINALIST");

  if (!winner) return null;

  const winnerName = winner.partner.name ?? winner.partner.username ?? "Partner";

  return (
    <Column fillWidth gap="24">
      <Column fillWidth gap="12" background="success-alpha-weak" radius="l" padding="24">
        <Tag size="s" variant="success" label="Fallo emitido" />
        <Row gap="12" vertical="center">
          <Avatar size="m" {...(winner.partner.imageUrl ? { src: winner.partner.imageUrl } : { value: winnerName[0]?.toUpperCase() ?? "P" })} />
          <Column gap="2">
            <Text variant="body-default-s" onBackground="neutral-weak">
              Ganador
            </Text>
            {winner.partner.username ? (
              <SmartLink href={`/${winner.partner.username}`} unstyled>
                <Text variant="heading-strong-s" onBackground="neutral-strong">
                  {winnerName}
                </Text>
              </SmartLink>
            ) : (
              <Text variant="heading-strong-s" onBackground="neutral-strong">
                {winnerName}
              </Text>
            )}
          </Column>
        </Row>
      </Column>

      {winner.entry && (
        <ContestEntryView
          partner={winner.partner}
          submittedAt={winner.entry.submittedAt}
          contentBlocks={winner.entry.contentBlocks}
          showAuthor={false}
        />
      )}

      {finalists.length > 0 && (
        <Column fillWidth gap="8">
          <Text variant="label-strong-s" onBackground="neutral-weak">
            Finalistas destacados
          </Text>
          <Row gap="8" wrap>
            {finalists.map((finalist) => {
              const name = finalist.partner.name ?? finalist.partner.username ?? "Partner";
              return finalist.partner.username ? (
                <SmartLink key={finalist.id} href={`/${finalist.partner.username}`} unstyled>
                  <Tag size="m" variant="neutral" label={name} />
                </SmartLink>
              ) : (
                <Tag key={finalist.id} size="m" variant="neutral" label={name} />
              );
            })}
          </Row>
        </Column>
      )}
    </Column>
  );
}
