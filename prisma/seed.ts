import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const TEST_USER_ID = "user_test123";

async function main() {
  // Limpieza scoped al usuario de prueba: nunca toca usuarios reales de Clerk.
  await prisma.projectQuote.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.markdownExercise.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });

  const user = await prisma.user.create({
    data: {
      id: TEST_USER_ID,
      email: "ricardo.test@hubnerds.com",
      name: "Ricardo Gómez (Test)",
    },
  });
  console.log(`👤 Usuario de prueba creado: ${user.name} (${user.id})`);

  const quoteNexus = await prisma.projectQuote.create({
    data: {
      userId: user.id,
      title: "Rediseño Plataforma B2B - Nexus",
      clientName: "Nexus Corp",
      status: "APPROVED",
      total: "4500.00",
      calculationData: {
        columns: ["fase", "horas", "tarifa", "subtotal"],
        rows: [
          { fase: "UX Research", horas: 20, tarifa: 50, subtotal: 1000 },
          { fase: "UI Design", horas: 40, tarifa: 50, subtotal: 2000 },
          { fase: "Next.js Development", horas: 30, tarifa: 50, subtotal: 1500 },
        ],
        summary: { subtotal: 4500, descuento: 0, total: 4500 },
      },
    },
  });

  const quoteVolto = await prisma.projectQuote.create({
    data: {
      userId: user.id,
      title: "Campaña de Branding & Animación - Volto",
      clientName: "Volto Studio",
      status: "DRAFT",
      total: "2800.00",
      calculationData: {
        columns: ["fase", "horas", "tarifa", "subtotal"],
        rows: [
          { fase: "Scriptwriting", horas: 8, tarifa: 100, subtotal: 800 },
          { fase: "Storyboarding", horas: 8, tarifa: 100, subtotal: 800 },
          { fase: "Motion Graphics", horas: 12, tarifa: 100, subtotal: 1200 },
        ],
        summary: { subtotal: 2800, descuento: 0, total: 2800 },
      },
    },
  });
  console.log(`💰 Cotizaciones creadas: "${quoteNexus.title}", "${quoteVolto.title}"`);

  const exercises = await prisma.markdownExercise.createMany({
    data: [
      {
        userId: user.id,
        title: "Guía de componentes Once-UI",
        slug: "guia-componentes-once-ui",
        content: `# Guía de componentes Once-UI

Referencia rápida para construir vistas con **tokens globales** del sistema.

## Layout básico

- Usa \`Column\` y \`Row\` para estructura
- Espaciado con tokens: \`gap="16"\`, \`padding="24"\`
- Nunca hardcodees colores; usa \`onBackground\` / \`brand\`

## Ejemplo en código

\`\`\`tsx
import { Column, Heading, Text } from "@once-ui-system/core";

export function Card({ title }: { title: string }) {
  return (
    <Column gap="8" padding="24" radius="l" border="neutral-alpha-weak">
      <Heading variant="heading-strong-m">{title}</Heading>
      <Text onBackground="neutral-weak">Contenido de la tarjeta</Text>
    </Column>
  );
}
\`\`\`

## Checklist antes de commitear

1. Verifica tema claro **y** oscuro
2. Revisa responsive en móvil
3. Corre \`tsc --noEmit\`

> Nota: los componentes de la sección *Modules* no vienen en el paquete npm.
`,
      },
      {
        userId: user.id,
        title: "Flujo de cotización HUB-NERDS",
        slug: "flujo-cotizacion-hub-nerds",
        content: `# Flujo de cotización

Cómo viaja una cotización desde **borrador** hasta **aprobada**.

## Estados

| Estado | Descripción |
| --- | --- |
| \`DRAFT\` | Editable, solo visible para el autor |
| \`SENT\` | Enviada al cliente |
| \`APPROVED\` | Aceptada; congela \`calculationData\` |

## Estructura del JSON de cálculo

\`\`\`json
{
  "columns": ["fase", "horas", "tarifa", "subtotal"],
  "rows": [
    { "fase": "UX Research", "horas": 20, "tarifa": 50, "subtotal": 1000 }
  ]
}
\`\`\`

## Reglas de negocio

- Los subtotales se recalculan en el cliente: \`horas * tarifa\`
- El total se persiste como \`Decimal(12,2)\`
- Moneda por defecto: **MXN**

### Pendientes

- [ ] Versionado de cotizaciones
- [ ] Exportar a PDF
`,
      },
    ],
  });
  console.log(`📝 Ejercicios Markdown creados: ${exercises.count}`);

  console.log("🌱 Base de datos poblada con éxito");
}

main()
  .catch((error) => {
    console.error("❌ Error al poblar la base de datos:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
