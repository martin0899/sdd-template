# Índice de Skills

Antes de invocar cualquier skill del proyecto, consulta esta tabla.
Carga SOLO el `SKILL.md` de la skill elegida; evita leer otros archivos de skills.

Cuando añadas, edites o elimines una skill, actualiza esta tabla manualmente.

**Regla de destino: toda skill nueva se crea bajo `.agents/skills/<nombre>/SKILL.md` (o el directorio del agente seleccionado). NUNCA bajo `.opencode/skills/` (vendor-managed por OpenSpec).**

| skill                               | trigger / description que la detona                                                                                             | ruta completa                                                    |
|-------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------|
| adversarial-review                  | Revisión adversarial / red-team / verificación independiente antes de archivar un cambio OpenSpec                                 | .agents/skills/adversarial-review/SKILL.md                        |
| brainstorming                       | Antes de cualquier trabajo creativo (features, componentes, funcionalidad): explora intención, requisitos y diseño antes de implementar | .agents/skills/brainstorming/SKILL.md                             |
| exploration-briefing                | Cierre de una exploración OpenSpec: briefing verificado y confirmación antes de crear el change ("briefing", "resumen de exploración") | .agents/skills/exploration-briefing/SKILL.md                   |
| code-auditing                       | Auditoría de calidad de código, vulnerabilidades de seguridad, deuda técnica, revisión pre-release                               | .agents/skills/code-auditing/SKILL.md                             |
| commit                              | Crear commits y pull requests enfocados siguiendo los estándares del repositorio                                                  | .agents/skills/commit/SKILL.md                                    |
| enrich-us                           | Analizar y enriquecer user stories con detalle técnico completo desde ticket directo o Jira                                       | .agents/skills/enrich-us/SKILL.md                                 |
| explain                             | Enseñar conceptos subyacentes con modelos mentales claros para cerrar brechas de conocimiento                                     | .agents/skills/explain/SKILL.md                                   |
| meta-prompt                         | Reescribir prompts aplicando mejores prácticas de prompt engineering para resultados precisos y completos                         | .agents/skills/meta-prompt/SKILL.md                               |
| grilling                            | Entrevista implacable para estresar un plan, decisión o idea; recorre el árbol de decisiones por rondas hasta el entendimiento compartido | .agents/skills/grilling/SKILL.md                                  |
| grill-me                            | Entrevista implacable para afinar un plan o diseño antes de comprometerlo                                                         | .agents/skills/grill-me/SKILL.md                                  |
| sdd-onboard-project                 | Onboarding SDD post-instalación: indagar código con graphify, adaptar docs/ al stack y configurar IA local Ollama                 | .agents/skills/sdd-onboard-project/SKILL.md                       |
| show-spec-working                   | Demostración en vivo de un spec, feature o ticket ("show me X", "demo X", "walk me through X")                                    | .agents/skills/show-spec-working/SKILL.md                         |
| requirements-discovery              | Definir un requerimiento desde conversación, documento, ticket o nota Obsidian (impacto BD, contratos API, navegación/UI) antes de especificar | .agents/skills/requirements-discovery/SKILL.md                    |
| spec-from-note                      | Convertir nota de requerimiento de Obsidian en changes y specs OpenSpec por capa ("lee la nota/lee el archivo <ruta>")            | .agents/skills/spec-from-note/SKILL.md                            |
| update-docs                         | Identificar y actualizar documentación técnica requerida tras cambios implementados                                               | .agents/skills/update-docs/SKILL.md                               |
| systematic-debugging                | Ante cualquier bug, fallo de test o comportamiento inesperado, antes de proponer arreglos                                         | .agents/skills/systematic-debugging/SKILL.md                      |
| using-git-worktrees                 | Aislar el workspace al iniciar trabajo de features o antes de ejecutar planes de implementación                                   | .agents/skills/using-git-worktrees/SKILL.md                       |
| writing-skills                      | Crear, editar o verificar skills antes de desplegarlas (TDD aplicado a documentación de proceso)                                  | .agents/skills/writing-skills/SKILL.md                            |
| find-skills                         | Descubrir e instalar skills del ecosistema Agent Skills ("¿hay una skill para X?", "busca una skill para X")                      | .agents/skills/find-skills/SKILL.md                               |
| frontend-design                     | Dirección visual distintiva e intencional al crear o rediseñar UI (paleta, tipografía, layout no genéricos)                       | .agents/skills/frontend-design/SKILL.md                           |
| web-design-guidelines               | Revisar código de UI contra las Web Interface Guidelines (accesibilidad, UX y diseño)                                             | .agents/skills/web-design-guidelines/SKILL.md                     |
| openspec-gate                       | Gatekeeper que verifica que exista un change OpenSpec activo antes de implementar. Rutea a workflows de OpenSpec cuando no existe. | .agents/skills/openspec-gate/SKILL.md                             |
| obsidian-summary                    | Genera resumen en Obsidian después de completar una especificación. Crea wiki portátil para referencia entre máquinas.           | .agents/skills/obsidian-summary/SKILL.md                          |
| obsidian-tests                      | Genera documentación de tests en Obsidian para regresión. Crea archivos de prueba para validación continua.                     | .agents/skills/obsidian-tests/SKILL.md                            |
| obsidian-briefing                   | Genera briefing técnico en Obsidian para cambios OpenSpec. Crea resumen técnico portátil para referencia entre máquinas.          | .agents/skills/obsidian-briefing/SKILL.md                         |
| obsidian-orchestration              | Orquesta la sincronización cerebro-OpenSpec (switch obsidianSync): briefing en apply, summary+tests+spec complete en archive.    | .agents/skills/obsidian-orchestration/SKILL.md                     |
| second-brain                        | Maneja vault Obsidian como Second Brain (CODE + PARA). Captura en 00_Notas/ y depura a destinations PARA.                        | .agents/skills/second-brain/SKILL.md                              |
