# Reglas de Ahorro de Tokens
- NUNCA leas node_modules, .next, .git, public/.
- Lee solo archivos estrictamente necesarios. Evita ls -R.
- Respuestas: Cero texto explicativo. Solo código y comandos.
- Stack: Next.js App Router + Once-UI (tokens nativos).
- Git: Siempre crear rama feat/ o fix/ antes de modificar.

# Once-UI Workflow
- El paquete `@once-ui-system/core` trae un harness de AI coding en `node_modules/@once-ui-system/core/ai/` — úsalo como fuente primaria antes de escribir UI (excepción a la regla de no leer `node_modules`).
- Bootstrap obligatorio antes de cualquier tarea de UI: `ai/rules.compact.md` (reglas compactas de codegen).
- Resuelve el intent del usuario contra `ai/tasks/index.json` y carga solo el bundle de tarea correspondiente.
- Componentes: slices individuales en `ai/components/`; catálogo completo en `ai/catalog.json`.
- Antes de generar, revisa `ai/gotchas.json` (advertencias sobre Background, Card, RevealFx, Fade).
- Para composiciones de producción, revisa `ai/examples/blocks/manifest.json` (Pro blocks) como referencia de estructura.
- Documentación oficial (https://docs.once-ui.com) y el MCP `context7` (ver `.mcp.json`) son fallback solo si el harness local no cubre el caso.
- Para actualizar: `npm update @once-ui-system/core` && verifica changelog en docs (el harness se regenera con la nueva versión).
