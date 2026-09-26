# Spectralis

**Instalador de la plantilla SDD (Spec-Driven Development) para tus proyectos.**

![Node](https://img.shields.io/badge/node-%E2%89%A522-339933?style=flat-square)
![Windows](https://img.shields.io/badge/Windows-0078D6?style=flat-square&logo=windows&logoColor=white)
![macOS](https://img.shields.io/badge/macOS-000000?style=flat-square&logo=apple&logoColor=white)
![Linux](https://img.shields.io/badge/Linux-FCC624?style=flat-square&logo=linux&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-3da639?style=flat-square)

Spectralis es la fuente canónica de la configuración SDD — **OpenSpec + skills + comandos + estándares de documentación** — para instalarla en proyectos **nuevos o existentes**, sin corromperlos.

> **Funciona en cualquier máquina**: Windows, macOS y Linux, con solo tener Node >= 22. No requiere WSL, Git Bash ni ninguna dependencia de plataforma — es un CLI de Node puro.

---

## Contenido de la plantilla

```
├── dist/               ← CLI compilado (npm i -g . compila e instala)
├── src/                ← código fuente del CLI (TypeScript)
├── openspec/           ← raíz OpenSpec: config con reglas de idioma español
├── .agents/skills/     ← 13+ skills portables (estándar Agent Skills)
├── .opencode/          ← comandos opsx-* y skills del workflow OpenSpec
├── docs/               ← estándares neutrales (base, api, data-model)
├── notes/              ← manuales canónicos del arnés (viven en el cerebro, no viajan)
└── docs-variants/      ← variantes de estándares por stack (fuente del instalador)
```

**Qué viaja al destino**: `openspec/` (creada con `openspec init` + contexto español inyectado), `.agents/skills/`, `.opencode/` (sin `node_modules`), `docs/` — con `backend-standards.md` y `frontend-standards.md` **compuestos según el stack detectado** en tu proyecto.

**Qué NO viaja**: este README, `notes/`, `docs-variants/`, `openspec/changes/` del repo plantilla. Los manuales de `notes/` viven en el **cerebro** (el segundo cerebro, `03_Recursos/02_Sistemas_info/`) y se sincronizan con `spectralis notes sync`; nunca se copian al proyecto destino.

---

## Prerrequisitos

| Herramienta | Verificación | Notas |
|-------------|--------------|-------|
| git | `git --version` | Para clonar la plantilla |
| node | `node --version` | **>= 22** — la única dependencia de plataforma |
| openspec CLI | `openspec --help` | Node-based, multiplataforma |
| graphify | `graphify --help` | Se usa tras la instalación, en el onboarding |

Si falta alguno, el instalador **aborta sin escribir nada** y te indica qué instalar.

---

## Instalación rápida

La forma recomendada de instalar la plantilla es el CLI **spectralis**, que viaja dentro de este repositorio (nunca se publica en npm).

```bash
# 1. Clonar la plantilla (una vez por máquina)
git clone https://github.com/martin0899/sdd-template.git
cd sdd-template

# 2. Instalar el CLI global (compila y empaqueta la plantilla; el clone puede borrarse después)
npm i -g .

# 3. Diagnóstico de prerrequisitos — opcional pero recomendado
spectralis doctor

# 4. Instalar en tu proyecto: parado en el proyecto, o pasando la ruta
cd /ruta/a/tu-proyecto && spectralis init
# o: spectralis init /ruta/a/tu-proyecto
```

### Aliases de flags

| Flag | Alias | Descripción |
|------|-------|-------------|
| `--dry-run` | `--demo`, `--dd` | Muestra el plan sin escribir nada |
| `--version` | `--v` | Muestra la versión del CLI |

### Comandos útiles post-instalación

```bash
spectralis update --check   # Verificar si hay actualizaciones disponibles
spectralis status           # Ver estado del arnés instalado
spectralis config           # Ver configuración del arnés
```

### Manuales en el cerebro (segundo cerebro)

Los manuales del arnés viven en el **cerebro** (el segundo cerebro, `03_Recursos/02_Sistemas_info/`) en subcarpetas por tema. La ruta se resuelve automáticamente (config → manifiesto → vault detectado → `info/` en el proyecto como fallback):

```bash
spectralis notes init      # Crea la estructura de subcarpetas donde viven los manuales
spectralis notes sync      # Copia los manuales canónicos de notes/ al cerebro
spectralis config --list   # Muestra la ruta efectiva (resources_dir) y su origen
```

- `spectralis notes init` y `notes sync` funcionan en cualquier proyecto instalado.
- Si no hay conexión al segundo cerebro, se usa `info/` **dentro del proyecto** como última opción y se avisa.
- Si ni siquiera `info/` es viable, no se crea ningún archivo y se avisa que falta carpeta raíz de almacenamiento.
- La ruta se puede fijar sin preguntar cada vez: `spectralis config --resources <ruta>` (con `--global` para toda la máquina).

### Orquestación automática (switch obsidianSync)

La sincronización con el cerebro se puede **orquestar** automáticamente con el switch `obsidianSync` (default `0` = desactivado, cero costo de tokens):

```bash
spectralis config --set obsidianSync=1          # activar (por proyecto; --global para toda la máquina)
spectralis config --get obsidianSync            # consultar el valor efectivo y su origen
spectralis init --obsidian                      # forzar la orquestación en esta instalación
spectralis init --no-obsidian                   # desactivarla en esta instalación aunque el switch sea 1
```

Con `obsidianSync=1` (o `--obsidian`):

- `spectralis init` / `spectralis update` ejecutan automáticamente `notes init` + `notes sync`.
- `/opsx-apply` invoca la skill `obsidian-orchestration` → genera `obsidian-briefing` al completar la implementación.
- `/opsx-archive` invoca `obsidian-orchestration` → genera `obsidian-summary` + `obsidian-tests` + `spectralis spec complete` antes de archivar.

La orquestación es idempotente (no regenera documentos ya correctos) y no modifica los comandos `opsx-*` (vendor-managed por OpenSpec).

### Matriz de agentes (`--agent`)

| Agente | Valor | Payload |
|--------|-------|---------|
| OpenCode (por defecto) | `opencode` | `.agents/` + `.opencode/` + docs + AGENTS.md + openspec |
| Antigravity | `antigravity` | `.agents/` + docs + AGENTS.md + openspec (sin `.opencode/`) |
| Claude Code | `claude` | igual que `antigravity` (ver `npx skills` más abajo) |
| Todos | `all` | `.agents/` + `.opencode/` + docs + AGENTS.md + openspec |

> **Detalle**: `spectralis init --dry-run` muestra el plan completo sin escribir nada.
>
> **Versionado**: spectralis nace en `1.0.0`; los bumps `MINOR`/`PATCH` siguen los deltas de especificaciones aprobados (cantidad de cambios y riesgo); `MAJOR` solo a petición explícita del usuario (el agente puede sugerirlo). `spectralis --version` reporta la versión del arnés (CLI); el manifiesto `.sdd-manifest.json` del destino registra `spectralisVersion` y `templateVersion` como campos separados para saber con qué se instaló.
>
> La política anti-corrupción es idéntica a la del instalador bash original: backups en `.sdd-backup-<fecha>/`, confirmación por archivo, bloques idempotentes y manifiesto con hashes.
>
> Uso estándar completo (comandos, opciones, matrix, versionado): ver el manual [notes/spectralis-cli/manual.md](notes/spectralis-cli/manual.md).

---

## Cómo funciona `spectralis init`

El proceso respeta tu proyecto en todo momento: **primero lee, luego pregunta, y solo entonces escribe.**

1. **Prerrequisitos (gate)** — verifica `git`, `node >= 22`, `openspec` y `graphify`; si falta algo, aborta sin escribir nada y te dice cómo instalarlo.
2. **Reconocimiento (lectura)** — escanea tu proyecto (`pom.xml`, `package.json`, `requirements.txt`, `go.mod`, ...) **sin escribir**: detecta backend y frontend.
3. **`--dry-run` (opcional)** — muestra el plan completo y deja tu proyecto bit a bit idéntico.
4. **Confirmación** — pregunta antes de escribir nada.
5. **`openspec init`** — crea la raíz OpenSpec si no existe (`--tools` según `--agent`).
6. **Contexto español** — se inyecta por APPEND en `openspec/config.yaml` (preserva comentarios y tu contexto propio).
7. **Bloques gestionados** — `AGENTS.md`: se crea o se añade/refresca el bloque SDD con marcadores (tu contenido queda intacto, idempotente). `.gitignore`: bloque gestionado con `graphify-out/`, `.sdd-backup-*/`, `.agents/`, `.opencode/`, `skills-lock.json` y `.claude/`.
8. **Payload** — copia `.agents/`, `.opencode/` (según `--agent`) y `docs/`; conflicto → backup + pregunta; idéntico → skip.
9. **Estándares compuestos** — `docs/backend-standards.md` y `docs/frontend-standards.md` se generan desde la variante detectada con los placeholders rellenados.
10. **Manifiesto** — `.sdd-manifest.json` con hashes de cada archivo gestionado.
11. **Verificación final** — reporta advertencias y los pasos manuales pendientes.

### Puntos clave

- **Cero escritura antes de tu confirmación** y re-ejecuciones idempotentes (los archivos idénticos se saltan, sin backups fantasma).
- **Conflictos**: tu versión se respalda en `.sdd-backup-<fecha>/` y decides si reemplazarla; el contrato detallado vive en `openspec/specs/sdd-template-install`.
- Cualquier cambio no previsto aborta y el destino conserva los backups en `.sdd-backup-<fecha>/`.

---

## Instalación paso a paso en proyectos locales

### 1. Instalar spectralis globalmente (una vez por máquina)

```bash
cd /ruta/al/repo/spectralis
npm i -g .
```

### 2. Verificar la instalación

```bash
spectralis --v          # Debe mostrar la versión (ej. 1.2.0)
spectralis doctor       # Verifica prerrequisitos (git, node, openspec, graphify)
```

### 3. Instalar en un proyecto existente

```bash
cd /ruta/a/tu-proyecto
spectralis init         # Instala SDD en el proyecto actual
```

Para simular primero sin escribir nada:

```bash
spectralis init --demo  # Muestra el plan sin escribir (alias de --dry-run)
```

### 4. Validar los comandos nuevos

```bash
# Verificar estado del arnés instalado
spectralis status

# Ver configuración del arnés (tools, directorios, versiones)
spectralis config

# Verificar si hay actualizaciones disponibles
spectralis update --check
```

### 5. Tabla de validación rápida

| Comando | Qué verifica |
|---------|--------------|
| `spectralis --v` | Versión instalada |
| `spectralis doctor` | Prerrequisitos (git, node, openspec, graphify) |
| `spectralis status` | Estado del arnés en el proyecto |
| `spectralis config` | Configuración y tools |
| `spectralis update --check` | Actualizaciones pendientes |

### 6. Mantenimiento de proyectos instalados

```bash
# Para cada proyecto con SDD instalado:
cd /ruta/al/proyecto
spectralis status            # Verificar que está instalado
spectralis update --check    # Verificar actualizaciones

# Si hay actualizaciones:
spectralis update --demo     # Ver el plan sin escribir
spectralis update            # Aplicar cambios
```

---

## Instalación en un proyecto (instalador bash)

```bash
# 1. Clonar la plantilla
git clone https://github.com/martin0899/sdd-template.git sdd-template
cd sdd-template

# 2. Instalar el CLI global
npm i -g .

# 3. Simulación (recomendado en proyectos existentes): muestra el plan sin escribir
spectralis init /ruta/a/tu-proyecto --dry-run

# 4. Instalar (confirma interactivamente; nada se sobrescribe sin backup)
spectralis init /ruta/a/tu-proyecto
```

### Política anti-corrupción

- **Detección de stack**: el instalador examina tu proyecto (`pom.xml`, `package.json`, `requirements.txt`, `go.mod`, ...) e infiere backend y frontend — sin escribir nada.
- **Estándares por stack**: `docs/backend-standards.md` y `docs/frontend-standards.md` se componen desde la variante detectada (`spring-boot`, `express-node`, `nestjs`, `react`, `angular` o genérica), rellenando nombre del proyecto, lenguaje, framework, versiones y build tool. Los valores no detectables quedan como placeholders visibles y los refina el onboarding. En un proyecto backend puro no se copia `frontend-standards.md` (y viceversa). El resultado se persiste en `stack.json` (detección reproducible: escaneo a profundidad 2 en monorepos, exclusión de carpetas de archivo/caché e invalidación por mtime).
- El contexto español se inyecta por **APPEND** en `openspec/config.yaml` (nunca reemplaza tu configuración).
- Las reglas de agentes (`AGENTS.md`): se crea si tu proyecto no lo tiene; si ya tienes uno, tus reglas quedan intactas y el bloque SDD (base-standards + graphify-first) se añade por APPEND con marcadores — idempotente, sin duplicar.
- **Tooling de agente y artefactos generados nunca se versionan**: el instalador garantiza en tu `.gitignore` un bloque gestionado con `graphify-out/`, `.sdd-backup-*/`, `.agents/`, `.opencode/` y `skills-lock.json`. El grafo es machine-local: se reconstruye con `graphify update .` tras clonar o cambiar de máquina (AST-only, sin coste). No se distribuyen plugins opencode: el recordatorio de graphify vive en las reglas de `AGENTS.md`.
- Archivo existente que difiere → se respalda en `.sdd-backup-<fecha>/` y **se te pregunta** si reemplazarlo (puedes conservar el tuyo).
- `--yes` omite las preguntas (siempre con backup previo).
- Idempotente: archivos idénticos se saltan; puedes re-ejecutarlo tras añadir skills.



### Instalación sin bash

¿Windows sin WSL ni Git Bash? **`spectralis` corre nativamente en cualquier plataforma con Node >= 22.** Ver la guía de instalación/actualización manual: **[notes/manual-installation/manual.md](notes/manual-installation/manual.md)**.

### Actualizar proyectos existentes

Cuando la plantilla tenga skills, comandos o definiciones más recientes, ejecuta en el proyecto destino:

```bash
spectralis update --check     # solo verifica si hay actualizaciones
spectralis update --demo      # muestra el plan sin escribir (alias de --dry-run)
spectralis update             # aplica los cambios
```

**Exit codes de `--check`:**

| Código | Significado |
|--------|-------------|
| `0` | El destino está al día |
| `1` | Hay actualizaciones disponibles |
| `2` | Error (destino no instalado) |

La actualización compara hashes, clasifica archivos (nuevos, actualizables, conflictos, retirados), respalda antes de reemplazar y conserva los cambios del proyecto en `.sdd-backup-<fecha>/`. Los archivos retirados se reportan, pero no se eliminan automáticamente.

Para restaurar un archivo, copia su versión desde el backup fechado conservando su ruta relativa. Si una actualización queda parcial, corrige el problema indicado y vuelve a ejecutar `--update`; los backups anteriores no se eliminan.

---

## Después de instalar: onboarding

En el proyecto destino, con tu agente (opencode):

1. `graphify update .` — construye el grafo del código
2. Invoca la skill `sdd-onboard-project`: comenta la estructura, te ofrece persistirla como regla en `openspec/config.yaml` (opt-in), **refina los estándares compuestos por el instalador** (resuelve placeholders pendientes como ORM o testing con la evidencia real del grafo) y te guía para configurar IA local (ver [notes/local-ai/manual.md](notes/local-ai/manual.md))

Cada escritura del onboarding requiere tu confirmación explícita.

### Solicitar ramas, commits y releases

Consulta la guía [Git Workflow Requests](notes/git-workflow/manual.md) para ver cómo pedir:

- creación de ramas `feature/<ticket-o-feature>`;
- commits con revisión previa;
- flujo combinado de rama + commit;
- releases con confirmación de versión.

---

## Exponer skills a otros agentes

`.agents/skills/` es el estándar Agent Skills: **OpenCode, Cursor, Codex CLI, Gemini CLI, Kiro, Antigravity y OpenClaw** lo cargan sin ningún paso extra.

Dos mecanismos opt-in complementarios:

- **`npx skills`** (skills.sh / Vercel): expone los skills de la plantilla a **Claude Code** (lee `.claude/skills/`):

```bash
npx skills    # en el proyecto destino (solo Claude Code; con lockfile)
```

Alternativa manual sin dependencias: copiar `.agents/skills/<skill>/` a `.claude/skills/<skill>/`. No uses symlinks: Claude Code los corrompe con archivos internos `.system/`.

**Skills propias (promoción)**: una skill que crees en un proyecto destino permanece local (nunca se versiona ahí). Para distribuirla a todos tus proyectos, cópiala a `.agents/skills/<nombre>/` en este repo plantilla y re-ejecuta `spectralis init` o `spectralis update` en los destinos. Excepción: las skills `openspec-*` son vendor-managed por el CLI de OpenSpec en `.opencode/skills/` y nunca se duplican en `.agents/`.

---

## Actualizar la configuración en proyectos instalados

Re-ejecuta el instalador tras clonar la plantilla actualizada: los archivos nuevos se copian, los cambiados se respaldan y se pregunta, los idénticos se saltan.

---

## Herramientas de Terceros

> Las siguientes herramientas son desarrolladas por terceros y se utilizan bajo sus respectivas licencias.

| Herramienta | Uso en Spectralis | Licencia | Repositorio |
|---|---|---|---|
| [graphify](https://github.com/cysalguero/graphify) | Grafo de conocimiento del proyecto | MIT | [GitHub](https://github.com/cysalguero/graphify) |
| [OpenSpec](https://github.com/cysalguero/openspec) | Gestión de especificaciones SDD | MIT | [GitHub](https://github.com/cysalguero/openspec) |
| [Commander.js](https://github.com/tj/commander.js) | CLI parsing | MIT | [GitHub](https://github.com/tj/commander.js) |
| [gray-matter](https://github.com/jonschlinkert/gray-matter) | Frontmatter YAML parsing | MIT | [GitHub](https://github.com/jonschlinkert/gray-matter) |

**Nota:** Spectralis no es propietario ni está afiliado a estos proyectos. Las licencias originales aplican.

---

## Mantenimiento del repo plantilla

- Este repo usa su propio workflow SDD: los cambios se gestionan con `/opsx:propose`, `/opsx:apply`, `/opsx:archive`.
- Las exploraciones nuevas deben pasar el briefing gate antes de `openspec new change` (protocolo: `.agents/skills/exploration-briefing/SKILL.md`).
- Los skills nuevos van en `.agents/skills/<nombre>/SKILL.md` (frontmatter: `name`, `description`, `author`, `version`).
- Después de cambios de código: `graphify update .`