---
description: Supervisor del estudio multi-agente. Analiza el repo y delega subtareas concretas a los subagentes ui-once y data-prisma.
argument-hint: [tarea]
---

@.claude/roles/supervisor.md

## Subagentes disponibles para delegar
- `ui-once` (`.claude/agents/ui-once.md`): trabajo visual con Once UI.
- `data-prisma` (`.claude/agents/data-prisma.md`): sustituir mock data por Prisma/Supabase.

Usa el Agent tool con `subagent_type: ui-once` o `subagent_type: data-prisma` para delegar, en vez de simular el rol tú mismo.

## Tarea del usuario
$ARGUMENTS
