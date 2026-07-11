import { Column, Row, Skeleton } from "@once-ui-system/core";

const THREAD_KEYS = ["thread-1", "thread-2", "thread-3", "thread-4", "thread-5", "thread-6"];

// Aproxima el layout de 3 paneles de MessengerView (bandeja + hilo + panel
// de detalle) para evitar parpadeo mientras se resuelve el fetch del inbox.
export default function MensajesLoading() {
  return (
    <Row fillWidth fillHeight gap="8" padding="8">
      <Column
        gap="8"
        padding="12"
        radius="l"
        border="neutral-alpha-weak"
        fillHeight
        style={{ width: 320, minWidth: 0, flexShrink: 0 }}
      >
        {THREAD_KEYS.map((key) => (
          <Row key={key} gap="12" vertical="center" paddingY="8">
            <Skeleton shape="circle" width="m" />
            <Column gap="4" fillWidth>
              <Skeleton shape="line" width="l" height="xs" />
              <Skeleton shape="line" width="m" height="xs" />
            </Column>
          </Row>
        ))}
      </Column>
      <Column flex={1} fillWidth fillHeight radius="l" border="neutral-alpha-weak" padding="12">
        <Skeleton shape="block" fillWidth fillHeight />
      </Column>
    </Row>
  );
}
