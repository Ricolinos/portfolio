// Seed de usuarios demo reales en Clerk + Supabase con proyectos de prueba.
// Idempotente: reutiliza usuarios de Clerk existentes (por email) y
// recrea los proyectos demo en cada corrida.
// Ejecutar: npm run seed:demo  (o npx tsx scripts/seed-demo-users.ts)
import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClerkClient } from "@clerk/backend";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

interface DemoUser {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "client" | "collaborator";
  whatsapp: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    email: "cliente.demo+clerk_test@hubnerds.com",
    username: "cliente_demo",
    password: "ClienteDemo!2026#hub",
    firstName: "Carla",
    lastName: "Cliente",
    role: "client",
    whatsapp: "+52 55 1234 5678",
  },
  {
    email: "partner.demo+clerk_test@hubnerds.com",
    username: "partner_demo",
    password: "PartnerDemo!2026#hub",
    firstName: "Pablo",
    lastName: "Partner",
    role: "collaborator",
    whatsapp: "+52 55 8765 4321",
  },
];

function demoCalculationData(concepto: string, total: number) {
  return {
    columns: ["fase", "horas", "tarifa", "subtotal"],
    rows: [{ fase: concepto, horas: 10, tarifa: total / 10, subtotal: total }],
    summary: { subtotal: total, descuento: 0, total },
  };
}

interface DemoQuote {
  title: string;
  status: string;
  total: number;
}

const CLIENT_QUOTES: DemoQuote[] = [
  { title: "Branding Restaurante La Milpa", status: "draft", total: 8500 },
  { title: "Videobug Torneo Verano", status: "active", total: 12000 },
  { title: "Plecas Animadas Noticiero", status: "completed", total: 6800 },
];

const PARTNER_QUOTES: DemoQuote[] = [
  { title: "Wipper Canal Deportes", status: "sent", total: 4500 },
  { title: "Motion Graphics Expo CDMX", status: "active", total: 15000 },
];

async function ensureClerkUser(demo: DemoUser): Promise<string> {
  const existing = await clerk.users.getUserList({ emailAddress: [demo.email] });
  if (existing.data.length > 0) {
    const user = existing.data[0];
    console.log(`♻️  Clerk: ${demo.email} ya existe (${user.id})`);
    return user.id;
  }

  const created = await clerk.users.createUser({
    emailAddress: [demo.email],
    username: demo.username,
    password: demo.password,
    firstName: demo.firstName,
    lastName: demo.lastName,
    publicMetadata: { role: demo.role, whatsapp: demo.whatsapp },
  });
  console.log(`✨ Clerk: usuario creado ${demo.email} (${created.id})`);
  return created.id;
}

async function seedQuotes(userId: string, quotes: DemoQuote[], clientName: string) {
  // Idempotencia: borra los proyectos previos de este usuario demo.
  await prisma.projectQuote.deleteMany({ where: { userId } });
  for (const quote of quotes) {
    await prisma.projectQuote.create({
      data: {
        userId,
        title: quote.title,
        clientName,
        status: quote.status,
        currency: "MXN",
        total: quote.total.toFixed(2),
        calculationData: demoCalculationData(quote.title, quote.total),
      },
    });
  }
  console.log(`💰 ${quotes.length} proyectos demo creados para ${userId}`);
}

async function main() {
  const ids: Record<string, string> = {};

  for (const demo of DEMO_USERS) {
    const clerkId = await ensureClerkUser(demo);
    ids[demo.username] = clerkId;

    const name = `${demo.firstName} ${demo.lastName}`;
    await prisma.user.upsert({
      where: { id: clerkId },
      update: {
        email: demo.email,
        username: demo.username,
        name,
        role: demo.role,
        whatsapp: demo.whatsapp,
      },
      create: {
        id: clerkId,
        email: demo.email,
        username: demo.username,
        name,
        role: demo.role,
        whatsapp: demo.whatsapp,
      },
    });
    console.log(`👤 Prisma: upsert de ${demo.username} (${clerkId})`);
  }

  await seedQuotes(ids.cliente_demo, CLIENT_QUOTES, "Carla Cliente");
  await seedQuotes(ids.partner_demo, PARTNER_QUOTES, "Pablo Partner");

  console.log("\n═══════════════ CREDENCIALES DEMO ═══════════════");
  for (const demo of DEMO_USERS) {
    console.log(`\n  Rol:      ${demo.role}${demo.role === "collaborator" ? " (Partner)" : ""}`);
    console.log(`  Clerk ID: ${ids[demo.username]}`);
    console.log(`  Email:    ${demo.email}`);
    console.log(`  Username: ${demo.username}`);
    console.log(`  Password: ${demo.password}`);
  }
  console.log("\n  (Emails +clerk_test: código de verificación 424242 en dev)");
  console.log("══════════════════════════════════════════════════");
}

main()
  .catch((error) => {
    console.error("❌ Error en seed de usuarios demo:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
