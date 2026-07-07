#!/usr/bin/env tsx
/**
 * Agent Studio — Sistema Multi-Agente Autónomo local.
 *
 * Arquitectura:
 *   1. SUPERVISOR   — analiza el repo Next.js, detecta mockups sin conexión a
 *                     Supabase/Clerk y rutas de auth faltantes; delega subtareas.
 *   2. UI (Once UI) — actualiza páginas usando exclusivamente componentes y
 *                     tokens nativos de Once UI (sin CSS manual).
 *   3. DATOS        — sustituye mock data por consultas reales vía '@/lib/prisma'.
 *
 * Autocorrección: tras cada escritura se ejecuta `npx tsc --noEmit`; si hay
 * errores nuevos, el log se reenvía al agente responsable en un bucle `while`
 * hasta que el typecheck quede limpio (o se agote AGENT_MAX_FIX_ATTEMPTS).
 *
 * Uso:
 *   npm run agents                       # objetivo por defecto
 *   npm run agents -- "objetivo custom"  # objetivo específico
 *
 * Variables de entorno: ver .env.example (sección Agent Studio).
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

// ─────────────────────────────────────────────────────────────────────────────
// Configuración
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const MODEL = process.env.AGENT_MODEL ?? "claude-opus-4-8";
const MAX_TURNS = Number(process.env.AGENT_MAX_TURNS ?? 40);
const MAX_FIX_ATTEMPTS = Number(process.env.AGENT_MAX_FIX_ATTEMPTS ?? 5);
const MAX_TOKENS = 64_000;
const ONCE_UI_DOCS_HOST = "docs.once-ui.com";

// Directorios vetados para lectura/escritura (ahorro de tokens + seguridad).
const BLOCKED_TOP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "public",
  ".vercel",
]);
// El cliente Prisma generado es enorme y no debe tocarse.
const BLOCKED_PREFIXES = ["src/generated"];

const client = new Anthropic();

const usageTotals = { input: 0, output: 0 };

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de sistema de archivos (sandbox al root del proyecto)
// ─────────────────────────────────────────────────────────────────────────────

function resolveSafe(relPath: string, { forWrite = false } = {}): string {
  const abs = path.resolve(ROOT, relPath);
  const rel = path.relative(ROOT, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Ruta fuera del proyecto: ${relPath}`);
  }
  const top = rel.split(path.sep)[0];
  if (BLOCKED_TOP_DIRS.has(top) || BLOCKED_PREFIXES.some((p) => rel.startsWith(p))) {
    throw new Error(`Ruta vetada: ${rel}`);
  }
  const base = path.basename(rel);
  if (base.startsWith(".env") && base !== ".env.example") {
    throw new Error(`Acceso a secretos denegado: ${rel}`);
  }
  if (forWrite && !/\.(ts|tsx|js|jsx|css|scss|md|mdx|json|prisma)$/.test(base)) {
    throw new Error(`Extensión no permitida para escritura: ${rel}`);
  }
  return abs;
}

function listFiles(dir = ".", contains = ""): string {
  const start = resolveSafe(dir);
  const out: string[] = [];
  const walk = (d: string) => {
    if (out.length >= 400) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const abs = path.join(d, entry.name);
      const rel = path.relative(ROOT, abs);
      const top = rel.split(path.sep)[0];
      if (BLOCKED_TOP_DIRS.has(top) || BLOCKED_PREFIXES.some((p) => rel.startsWith(p))) {
        continue;
      }
      if (entry.isDirectory()) {
        walk(abs);
      } else if (!contains || rel.includes(contains)) {
        out.push(rel);
        if (out.length >= 400) return;
      }
    }
  };
  walk(start);
  return out.length ? out.join("\n") : "(sin resultados)";
}

function readFile(relPath: string): string {
  const abs = resolveSafe(relPath);
  const stat = fs.statSync(abs);
  if (stat.size > 200_000) throw new Error(`Archivo demasiado grande (${stat.size} bytes)`);
  return fs.readFileSync(abs, "utf8");
}

function writeFile(relPath: string, content: string): string {
  const abs = resolveSafe(relPath, { forWrite: true });
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");
  return path.relative(ROOT, abs);
}

function editFile(relPath: string, oldStr: string, newStr: string): string {
  const abs = resolveSafe(relPath, { forWrite: true });
  const current = fs.readFileSync(abs, "utf8");
  const occurrences = current.split(oldStr).length - 1;
  if (occurrences === 0) throw new Error("old_string no encontrado en el archivo");
  if (occurrences > 1) throw new Error(`old_string aparece ${occurrences} veces; debe ser único`);
  fs.writeFileSync(abs, current.replace(oldStr, newStr), "utf8");
  return path.relative(ROOT, abs);
}

// ─────────────────────────────────────────────────────────────────────────────
// Typecheck (bucle de autocorrección)
// ─────────────────────────────────────────────────────────────────────────────

interface TypecheckResult {
  ok: boolean;
  errors: string[];
}

function runTypecheck(): TypecheckResult {
  const res = spawnSync("npx", ["tsc", "--noEmit", "--pretty", "false"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 300_000,
  });
  const output = `${res.stdout ?? ""}\n${res.stderr ?? ""}`;
  const errors = output.split("\n").filter((l) => /error TS\d+/.test(l));
  return { ok: res.status === 0, errors };
}

// Errores preexistentes en el repo: el bucle solo exige no introducir nuevos.
let baselineErrors = new Set<string>();

function newErrors(check: TypecheckResult): string[] {
  return check.errors.filter((e) => !baselineErrors.has(e));
}

function typecheckReport(): { clean: boolean; report: string } {
  const check = runTypecheck();
  const fresh = newErrors(check);
  if (check.ok) return { clean: true, report: "✅ Typecheck limpio (0 errores)." };
  if (fresh.length === 0) {
    return {
      clean: true,
      report: `✅ Sin errores nuevos (persisten ${check.errors.length} preexistentes).`,
    };
  }
  const shown = fresh.slice(0, 30).join("\n");
  return {
    clean: false,
    report: `❌ ${fresh.length} error(es) nuevos de TypeScript:\n${shown}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Docs de Once UI (solo agente UI)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchOnceUiDocs(docPath: string): Promise<string> {
  const url = new URL(docPath, `https://${ONCE_UI_DOCS_HOST}/`);
  if (url.hostname !== ONCE_UI_DOCS_HOST) {
    throw new Error(`Solo se permite ${ONCE_UI_DOCS_HOST}`);
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} al consultar ${url.pathname}`);
  const html = await res.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 20_000) || "(página vacía)";
}

// ─────────────────────────────────────────────────────────────────────────────
// Definición de herramientas y agentes
// ─────────────────────────────────────────────────────────────────────────────

const fsTools: Anthropic.Tool[] = [
  {
    name: "list_files",
    description:
      "Lista archivos del proyecto (excluye node_modules, .next, .git, public, src/generated). Máx. 400 resultados.",
    input_schema: {
      type: "object",
      properties: {
        dir: { type: "string", description: "Directorio relativo al root. Default: '.'" },
        contains: { type: "string", description: "Filtro: solo rutas que contengan este texto" },
      },
    },
  },
  {
    name: "read_file",
    description: "Lee un archivo de texto del proyecto (ruta relativa al root).",
    input_schema: {
      type: "object",
      properties: { file: { type: "string", description: "Ruta relativa" } },
      required: ["file"],
    },
  },
  {
    name: "run_typecheck",
    description: "Ejecuta `npx tsc --noEmit` y reporta errores nuevos respecto al baseline.",
    input_schema: { type: "object", properties: {} },
  },
];

const writeTools: Anthropic.Tool[] = [
  {
    name: "write_file",
    description:
      "Crea o sobrescribe un archivo. Tras escribir se ejecuta el typecheck automáticamente y el resultado se incluye en la respuesta.",
    input_schema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Ruta relativa" },
        content: { type: "string", description: "Contenido completo del archivo" },
      },
      required: ["file", "content"],
    },
  },
  {
    name: "edit_file",
    description:
      "Reemplaza una cadena única (old_string debe aparecer exactamente 1 vez) dentro de un archivo existente. Tras editar se ejecuta el typecheck automáticamente.",
    input_schema: {
      type: "object",
      properties: {
        file: { type: "string" },
        old_string: { type: "string" },
        new_string: { type: "string" },
      },
      required: ["file", "old_string", "new_string"],
    },
  },
];

const onceUiDocsTool: Anthropic.Tool = {
  name: "fetch_once_ui_docs",
  description:
    "Consulta la documentación oficial de Once UI (docs.once-ui.com). Úsala SIEMPRE antes de usar un componente para verificar sus props reales. Ej.: '/components/flex', '/components/input', '/components/button'.",
  input_schema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Ruta de la página de docs, ej. '/components/flex'" },
    },
    required: ["path"],
  },
};

const delegateTool: Anthropic.Tool = {
  name: "delegate_task",
  description:
    "Delega una subtarea a un agente especialista y devuelve su informe final. 'ui' = especialista Once UI (actualiza páginas con componentes nativos). 'data' = ingeniero de datos (sustituye mock data por consultas Prisma reales). Incluye en 'context' las rutas de archivos relevantes y hallazgos concretos.",
  input_schema: {
    type: "object",
    properties: {
      specialist: { type: "string", enum: ["ui", "data"], description: "Agente destino" },
      objective: { type: "string", description: "Objetivo concreto y verificable de la subtarea" },
      context: {
        type: "string",
        description: "Archivos implicados, hallazgos del análisis y restricciones",
      },
    },
    required: ["specialist", "objective"],
  },
};

type SpecialistKind = "ui" | "data";

interface AgentDef {
  name: string;
  system: string;
  tools: Anthropic.Tool[];
}

const SUPERVISOR: AgentDef = {
  name: "SUPERVISOR",
  system: `Eres el SUPERVISOR de un estudio multi-agente que trabaja sobre un portfolio en Next.js (App Router) con Once UI, Clerk, Prisma y Supabase.

Tu misión:
1. Analizar la estructura del repositorio con list_files/read_file (concéntrate en src/app y src/components).
2. Identificar páginas estáticas o mockups que requieran conexión real a Supabase/Clerk (datos hardcodeados, arrays simulados, TODOs).
3. Detectar rutas faltantes en los flujos de autenticación de Clerk (sign-in, sign-up, callbacks, middleware, whitelist de rutas en once-ui.config.ts y RouteGuard).
4. Delegar subtareas concretas con delegate_task: 'ui' para trabajo visual con Once UI, 'data' para sustituir mock data por Prisma.

Reglas:
- NO escribes código tú mismo: solo analizas y delegas.
- Cada delegación debe incluir rutas de archivo exactas y criterios de aceptación.
- Lee solo los archivos estrictamente necesarios (ahorro de tokens).
- Al terminar, entrega un informe final: hallazgos, tareas delegadas y resultado de cada una.`,
  tools: [...fsTools, delegateTool],
};

const UI_AGENT: AgentDef = {
  name: "UI (Once UI)",
  system: `Eres el ESPECIALISTA EN UI de un portfolio Next.js. Trabajas EXCLUSIVAMENTE con Once UI (@once-ui-system/core).

Reglas estrictas:
- PROHIBIDO crear CSS/SCSS manual, estilos inline o componentes de UI nuevos.
- Usa solo componentes nativos (<Flex>, <Column>, <Row>, <Input>, <Button>, <Text>, <Heading>, etc.) y tokens globales de Once UI.
- Consulta fetch_once_ui_docs ANTES de usar cualquier componente: verifica props reales (ej. gap="16", horizontal="between" — no CSS).
- Respeta el patrón de las páginas existentes del repo (léelas primero).
- Si una ruta es nueva, recuerda que debe habilitarse en once-ui.config.ts y RouteGuard.tsx o dará 404 en cliente.
- Tras cada write_file/edit_file el sistema ejecuta 'npx tsc --noEmit'; corrige inmediatamente cualquier error nuevo que aparezca.

Al terminar, resume: archivos modificados y componentes Once UI utilizados.`,
  tools: [...fsTools, ...writeTools, onceUiDocsTool],
};

const DATA_AGENT: AgentDef = {
  name: "DATOS (Prisma/Supabase)",
  system: `Eres el INGENIERO DE DATOS de un portfolio Next.js con Prisma 7 + Supabase (Postgres) y Clerk.

Reglas:
- Sustituye datos simulados (arrays hardcodeados, mock data) por consultas asíncronas reales importando la instancia singleton: import { prisma } from "@/lib/prisma".
- Lee prisma/schema.prisma antes de escribir consultas: usa solo modelos y campos existentes.
- Prefiere Server Components async para data fetching; usa currentUser() de Clerk cuando la consulta dependa del usuario.
- NO modifiques el schema ni generes migraciones sin que la tarea lo pida explícitamente.
- El cliente generado vive en src/generated (vetado): confía en los tipos exportados por @/lib/prisma.
- Tras cada write_file/edit_file el sistema ejecuta 'npx tsc --noEmit'; corrige inmediatamente cualquier error nuevo que aparezca.

Al terminar, resume: archivos modificados y consultas Prisma introducidas.`,
  tools: [...fsTools, ...writeTools],
};

// ─────────────────────────────────────────────────────────────────────────────
// Ejecución de herramientas
// ─────────────────────────────────────────────────────────────────────────────

interface RunContext {
  wroteFiles: boolean;
}

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: RunContext,
): Promise<{ content: string; isError: boolean }> {
  try {
    switch (name) {
      case "list_files":
        return { content: listFiles(String(input.dir ?? "."), String(input.contains ?? "")), isError: false };
      case "read_file":
        return { content: readFile(String(input.file)), isError: false };
      case "run_typecheck":
        return { content: typecheckReport().report, isError: false };
      case "write_file": {
        const rel = writeFile(String(input.file), String(input.content));
        ctx.wroteFiles = true;
        const { report } = typecheckReport();
        return { content: `Archivo escrito: ${rel}\n${report}`, isError: false };
      }
      case "edit_file": {
        const rel = editFile(String(input.file), String(input.old_string), String(input.new_string));
        ctx.wroteFiles = true;
        const { report } = typecheckReport();
        return { content: `Archivo editado: ${rel}\n${report}`, isError: false };
      }
      case "fetch_once_ui_docs":
        return { content: await fetchOnceUiDocs(String(input.path)), isError: false };
      case "delegate_task": {
        const specialist = String(input.specialist) as SpecialistKind;
        if (specialist !== "ui" && specialist !== "data") {
          throw new Error(`Especialista desconocido: ${specialist}`);
        }
        const report = await runSpecialist(
          specialist,
          String(input.objective),
          String(input.context ?? ""),
        );
        return { content: report, isError: false };
      }
      default:
        return { content: `Herramienta desconocida: ${name}`, isError: true };
    }
  } catch (err) {
    return { content: err instanceof Error ? err.message : String(err), isError: true };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Agentic loop (manual, con streaming)
// ─────────────────────────────────────────────────────────────────────────────

function log(agent: string, msg: string): void {
  console.log(`\n\x1b[36m[${agent}]\x1b[0m ${msg}`);
}

async function runAgentLoop(
  agent: AgentDef,
  messages: Anthropic.MessageParam[],
  ctx: RunContext,
): Promise<string> {
  let finalText = "";
  let turns = 0;

  while (turns++ < MAX_TURNS) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: "adaptive" },
      system: agent.system,
      tools: agent.tools,
      messages,
    });
    stream.on("text", (delta) => process.stdout.write(delta));

    const message = await stream.finalMessage();
    usageTotals.input += message.usage.input_tokens;
    usageTotals.output += message.usage.output_tokens;

    if (message.stop_reason === "refusal") {
      log(agent.name, "⛔ Solicitud rechazada por políticas de seguridad; tarea abortada.");
      return "La tarea fue rechazada por los clasificadores de seguridad del modelo.";
    }

    messages.push({ role: "assistant", content: message.content });

    if (message.stop_reason === "pause_turn") continue;

    if (message.stop_reason === "max_tokens") {
      log(agent.name, "⚠️ Respuesta truncada por max_tokens.");
      break;
    }

    const toolUses = message.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    if (message.stop_reason !== "tool_use" || toolUses.length === 0) {
      finalText = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      break;
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUses) {
      log(agent.name, `🔧 ${toolUse.name}(${JSON.stringify(toolUse.input).slice(0, 160)})`);
      const { content, isError } = await executeTool(
        toolUse.name,
        (toolUse.input ?? {}) as Record<string, unknown>,
        ctx,
      );
      results.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content,
        is_error: isError,
      });
    }
    // Todos los tool_result en UN solo mensaje user (requisito del API).
    messages.push({ role: "user", content: results });
  }

  if (turns > MAX_TURNS) {
    log(agent.name, `⚠️ Límite de ${MAX_TURNS} turnos alcanzado.`);
  }
  return finalText || "(el agente terminó sin informe final)";
}

// ─────────────────────────────────────────────────────────────────────────────
// Especialistas con bucle de autocorrección (typecheck)
// ─────────────────────────────────────────────────────────────────────────────

async function runSpecialist(
  kind: SpecialistKind,
  objective: string,
  context: string,
): Promise<string> {
  const agent = kind === "ui" ? UI_AGENT : DATA_AGENT;
  log(agent.name, `▶️ Subtarea: ${objective}`);

  const ctx: RunContext = { wroteFiles: false };
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `OBJETIVO:\n${objective}\n\nCONTEXTO DEL SUPERVISOR:\n${context || "(sin contexto adicional)"}`,
    },
  ];

  let report = await runAgentLoop(agent, messages, ctx);

  // Bucle de autocorrección: reintenta hasta typecheck limpio o agotar intentos.
  let attempts = 0;
  while (ctx.wroteFiles) {
    const { clean, report: tscReport } = typecheckReport();
    if (clean) {
      log(agent.name, tscReport);
      break;
    }
    if (++attempts > MAX_FIX_ATTEMPTS) {
      log(agent.name, `⛔ Typecheck sigue fallando tras ${MAX_FIX_ATTEMPTS} intentos.`);
      report += `\n\n⚠️ ATENCIÓN: quedaron errores de TypeScript sin resolver:\n${tscReport}`;
      break;
    }
    log(agent.name, `🔁 Autocorrección ${attempts}/${MAX_FIX_ATTEMPTS}: typecheck con errores.`);
    messages.push({
      role: "user",
      content: `El typecheck del proyecto falló tras tus cambios. Corrige TODOS los errores nuevos y vuelve a verificar con run_typecheck antes de terminar.\n\n${tscReport}`,
    });
    report = await runAgentLoop(agent, messages, ctx);
  }

  log(agent.name, "✅ Subtarea finalizada.");
  return `INFORME DEL AGENTE ${agent.name}:\n${report}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_OBJECTIVE = `Audita el repositorio y ejecuta el pipeline completo:
1. Localiza páginas estáticas/mockups en src/app que deberían leer datos reales de Supabase (vía Prisma) o de Clerk.
2. Detecta rutas faltantes o mal configuradas en el flujo de autenticación (Clerk + RouteGuard + once-ui.config.ts).
3. Delega las correcciones a los especialistas y verifica sus informes.`;

async function main(): Promise<void> {
  const objective = process.argv[2] || DEFAULT_OBJECTIVE;

  console.log("🎬 Agent Studio — Supervisor + UI (Once UI) + Datos (Prisma/Supabase)");
  console.log(`   Modelo: ${MODEL} | Máx. turnos: ${MAX_TURNS} | Máx. autocorrecciones: ${MAX_FIX_ATTEMPTS}\n`);

  log("SETUP", "Calculando baseline de typecheck…");
  const baseline = runTypecheck();
  baselineErrors = new Set(baseline.errors);
  log(
    "SETUP",
    baseline.ok
      ? "Baseline limpio."
      : `Baseline con ${baseline.errors.length} errores preexistentes (solo se exigirá no introducir nuevos).`,
  );

  const ctx: RunContext = { wroteFiles: false };
  const report = await runAgentLoop(
    SUPERVISOR,
    [{ role: "user", content: objective }],
    ctx,
  );

  console.log("\n\n════════════════ INFORME FINAL DEL SUPERVISOR ════════════════\n");
  console.log(report);
  console.log(
    `\n📊 Tokens — entrada: ${usageTotals.input.toLocaleString()} | salida: ${usageTotals.output.toLocaleString()}`,
  );
}

main().catch((err) => {
  if (err instanceof Anthropic.AuthenticationError) {
    console.error("⛔ Credenciales inválidas: define ANTHROPIC_API_KEY en .env.local (o usa `ant auth login`).");
  } else if (err instanceof Anthropic.RateLimitError) {
    console.error("⛔ Rate limit alcanzado; reintenta en unos minutos.");
  } else if (err instanceof Anthropic.APIConnectionError) {
    console.error("⛔ Sin conexión con la API de Anthropic:", err.message);
  } else if (err instanceof Anthropic.APIError) {
    console.error(`⛔ Error del API (${err.status}):`, err.message);
  } else {
    console.error("⛔ Error inesperado:", err);
  }
  process.exit(1);
});
