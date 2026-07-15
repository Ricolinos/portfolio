// Crea (si no existe) el bucket público `portfolio-media` de Supabase
// Storage para el editor de proyectos (portada + bloques del Canvas, ver
// lib/storageUpload.ts y app/actions/media.ts). Idempotente: el INSERT usa
// ON CONFLICT DO NOTHING, así que correrlo varias veces es seguro.
// Ejecutar: npm run setup:storage  (o npx tsx scripts/setup-storage.ts)
//
// NUNCA correr `prisma migrate` para esto: `storage.buckets`/`storage.objects`
// son tablas del esquema interno de Supabase Storage, no del esquema público
// de la app (prisma/schema.prisma) — este script usa $executeRaw puntual,
// sin tocar el esquema versionado por Prisma.
import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const BUCKET_ID = "portfolio-media";

interface BucketRow {
  id: string;
  public: boolean;
  file_size_limit: number | null;
  allowed_mime_types: string[] | null;
}

async function main() {
  await prisma.$executeRaw`
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      ${BUCKET_ID},
      ${BUCKET_ID},
      true,
      15728640,
      array['image/jpeg','image/png','image/webp','image/gif','video/mp4']
    )
    on conflict (id) do nothing
  `;

  const rows = await prisma.$queryRaw<BucketRow[]>`
    select id, public, file_size_limit, allowed_mime_types
    from storage.buckets
    where id = ${BUCKET_ID}
  `;

  const bucket = rows[0];
  if (!bucket) {
    throw new Error(`No se encontró el bucket "${BUCKET_ID}" tras el insert.`);
  }

  console.log("🪣 Bucket verificado:");
  console.log(`   id: ${bucket.id}`);
  console.log(`   public: ${bucket.public}`);
  console.log(`   file_size_limit: ${bucket.file_size_limit} bytes`);
  console.log(`   allowed_mime_types: ${bucket.allowed_mime_types?.join(", ")}`);
}

main()
  .catch((error) => {
    console.error("❌ Error creando el bucket de Storage:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
