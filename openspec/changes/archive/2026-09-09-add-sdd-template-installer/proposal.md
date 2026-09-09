# Proposal: add-sdd-template-installer

## Why

La configuración SDD (OpenSpec, skills portables, comandos opencode, estándares de documentación) se acumuló en este proyecto a partir de otros (los skills cargan `author: chapur-pay` y `LIDR.co`), pero no existe un mecanismo para llevarla a proyectos nuevos o existentes: cada migración es copiar/pegar manual, con riesgo de corromper el proyecto destino y sin garantía de que las reglas de idioma (español) viajen. Este proyecto debe convertirse en la fuente canónica: un repo plantilla en git con un instalador no destructivo y un flujo de onboarding con graphify.

## What Changes

- **Repo plantilla en git**: inicializar git en este proyecto para que sea clonable; definir manifiesto explícito de qué viaja al destino (payload) y qué no (instalador, artefactos de trabajo del propio repo plantilla).
- **Instalador no destructivo (`install.sh`)**: script mecánico que, dado un proyecto destino existente, verifica prerrequisitos (git, openspec CLI, graphify), reconoce el estado del destino sin escribir, ejecuta `openspec init` normal (no interactivo), inyecta el contexto de idioma español por APPEND en `openspec/config.yaml` (jamás reemplazo), y copia el payload con política anti-corrupción (`--dry-run`, backup a `.sdd-backup-<fecha>/`, pregunta ante conflicto).
- **Skill de onboarding post-instalación (nueva)**: flujo del agente para proyectos existentes: `graphify update .` → comentar la estructura del código → ofrecer persistir la estructura como regla en `openspec/config.yaml` → adaptar `docs/` (estándares backend/frontend) al stack real del proyecto → guiar la configuración de IA local (Ollama) para tareas de baja demanda.
- **Retirar skills**:
  - `sync-agent-symlinks` (LIDR.co): obsoleta — asume origen canónico `ai-specs/skills` inexistente aquí, y `.agents/skills/` ya es leído nativamente por OpenCode, Cursor, Codex CLI, Gemini CLI, Kiro, Antigravity y OpenClaw. El symlink hacia `.claude/skills/` además está roto (Claude Code lo contamina con `.system/`, issue #20820).
  - `sdd-bootstrap-docs` (chapur-pay): su caso de uso (generar docs desde cero) desaparece porque `docs/` viaja completo con la plantilla; su lógica útil (tabla de detección de stack por archivos indicadores) se traslada a la nueva skill de onboarding. Mantener ambas produciría colisión de triggers.
- **Soporte Claude Code vía `npx skills`** (Vercel / skills.sh): documentado como paso opt-in; no se implementa sync por copia propio.
- **Guía de IA local**: nueva página `docs/manuals/local-ai.md` con recomendación de usar modelos Ollama locales solo para tareas de baja demanda (RAM limitada), con placeholder para que cada usuario configure su modelo.
- **Guía de instalación manual (`docs/manuals/manual-installation.md`)**: pasos equivalentes a `install.sh` para entornos donde el script no puede ejecutarse (por ejemplo Windows sin WSL ni Git Bash), con paridad de resultado y lista de verificación. Viaja en el payload dentro de `docs/`.
- **README de la plantilla**: instrucciones de uso (clonar, ejecutar instalador, onboarding post-instalación).

## Capabilities

### New Capabilities

- `sdd-template-install`: Comportamiento del instalador no destructivo — verificación de prerrequisitos, reconocimiento del destino, inyección de contexto español, copia con backup/dry-run, manifiesto de payload, y documentación de `npx skills` para Claude Code.
- `sdd-project-onboarding`: Comportamiento de la skill post-instalación — análisis con graphify, comentario de estructura, persistencia de estructura como regla (con confirmación del usuario), adaptación de `docs/` al stack detectado, y guía de Ollama local.

### Modified Capabilities

(ninguna — este repo no tiene specs previas)

## Impact

- **Estructura del repo**: git init + remote; eliminación de 2 skills; adición de `install.sh`, README, `docs/manuals/local-ai.md`, `docs/manuals/manual-installation.md`; `.agents/skills/sdd-onboard-project/` nueva.
- **Proyectos destino**: reciben `openspec/`, `.agents/skills/`, `.opencode/`, `docs/`, `sdd-cli-guide.md`; el instalador nunca modifica código del proyecto destino, solo agrega configuración con backup previo ante conflictos.
- **Dependencias externas**: `openspec` CLI y `graphify` (requisitos del instalador); `npx skills` (opcional, solo Claude Code).
- **Usuarios de otros agentes**: Cursor/OpenCode/Codex/Gemini cargan los skills sin cambios; usuarios de Claude Code deben ejecutar `npx skills` manualmente (documentado).
