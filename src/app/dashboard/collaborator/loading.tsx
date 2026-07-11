import { Column, Grid, Skeleton } from "@once-ui-system/core";

const METRIC_KEYS = ["metric-1", "metric-2", "metric-3", "metric-4"];
const ROW_KEYS = ["row-1", "row-2", "row-3"];
const SECTION_KEYS = ["requests", "current", "finished"];

// Aproxima el layout real de CollaboratorDashboardPage (heading + métricas +
// acción + solicitudes pendientes + dos listas de proyectos).
export default function CollaboratorDashboardLoading() {
  return (
    <Column fillWidth paddingY="80" paddingX="24" gap="24" maxWidth="l" horizontal="center">
      <Column gap="8" fillWidth>
        <Skeleton shape="line" width="m" height="l" />
        <Skeleton shape="line" width="l" height="xs" />
      </Column>

      <Grid columns="4" s={{ columns: 2 }} fillWidth gap="16">
        {METRIC_KEYS.map((key) => (
          <Column key={key} height="80" fillWidth>
            <Skeleton shape="block" fillWidth />
          </Column>
        ))}
      </Grid>

      <Column width="160" height="40">
        <Skeleton shape="block" fillWidth />
      </Column>

      {SECTION_KEYS.map((section) => (
        <Column key={section} gap="12" fillWidth>
          <Skeleton shape="line" width="xs" height="m" />
          {ROW_KEYS.map((row) => (
            <Column key={`${section}-${row}`} height="56" fillWidth>
              <Skeleton shape="block" fillWidth />
            </Column>
          ))}
        </Column>
      ))}
    </Column>
  );
}
