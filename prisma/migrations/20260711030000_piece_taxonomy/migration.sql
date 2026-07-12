-- Taxonomía nueva de PortfolioPiece: subcategorías libres (mín. 1 al
-- publicar, validado en la server action, no en el schema) y software
-- implementado. Aditivo: `tags` (legacy) se conserva sin cambios, arrays
-- nuevos nacen vacíos y no rompen piezas existentes.
ALTER TABLE "PortfolioPiece" ADD COLUMN     "subcategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "software" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
