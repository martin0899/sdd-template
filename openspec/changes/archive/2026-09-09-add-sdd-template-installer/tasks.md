# Tasks: add-sdd-template-installer

## 1. Limpieza del repo plantilla

- [x] 1.1 Eliminar `.agents/skills/sync-agent-symlinks/` y `.agents/skills/sdd-bootstrap-docs/`; verificar con `ls .agents/skills/` que no existen y que las demás skills están intactas
- [x] 1.2 Inicializar git en el proyecto (`git init`) y crear `.gitignore` raíz que excluya `graphify-out/`, `node_modules/`, `.sdd-backup-*/`; verificar con `git status` que el árbol inicial está limpio y trazable
- [x] 1.3 Extraer la tabla de detección de stack (archivos indicadores por tecnología) del contenido retirado de `sdd-bootstrap-docs` y guardarla como material de referencia para la skill de onboarding (puede ser una nota temporal fuera de `.agents/` o conservarse en el historial del change); verificar que la tabla quedó documentada en el artefacto correspondiente

## 2. Instalador mecánico

- [x] 2.1 Crear `install.sh` en la raíz con manifiesto de payload explícito (viaja: `openspec/`, `.agents/skills/`, `.opencode/` sin `node_modules`, `docs/`, `sdd-cli-guide.md`; no viaja: `install.sh`, README, `openspec/changes/*`) y verificación de prerrequisitos (`git`, `openspec`, `graphify` en PATH, con aborto e instrucciones si falta); verificar ejecutándolo con un prerrequisito oculto artificialmente y confirmando que aborta sin escribir nada
- [x] 2.2 Implementar reconocimiento del destino sin escritura: detectar existencia de `openspec/`, `.agents/`, `.opencode/`, `docs/` y presentar mapa de conflictos; verificar sobre un proyecto dummy vacío (reporta limpio) y sobre uno con `openspec/config.yaml` preexistente (reporta conflicto, cero escrituras)
- [x] 2.3 Implementar `--dry-run` que muestre plan completo (copias, conflictos, bloque de contexto a inyectar) sin tocar disco; verificar comparando hash del árbol del dummy antes/después del dry-run
- [x] 2.4 Implementar ejecución de `openspec init` no interactivo cuando el destino no tiene raíz OpenSpec; verificar en el dummy que `config.yaml`, `changes/` y `specs/` se crean
- [x] 2.5 Implementar inyección del contexto español por APPEND al campo `context` de `openspec/config.yaml` (preservando contexto preexistente si lo hay) y validar YAML resultante; verificar con dummy sin contexto (solo español), con contexto propio (ambos presentes), y `python3 -c "import yaml; yaml.safe_load(open('config.yaml'))"` sin error
- [x] 2.6 Implementar copia del payload con política anti-corrupción: archivo nuevo → copia directa; archivo existente → backup a `.sdd-backup-<fecha>/` preservando ruta relativa + pregunta (reemplazar/mantener); verificar sobre dummy con archivo en conflicto confirmando que el backup existe y el original queda restaurable
- [x] 2.7 Verificación de integración del instalador: ejecutar instalación completa sobre un segundo dummy existente y confirmar el resultado contra el Requirement "Manifiesto de payload" (exactamente el payload, sin `install.sh` ni cambios de la plantilla)

## 3. Skill de onboarding

- [x] 3.1 Crear `.agents/skills/sdd-onboard-project/SKILL.md` con frontmatter (name, description, author, version) y flujo: `graphify update .` → comentario estructurado del proyecto → oferta de persistir estructura como regla (opt-in, APPEND a `config.yaml`) → detección de stack con tabla de archivos indicadores → adaptación de `docs/` con confirmación por artefacto; verificar que la skill aparece en la lista de skills de OpenCode al abrir un proyecto instalado
- [x] 3.2 Incluir en la skill la regla de no escritura sin confirmación explícita por artefacto y el escenario de stack no detectable (pregunta al usuario); verificar revisando que ambos casos están cubiertos en los escenarios del SKILL.md
- [x] 3.3 Añadir a la skill la fase de guía Ollama: leer `docs/manuals/local-ai.md`, preguntar modelo para tareas de baja demanda, registrarlo en el contexto del proyecto solo si el usuario acepta; verificar que el flujo referencia la guía existente

## 4. Documentación de la plantilla

- [x] 4.1 Crear `docs/manuals/local-ai.md`: recomendación de modelos locales Ollama solo para tareas de baja demanda (RAM limitada), instrucciones de configuración, placeholder del modelo por usuario; verificar que el documento existe y es coherente con los estándares de `docs/documentation-standards.md`
- [x] 4.2 Crear README de la plantilla: qué es, cómo clonar, cómo ejecutar `install.sh` (flags `--dry-run`, `--yes`), paso opt-in `npx skills` para Claude Code (con alternativa manual de copiar a `.claude/skills/`), flujo de onboarding post-instalación, y qué viaja/no viaja; verificar que un lector nuevo puede seguir el README de principio a fin sin información faltante
- [x] 4.3 Revisar `sdd-cli-guide.md` para añadir una sección breve de "instalación en proyectos existentes" que enlace al README y al flujo de onboarding; verificar enlaces y coherencia con la guía existente
- [x] 4.4 Crear `docs/manuals/manual-installation.md` con pasos equivalentes a `install.sh` para entornos sin bash (Windows nativo: copia manual del payload, `openspec init --tools opencode`, append del bloque de contexto español, backup manual ante conflicto) y lista de verificación de paridad; verificar siguiendo la guía sobre un dummy y confirmando el resultado contra el Requirement "Manifiesto de payload"
- [x] 4.5 Añadir al README de la plantilla una sección "Instalación sin bash" que enlace a `docs/manuals/manual-installation.md`; verificar que el enlace funciona y es visible desde la sección de prerrequisitos

## 5. Verificación end-to-end

- [x] 5.1 Instalar la plantilla sobre un proyecto real de prueba existente (con código y stack detectable), correr onboarding completo y confirmar: contexto español presente en `config.yaml`, skills cargan en OpenCode, graphify-out generado, estructura comentada y regla persistida solo si se aceptó; verificar abriendo el proyecto con OpenCode y consultando `openspec context`
- [x] 5.2 Validar el change completo: `openspec validate --change "add-sdd-template-installer" --strict` sin errores
