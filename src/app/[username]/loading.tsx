import { Column, Grid, Row, Skeleton } from "@once-ui-system/core";

const PIECE_KEYS = ["piece-1", "piece-2", "piece-3", "piece-4", "piece-5", "piece-6"];

// Aproxima el header (avatar + nombre + bio) y la grilla de proyectos que
// comparten ProfileView/ClientProfileView, sin distinguir rol de antemano.
export default function UserProfileLoading() {
  return (
    <Column fillWidth maxWidth="l" paddingY="40" paddingX="24" gap="32" horizontal="center">
      <Row gap="16" vertical="center" fillWidth>
        <Skeleton shape="circle" width="l" />
        <Column gap="8" fillWidth>
          <Skeleton shape="line" width="m" height="m" />
          <Skeleton shape="line" width="s" height="xs" />
        </Column>
      </Row>

      <Grid columns="3" s={{ columns: 1 }} gap="24" fillWidth>
        {PIECE_KEYS.map((key) => (
          <Column key={key} height="160" fillWidth>
            <Skeleton shape="block" fillWidth />
          </Column>
        ))}
      </Grid>
    </Column>
  );
}
