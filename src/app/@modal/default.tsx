// Slot paralelo @modal: sin match (toda navegación que no sea la ruta
// interceptada de abajo, o refresh/entrada directa a cualquier URL) no debe
// renderizar nada. Obligatorio para que el resto del sitio no rompa.
export default function ModalDefault() {
  return null;
}
