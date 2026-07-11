import { Column, Grid, Row, Skeleton } from "@once-ui-system/core";

const CARD_KEYS = ["card-1", "card-2", "card-3", "card-4"];

// Aproxima la grilla de tarjetas de ExploreFeed (avatar + texto + imagen)
// dentro del slot {children} del layout de /explorar (Sidebar y buscador
// ya están montados por explorar/layout.tsx, no se repiten aquí).
export default function ExplorarLoading() {
  return (
    <Grid columns="2" s={{ columns: 1 }} gap="24" fillWidth>
      {CARD_KEYS.map((key) => (
        <Column key={key} gap="16" radius="l" border="neutral-alpha-weak" padding="20" fillWidth>
          <Row gap="12" vertical="center">
            <Skeleton shape="circle" width="m" />
            <Skeleton shape="line" width="s" height="s" />
          </Row>
          <Skeleton shape="line" width="l" height="xs" />
          <Column height="160" fillWidth>
            <Skeleton shape="block" fillWidth />
          </Column>
        </Column>
      ))}
    </Grid>
  );
}
