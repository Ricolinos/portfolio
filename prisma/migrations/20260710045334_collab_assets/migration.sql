-- CreateTable
CREATE TABLE "AssetCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AssetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AssetTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetTaskTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "assetTemplateId" TEXT NOT NULL,

    CONSTRAINT "AssetTaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAsset" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assetTemplateId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAssetTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "assetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectAssetTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetCategory_name_key" ON "AssetCategory"("name");

-- CreateIndex
CREATE INDEX "AssetTemplate_categoryId_idx" ON "AssetTemplate"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetTemplate_categoryId_name_key" ON "AssetTemplate"("categoryId", "name");

-- CreateIndex
CREATE INDEX "AssetTaskTemplate_assetTemplateId_idx" ON "AssetTaskTemplate"("assetTemplateId");

-- CreateIndex
CREATE INDEX "ProjectAsset_projectId_idx" ON "ProjectAsset"("projectId");

-- CreateIndex
CREATE INDEX "ProjectAssetTask_assetId_idx" ON "ProjectAssetTask"("assetId");

-- AddForeignKey
ALTER TABLE "AssetTemplate" ADD CONSTRAINT "AssetTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AssetCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetTaskTemplate" ADD CONSTRAINT "AssetTaskTemplate_assetTemplateId_fkey" FOREIGN KEY ("assetTemplateId") REFERENCES "AssetTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAsset" ADD CONSTRAINT "ProjectAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CollabProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAsset" ADD CONSTRAINT "ProjectAsset_assetTemplateId_fkey" FOREIGN KEY ("assetTemplateId") REFERENCES "AssetTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssetTask" ADD CONSTRAINT "ProjectAssetTask_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ProjectAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: catálogo piloto "Branding" (AssetCategory > AssetTemplate > AssetTaskTemplate).
-- IDs fijos legibles (no cuid) para facilitar referencia/depuración manual.
INSERT INTO "AssetCategory" ("id", "name", "order") VALUES
  ('branding', 'Branding', 0);

INSERT INTO "AssetTemplate" ("id", "name", "categoryId", "order") VALUES
  ('branding-logotipo', 'Logotipo', 'branding', 0),
  ('branding-manual-marca', 'Manual de marca', 'branding', 1),
  ('branding-identidad-marca', 'Identidad de marca', 'branding', 2),
  ('branding-pieza-comercial', 'Pieza comercial', 'branding', 3),
  ('branding-redes-sociales', 'Paquetería de redes sociales', 'branding', 4);

-- Logotipo: checklist textual exacta pedida por el usuario.
INSERT INTO "AssetTaskTemplate" ("id", "title", "order", "assetTemplateId") VALUES
  ('branding-logotipo-t1', 'Primera serie de bocetos', 0, 'branding-logotipo'),
  ('branding-logotipo-t2', 'Feedback de bocetos', 1, 'branding-logotipo'),
  ('branding-logotipo-t3', 'Primeras propuestas de logo', 2, 'branding-logotipo'),
  ('branding-logotipo-t4', 'Selección del logo', 3, 'branding-logotipo'),
  ('branding-logotipo-t5', 'Propuesta final', 4, 'branding-logotipo'),
  ('branding-logotipo-t6', 'Revisión final', 5, 'branding-logotipo'),
  ('branding-logotipo-t7', 'Entrega final', 6, 'branding-logotipo'),
  ('branding-logotipo-t8', 'Aprobación final', 7, 'branding-logotipo');

-- Manual de marca: checklist sugerida.
INSERT INTO "AssetTaskTemplate" ("id", "title", "order", "assetTemplateId") VALUES
  ('branding-manual-marca-t1', 'Recopilación de elementos de marca', 0, 'branding-manual-marca'),
  ('branding-manual-marca-t2', 'Estructura del manual', 1, 'branding-manual-marca'),
  ('branding-manual-marca-t3', 'Primer borrador', 2, 'branding-manual-marca'),
  ('branding-manual-marca-t4', 'Revisión de contenido', 3, 'branding-manual-marca'),
  ('branding-manual-marca-t5', 'Ajustes finales', 4, 'branding-manual-marca'),
  ('branding-manual-marca-t6', 'Entrega final', 5, 'branding-manual-marca'),
  ('branding-manual-marca-t7', 'Aprobación final', 6, 'branding-manual-marca');

-- Identidad de marca: checklist sugerida.
INSERT INTO "AssetTaskTemplate" ("id", "title", "order", "assetTemplateId") VALUES
  ('branding-identidad-marca-t1', 'Investigación y moodboard', 0, 'branding-identidad-marca'),
  ('branding-identidad-marca-t2', 'Propuesta de paleta y tipografía', 1, 'branding-identidad-marca'),
  ('branding-identidad-marca-t3', 'Aplicaciones de prueba', 2, 'branding-identidad-marca'),
  ('branding-identidad-marca-t4', 'Revisión de identidad', 3, 'branding-identidad-marca'),
  ('branding-identidad-marca-t5', 'Ajustes finales', 4, 'branding-identidad-marca'),
  ('branding-identidad-marca-t6', 'Entrega final', 5, 'branding-identidad-marca'),
  ('branding-identidad-marca-t7', 'Aprobación final', 6, 'branding-identidad-marca');

-- Pieza comercial: checklist sugerida.
INSERT INTO "AssetTaskTemplate" ("id", "title", "order", "assetTemplateId") VALUES
  ('branding-pieza-comercial-t1', 'Brief y referencias', 0, 'branding-pieza-comercial'),
  ('branding-pieza-comercial-t2', 'Primer boceto o guion', 1, 'branding-pieza-comercial'),
  ('branding-pieza-comercial-t3', 'Producción', 2, 'branding-pieza-comercial'),
  ('branding-pieza-comercial-t4', 'Revisión', 3, 'branding-pieza-comercial'),
  ('branding-pieza-comercial-t5', 'Ajustes finales', 4, 'branding-pieza-comercial'),
  ('branding-pieza-comercial-t6', 'Entrega final', 5, 'branding-pieza-comercial'),
  ('branding-pieza-comercial-t7', 'Aprobación final', 6, 'branding-pieza-comercial');

-- Paquetería de redes sociales: checklist sugerida.
INSERT INTO "AssetTaskTemplate" ("id", "title", "order", "assetTemplateId") VALUES
  ('branding-redes-sociales-t1', 'Definición de formatos y piezas', 0, 'branding-redes-sociales'),
  ('branding-redes-sociales-t2', 'Primer set de diseños', 1, 'branding-redes-sociales'),
  ('branding-redes-sociales-t3', 'Revisión de set', 2, 'branding-redes-sociales'),
  ('branding-redes-sociales-t4', 'Ajustes finales', 3, 'branding-redes-sociales'),
  ('branding-redes-sociales-t5', 'Entrega final', 4, 'branding-redes-sociales'),
  ('branding-redes-sociales-t6', 'Aprobación final', 5, 'branding-redes-sociales');
