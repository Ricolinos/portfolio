import { Column, Row, Skeleton } from "@once-ui-system/core";

const RAIL_TAB_KEYS = ["rail-1", "rail-2", "rail-3"];
const THREAD_KEYS = ["thread-1", "thread-2", "thread-3", "thread-4", "thread-5", "thread-6"];

// Replica los 3 paneles reales de MessengerView: mismo Row raíz (gap 8,
// padding 8), ProjectRail (64px, pestañas circulares), ConversationList
// (320px fijo, header + buscador + segmented control + filas) y
// ConversationPanel (flex restante). DetailsPanel se omite: no está montado
// por defecto (solo aparece si el usuario abre "info").
export default function MensajesLoading() {
  return (
    <Row fillWidth fillHeight gap="8" padding="8" style={{ minWidth: 0 }}>
      {/* ProjectRail */}
      <Column
        background="surface"
        border="neutral-alpha-weak"
        radius="l"
        gap="8"
        paddingY="12"
        horizontal="center"
        style={{ width: 64, minWidth: 0, flexShrink: 0 }}
      >
        {RAIL_TAB_KEYS.map((key) => (
          <Skeleton key={key} shape="circle" width="s" />
        ))}
      </Column>

      {/* ConversationList */}
      <Column
        background="surface"
        border="neutral-alpha-weak"
        radius="l"
        gap="12"
        padding="16"
        fillHeight
        style={{ width: 320, minWidth: 0, flexShrink: 0 }}
      >
        <Row
          fillWidth
          horizontal="between"
          vertical="center"
          paddingBottom="16"
          borderBottom="neutral-alpha-weak"
        >
          <Skeleton shape="line" width="s" height="m" />
          <Row gap="4">
            <Skeleton shape="circle" width="xs" />
            <Skeleton shape="circle" width="xs" />
          </Row>
        </Row>
        <Column height="40" fillWidth>
          <Skeleton shape="block" fillWidth />
        </Column>
        <Column height="32" fillWidth>
          <Skeleton shape="block" fillWidth />
        </Column>
        <Column gap="12" fillWidth style={{ flex: 1, minHeight: 0 }}>
          {THREAD_KEYS.map((key) => (
            <Row key={key} gap="12" vertical="center">
              <Skeleton shape="circle" width="m" />
              <Column gap="4" fillWidth>
                <Skeleton shape="line" width="l" height="xs" />
                <Skeleton shape="line" width="m" height="xs" />
              </Column>
            </Row>
          ))}
        </Column>
      </Column>

      {/* ConversationPanel */}
      <Column
        flex={1}
        fillWidth
        fillHeight
        background="surface"
        border="neutral-alpha-weak"
        radius="l"
        padding="12"
      >
        <Skeleton shape="block" fillWidth fillHeight />
      </Column>
    </Row>
  );
}
