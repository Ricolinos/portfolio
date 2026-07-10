"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Column, Feedback, Modal, Row, Textarea } from "@once-ui-system/core";
import { sendContactRequest } from "@/app/actions/collab";
import { BrandModalBackdrop } from "@/components/BrandModalBackdrop";

const modalBackdrop = <BrandModalBackdrop />;

/* ══ Solicitud de contacto de un cliente hacia un partner ═════════════════
   Vive en el perfil ajeno del partner (viewer logueado como cliente). ══ */
export function ContactPartnerDialog({
  isOpen,
  onClose,
  partnerId,
  partnerName,
}: {
  isOpen: boolean;
  onClose: () => void;
  partnerId: string;
  partnerName: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleClose = () => {
    if (sending) return;
    setMessage("");
    setError(null);
    onClose();
  };

  const handleSend = async () => {
    setSending(true);
    setError(null);
    const result = await sendContactRequest(partnerId, message);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage("");
    onClose();
    router.refresh();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Contactar a ${partnerName}`} backdrop={modalBackdrop}>
      <Column gap="16" fillWidth paddingTop="12">
        <Textarea
          id="contact-partner-message"
          label="Mensaje (opcional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          lines={4}
          placeholder="Cuéntale brevemente sobre tu proyecto..."
        />

        {error && <Feedback variant="danger" description={error} />}

        <Row fillWidth gap="8" horizontal="end">
          <Button variant="secondary" size="m" onClick={handleClose} disabled={sending}>
            Cancelar
          </Button>
          <Button variant="primary" size="m" onClick={handleSend} loading={sending}>
            Enviar solicitud
          </Button>
        </Row>
      </Column>
    </Modal>
  );
}
