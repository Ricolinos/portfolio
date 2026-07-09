"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  Column,
  Dialog,
  Feedback,
  Input,
  Modal,
  Row,
  Select,
  Switch,
  Text,
  Textarea,
} from "@once-ui-system/core";
import type { ClientResourceData } from "@/lib/collab";
import { validateExternalUrl } from "@/lib/externalLink";
import { BrandModalBackdrop } from "@/components/BrandModalBackdrop";
import { addClientResource, createCollabProject, updateClientResource, deleteClientResource } from "@/app/actions/collab";

const modalBackdrop = <BrandModalBackdrop />;

export interface ConnectionOption {
  value: string; // connectionId
  label: string; // nombre de la contraparte (partner o cliente, según quién abre el dialog)
}

/* ══ Nuevo proyecto en colaboración ═══════════════════════════════════════
   Compartido entre cliente y partner: solo cambia qué lista de connections
   (options) se le pasa desde cada vista. ═══════════════════════════════ */
export function NewCollabProjectDialog({
  isOpen,
  onClose,
  options,
}: {
  isOpen: boolean;
  onClose: () => void;
  options: ConnectionOption[];
}) {
  const router = useRouter();
  const [connectionId, setConnectionId] = useState<string>(options[0]?.value ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setConnectionId(options[0]?.value ?? "");
    setTitle("");
    setDescription("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!connectionId || !title.trim()) {
      setError("Elige a tu contraparte y escribe un título.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await createCollabProject(connectionId, title, description);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    reset();
    onClose();
    router.refresh();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nuevo proyecto en colaboración" backdrop={modalBackdrop}>
      <Column gap="16" fillWidth paddingTop="12">
        <Select
          id="collab-new-project-connection"
          label="Con quién"
          value={connectionId}
          onSelect={(value) => setConnectionId(value as string)}
          options={options}
        />
        <Input
          id="collab-new-project-title"
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej. Rediseño de marca"
        />
        <Textarea
          id="collab-new-project-description"
          label="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          lines={3}
        />

        {error && <Feedback variant="danger" description={error} />}

        <Row fillWidth gap="8" horizontal="end">
          <Button variant="secondary" size="m" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="m"
            onClick={handleSave}
            loading={saving}
            disabled={!connectionId || !title.trim()}
          >
            Crear proyecto
          </Button>
        </Row>
      </Column>
    </Modal>
  );
}

/* ══ Agregar recurso ("Mis recursos" del cliente) ═════════════════════════ */
export function AddClientResourceDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setLabel("");
    setUrl("");
    setDescription("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!label.trim() || !url.trim()) return;
    if (!validateExternalUrl(url)) {
      setError("La URL no es válida.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await addClientResource(label, url, description);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    reset();
    onClose();
    router.refresh();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Agregar recurso" backdrop={modalBackdrop}>
      <Column gap="16" fillWidth paddingTop="12">
        <Feedback
          variant="info"
          description="Aquí no se guardan archivos pesados: sube tus assets a tu servicio de nube favorito (Google Drive, Dropbox, OneDrive...) y comparte solo el link, cuidando que tenga permisos de acceso."
        />
        <Input
          id="client-resource-label"
          label="Etiqueta"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ej. Logotipos finales"
        />
        <Input
          id="client-resource-url"
          label="URL"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          placeholder="https://drive.google.com/..."
        />
        <Textarea
          id="client-resource-description"
          label="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          lines={2}
        />

        {error && <Feedback variant="danger" description={error} />}

        <Row fillWidth gap="8" horizontal="end">
          <Button variant="secondary" size="m" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="m"
            onClick={handleSave}
            loading={saving}
            disabled={!label.trim() || !url.trim()}
          >
            Guardar recurso
          </Button>
        </Row>
      </Column>
    </Modal>
  );
}

export interface ShareablePartner {
  id: string;
  name: string | null;
  username: string | null;
  imageUrl: string | null;
}

/* ══ Compartir un recurso con partners (connections ACCEPTED) ═════════════ */
export function ShareClientResourceDialog({
  isOpen,
  onClose,
  resource,
  partners,
}: {
  isOpen: boolean;
  onClose: () => void;
  resource: ClientResourceData | null;
  partners: ShareablePartner[];
}) {
  const router = useRouter();
  // El padre remonta este dialog con key={resource?.id} al cambiar de
  // recurso, así que el estado inicial siempre corresponde al recurso abierto.
  const [selected, setSelected] = useState<string[]>(resource?.sharedWith ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const toggle = (partnerId: string) => {
    setSelected((current) =>
      current.includes(partnerId) ? current.filter((id) => id !== partnerId) : [...current, partnerId],
    );
  };

  const handleSave = async () => {
    if (!resource) return;
    setSaving(true);
    setError(null);
    const result = await updateClientResource(resource.id, { sharedWith: selected });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
    router.refresh();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Compartir recurso" backdrop={modalBackdrop}>
      <Column gap="16" fillWidth paddingTop="12">
        {resource && (
          <Text variant="body-default-s" onBackground="neutral-weak" style={{ minWidth: 0, overflowWrap: "anywhere" }}>
            Elige con qué partners compartir <strong>{resource.label}</strong>.
          </Text>
        )}

        {partners.length === 0 ? (
          <Feedback
            variant="info"
            description="Todavía no tienes ningún partner con conexión aceptada. Cuando un partner acepte tu solicitud de contacto, aparecerá aquí para poder compartirle este recurso."
          />
        ) : (
          <Column gap="8" fillWidth>
            {partners.map((partner) => (
              <Row key={partner.id} fillWidth horizontal="between" vertical="center" gap="12">
                <Row gap="12" vertical="center" style={{ minWidth: 0 }}>
                  <Avatar
                    size="s"
                    {...(partner.imageUrl
                      ? { src: partner.imageUrl }
                      : { value: (partner.name?.[0] ?? partner.username?.[0] ?? "P").toUpperCase() })}
                  />
                  <Text
                    variant="label-default-s"
                    onBackground="neutral-strong"
                    style={{ minWidth: 0, overflowWrap: "anywhere" }}
                  >
                    {partner.name ?? partner.username ?? "Partner"}
                  </Text>
                </Row>
                <Switch
                  isChecked={selected.includes(partner.id)}
                  onToggle={() => toggle(partner.id)}
                  ariaLabel={`Compartir con ${partner.name ?? partner.username ?? "partner"}`}
                />
              </Row>
            ))}
          </Column>
        )}

        {error && <Feedback variant="danger" description={error} />}

        <Row fillWidth gap="8" horizontal="end">
          <Button variant="secondary" size="m" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="m"
            onClick={handleSave}
            loading={saving}
            disabled={partners.length === 0}
          >
            Guardar
          </Button>
        </Row>
      </Column>
    </Modal>
  );
}

/* ══ Eliminar recurso ══════════════════════════════════════════════════ */
export function DeleteClientResourceDialog({
  isOpen,
  onClose,
  resource,
}: {
  isOpen: boolean;
  onClose: () => void;
  resource: ClientResourceData | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleClose = () => {
    if (deleting) return;
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!resource) return;
    setDeleting(true);
    setError(null);
    const result = await deleteClientResource(resource.id);
    setDeleting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
    router.refresh();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="¿Eliminar este recurso?"
      footer={
        <Row fillWidth gap="8" horizontal="end">
          <Button variant="secondary" size="m" onClick={handleClose} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="danger" size="m" onClick={handleConfirm} loading={deleting}>
            Sí, eliminar
          </Button>
        </Row>
      }
    >
      <Column gap="16" fillWidth>
        <Feedback
          variant="danger"
          icon
          description="Esta acción no se puede deshacer. Dejará de estar disponible para los partners con los que lo compartiste."
        />
        {resource && (
          <Text variant="body-default-m">
            Vas a eliminar <strong>{resource.label}</strong>.
          </Text>
        )}
        {error && <Feedback variant="danger" description={error} />}
      </Column>
    </Dialog>
  );
}
