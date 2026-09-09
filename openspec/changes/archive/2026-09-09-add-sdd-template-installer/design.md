# Design: add-sdd-template-installer

## Context

Este repositorio concentra la configuración SDD completa: raíz OpenSpec (`openspec/config.yaml` con contexto de idioma español), 15 skills portables en `.agents/skills/`, comandos y skills del workflow en `.opencode/`, estándares de documentación en `docs/`, y la guía `sdd-cli-guide.md`. No es repo git. Los skills provienen de proyectos previos (`chapur-pay`, `LIDR.co`) y nunca hubo mecanismo de propagación.

Hallazgos verificados que condicionan el diseño:

- `openspec init` es no interactivo (`--tools`, `--language`, `--force`): la raíz OpenSpec se crea limpio en el destino y el contexto se inyecta después; no hace falta copiar el directorio a mano.
- `.agents/skills/` es el estándar Agent Skills y los leen nativamente: OpenCode, Cursor (además lee `.claude/` y `.codex/`), Codex CLI, Gemini CLI, Kiro, Antigravity, OpenClaw. Solo Claude Code exige `.claude/skills/`.
- El workaround de symlink hacia `.claude/skills/` está roto: Claude Code contamina el directorio con archivos internos `.system/` (issue #20820). La alternativa mantenida por la comunidad es `npx skills` (Vercel / skills.sh) con lockfile.
- `graphify` está instalado (`~/.local/bin/graphify`) y tiene `update`, `query`, `explain`, `path` sobre `graphify-out/`.

## Goals / Non-Goals

**Goals**
- Instalación idempotente y no destructiva en proyectos existentes: nada se sobrescribe sin backup y pregunta.
- Las reglas de español viajan a todos los proyectos vía inyección de contexto en `openspec/config.yaml`.
- Separación clara de responsabilidades: script mecánico (instalación) vs. skill semántica (onboarding).
- Payload determinista vía manifiesto explícito.
- El flujo de instalación es alcanzable sin bash: guía manual con paridad de resultado.

**Non-Goals**
- No se modifica el código del proyecto destino jamás; solo se agrega configuración.
- No se implementan symlinks ni sync propio hacia `.claude/skills/` (esa necesidad la cubre `npx skills`, documentado).
- No se versionan los proyectos destino desde la plantilla (sin submódulos, sin fork).
- No se automatiza la instalación de Ollama: solo guía y registro del modelo elegido.

## Decisions

### D1: `openspec init` normal + inyección posterior de contexto
La raíz OpenSpec se crea con `openspec init` no interactivo en el destino. Las reglas de español se inyectan después por APPEND al campo `context` del `config.yaml` resultante. Alternativa descartada: copiar `openspec/` completo desde la plantilla (frágil ante cambios de formato del CLI, y `init` garantiza estructura válida). La inyección parsea el YAML existente y añade al `context` preservando todo lo demás; ante `config.yaml` preexistente del destino, su contexto propio queda intacto y el español se añade al final.

### D2: `.agents/skills/` como único origen; cero mecanismo de mirror; `npx skills` para Claude Code
Se elimina `sync-agent-symlinks`: su supuesto (`ai-specs/skills` canónico con espejos `.claude/`/`.cursor/`) no existe en esta plantilla, y el estándar ya cubre a casi todos los agentes nativamente. Para Claude Code se documenta `npx skills` como paso opt-in único. Alternativas descartadas: script de sync por copia propio (mantenimiento innecesario siendo `npx skills` estándar de facto con lockfile), symlinks (rotos para Claude Code).

### D3: Dos mecanismos — script mecánico + skill semántica
`install.sh` (en la raíz del repo plantilla, no viaja) hace lo determinista: prerrequisitos, reconocimiento, dry-run, copia/backup, inyección de contexto. La skill nueva `sdd-onboard-project` (viaja en el payload) hace lo semántico: graphify, comentario de estructura, reglas opt-in, adaptación de docs, guía Ollama — siempre con confirmación por artefacto. Alternativa descartada: un solo script que intente todo (la indagación y la redacción de reglas requieren criterio del agente, no shell).

### D4: Política anti-corrupción — dry-run, backup fechado, pregunta por conflicto
Primera pasada recomendada con `--dry-run` (obligatorio si se detecta destino no vacío con elementos del payload, salvo `--yes` explícito). Conflictos: backup a `.sdd-backup-<fecha>/` con ruta relativa preservada y consulta al usuario (reemplazar / mantener). Contexto español: siempre APPEND, jamás replace. Alternativa descartada: sobrescribir silenciosamente "porque la plantilla manda" (rompería personalización de proyectos existentes).

### D5: Retiro de `sdd-bootstrap-docs` con fusión de su lógica de detección
Su caso de uso (generar docs desde cero) desaparece: `docs/` viaja completo. Su tabla de detección de stack (archivos indicadores por tecnología) se traslada al cuerpo de `sdd-onboard-project`, que la usa para adaptar los estándares al stack real. Mantener ambas produciría colisión de triggers (misma intención: "docs SDD para proyecto").

### D6: Guía Ollama en `docs/manuals/local-ai.md` + registro opcional en contexto
Página corta: recomendación de modelos locales solo para tareas de baja demanda (RAM limitada en las máquinas del usuario), cómo configurar Ollama, y placeholder del modelo. La skill de onboarding registra el modelo elegido en el contexto del proyecto. Alternativa descartada: regla obligatoria en el payload (el modelo es decisión por usuario/máquina, no de la plantilla).

### D7: Manifiesto de payload en el propio repo
Lista explícita (en `install.sh` y documentada en README) de qué viaja: `openspec/` (config con contexto español), `.agents/skills/` (sin retiradas), `.opencode/` (comandos + skills + package.json, sin `node_modules`), `docs/`, `sdd-cli-guide.md`. Qué no viaja: `install.sh`, README de la plantilla, `openspec/changes/*` del repo plantilla. Fuente única de verdad para evitar arrastrar basura de trabajo.

### D8: Guía de instalación manual multi-OS
Página `docs/manuals/manual-installation.md` con pasos equivalentes a `install.sh` para entornos sin bash (Windows nativo): copia manual del payload (File Explorer o `robocopy`), `openspec init --tools opencode` (el CLI es Node, multiplataforma), añadido a mano del bloque de contexto español al `config.yaml`, respaldo manual del original ante archivo en conflicto, y `npx skills` opt-in para Claude Code. Incluye lista de verificación de paridad con la instalación por script. La página viaja en el payload dentro de `docs/`, por lo que también queda disponible en la máquina destino. Alternativa descartada: mantener un `install.ps1` en paralelo (doble mantenimiento para un caso excepcional; el manual cubre el camino sin código que mantener).

## Risks / Trade-offs

- [`npx skills` es dependencia externa de terceros] → es opt-in; sin él, todos los demás agentes funcionan; el README documenta la alternativa manual (copiar skills a `.claude/skills/`).
- [`openspec init` puede cambiar flags entre versiones] → el instalador verifica versión mínima y ante fallo de `init` aborta con mensaje claro; el modo no interactivo está soportado en la CLI actual.
- [YAML merge del contexto: parsear y reescribir `config.yaml` puede reordenar claves] → usar librería YAML (preserva estructura semántica) y aceptar reorden de claves como inofensivo; el contenido se preserva.
- [`graphify update` en monorepos grandes puede tardar] → el onboarding lo anuncia antes de ejecutar y lo hace en fase separada de la instalación mecánica.
- [`.sdd-backup-<fecha>/` acumula basura con reinstalaciones repetidas] → nombrar por fecha/hora y documentar cómo limpiar; nunca reutilizar backups previos.
- [Payload `.opencode/node_modules` debe excluirse] → manifiesto excluye `node_modules` y `package-lock` viaja para reproducir con `npm install` en el destino.

## Migration Plan

1. Limpieza del repo plantilla (quitar skills obsoletas, git init, .gitignore, manifiesto, README).
2. Implementar `install.sh` + probarlo con `--dry-run` sobre un proyecto dummy existente.
3. Crear skill `sdd-onboard-project` + `docs/manuals/local-ai.md`.
4. Verificación end-to-end: instalar sobre proyecto real de prueba, onboarding completo, validar que el contexto español y las skills cargan en OpenCode.
5. Rollback: el repo plantilla es git desde el paso 1; en el destino, `.sdd-backup-<fecha>/` restaura el estado previo eliminando lo añadido.

## Open Questions

- URL del remote git (GitHub/GitLab y nombre del repo) — decide el usuario al publicar; no bloquea el diseño.
- Versión mínima de `openspec` CLI a exigir — se fija al implementar contra la instalada hoy.
