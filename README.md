# Plantilla SDD — Spec-Driven Development para tus proyectos

Fuente canónica de la configuración SDD (OpenSpec + skills + comandos + estándares de documentación) para instalarla en **proyectos nuevos o existentes**, sin corromperlos.

## Qué contiene

```
├── install.sh          ← instalador no destructivo (NO viaja al destino)
├── openspec/           ← raíz OpenSpec: config con reglas de idioma español
├── .agents/skills/     ← 13 skills portables (estándar Agent Skills)
├── .opencode/          ← comandos opsx-* y skills del workflow OpenSpec
└── docs/               ← estándares (base, backend, frontend, docs) + manuales
```

**Qué viaja al destino**: `openspec/` (creada con `openspec init` + contexto español inyectado), `.agents/skills/`, `.opencode/` (sin `node_modules`), `docs/`.
**Qué NO viaja**: `install.sh`, este README, `openspec/changes/` del repo plantilla.

## Prerrequisitos

| Herramienta | Verificación |
|-------------|--------------|
| git | `git --version` |
| openspec CLI | `openspec --help` |
| graphify | `graphify --help` |

Si falta alguna, el instalador aborta sin escribir nada y te indica qué instalar.

## Instalación en un proyecto (nuevo o existente)

```bash
# 1. Clonar la plantilla a un directorio temporal
git clone https://github.com/martin0899/sdd-template.git sdd-template
cd sdd-template

# 2. Simulación (recomendado en proyectos existentes): muestra el plan sin escribir
./install.sh /ruta/a/tu-proyecto --dry-run

# 3. Instalar (confirma interactivamente; nada se sobrescribe sin backup)
./install.sh /ruta/a/tu-proyecto
```

Política anti-corrupción:
- El contexto español se inyecta por **APPEND** en `openspec/config.yaml` (nunca reemplaza tu configuración).
- Las reglas de agentes (`AGENTS.md`): se crea si tu proyecto no lo tiene; si ya tienes uno, tus reglas quedan intactas y el bloque SDD (base-standards + graphify-first) se añade por APPEND con marcadores — idempotente, sin duplicar.
- Archivo existente que difiere → se respalda en `.sdd-backup-<fecha>/` y **se te pregunta** si reemplazarlo (puedes conservar el tuyo).
- `--yes` omite las preguntas (siempre con backup previo).
- Idempotente: archivos idénticos se saltan; puedes re-ejecutarlo tras añadir skills.

### Instalación sin bash

¿Windows sin WSL ni Git Bash, o cualquier entorno donde el script no pueda ejecutarse? Sigue la guía manual equivalente: **[docs/manuals/manual-installation.md](docs/manuals/manual-installation.md)** — incluye pasos con `robocopy`, manejo de conflictos con backup y lista de verificación de paridad.

## Después de instalar: onboarding

En el proyecto destino, con tu agente (opencode):

1. `graphify update .` — construye el grafo del código
2. Invoca la skill `sdd-onboard-project`: comenta la estructura, te ofrece persistirla como regla en `openspec/config.yaml` (opt-in), adapta `docs/` a tu stack real y te guía para configurar IA local (ver [docs/manuals/local-ai.md](docs/manuals/local-ai.md))

Cada escritura del onboarding requiere tu confirmación explícita.

## Exponer skills a otros agentes

`.agents/skills/` es el estándar Agent Skills: **OpenCode, Cursor, Codex CLI, Gemini CLI, Kiro, Antigravity y OpenClaw** lo cargan sin ningún paso extra.

**Solo Claude Code** requiere un paso opt-in (lee `.claude/skills/`):

```bash
npx skills    # en el proyecto destino (skills.sh / Vercel, con lockfile)
```

Alternativa manual sin dependencias: copiar `.agents/skills/<skill>/` a `.claude/skills/<skill>/`. No uses symlinks: Claude Code los corrompe con archivos internos `.system/`.

## Actualizar la configuración en proyectos instalados

Re-ejecuta el instalador tras clonar la plantilla actualizada: los archivos nuevos se copian, los cambiados se respaldan y se pregunta, los idénticos se saltan.

## Mantenimiento del repo plantilla

- Este repo usa su propio workflow SDD: los cambios se gestionan con `/opsx:propose`, `/opsx:apply`, `/opsx:archive`.
- Los skills nuevos van en `.agents/skills/<nombre>/SKILL.md` (frontmatter: `name`, `description`, `author`, `version`).
- Después de cambios de código: `graphify update .`
