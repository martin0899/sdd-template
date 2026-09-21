# Plantilla SDD — Spec-Driven Development para tus proyectos

Fuente canónica de la configuración SDD (OpenSpec + skills + comandos + estándares de documentación) para instalarla en **proyectos nuevos o existentes**, sin corromperlos.

## Qué contiene

```
├── install.sh          ← instalador no destructivo (NO viaja al destino)
├── openspec/           ← raíz OpenSpec: config con reglas de idioma español
├── .agents/skills/     ← 13 skills portables (estándar Agent Skills)
├── .opencode/          ← comandos opsx-* y skills del workflow OpenSpec
├── docs/               ← estándares neutrales (base, api, data-model) + manuales
└── docs-variants/      ← variantes de estándares por stack (fuente del instalador)
```

**Qué viaja al destino**: `openspec/` (creada con `openspec init` + contexto español inyectado), `.agents/skills/`, `.opencode/` (sin `node_modules`), `docs/` — con `backend-standards.md` y `frontend-standards.md` **compuestos según el stack detectado** en tu proyecto.
**Qué NO viaja**: `install.sh`, este README, `docs-variants/`, `openspec/changes/` del repo plantilla.

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
- **Detección de stack**: el instalador examina tu proyecto (pom.xml, package.json, requirements.txt, go.mod, ...) e infiere backend y frontend — sin escribir nada.
- **Estándares por stack**: `docs/backend-standards.md` y `docs/frontend-standards.md` se componen desde la variante detectada (`spring-boot`, `express-node`, `nestjs`, `react`, `angular` o genérica), rellenando nombre del proyecto, lenguaje, framework, versiones y build tool. Los valores no detectables quedan como placeholders visibles y los refina el onboarding. En un proyecto backend puro no se copia `frontend-standards.md` (y viceversa).
- El contexto español se inyecta por **APPEND** en `openspec/config.yaml` (nunca reemplaza tu configuración).
- Las reglas de agentes (`AGENTS.md`): se crea si tu proyecto no lo tiene; si ya tienes uno, tus reglas quedan intactas y el bloque SDD (base-standards + graphify-first) se añade por APPEND con marcadores — idempotente, sin duplicar.
- **Tooling de agente y artefactos generados nunca se versionan**: el instalador garantiza en tu `.gitignore` un bloque gestionado con `graphify-out/`, `.sdd-backup-*/`, `.agents/`, `.opencode/` y `skills-lock.json`. El grafo es machine-local: se reconstruye con `graphify update .` tras clonar o cambiar de máquina (AST-only, sin coste). No se distribuyen plugins opencode: el recordatorio de graphify vive en las reglas de `AGENTS.md`.
- Archivo existente que difiere → se respalda en `.sdd-backup-<fecha>/` y **se te pregunta** si reemplazarlo (puedes conservar el tuyo).
- `--yes` omite las preguntas (siempre con backup previo).
- Idempotente: archivos idénticos se saltan; puedes re-ejecutarlo tras añadir skills.

### Skills de tu stack (npx autoskills)

Al terminar la copia, el instalador te pregunta si ejecutar **`npx autoskills`** en tu proyecto: escanea el stack, detecta las tecnologías e instala skills curadas para que tus agentes IA (Cursor, Claude Code, ...) entiendan tu stack concreto. Es **opt-in**: se ejecuta solo si aceptas, requiere Node >= 22 y un fallo nunca aborta la instalación. Si lo saltas (o usas `--yes`), queda como paso pendiente:

```bash
npx autoskills    # en tu proyecto destino (detecta el stack e instala skills)
```

### Instalación sin bash

¿Windows sin WSL ni Git Bash, o cualquier entorno donde el script no pueda ejecutarse? Sigue la guía manual equivalente: **[docs/manuals/manual-installation.md](docs/manuals/manual-installation.md)** — incluye pasos con `robocopy`, manejo de conflictos con backup y lista de verificación de paridad.

### Actualizar proyectos existentes

Cuando la plantilla tenga skills, comandos o definiciones más recientes, ejecuta desde la raíz de esta plantilla:

```bash
./install.sh /ruta/a/tu-proyecto --update --dry-run
./install.sh /ruta/a/tu-proyecto --update
```

La primera ejecución solo muestra el plan. La actualización compara hashes, clasifica archivos nuevos, actualizables, personalizados y retirados, y conserva los cambios del proyecto mediante `.sdd-backup-<fecha>/`. Los archivos retirados se reportan, pero no se eliminan automáticamente. Cada instalación o actualización confirmada mantiene un inventario en `.sdd-manifest.json`.

Para restaurar un archivo, copia su versión desde el backup fechado conservando su ruta relativa. Si una actualización queda parcial, corrige el problema indicado y vuelve a ejecutar `--update`; los backups anteriores no se eliminan.

## Después de instalar: onboarding

En el proyecto destino, con tu agente (opencode):

1. `graphify update .` — construye el grafo del código
2. Invoca la skill `sdd-onboard-project`: comenta la estructura, te ofrece persistirla como regla en `openspec/config.yaml` (opt-in), **refina los estándares compuestos por el instalador** (resuelve placeholders pendientes como ORM o testing con la evidencia real del grafo) y te guía para configurar IA local (ver [docs/manuals/local-ai.md](docs/manuals/local-ai.md))

Cada escritura del onboarding requiere tu confirmación explícita.

### Solicitar ramas, commits y releases

Consulta la guía [Git Workflow Requests](docs/manuals/git-workflow.md) para ver cómo pedir:

- creación de ramas `feature/<ticket-o-feature>`;
- commits con revisión previa;
- flujo combinado de rama + commit;
- releases con confirmación de versión.

## Exponer skills a otros agentes

`.agents/skills/` es el estándar Agent Skills: **OpenCode, Cursor, Codex CLI, Gemini CLI, Kiro, Antigravity y OpenClaw** lo cargan sin ningún paso extra.

Dos mecanismos opt-in complementarios:

- **`npx autoskills`**: instala skills curadas **de tu stack** (detecta tecnologías del proyecto). Recomendado tras instalar.
- **`npx skills`** (skills.sh / Vercel): expone los skills de la plantilla a **Claude Code** (lee `.claude/skills/`):

```bash
npx skills    # en el proyecto destino (solo Claude Code; con lockfile)
```

Alternativa manual sin dependencias: copiar `.agents/skills/<skill>/` a `.claude/skills/<skill>/`. No uses symlinks: Claude Code los corrompe con archivos internos `.system/`.

**Skills propias (promoción)**: una skill que crees en un proyecto destino permanece local (nunca se versiona ahí). Para distribuirla a todos tus proyectos, cópiala a `.agents/skills/<nombre>/` en este repo plantilla y re-ejecuta `install.sh` (o `--update`) en los destinos. Excepción: las skills `openspec-*` son vendor-managed por el CLI de OpenSpec en `.opencode/skills/` y nunca se duplican en `.agents/`.

## Actualizar la configuración en proyectos instalados

Re-ejecuta el instalador tras clonar la plantilla actualizada: los archivos nuevos se copian, los cambiados se respaldan y se pregunta, los idénticos se saltan.

## Mantenimiento del repo plantilla

- Este repo usa su propio workflow SDD: los cambios se gestionan con `/opsx:propose`, `/opsx:apply`, `/opsx:archive`.
- Las exploraciones nuevas deben pasar el briefing gate antes de `openspec new change` (protocolo: `.agents/skills/exploration-briefing/SKILL.md`).
- Los skills nuevos van en `.agents/skills/<nombre>/SKILL.md` (frontmatter: `name`, `description`, `author`, `version`).
- Después de cambios de código: `graphify update .`
