import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const TEMPLATE_FILES = [
  "contrato-de-servicios-template.md",
  "formato-cotizacion-template.md",
  "formato-factura-datos.md",
] as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  if (!TEMPLATE_FILES.includes(filename as (typeof TEMPLATE_FILES)[number])) {
    return new NextResponse("Plantilla no encontrada", { status: 404 });
  }

  const filePath = path.join(process.cwd(), "src", "content", "plantillas", filename);
  const content = await readFile(filePath, "utf-8");

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
