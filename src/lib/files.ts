// Sin bucket de Storage todavía: los archivos subidos desde el editor se
// guardan como data URL directo en la BD (portada, galería, bloques del Canvas).
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}
