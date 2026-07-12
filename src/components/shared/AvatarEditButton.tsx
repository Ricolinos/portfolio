"use client";

import { Avatar, type AvatarProps, Icon } from "@once-ui-system/core";
import styles from "./AvatarEditButton.module.scss";

/* ══ Avatar editable con overlay al hover (compartido) ══════════════════
   Extraído del botón "avatarButton"/"avatarEdit" duplicado en
   ProfileView.tsx / ClientProfileView.tsx: Avatar clickeable que muestra un
   overlay con icono de editar al hacer hover o focus. Reutilizado por
   ProjectLogoControl para el logotipo del proyecto. ═══════════════════════ */

export function AvatarEditButton({
  avatarProps,
  size = "xl",
  ariaLabel,
  onClick,
  disabled,
}: {
  avatarProps: AvatarProps;
  size?: AvatarProps["size"];
  ariaLabel: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={styles.avatarButton}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
    >
      <Avatar {...avatarProps} size={size} />
      <span className={styles.avatarEdit}>
        <Icon name="edit" size="s" />
      </span>
    </button>
  );
}
