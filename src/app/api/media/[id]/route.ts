import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Sirve las imágenes de casos de estudio guardadas en MediaFile.data
// (base64 en BD por falta de bucket de Storage). El contenido de un id es
// inmutable, de ahí el cache agresivo.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const file = await prisma.mediaFile.findUnique({
    where: { id },
    select: { fileType: true, data: true },
  });
  if (!file?.data) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(file.data, "base64"), {
    headers: {
      "Content-Type": file.fileType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
