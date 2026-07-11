import { Column, Grid, Row, Skeleton } from "@once-ui-system/core";

const PIECE_KEYS = ["piece-1", "piece-2", "piece-3", "piece-4", "piece-5", "piece-6"];

// Neutro para ambas bifurcaciones de UserProfilePage (ProfileView estilo
// Behance / ClientProfileView estilo Monday): ambas comparten el mismo
// contenedor raíz (maxWidth l, horizontal center, paddingBottom 80,
// paddingX 32) y una cabecera en card (avatar + nombre) seguida de una
// grilla de contenido. La grilla real de ProfileView (columns=3 m={{2}}
// s={{1}} gap 20) es la referencia: ClientProfileView usa filas en vez de
// grid, así que aquí solo se puede aproximar, no igualar pixel a pixel.
export default function UserProfileLoading() {
  return (
    <Column fillWidth maxWidth="l" horizontal="center" paddingBottom="80">
      <Column fillWidth paddingX="32" paddingTop="32" gap="24">
        <Column
          fillWidth
          background="surface"
          border="neutral-alpha-weak"
          radius="l"
          padding="24"
          gap="16"
        >
          <Row gap="20" vertical="center" wrap>
            <Skeleton shape="circle" width="l" />
            <Column gap="8" fillWidth>
              <Skeleton shape="line" width="m" height="m" />
              <Skeleton shape="line" width="s" height="xs" />
            </Column>
          </Row>
        </Column>

        <Grid columns="3" m={{ columns: 2 }} s={{ columns: 1 }} gap="20" fillWidth>
          {PIECE_KEYS.map((key) => (
            <Column key={key} radius="l" style={{ aspectRatio: "4 / 3" }} fillWidth>
              <Skeleton shape="block" fillWidth fillHeight />
            </Column>
          ))}
        </Grid>
      </Column>
    </Column>
  );
}
