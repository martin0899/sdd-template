#!/usr/bin/env bash
#
# install.sh — Instalador no destructivo de la plantilla SDD
#
# Copia la configuración SDD de este repo plantilla hacia un proyecto
# destino (nuevo o existente) sin corromperlo:
#   - Verifica prerrequisitos antes de escribir nada
#   - Detecta el stack del destino (backend/frontend) sin escribir nada
#   - Compone docs/backend-standards.md y docs/frontend-standards.md desde
#     docs-variants/ con placeholders rellenados según lo detectado
#   - Reconoce el destino y reporta conflictos
#   - --dry-run muestra el plan completo sin tocar disco
#   - --update sincroniza una instalación SDD existente con esta plantilla
#   - openspec init (no interactivo) + inyección del contexto español
#   - Ofrece ejecutar npx autoskills (opt-in) para skills del stack
#   - Archivo en conflicto -> backup a .sdd-backup-<fecha>/ + pregunta
#
# Uso:
#   ./install.sh <destino> [--dry-run] [--update] [--yes]
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Manifiesto de payload — única fuente de verdad de qué viaja al destino.
# NO viaja: install.sh, README.md, openspec/changes/* del repo plantilla,
# node_modules, graphify-out/, .sdd-backup-*/.
# NO viaja tampoco: plugins opencode (.opencode/plugins/) ni skills-lock.json
# (política project-local: el recordatorio de graphify vive en las reglas de
# AGENTS.md; ningún plugin se distribuye; el lock de skills es local).
# La raíz OpenSpec del destino NO se copia: se crea con `openspec init`
# y el contexto español se inyecta después (ver SPANISH_CONTEXT).
# ---------------------------------------------------------------------------
PAYLOAD_DIRS=(
  ".agents/skills"
  ".opencode/commands"
  ".opencode/skills"
)
PAYLOAD_FILES=(
  ".opencode/package.json"
  ".opencode/package-lock.json"
  ".opencode/.gitignore"
)
# docs/ viaja completo salvo directorios generados:
PAYLOAD_DOCS_EXCLUDE=("graphify-out")
# docs-variants/ NO viaja como payload: es la fuente desde la que se compone
# docs/backend-standards.md y docs/frontend-standards.md según el stack detectado.
VARIANTS_ROOT_NAME="docs-variants"

# Tokens de placeholder de las variantes (los no detectables quedan visibles
# para refinarlos en el onboarding: skill sdd-onboard-project).
PLACEHOLDER_TOKENS=(PROJECT_NAME LANGUAGE LANGUAGE_VERSION FRAMEWORK FRAMEWORK_VERSION BUILD_TOOL TEST_FRAMEWORK ORM)

# Resultado de detección (solo lectura; se rellena en detect_stack):
BACKEND_VARIANT="generic"   # spring-boot | express-node | generic
FRONTEND_VARIANT="generic"  # react | generic | none (backend puro)
V_PROJECT_NAME="" V_LANGUAGE="" V_LANGUAGE_VERSION=""
V_FRAMEWORK="" V_FRAMEWORK_VERSION="" V_BUILD_TOOL="" V_TEST_FRAMEWORK=""
V_FRAMEWORK_FE="" V_FRAMEWORK_VERSION_FE=""
POM_FILE="" PKG_FILE=""
AUTOSKILLS_PENDING=false

# Bloque de contexto español que se inyecta en openspec/config.yaml.
SPANISH_CONTEXT_HEADING="Language preference: All interactions, questions, summaries, and results must be displayed in Spanish."
SPANISH_CONTEXT_BLOCK=(
  "Language preference: All interactions, questions, summaries, and results must be displayed in Spanish."
  "Even if the files and configurations are in English, the user interface and AI responses should be in Spanish."
  "When showing artifacts, status, or any output, translate to Spanish while preserving technical terms in English when appropriate."
)

# Reglas de agentes (AGENTS.md): fuente canónica = $TEMPLATE_ROOT/AGENTS.md
AGENTS_MARKER_BEGIN="<!-- BEGIN: SDD template rules (agregado por install.sh) -->"
AGENTS_MARKER_END="<!-- END: SDD template rules -->"
AGENTS_SENTINEL="ALWAYS use graphify first"

# .gitignore del destino: bloque gestionado (tooling de agente + artefactos generados).
GITIGNORE_MARKER_BEGIN="# BEGIN: SDD managed gitignore (agregado por install.sh; no editar a mano)"
GITIGNORE_MARKER_END="# END: SDD managed gitignore"
GITIGNORE_SENTINEL="SDD managed gitignore"
GITIGNORE_ENTRIES=( 'graphify-out/' '.sdd-backup-*/' '.agents/' '.opencode/' '.claude/' 'skills-lock.json' 'openspec/' )

DRY_RUN=false
AUTO_YES=false
UPDATE_MODE=false
TARGET=""
MANIFEST_PATH=""
MANIFEST_AVAILABLE=false
LEGACY_INSTALL=false
SYNC_PARTIAL_FAILURE=false
TEMPLATE_VERSION="unknown"
declare -a MANAGED_PATHS=() RETIRED_PATHS=() UPDATE_NEW=() UPDATEABLE_PATHS=() UPDATE_CONFLICTS=() UPDATE_UNCHANGED=() UPDATE_SENSITIVE=()

usage() {
  sed -n '2,15p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

log()  { printf '%s\n' "$*"; }
warn() { printf '[AVISO] %s\n' "$*" >&2; }
die()  { printf '[ERROR] %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
parse_args() {
  if [[ $# -eq 0 ]]; then usage 1; fi
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run) DRY_RUN=true; shift ;;
      --update)  UPDATE_MODE=true; shift ;;
      --yes|-y)  AUTO_YES=true; shift ;;
      -h|--help) usage 0 ;;
      -*)        die "Opción desconocida: $1 (usa --help)" ;;
      *)         [[ -n "$TARGET" ]] && die "Solo se admite un destino"; TARGET="$1"; shift ;;
    esac
  done
  [[ -n "$TARGET" ]] || die "Falta el proyecto destino. Uso: ./install.sh <destino> [--dry-run] [--update] [--yes]"
}

# ---------------------------------------------------------------------------
check_prereqs() {
  local missing=()
  local tool
  for tool in git openspec graphify; do
    command -v "$tool" >/dev/null 2>&1 || missing+=("$tool")
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    log "Faltan prerrequisitos: ${missing[*]}"
    log ""
    log "Instálalos antes de ejecutar el instalador:"
    log "  - git:            https://git-scm.com/downloads"
    log "  - openspec (CLI): gestor de paquetes de tu sistema / documentación de OpenSpec"
    log "  - graphify:       documentación de graphify (provee: graphify update/query/explain)"
    die "Abortando: no se ha escrito nada en el destino."
  fi
  return 0
}

# ---------------------------------------------------------------------------
# Manifest and synchronization helpers.
# The manifest stores metadata only; file contents never leave the destination.
# ---------------------------------------------------------------------------
hash_file() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | cut -d' ' -f1
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | cut -d' ' -f1
  else
    cksum "$file" | cut -d' ' -f1
  fi
}

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

template_version() {
  git -C "$TEMPLATE_ROOT" rev-parse HEAD 2>/dev/null || printf '%s' "unknown"
}

is_excluded_path() {
  local rel="$1"
  case "$rel" in
    .env|.env.*|*/.env|*/.env.*|graphify-out/*|*/graphify-out/*|node_modules/*|*/node_modules/*|dist/*|*/dist/*|build/*|*/build/*|.sdd-backup-*/*|*/.sdd-backup-*/*|skills-lock.json|*/skills-lock.json|.opencode/plugins/*|*/.opencode/plugins/*)
      return 0
      ;;
  esac
  return 1
}

append_managed_path() {
  local rel="$1" existing
  [[ -n "$rel" ]] || return 0
  is_excluded_path "$rel" && return 0
  for existing in "${MANAGED_PATHS[@]:-}"; do
    [[ "$existing" == "$rel" ]] && return 0
  done
  MANAGED_PATHS+=("$rel")
}

collect_managed_paths() {
  local dir f rel p
  MANAGED_PATHS=()
  for dir in "${PAYLOAD_DIRS[@]}"; do
    [[ -d "$TEMPLATE_ROOT/$dir" ]] || continue
    while IFS= read -r -d '' f; do
      rel="${f#"$TEMPLATE_ROOT/"}"
      append_managed_path "$rel"
    done < <(find "$TEMPLATE_ROOT/$dir" -type f -print0)
  done
  for p in "${PAYLOAD_FILES[@]}"; do
    append_managed_path "$p"
  done
  if [[ -d "$TEMPLATE_ROOT/docs" ]]; then
    while IFS= read -r -d '' f; do
      rel="${f#"$TEMPLATE_ROOT/"}"
      append_managed_path "$rel"
    done < <(find "$TEMPLATE_ROOT/docs" -type f -print0)
  fi
  append_managed_path "AGENTS.md"
  append_managed_path "openspec/config.yaml"
  [[ "$BACKEND_VARIANT" == "none" ]] || append_managed_path "docs/backend-standards.md"
  [[ "$FRONTEND_VARIANT" == "none" ]] || append_managed_path "docs/frontend-standards.md"
}

manifest_hash_for() {
  local rel="$1"
  [[ -f "$MANIFEST_PATH" ]] || return 0
  grep -F '"path": "'"$(json_escape "$rel")"'"' "$MANIFEST_PATH" \
    | sed -n 's/.*"hash": "\([^"]*\)".*/\1/p' | head -n 1
}

manifest_paths() {
  [[ -f "$MANIFEST_PATH" ]] || return 0
  sed -n 's/.*"path": "\([^"]*\)".*/\1/p' "$MANIFEST_PATH"
}

source_file_for() {
  local rel="$1" generated
  if [[ "$rel" == "docs/backend-standards.md" && -f "$TEMPLATE_ROOT/docs-variants/backend/$BACKEND_VARIANT.md" ]]; then
    generated="$(mktemp)"
    fill_placeholders backend < "$TEMPLATE_ROOT/docs-variants/backend/$BACKEND_VARIANT.md" > "$generated"
    printf '%s\n' "$generated"
  elif [[ "$rel" == "docs/frontend-standards.md" && -f "$TEMPLATE_ROOT/docs-variants/frontend/$FRONTEND_VARIANT.md" ]]; then
    generated="$(mktemp)"
    fill_placeholders frontend < "$TEMPLATE_ROOT/docs-variants/frontend/$FRONTEND_VARIANT.md" > "$generated"
    printf '%s\n' "$generated"
  elif [[ -f "$TEMPLATE_ROOT/$rel" ]]; then
    printf '%s\n' "$TEMPLATE_ROOT/$rel"
  else
    printf '%s\n' ""
  fi
}

write_manifest() {
  local tmp rel source dest hash
  MANIFEST_PATH="$TARGET/.sdd-manifest.json"
  TEMPLATE_VERSION="$(template_version)"
  tmp="$(mktemp)"
  {
    printf '{\n'
    printf '  "schemaVersion": 1,\n'
    printf '  "templateVersion": "%s",\n' "$(json_escape "$TEMPLATE_VERSION")"
    printf '  "source": "%s",\n' "$(json_escape "$TEMPLATE_ROOT")"
    printf '  "updatedAt": "%s",\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf '  "excluded": ["secrets", "local-config", "generated-artifacts"],\n'
    printf '  "files": [\n'
    local first=true
    for rel in "${MANAGED_PATHS[@]:-}"; do
      dest="$TARGET/$rel"
      [[ -f "$dest" ]] || continue
      $first || printf ',\n'
      first=false
      hash="$(hash_file "$dest")"
      printf '    {"path": "%s", "hash": "%s"}' "$(json_escape "$rel")" "$(json_escape "$hash")"
    done
    printf '\n  ]\n}\n'
  } > "$tmp"
  mv "$tmp" "$MANIFEST_PATH"
  MANIFEST_AVAILABLE=true
  log "[OK] Manifiesto SDD actualizado: $MANIFEST_PATH"
}

detect_manifest_state() {
  MANIFEST_PATH="$TARGET/.sdd-manifest.json"
  if [[ -f "$MANIFEST_PATH" ]]; then
    MANIFEST_AVAILABLE=true
    LEGACY_INSTALL=false
  elif [[ -d "$TARGET/openspec" || -d "$TARGET/.agents/skills" || -d "$TARGET/.opencode" || -f "$TARGET/AGENTS.md" ]]; then
    MANIFEST_AVAILABLE=false
    LEGACY_INSTALL=true
  else
    MANIFEST_AVAILABLE=false
    LEGACY_INSTALL=false
  fi
}

classify_update() {
  local rel source dest current previous source_hash found
  UPDATE_NEW=(); UPDATEABLE_PATHS=(); UPDATE_CONFLICTS=(); UPDATE_UNCHANGED=(); UPDATE_SENSITIVE=(); RETIRED_PATHS=()
  collect_managed_paths

  for rel in "${MANAGED_PATHS[@]:-}"; do
    if is_excluded_path "$rel"; then
      UPDATE_SENSITIVE+=("$rel")
      continue
    fi
    # These files are merged by dedicated idempotent handlers, not replaced.
    [[ "$rel" == "AGENTS.md" || "$rel" == "openspec/config.yaml" ]] && continue
    source="$(source_file_for "$rel")"
    dest="$TARGET/$rel"
    if [[ -z "$source" || ! -f "$source" ]]; then
      [[ -n "$source" && -f "$source" ]] && rm -f "$source"
      continue
    fi
    source_hash="$(hash_file "$source")"
    if [[ ! -e "$dest" ]]; then
      UPDATE_NEW+=("$rel")
    elif cmp -s "$source" "$dest"; then
      UPDATE_UNCHANGED+=("$rel")
    else
      previous="$(manifest_hash_for "$rel")"
      current="$(hash_file "$dest")"
      if [[ -n "$previous" && "$previous" == "$current" ]]; then
        UPDATEABLE_PATHS+=("$rel")
      else
        UPDATE_CONFLICTS+=("$rel")
      fi
    fi
    [[ "$source" == /tmp/* ]] && rm -f "$source"
  done

  if $MANIFEST_AVAILABLE; then
    while IFS= read -r rel; do
      [[ -n "$rel" ]] || continue
      found=false
      for current in "${MANAGED_PATHS[@]:-}"; do
        [[ "$current" == "$rel" ]] && found=true && break
      done
      $found || RETIRED_PATHS+=("$rel")
    done < <(manifest_paths)
  fi
}

report_update() {
  local rel
  log ""
  log "== Reconocimiento de actualización SDD: $TARGET =="
  if $MANIFEST_AVAILABLE; then
    log "  manifiesto: $MANIFEST_PATH"
    log "  versión de plantilla instalada: $(grep -m1 '"templateVersion"' "$MANIFEST_PATH" | sed 's/.*: "\([^"]*\)".*/\1/')"
  elif $LEGACY_INSTALL; then
    log "  manifiesto: no existe (instalación antigua; confianza limitada)"
  else
    log "  manifiesto: no existe (no se detectó instalación SDD previa)"
  fi
  log "  versión de esta plantilla: $TEMPLATE_VERSION"
  log "  -- nuevos:"
  if [[ ${#UPDATE_NEW[@]} -gt 0 ]]; then for rel in "${UPDATE_NEW[@]}"; do log "     + $rel"; done; fi
  [[ ${#UPDATE_NEW[@]} -gt 0 ]] || log "     (ninguno)"
  log "  -- actualizables sin personalización detectada:"
  if [[ ${#UPDATEABLE_PATHS[@]} -gt 0 ]]; then for rel in "${UPDATEABLE_PATHS[@]}"; do log "     ^ $rel"; done; fi
  [[ ${#UPDATEABLE_PATHS[@]} -gt 0 ]] || log "     (ninguno)"
  log "  -- conflictos personalizados:"
  if [[ ${#UPDATE_CONFLICTS[@]} -gt 0 ]]; then for rel in "${UPDATE_CONFLICTS[@]}"; do log "     ! $rel"; done; fi
  [[ ${#UPDATE_CONFLICTS[@]} -gt 0 ]] || log "     (ninguno)"
  log "  -- sin cambios:"
  if [[ ${#UPDATE_UNCHANGED[@]} -gt 0 ]]; then for rel in "${UPDATE_UNCHANGED[@]}"; do log "     = $rel"; done; fi
  [[ ${#UPDATE_UNCHANGED[@]} -gt 0 ]] || log "     (ninguno)"
  log "  -- retirados de la plantilla (solo reporte; no se eliminan):"
  if [[ ${#RETIRED_PATHS[@]} -gt 0 ]]; then for rel in "${RETIRED_PATHS[@]}"; do log "     - $rel"; done; fi
  [[ ${#RETIRED_PATHS[@]} -gt 0 ]] || log "     (ninguno)"
  log "  -- excluidos por seguridad:"
  if [[ ${#UPDATE_SENSITIVE[@]} -gt 0 ]]; then for rel in "${UPDATE_SENSITIVE[@]}"; do log "     x $rel"; done; fi
  [[ ${#UPDATE_SENSITIVE[@]} -gt 0 ]] || log "     (ninguno)"
  log ""
}

# ---------------------------------------------------------------------------
# Reconocimiento del destino SIN escritura.
# Rellena CONFLICT_DIRS / CONFLICT_FILES con las rutas de payload ya presentes.
# ---------------------------------------------------------------------------
declare -a CONFLICT_DIRS=() CONFLICT_FILES=() NEW_DIRS=() NEW_FILES=() PENDING_DIRS=() PENDING_FILES=()
recognize_target() {
  local p
  for p in "${PAYLOAD_DIRS[@]}"; do
    [[ -e "$TARGET/$p" ]] && CONFLICT_DIRS+=("$p") || NEW_DIRS+=("$p")
  done
  for p in "${PAYLOAD_FILES[@]}"; do
    [[ -e "$TARGET/$p" ]] && CONFLICT_FILES+=("$p") || NEW_FILES+=("$p")
  done
  [[ -e "$TARGET/docs" ]] && CONFLICT_DIRS+=("docs") || NEW_DIRS+=("docs")
}

# ---------------------------------------------------------------------------
# Detección del stack del destino (SOLO LECTURA).
# Escanea raíz + un nivel (excluye node_modules). Primer match por orden.
# Rellena: BACKEND_VARIANT, FRONTEND_VARIANT, V_* (datos para placeholders).
# ---------------------------------------------------------------------------
indicator_file() {  # $1 = nombre de archivo indicador; imprime la primera ruta
  find "$TARGET" -maxdepth 2 -name "$1" -not -path "*/node_modules/*" -not -path "*/.opencode/*" -print -quit 2>/dev/null
}

pkg_has_dep() {  # $1 = clave de dependencia (regex); busca en cualquier package.json del destino
  local f
  while IFS= read -r f; do
    grep -qE "\"$1\"[[:space:]]*:" "$f" && return 0
  done < <(find "$TARGET" -maxdepth 2 -name package.json -not -path "*/node_modules/*" -not -path "*/.opencode/*" 2>/dev/null)
  return 1
}

pkg_dep_value() {  # $1 = clave de dependencia; imprime su versión del primer package.json que la tenga
  local f v
  while IFS= read -r f; do
    v="$(pkg_json_str "$1" "$f")"
    if [[ -n "$v" ]]; then printf '%s\n' "$v"; return 0; fi
  done < <(find "$TARGET" -maxdepth 2 -name package.json -not -path "*/node_modules/*" -not -path "*/.opencode/*" 2>/dev/null)
  return 0
}

xml_val() {  # $1 = etiqueta xml sin corchetes; $2 = archivo; imprime el primer valor
  grep -m1 -o "<$1>[^<]*" "$2" 2>/dev/null | sed "s/^<$1>//" || true
}

pom_artifact_id() {  # $1 = pom.xml; artifactId del proyecto (ignora el bloque <parent>)
  local after
  after="$(awk '/<\/parent>/{f=1;next} f&&/<artifactId>/{sub(/^.*<artifactId>/,""); sub(/<\/artifactId>.*/,""); print; exit}' "$1" 2>/dev/null || true)"
  if [[ -n "$after" ]]; then printf '%s\n' "$after"; return 0; fi
  xml_val artifactId "$1"
  return 0
}

pom_parent_version() {  # $1 = pom.xml; versión del primer <version> dentro de <parent>
  awk '/<parent>/{f=1} f&&/<version>/{sub(/^.*<version>/,""); sub(/<\/version>.*/,""); print; exit}' "$1" 2>/dev/null || true
}

pkg_json_str() {  # $1 = clave; $2 = package.json; imprime el primer string asociado
  grep -m1 -o "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$2" 2>/dev/null | sed 's/.*:[[:space:]]*"//; s/"$//' || true
}

set_project_name() {
  local candidate=""
  if [[ -n "$POM_FILE" ]]; then
    candidate="$(pom_artifact_id "$POM_FILE")"
  fi
  if [[ -z "$candidate" && -n "$PKG_FILE" ]]; then
    candidate="$(pkg_json_str name "$PKG_FILE")"
  fi
  if [[ -z "$candidate" ]]; then
    candidate="$(basename "$TARGET")"
  fi
  V_PROJECT_NAME="$candidate"
  return 0
}

detect_backend() {
  local gradle
  if [[ -n "$(indicator_file pom.xml)" ]]; then
    POM_FILE="$(indicator_file pom.xml)"
    V_BUILD_TOOL="Maven"
    V_LANGUAGE="Java"
    V_LANGUAGE_VERSION="$(xml_val java.version "$POM_FILE")"
    if grep -q "spring-boot-starter" "$POM_FILE"; then
      BACKEND_VARIANT="spring-boot"
      V_FRAMEWORK="Spring Boot"
      V_FRAMEWORK_VERSION="$(pom_parent_version "$POM_FILE")"
    fi
    return 0
  fi
  gradle="$(indicator_file build.gradle)"; [[ -z "$gradle" ]] && gradle="$(indicator_file build.gradle.kts)"
  if [[ -n "$gradle" ]]; then
    V_LANGUAGE="Java"; V_BUILD_TOOL="Gradle"
    if grep -q "org.springframework.boot" "$gradle"; then
      BACKEND_VARIANT="spring-boot"
      V_FRAMEWORK="Spring Boot"
      V_FRAMEWORK_VERSION="$(grep -m1 -oE "org\.springframework\.boot['\"] version ['\"][^'\"]+" "$gradle" | sed "s/.*version ['\"]//" || true)"
      V_LANGUAGE_VERSION="$(grep -m1 -oE 'sourceCompatibility *= *["'"'"']?[0-9]+|jvmToolchain\([0-9]+' "$gradle" | grep -oE '[0-9]+' | head -1 || true)"
    fi
    return 0
  fi
  if [[ -n "$(indicator_file package.json)" ]]; then
    PKG_FILE="$(indicator_file package.json)"
    V_LANGUAGE="Node.js"; V_BUILD_TOOL="npm"
    V_LANGUAGE_VERSION="$(pkg_json_str node "$PKG_FILE")"
    if pkg_has_dep "@nestjs/core"; then
      # NestJS: paquetes con scope; chequeado antes que express (Nest puede
      # listar express como adaptador de plataforma).
      BACKEND_VARIANT="nestjs"; V_FRAMEWORK="NestJS"; V_FRAMEWORK_VERSION="$(pkg_dep_value "@nestjs/core")"
    elif pkg_has_dep "express"; then
      BACKEND_VARIANT="express-node"; V_FRAMEWORK="Express"; V_FRAMEWORK_VERSION="$(pkg_dep_value "express")"
    elif pkg_has_dep "fastify"; then
      BACKEND_VARIANT="express-node"; V_FRAMEWORK="Fastify"; V_FRAMEWORK_VERSION="$(pkg_dep_value "fastify")"
    fi
    local tf
    for tf in jest vitest mocha; do
      if pkg_has_dep "$tf"; then V_TEST_FRAMEWORK="$tf"; break; fi
    done
    return 0
  fi
  local req; req="$(indicator_file requirements.txt)"; [[ -z "$req" ]] && req="$(indicator_file pyproject.toml)"
  if [[ -n "$req" ]]; then
    V_LANGUAGE="Python"
    if [[ "$req" == *pyproject.toml ]]; then V_BUILD_TOOL="poetry/pip"; else V_BUILD_TOOL="pip"; fi
    if grep -qiE '^(django|.*django[=>])' "$req" 2>/dev/null || grep -qE '"?django"?' "$req" 2>/dev/null; then V_FRAMEWORK="Django"
    elif grep -qi "fastapi" "$req" 2>/dev/null; then V_FRAMEWORK="FastAPI"
    elif grep -qi "flask" "$req" 2>/dev/null; then V_FRAMEWORK="Flask"; fi
    return 0
  fi
  if [[ -n "$(indicator_file go.mod)" ]]; then
    V_LANGUAGE="Go"; V_BUILD_TOOL="go"
    local gomod; gomod="$(indicator_file go.mod)"
    if grep -q "gin-gonic" "$gomod"; then V_FRAMEWORK="Gin"
    elif grep -qi "echo" "$gomod"; then V_FRAMEWORK="Echo"
    elif grep -q "fiber" "$gomod"; then V_FRAMEWORK="Fiber"; fi
    return 0
  fi
  if [[ -n "$(indicator_file Cargo.toml)" ]]; then
    V_LANGUAGE="Rust"; V_BUILD_TOOL="cargo"
    local ct; ct="$(indicator_file Cargo.toml)"
    if grep -q "actix" "$ct"; then V_FRAMEWORK="Actix"
    elif grep -q "axum" "$ct"; then V_FRAMEWORK="Axum"
    elif grep -q "rocket" "$ct"; then V_FRAMEWORK="Rocket"; fi
    return 0
  fi
  if [[ -n "$(indicator_file Gemfile)" ]]; then
    V_LANGUAGE="Ruby"; V_BUILD_TOOL="bundler"
    local gf; gf="$(indicator_file Gemfile)"
    if grep -qi "rails" "$gf"; then V_FRAMEWORK="Rails"
    elif grep -qi "sinatra" "$gf"; then V_FRAMEWORK="Sinatra"; fi
    return 0
  fi
  return 0
}

detect_frontend() {
  # package.json con framework frontend => variante; frontend detectado sin
  # backend => BACKEND_VARIANT=none (frontend puro); backend puro => none.
  if [[ -n "$PKG_FILE" ]] || [[ -n "$(indicator_file package.json)" ]]; then
    [[ -z "$PKG_FILE" ]] && PKG_FILE="$(indicator_file package.json)"
    if pkg_has_dep "react"; then
      FRONTEND_VARIANT="react"
      V_FRAMEWORK_FE="React"
      V_FRAMEWORK_VERSION_FE="$(pkg_dep_value "react")"
    elif pkg_has_dep "@angular/core"; then
      # Angular moderno usa paquetes con scope (@angular/*); la clave simple
      # "angular" solo existe en AngularJS legacy (→ generic).
      FRONTEND_VARIANT="angular"
      V_FRAMEWORK_FE="Angular"
      V_FRAMEWORK_VERSION_FE="$(pkg_dep_value "@angular/core")"
    else
      local fw
      for fw in vue angular svelte next nuxt; do
        if pkg_has_dep "$fw"; then
          FRONTEND_VARIANT="generic"
          V_FRAMEWORK_FE="${fw^}"
          V_FRAMEWORK_VERSION_FE="$(pkg_dep_value "$fw")"
          break
        fi
      done
    fi
    if [[ -n "$V_FRAMEWORK_FE" && -z "$V_LANGUAGE" ]]; then
      # Frontend puro (solo package.json con framework, sin backend detectado)
      BACKEND_VARIANT="none"
    elif [[ -n "$V_FRAMEWORK_FE" && "$V_LANGUAGE" == "Node.js" && "$BACKEND_VARIANT" == "generic" ]]; then
      # package.json solo de tooling/frontend junto a backend detectado por otro lado
      BACKEND_VARIANT="none"
    fi
    return 0
  fi
  if [[ -d "$TARGET/src/main/webapp" ]]; then
    # Frontend server-renderado legado (JSP/Thymeleaf): estándares genéricos.
    FRONTEND_VARIANT="generic"
    return 0
  fi
  if [[ "$BACKEND_VARIANT" == "spring-boot" || -n "$V_LANGUAGE" ]]; then
    # Backend detectado sin indicador frontend: backend puro.
    FRONTEND_VARIANT="none"
  fi
  return 0
}

detect_stack() {
  detect_backend
  detect_frontend
  set_project_name
  return 0
}

report_stack() {
  log "  -- stack detectado:"
  if [[ "$BACKEND_VARIANT" == "none" ]]; then
    log "     backend : no detectado (frontend puro) -> backend-standards.md no se copia"
  else
    log "     backend : variante $BACKEND_VARIANT${V_FRAMEWORK:+ | $V_FRAMEWORK${V_FRAMEWORK_VERSION:+ $V_FRAMEWORK_VERSION}}${V_LANGUAGE:+ | $V_LANGUAGE${V_LANGUAGE_VERSION:+ $V_LANGUAGE_VERSION}}"
  fi
  if [[ "$FRONTEND_VARIANT" == "none" ]]; then
    log "     frontend: no detectado (backend puro) -> frontend-standards.md no se copia"
  else
    log "     frontend: variante $FRONTEND_VARIANT${V_FRAMEWORK_FE:+ | $V_FRAMEWORK_FE${V_FRAMEWORK_VERSION_FE:+ $V_FRAMEWORK_VERSION_FE}}"
  fi
  log "     proyecto: $V_PROJECT_NAME${V_BUILD_TOOL:+ | build: $V_BUILD_TOOL}${V_TEST_FRAMEWORK:+ | tests: $V_TEST_FRAMEWORK}"
  return 0
}

report_recognition() {
  local p
  log ""
  log "== Reconocimiento del destino: $TARGET =="
  if [[ -d "$TARGET/openspec" ]]; then
    log "  openspec/            EXISTE (se preserva; no se ejecuta openspec init)"
  else
    log "  openspec/            no existe (se creará con openspec init)"
  fi
  if [[ -f "$TARGET/graphify-out/graph.json" ]]; then
    log "  graphify-out/        EXISTE (grafo de conocimiento presente)"
  else
    log "  graphify-out/        no existe (crea el grafo después: graphify update .)"
  fi
  report_stack
  log "  -- payload nuevo:"
  for p in "${NEW_DIRS[@]:-}";   do [[ -n "$p" ]] && log "     + $p/ (copia directa)"; done
  for p in "${NEW_FILES[@]:-}";  do [[ -n "$p" ]] && log "     + $p"; done
  log "  -- conflictos (archivo/directorio ya existen):"
  local any_conflict=false
  for p in "${CONFLICT_DIRS[@]:-}";  do [[ -n "$p" ]] && any_conflict=true && log "     ! $p/ (backup + pregunta por archivo cambiado)"; done
  for p in "${CONFLICT_FILES[@]:-}"; do [[ -n "$p" ]] && any_conflict=true && log "     ! $p  (backup + pregunta)"; done
  $any_conflict || log "     (ninguno)"
  log ""
  return 0
}

# ---------------------------------------------------------------------------
dry_run_plan() {
  log "== PLAN (dry-run; no se ha escrito nada) =="
  log "  1. Prerrequisitos verificados."
  report_recognition
  log "  2. openspec init no interactivo si el destino no tiene raíz OpenSpec."
  log "  3. Inyección del contexto español por APPEND en openspec/config.yaml:"
  local line
  for line in "${SPANISH_CONTEXT_BLOCK[@]}"; do log "     | $line"; done
  log "  3b. Reglas de agentes (AGENTS.md):"
  if [[ ! -f "$TARGET/AGENTS.md" ]]; then
    log "     se creará AGENTS.md con las reglas de la plantilla"
  elif grep -qF "$AGENTS_MARKER_BEGIN" "$TARGET/AGENTS.md" || grep -qF "$AGENTS_SENTINEL" "$TARGET/AGENTS.md"; then
    log "     reglas ya presentes (no se duplica)"
  else
    log "     se añadirá el bloque de reglas por APPEND (marcadores BEGIN/END, sin tocar tu contenido)"
  fi
  log "  3c. Gestión del .gitignore del destino (bloque marcado idempotente):"
  if [[ ! -f "$TARGET/.gitignore" ]]; then
    log "     se creará .gitignore con las exclusiones: ${GITIGNORE_ENTRIES[*]}"
  elif grep -qF "$GITIGNORE_SENTINEL" "$TARGET/.gitignore"; then
    log "     bloque gestionado ya presente (no se duplica)"
  else
    log "     se añadirá el bloque gestionado por APPEND (contenido propio intacto)"
  fi
  log "  4. Copia del payload (nuevos: directo; en conflicto: backup a .sdd-backup-<fecha>/ y pregunta):"
  local p
  for p in "${PAYLOAD_DIRS[@]}";  do log "     $p/"; done
  for p in "${PAYLOAD_FILES[@]}"; do log "     $p"; done
  log "     docs/ (completo)"
  log "  4b. Estándares compuestos desde $VARIANTS_ROOT_NAME/ según el stack detectado:"
  if [[ "$BACKEND_VARIANT" == "none" ]]; then
    log "     backend-standards.md  no se copia (frontend puro)"
  else
    log "     backend-standards.md  <- $VARIANTS_ROOT_NAME/backend/$BACKEND_VARIANT.md (placeholders conocidos rellenados)"
  fi
  if [[ "$FRONTEND_VARIANT" == "none" ]]; then
    log "     frontend-standards.md no se copia (backend puro)"
  else
    log "     frontend-standards.md <- $VARIANTS_ROOT_NAME/frontend/$FRONTEND_VARIANT.md (placeholders conocidos rellenados)"
  fi
  log "  5. Skills del stack (npx autoskills): se preguntará al usuario si ejecutarlo en el destino"
  log "     (requiere Node >= 22; con --yes se omite y queda como paso pendiente)."
  log "  6. Recordatorio: npm install en .opencode/ y (opcional) npx skills para Claude Code."
  log ""
  log "Dry-run completo. El destino permanece idéntico. Ejecuta sin --dry-run para aplicar."
  return 0
}

update_dry_run_plan() {
  log "== PLAN DE ACTUALIZACIÓN (dry-run; no se ha escrito nada) =="
  log "  1. Prerrequisitos verificados."
  report_update
  log "  2. Se conservarán AGENTS.md y openspec/config.yaml mediante operaciones idempotentes."
  log "     Si el bloque gestionado de reglas SDD en AGENTS.md difiere de la plantilla,"
  log "     se refrescará con backup previo y confirmación (contenido propio intacto)."
  log "     Si al bloque gestionado de .gitignore le faltan entradas vigentes (ej. .claude/),"
  log "     se refrescará con backup previo y confirmación."
  log "  3. Los conflictos requieren decisión por archivo; los retirados solo se reportan."
  log "  4. El manifiesto se actualizaría al finalizar una aplicación confirmada."
  log "  5. El .gitignore gestionado del destino se mantiene idempotente (sin duplicados)."
  log ""
  log "Dry-run de actualización completo. El destino permanece idéntico."
  return 0
}

# ---------------------------------------------------------------------------
confirm() {
  $AUTO_YES && return 0
  local reply
  read -r -p "$1 [s/N] " reply || return 1
  [[ "$reply" =~ ^[sS]$ ]]
}

# ---------------------------------------------------------------------------
# openspec init no interactivo cuando el destino no tiene raíz.
# ---------------------------------------------------------------------------
init_openspec() {
  if [[ -d "$TARGET/openspec" ]]; then
    log "[OK] openspec/ ya existe en el destino: se preserva tal cual."
    return 0
  fi
  log "[..] Ejecutando openspec init en el destino..."
  if (cd "$TARGET" && openspec init --tools opencode --no-animation); then
    [[ -f "$TARGET/openspec/config.yaml" ]] || die "openspec init no creó openspec/config.yaml"
    log "[OK] Raíz OpenSpec creada."
  else
    die "openspec init falló. Revisa la versión del CLI y ejecuta de nuevo (el destino no se ha modificado más allá de lo ya copiado)."
  fi
  return 0
}

# ---------------------------------------------------------------------------
# Inyección del contexto español por APPEND al campo `context:` del
# openspec/config.yaml. NUNCA reemplaza el archivo: preserva comentarios,
# orden de claves y contenido previo del contexto.
# ---------------------------------------------------------------------------
inject_spanish_context() {
  local cfg="$TARGET/openspec/config.yaml"
  [[ -f "$cfg" ]] || die "No existe $cfg; no se puede inyectar contexto."
  if grep -qF "$SPANISH_CONTEXT_HEADING" "$cfg"; then
    log "[OK] El contexto español ya está presente: no se duplica."
    return 0
  fi

  local tmp; tmp="$(mktemp)"
  if grep -qE '^context:' "$cfg"; then
    # Campo context: existe (bloque | vacío o con contenido). Añadir líneas al
    # final del bloque: antes de la siguiente clave top-level o al final del archivo.
    awk -v lines="$(printf '  %s\n' "${SPANISH_CONTEXT_BLOCK[@]}")" '
      BEGIN { inctx=0; done=0; n=split(lines, L, "\n") }
      /^context:/ { inctx=1; print; next }
      inctx && /^[^ \t#]/ && !done { for (i=1;i<=n;i++) print L[i]; done=1; inctx=0; print; next }
      { print }
      END { if (inctx && !done) for (i=1;i<=n;i++) print L[i] }
    ' "$cfg" > "$tmp"
  else
    # No hay campo context: añadirlo al final del archivo.
    { cat "$cfg"; printf '\n# Contexto de idioma (inyectado por la plantilla SDD)\ncontext: |\n'; \
      printf '  %s\n' "${SPANISH_CONTEXT_BLOCK[@]}"; } > "$tmp"
  fi
  mv "$tmp" "$cfg"
  log "[OK] Contexto español inyectado por APPEND en openspec/config.yaml."
  return 0
}

# ---------------------------------------------------------------------------
# Reglas de agentes: crear AGENTS.md si falta; APPEND marcado si existe;
# en actualización, refrescar el bloque gestionado si difiere de la plantilla.
# Idempotente: bloque idéntico => skip; sentinel sin marcadores => skip+warn.
# ---------------------------------------------------------------------------
manage_agents_md() {
  local dest="$TARGET/AGENTS.md"
  [[ -f "$TEMPLATE_ROOT/AGENTS.md" ]] || die "Falta $TEMPLATE_ROOT/AGENTS.md (fuente de las reglas de agentes)."
  if [[ ! -f "$dest" ]]; then
    log "  -> AGENTS.md no existe: se crea con las reglas de la plantilla (bloque gestionado)"
    $DRY_RUN && return 0
    { printf '%s\n' "$AGENTS_MARKER_BEGIN"; cat "$TEMPLATE_ROOT/AGENTS.md"; printf '%s\n' "$AGENTS_MARKER_END"; } > "$dest"
    log "[OK] AGENTS.md creado."
    return 0
  fi
  local begin_count end_count
  begin_count="$(grep -cF "$AGENTS_MARKER_BEGIN" "$dest" || true)"
  end_count="$(grep -cF "$AGENTS_MARKER_END" "$dest" || true)"
  if (( begin_count == 1 && end_count == 1 )); then
    # Bloque gestionado presente: comparar con la plantilla y refrescar si difiere.
    # Dos variantes validas: plantilla completa (destino nacido gestionado) y
    # sin titulo (APPEND en archivo con titulo propio).
    local block_file tpl_full tpl_noheader before_file after_file dest_block
    block_file="$(mktemp)" tpl_full="$(mktemp)" tpl_noheader="$(mktemp)" before_file="$(mktemp)" after_file="$(mktemp)" dest_block="$(mktemp)"
    { printf '%s\n' "$AGENTS_MARKER_BEGIN"; cat "$TEMPLATE_ROOT/AGENTS.md"; printf '%s\n' "$AGENTS_MARKER_END"; } > "$tpl_full"
    { printf '%s\n' "$AGENTS_MARKER_BEGIN"; tail -n +2 "$TEMPLATE_ROOT/AGENTS.md"; printf '%s\n' "$AGENTS_MARKER_END"; } > "$tpl_noheader"
    awk -v b="$AGENTS_MARKER_BEGIN" 'index($0,b){f=1} f{print}' "$dest" | awk -v e="$AGENTS_MARKER_END" '{print} index($0,e){exit}' > "$dest_block"
    if cmp -s "$tpl_full" "$dest_block" || cmp -s "$tpl_noheader" "$dest_block"; then
      log "[OK] AGENTS.md: bloque de reglas SDD ya sincronizado con la plantilla."
      rm -f "$block_file" "$tpl_full" "$tpl_noheader" "$before_file" "$after_file" "$dest_block"
      return 0
    fi
    log "  -> AGENTS.md: bloque de reglas SDD difiere de la plantilla; se refrescará (contenido propio intacto)"
    $DRY_RUN && rm -f "$block_file" "$tpl_full" "$tpl_noheader" "$before_file" "$after_file" "$dest_block" && return 0
    backup_file "AGENTS.md"
    if confirm "       ¿Reemplazar el bloque de reglas SDD en AGENTS.md con la versión de la plantilla?"; then
      awk -v b="$AGENTS_MARKER_BEGIN" 'index($0,b){exit} {print}' "$dest" > "$before_file"
      awk -v e="$AGENTS_MARKER_END" 'p; index($0,e){p=1}' "$dest" > "$after_file"
      # Variante: bloque que abarca TODO el archivo -> plantilla completa;
      # bloque embebido con contenido propio -> sin titulo (evita H1 duplicado).
      if [[ ! -s "$before_file" && ! -s "$after_file" ]]; then
        cat "$before_file" "$tpl_full" "$after_file" > "$block_file"
      else
        cat "$before_file" "$tpl_noheader" "$after_file" > "$block_file"
      fi
      cp "$block_file" "$dest"
      log "[OK] Bloque de reglas SDD refrescado en AGENTS.md (contenido propio intacto)."
    else
      log "       [mantenido] AGENTS.md (se conserva la versión del destino)"
    fi
    rm -f "$block_file" "$tpl_full" "$tpl_noheader" "$before_file" "$after_file" "$dest_block"
    return 0
  fi
  if (( begin_count > 1 || end_count > 1 )); then
    warn "AGENTS.md tiene marcadores SDD duplicados: el bloque requiere revisión manual (no se modifica)."
    return 0
  fi
  if (( begin_count == 1 || end_count == 1 )); then
    warn "AGENTS.md tiene el bloque SDD incompleto (falta BEGIN o END): requiere revisión manual (no se modifica)."
    return 0
  fi
  if grep -qF "$AGENTS_SENTINEL" "$dest"; then
    if cmp -s "$dest" "$TEMPLATE_ROOT/AGENTS.md"; then
      log "  -> AGENTS.md contiene la plantilla sin marcadores (instalación previa): se reescribirá envuelto en bloque gestionado"
      $DRY_RUN && return 0
      backup_file "AGENTS.md"
      { printf '%s\n' "$AGENTS_MARKER_BEGIN"; cat "$TEMPLATE_ROOT/AGENTS.md"; printf '%s\n' "$AGENTS_MARKER_END"; } > "$dest"
      log "[OK] AGENTS.md reescrito con bloque gestionado (contenido idéntico a la plantilla)."
    else
      warn "AGENTS.md contiene reglas SDD sin marcadores (instalación legacy): el bloque no puede refrescarse automáticamente; requiere revisión manual."
    fi
    return 0
  fi
  log "  -> AGENTS.md existe: se añadirá el bloque de reglas SDD por APPEND"
  $DRY_RUN && return 0
  { printf '\n%s\n' "$AGENTS_MARKER_BEGIN"; tail -n +2 "$TEMPLATE_ROOT/AGENTS.md"; printf '%s\n' "$AGENTS_MARKER_END"; } >> "$dest"
  log "[OK] Reglas SDD añadidas por APPEND en AGENTS.md (contenido propio intacto)."
}

# ---------------------------------------------------------------------------
# .gitignore del destino: tooling de agente y artefactos generados quedan
# fuera del repositorio destino (bloque marcado idempotente).
# ---------------------------------------------------------------------------
warn_tracked_agent_paths() {
  [[ -d "$TARGET/.git" ]] || return 0
  local tracked tops
  tracked="$(git -C "$TARGET" ls-files -- graphify-out/ .agents/ .opencode/ skills-lock.json 2>/dev/null || true)"
  [[ -n "$tracked" ]] || return 0
  tops="$(printf '%s\n' "$tracked" | cut -d/ -f1 | sort -u | tr '\n' ' ')"
  tops="${tops% }"
  warn "El destino ya versiona rutas gestionadas: $tops"
  warn "Des-versiona (no se hace automáticamente): git rm -r --cached $tops"
  return 0
}

manage_gitignore() {
  local gi="$TARGET/.gitignore"
  warn_tracked_agent_paths
  if [[ -f "$gi" ]] && grep -qF "$GITIGNORE_SENTINEL" "$gi"; then
    # Bloque gestionado presente: recalcular entradas aplicables y refrescar si faltan.
    local tmp before_file after_file entry missing=()
    before_file="$(mktemp)" after_file="$(mktemp)" tmp="$(mktemp)"
    awk -v b="$GITIGNORE_MARKER_BEGIN" 'index($0,b){exit} {print}' "$gi" > "$before_file"
    awk -v e="$GITIGNORE_MARKER_END" 'p; index($0,e){p=1}' "$gi" > "$after_file"
    cat "$before_file" "$after_file" > "$tmp"
    for entry in "${GITIGNORE_ENTRIES[@]}"; do
      grep -qxF -- "$entry" "$gi" || missing+=("$entry")
    done
    if (( ${#missing[@]} == 0 )); then
      log "[OK] .gitignore: bloque gestionado ya sincronizado con las entradas vigentes."
      rm -f "$before_file" "$after_file" "$tmp"
      return 0
    fi
    log "  -> .gitignore: faltan entradas en el bloque gestionado: ${missing[*]}"
    $DRY_RUN && rm -f "$before_file" "$after_file" "$tmp" && return 0
    backup_file ".gitignore"
    if confirm "       ¿Añadir las entradas faltantes al bloque gestionado de .gitignore?"; then
      { cat "$before_file"; printf '%s\n' "$GITIGNORE_MARKER_BEGIN"
        for entry in "${GITIGNORE_ENTRIES[@]}"; do
          grep -qxF -- "$entry" "$tmp" || printf '%s\n' "$entry"
        done
        printf '%s\n' "$GITIGNORE_MARKER_END"; cat "$after_file"; } > "$gi"
      log "[OK] Bloque gestionado de .gitignore refrescado (${#missing[@]} entradas añadidas)."
    else
      log "       [mantenido] .gitignore (se conserva la versión del destino)"
    fi
    rm -f "$before_file" "$after_file" "$tmp"
    return 0
  fi
  local missing=() entry
  for entry in "${GITIGNORE_ENTRIES[@]}"; do
    if [[ -f "$gi" ]] && grep -qxF -- "$entry" "$gi"; then continue; fi
    missing+=("$entry")
  done
  if [[ ${#missing[@]} == 0 ]]; then
    log "[OK] .gitignore ya excluye las rutas gestionadas; no se añade bloque."
    return 0
  fi
  log "  -> .gitignore: se añadirá el bloque gestionado con: ${missing[*]}"
  $DRY_RUN && return 0
  if [[ ! -f "$gi" ]]; then
    printf '# Tooling de agente y artefactos generados (gestionado por install.sh)\n' > "$gi"
  else
    printf '\n' >> "$gi"
  fi
  {
    printf '%s\n' "$GITIGNORE_MARKER_BEGIN"
    printf '%s\n' "${missing[@]}"
    printf '%s\n' "$GITIGNORE_MARKER_END"
  } >> "$gi"
  log "[OK] Bloque gestionado añadido a .gitignore (${#missing[@]} exclusiones)."
  return 0
}

# ---------------------------------------------------------------------------
# Copia del payload con política anti-corrupción.
# - nuevo -> copia directa
# - existente idéntico -> se salta (idempotente)
# - existente distinto -> backup del original a .sdd-backup-<fecha>/ y pregunta
# ---------------------------------------------------------------------------
BACKUP_ROOT=""
prepare_backup_root() {
  BACKUP_ROOT="$TARGET/.sdd-backup-$(date +%Y%m%d-%H%M%S)"
}

backup_file() {  # $1 = ruta relativa del original en el destino
  [[ -n "$BACKUP_ROOT" ]] || prepare_backup_root
  local rel="$1" dest="$BACKUP_ROOT/$1"
  mkdir -p "$(dirname "$dest")"
  if ! cp -p "$TARGET/$rel" "$dest"; then
    SYNC_PARTIAL_FAILURE=true
    warn "No se pudo crear el backup de $rel"
    return 1
  fi
  log "     [backup] $rel -> $dest"
}

copy_payload() {
  local p f
  prepare_backup_root

  # Directorios de payload (árbol completo por archivo)
  for p in "${PAYLOAD_DIRS[@]}"; do
    log "  -> $p/"
    while IFS= read -r -d '' f; do
      local rel="$p/${f#"$TEMPLATE_ROOT/$p"/}"
      is_excluded_path "$rel" && continue
      [[ "$rel" == "docs/backend-standards.md" || "$rel" == "docs/frontend-standards.md" ]] && continue
      if [[ ! -e "$TARGET/$rel" ]]; then
        $DRY_RUN && continue
        mkdir -p "$TARGET/$(dirname "$rel")"
        if ! cp -p "$f" "$TARGET/$rel"; then
          SYNC_PARTIAL_FAILURE=true
          warn "No se pudo copiar $rel"
        fi
      else
        if ! cmp -s "$f" "$TARGET/$rel"; then
          log "     [conflicto] $rel difiere de la plantilla"
          backup_file "$rel"
          if confirm "       ¿Reemplazar $rel con la versión de la plantilla?"; then
            $DRY_RUN && continue
            if ! cp -p "$f" "$TARGET/$rel"; then
              SYNC_PARTIAL_FAILURE=true
              warn "No se pudo reemplazar $rel"
            fi
          else
            log "       [mantenido] $rel (se conserva la versión del destino)"
          fi
        fi
      fi
    done < <(find "$TEMPLATE_ROOT/$p" -type f -print0)
  done

  # Archivos sueltos de payload
  for p in "${PAYLOAD_FILES[@]}"; do
    log "  -> $p"
    is_excluded_path "$p" && continue
    if [[ ! -e "$TARGET/$p" ]]; then
      $DRY_RUN && continue
      mkdir -p "$TARGET/$(dirname "$p")"
      if ! cp -p "$TEMPLATE_ROOT/$p" "$TARGET/$p"; then
        SYNC_PARTIAL_FAILURE=true
        warn "No se pudo copiar $p"
      fi
    elif ! cmp -s "$TEMPLATE_ROOT/$p" "$TARGET/$p"; then
      backup_file "$p"
      if confirm "       ¿Reemplazar $p con la versión de la plantilla?"; then
        $DRY_RUN && continue
        if ! cp -p "$TEMPLATE_ROOT/$p" "$TARGET/$p"; then
          SYNC_PARTIAL_FAILURE=true
          warn "No se pudo reemplazar $p"
        fi
      else
        log "       [mantenido] $p (se conserva la versión del destino)"
      fi
    fi
  done

  # docs/ completo (excluyendo directorios generados)
  log "  -> docs/"
  while IFS= read -r -d '' f; do
    local rel="${f#"$TEMPLATE_ROOT/"}" skip=false ex
    is_excluded_path "$rel" && continue
    [[ "$rel" == "docs/backend-standards.md" || "$rel" == "docs/frontend-standards.md" ]] && continue
    for ex in "${PAYLOAD_DOCS_EXCLUDE[@]}"; do
      [[ "$rel" == *"/$ex/"* || "$rel" == docs/"$ex"/* ]] && skip=true
    done
    $skip && continue
    if [[ ! -e "$TARGET/$rel" ]]; then
      $DRY_RUN && continue
      mkdir -p "$TARGET/$(dirname "$rel")"
      if ! cp -p "$f" "$TARGET/$rel"; then
        SYNC_PARTIAL_FAILURE=true
        warn "No se pudo copiar $rel"
      fi
    else
      if ! cmp -s "$f" "$TARGET/$rel"; then
        log "     [conflicto] $rel difiere de la plantilla"
        backup_file "$rel"
        if confirm "         ¿Reemplazar $rel con la versión de la plantilla?"; then
          $DRY_RUN && continue
          if ! cp -p "$f" "$TARGET/$rel"; then
            SYNC_PARTIAL_FAILURE=true
            warn "No se pudo reemplazar $rel"
          fi
        else
          log "         [mantenido] $rel (se conserva la versión del destino)"
        fi
      fi
    fi
  done < <(find "$TEMPLATE_ROOT/docs" -type f -print0)
  $SYNC_PARTIAL_FAILURE && return 1
  return 0
}

# ---------------------------------------------------------------------------
# Composición de estándares desde docs-variants/ según el stack detectado.
# Los placeholders detectables se rellenan; los no detectables quedan visibles
# para refinarlos en el onboarding (skill sdd-onboard-project).
# ---------------------------------------------------------------------------
fill_placeholders() {  # $1 = contexto de FRAMEWORK: backend | frontend ; stdin -> stdout
  local ctx="$1" out
  out="$(cat)"
  out="${out//\{\{PROJECT_NAME\}\}/$V_PROJECT_NAME}"
  if [[ -n "$V_LANGUAGE" ]];      then out="${out//\{\{LANGUAGE\}\}/$V_LANGUAGE}"; fi
  if [[ -n "$V_LANGUAGE_VERSION" ]]; then out="${out//\{\{LANGUAGE_VERSION\}\}/$V_LANGUAGE_VERSION}"; fi
  if [[ "$ctx" == "backend" ]]; then
    if [[ -n "$V_FRAMEWORK" ]];         then out="${out//\{\{FRAMEWORK\}\}/$V_FRAMEWORK}"; fi
    if [[ -n "$V_FRAMEWORK_VERSION" ]]; then out="${out//\{\{FRAMEWORK_VERSION\}\}/$V_FRAMEWORK_VERSION}"; fi
  else
    if [[ -n "$V_FRAMEWORK_FE" ]];         then out="${out//\{\{FRAMEWORK\}\}/$V_FRAMEWORK_FE}"; fi
    if [[ -n "$V_FRAMEWORK_VERSION_FE" ]]; then out="${out//\{\{FRAMEWORK_VERSION\}\}/$V_FRAMEWORK_VERSION_FE}"; fi
  fi
  if [[ -n "$V_BUILD_TOOL" ]];     then out="${out//\{\{BUILD_TOOL\}\}/$V_BUILD_TOOL}"; fi
  if [[ -n "$V_TEST_FRAMEWORK" ]]; then out="${out//\{\{TEST_FRAMEWORK\}\}/$V_TEST_FRAMEWORK}"; fi
  # Si ya no queda ningún token sin resolver, retira la nota sobre placeholders.
  if ! grep -qE '\{\{[A-Z_]+\}\}' <<<"$out"; then
    out="$(grep -vE '^> Section values marked with `\{\{\.\.\.\}\}`' <<<"$out" || true)"
  fi
  printf '%s\n' "$out"
}

compose_one_standard() {  # $1 = kind (backend|frontend) ; $2 = variante ; $3 = archivo destino
  local kind="$1" variant="$2" destname="$3"
  local src="$TEMPLATE_ROOT/$VARIANTS_ROOT_NAME/$kind/$variant.md"
  local dest="$TARGET/docs/$destname"
  if [[ ! -f "$src" ]]; then
    warn "Variante faltante en la plantilla: $src (no se compone docs/$destname)"
    return 0
  fi
  if [[ ! -e "$dest" ]]; then
    log "  -> docs/$destname (variante $kind/$variant)"
    $DRY_RUN && return 0
    mkdir -p "$TARGET/docs"
    fill_placeholders "$kind" < "$src" > "$dest"
  elif ! cmp -s <(fill_placeholders "$kind" < "$src") "$dest"; then
    log "     [conflicto] docs/$destname difiere de la variante $kind/$variant"
    $DRY_RUN && return 0
    backup_file "docs/$destname"
    if confirm "       ¿Reemplazar docs/$destname con la variante del stack detectado ($kind/$variant)?"; then
      fill_placeholders "$kind" < "$src" > "$dest"
    else
      log "       [mantenido] docs/$destname (se conserva la versión del destino)"
    fi
  else
    log "  -> docs/$destname idéntico a la variante (se salta)"
  fi
  return 0
}

compose_docs_standards() {
  log "  -> docs/ (estándares por variante de stack)"
  if [[ "$BACKEND_VARIANT" == "none" ]]; then
    log "     backend puro detectado: docs/backend-standards.md no se copia"
  else
    compose_one_standard backend "$BACKEND_VARIANT" "backend-standards.md"
  fi
  if [[ "$FRONTEND_VARIANT" == "none" ]]; then
    log "     backend puro detectado: docs/frontend-standards.md no se copia"
    log "     (puedes generarlo o marcarlo como no aplicable con la skill sdd-onboard-project)"
  else
    compose_one_standard frontend "$FRONTEND_VARIANT" "frontend-standards.md"
  fi
  return 0
}

# ---------------------------------------------------------------------------
# Sugerencia opt-in de npx autoskills: skills curadas del stack detectado.
# Solo se ejecuta con confirmación explícita; fallo no es fatal.
# ---------------------------------------------------------------------------
prompt_autoskills() {
  log ""
  log "== Skills del stack (npx autoskills) =="
  log "  autoskills detecta las tecnologías del proyecto e instala skills curadas"
  log "  para que tus agentes IA (Cursor, Claude Code, ...) entiendan tu stack."
  log "  (En monorepos, ejecútalo también dentro de cada workspace: backend/, frontend/)"
  if $DRY_RUN; then
    log "  (dry-run) se preguntaría: ¿ejecutar 'npx autoskills' en el destino?"
    return 0
  fi
  if $AUTO_YES; then
    log "  [modo --yes] omitido; ejecuta 'npx autoskills' manualmente en el destino."
    AUTOSKILLS_PENDING=true
    return 0
  fi
  if ! command -v node >/dev/null 2>&1; then
    warn "npx autoskills requiere Node.js >= 22 y 'node' no está en PATH. Se omite (puedes ejecutarlo después)."
    AUTOSKILLS_PENDING=true
    return 0
  fi
  local node_major
  node_major="$(node -e 'console.log(parseInt(process.versions.node, 10))')"
  if (( node_major < 22 )); then
    warn "npx autoskills requiere Node.js >= 22 (detectado: $(node --version)). Se omite (puedes actualizar y ejecutarlo después)."
    AUTOSKILLS_PENDING=true
    return 0
  fi
  if confirm "¿Ejecutar 'npx autoskills' en el destino para instalar skills de tu stack?"; then
    log "  -> ejecutando 'npx -y autoskills' en $TARGET ..."
    if (cd "$TARGET" && npx -y autoskills); then
      log "[OK] autoskills completado en el destino."
    else
      warn "autoskills falló o fue cancelado; la instalación continúa. Ejecútalo después con 'npx autoskills' en el destino."
      AUTOSKILLS_PENDING=true
    fi
  else
    log "  [omitido] Puedes ejecutarlo cuando quieras: npx autoskills (en el proyecto destino)"
    AUTOSKILLS_PENDING=true
  fi
  return 0
}

# ---------------------------------------------------------------------------
# Ronda final de verificación ligera.
# ---------------------------------------------------------------------------
post_checks() {
  grep -qF "$SPANISH_CONTEXT_HEADING" "$TARGET/openspec/config.yaml" \
    || warn "El contexto español no se detecta en openspec/config.yaml"
  [[ -f "$TARGET/.agents/skills/commit/SKILL.md" ]] || warn "Falta .agents/skills/commit/SKILL.md en el destino"
  [[ -f "$TARGET/.opencode/package.json" ]] || warn "Falta .opencode/package.json en el destino"
  [[ -d "$TARGET/docs" ]] || warn "Falta docs/ en el destino"
  [[ -s "$TARGET/.sdd-manifest.json" ]] || warn "Falta .sdd-manifest.json en el destino"
  [[ -f "$TARGET/.agents/skills/INDEX.md" ]] || warn "Falta .agents/skills/INDEX.md en el destino (índice de enrutado de skills)"
  [[ -f "$TARGET/.agents/skills/spec-from-note/SKILL.md" ]] || warn "Falta .agents/skills/spec-from-note/SKILL.md en el destino"
  if [[ -f "$TARGET/.sdd-manifest.json" ]]; then
    grep -q '"schemaVersion": 1' "$TARGET/.sdd-manifest.json" \
      || warn "El manifiesto SDD no declara un schemaVersion válido"
    grep -q '"files":' "$TARGET/.sdd-manifest.json" \
      || warn "El manifiesto SDD no contiene el inventario de archivos"
  fi
  if [[ "$BACKEND_VARIANT" != "none" && ! -f "$TARGET/docs/backend-standards.md" ]]; then
    warn "Falta docs/backend-standards.md (variante $BACKEND_VARIANT) en el destino"
  fi
  if [[ "$FRONTEND_VARIANT" != "none" && ! -f "$TARGET/docs/frontend-standards.md" ]]; then
    warn "Falta docs/frontend-standards.md (variante $FRONTEND_VARIANT) en el destino"
  fi
  if [[ "$BACKEND_VARIANT" == "generic" || "$FRONTEND_VARIANT" == "generic" ]]; then
    warn "Se compusieron estándares genéricos: refínalos con la skill sdd-onboard-project (Fase 3)"
  fi
  $AUTOSKILLS_PENDING && warn "Pendiente: ejecutar 'npx autoskills' en el destino (requiere Node >= 22)"
  [[ -f "$TARGET/graphify-out/graph.json" ]] \
    || warn "El grafo de conocimiento no existe: créalo en el destino con 'graphify update .' (skill sdd-onboard-project)"
  [[ -e "$TARGET/install.sh" ]] && warn "install.sh no debía copiarse al destino"
  [[ -e "$TARGET/$VARIANTS_ROOT_NAME" ]] && warn "$VARIANTS_ROOT_NAME/ no debía copiarse al destino (es fuente del instalador)"
  [[ -e "$TARGET/.opencode/plugins" ]] && warn ".opencode/plugins/ no debía existir en el destino (política: sin plugins opencode)"
  log ""
  log "Plugins opencode: ninguno (política: el recordatorio de graphify vive en las reglas de AGENTS.md)"
  log ""
  log ""
  log "Pasos manuales pendientes en el destino:"
  log "  1. npm install dentro de .opencode/ (dependencia @opencode-ai/plugin)"
  log "  2. (Opcional, solo Claude Code) npx skills en el destino"
  $AUTOSKILLS_PENDING && log "  3. (Opcional) npx autoskills en el destino: skills curadas de tu stack (Node >= 22)"
  log "  4. Onboarding: graphify update . y flujo de la skill sdd-onboard-project"
  log "     (refina los estándares genéricos, resuelve placeholders pendientes)"
  log "  5. Al primer uso de la skill spec-from-note: registrar en"
  log "     docs/requirements/REGISTRY.md la ruta de la plantilla de notas"
  log "     (Requerimiento para Specs.md) del vault de Obsidian"
  return 0
}

# ---------------------------------------------------------------------------
main() {
  parse_args "$@"
  TEMPLATE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

  [[ -d "$TARGET" ]] || die "El destino no existe: $TARGET"
  TARGET="$(cd "$TARGET" && pwd)"

  check_prereqs

  if $UPDATE_MODE; then
    detect_manifest_state
    detect_stack
    TEMPLATE_VERSION="$(template_version)"
    classify_update
    if $DRY_RUN; then
      update_dry_run_plan
      return 0
    fi

    report_update
    log "Confirmación de seguridad: se actualizará la configuración SDD del destino."
    log "Nada se sobrescribe sin backup previo (.sdd-backup-<fecha>/)."
    confirm "¿Continuar con la actualización?" || die "Actualización cancelada por el usuario. Nada fue escrito."

    if ! {
      init_openspec
      inject_spanish_context
      manage_agents_md
      manage_gitignore
      copy_payload
      compose_docs_standards
      ! $SYNC_PARTIAL_FAILURE
    }; then
      warn "Actualización parcial: los backups existentes se conservaron y el destino requiere revisión."
      collect_managed_paths
      write_manifest
      post_checks
      return 1
    fi
    collect_managed_paths
    write_manifest
    post_checks
    log ""
    log "[OK] Actualización SDD completada en: $TARGET"
    return 0
  fi

  if $DRY_RUN; then
    recognize_target
    detect_stack
    dry_run_plan
    return 0
  fi

  recognize_target
  detect_stack
  report_recognition
  log "Confirmación de seguridad: se escribirá configuración en el destino."
  log "Nada se sobrescribe sin backup previo (.sdd-backup-<fecha>/)."
  confirm "¿Continuar con la instalación?" || die "Instalación cancelada por el usuario. Nada fue escrito."

  init_openspec
  inject_spanish_context
  manage_agents_md
  manage_gitignore
  copy_payload
  compose_docs_standards
  collect_managed_paths
  write_manifest
  prompt_autoskills
  post_checks
  log ""
  log "[OK] Instalación SDD completada en: $TARGET"
  return 0
}

main "$@"
