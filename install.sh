#!/usr/bin/env bash
#
# install.sh — Instalador no destructivo de la plantilla SDD
#
# Copia la configuración SDD de este repo plantilla hacia un proyecto
# destino (nuevo o existente) sin corromperlo:
#   - Verifica prerrequisitos antes de escribir nada
#   - Reconoce el destino y reporta conflictos
#   - --dry-run muestra el plan completo sin tocar disco
#   - openspec init (no interactivo) + inyección del contexto español
#   - Archivo en conflicto -> backup a .sdd-backup-<fecha>/ + pregunta
#
# Uso:
#   ./install.sh <destino> [--dry-run] [--yes]
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Manifiesto de payload — única fuente de verdad de qué viaja al destino.
# NO viaja: install.sh, README.md, openspec/changes/* del repo plantilla,
# node_modules, graphify-out/, .sdd-backup-*/.
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

DRY_RUN=false
AUTO_YES=false
TARGET=""

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
      --yes|-y)  AUTO_YES=true; shift ;;
      -h|--help) usage 0 ;;
      -*)        die "Opción desconocida: $1 (usa --help)" ;;
      *)         [[ -n "$TARGET" ]] && die "Solo se admite un destino"; TARGET="$1"; shift ;;
    esac
  done
  [[ -n "$TARGET" ]] || die "Falta el proyecto destino. Uso: ./install.sh <destino> [--dry-run] [--yes]"
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
  log "  4. Copia del payload (nuevos: directo; en conflicto: backup a .sdd-backup-<fecha>/ y pregunta):"
  local p
  for p in "${PAYLOAD_DIRS[@]}";  do log "     $p/"; done
  for p in "${PAYLOAD_FILES[@]}"; do log "     $p"; done
  log "     docs/ (completo)"
  log "  5. Recordatorio: npm install en .opencode/ y (opcional) npx skills para Claude Code."
  log ""
  log "Dry-run completo. El destino permanece idéntico. Ejecuta sin --dry-run para aplicar."
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
# Reglas de agentes: crear AGENTS.md si falta; APPEND marcado si existe.
# Idempotente: marcador BEGIN/END o sentencia graphify ya presente => skip.
# ---------------------------------------------------------------------------
manage_agents_md() {
  local dest="$TARGET/AGENTS.md"
  [[ -f "$TEMPLATE_ROOT/AGENTS.md" ]] || die "Falta $TEMPLATE_ROOT/AGENTS.md (fuente de las reglas de agentes)."
  if [[ ! -f "$dest" ]]; then
    log "  -> AGENTS.md no existe: se crea con las reglas de la plantilla"
    $DRY_RUN && return 0
    cp "$TEMPLATE_ROOT/AGENTS.md" "$dest"
    log "[OK] AGENTS.md creado."
    return 0
  fi
  if grep -qF "$AGENTS_MARKER_BEGIN" "$dest" || grep -qF "$AGENTS_SENTINEL" "$dest"; then
    log "[OK] AGENTS.md ya contiene las reglas SDD: no se duplica."
    return 0
  fi
  log "  -> AGENTS.md existe: se añadirá el bloque de reglas SDD por APPEND"
  $DRY_RUN && return 0
  { printf '\n%s\n' "$AGENTS_MARKER_BEGIN"; tail -n +2 "$TEMPLATE_ROOT/AGENTS.md"; printf '%s\n' "$AGENTS_MARKER_END"; } >> "$dest"
  log "[OK] Reglas SDD añadidas por APPEND en AGENTS.md (contenido propio intacto)."
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
  local rel="$1" dest="$BACKUP_ROOT/$1"
  mkdir -p "$(dirname "$dest")"
  cp -p "$TARGET/$rel" "$dest"
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
      if [[ ! -e "$TARGET/$rel" ]]; then
        $DRY_RUN && continue
        mkdir -p "$TARGET/$(dirname "$rel")"
        cp -p "$f" "$TARGET/$rel"
      else
        if ! cmp -s "$f" "$TARGET/$rel"; then
          log "     [conflicto] $rel difiere de la plantilla"
          backup_file "$rel"
          if confirm "       ¿Reemplazar $rel con la versión de la plantilla?"; then
            $DRY_RUN && continue
            cp -p "$f" "$TARGET/$rel"
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
    if [[ ! -e "$TARGET/$p" ]]; then
      $DRY_RUN && continue
      mkdir -p "$TARGET/$(dirname "$p")"
      cp -p "$TEMPLATE_ROOT/$p" "$TARGET/$p"
    elif ! cmp -s "$TEMPLATE_ROOT/$p" "$TARGET/$p"; then
      backup_file "$p"
      if confirm "       ¿Reemplazar $p con la versión de la plantilla?"; then
        $DRY_RUN && continue
        cp -p "$TEMPLATE_ROOT/$p" "$TARGET/$p"
      else
        log "       [mantenido] $p (se conserva la versión del destino)"
      fi
    fi
  done

  # docs/ completo (excluyendo directorios generados)
  log "  -> docs/"
  while IFS= read -r -d '' f; do
    local rel="${f#"$TEMPLATE_ROOT/"}" skip=false ex
    for ex in "${PAYLOAD_DOCS_EXCLUDE[@]}"; do
      [[ "$rel" == *"/$ex/"* || "$rel" == docs/"$ex"/* ]] && skip=true
    done
    $skip && continue
    if [[ ! -e "$TARGET/$rel" ]]; then
      $DRY_RUN && continue
      mkdir -p "$TARGET/$(dirname "$rel")"
      cp -p "$f" "$TARGET/$rel"
    else
      if ! cmp -s "$f" "$TARGET/$rel"; then
        log "     [conflicto] $rel difiere de la plantilla"
        backup_file "$rel"
        if confirm "         ¿Reemplazar $rel con la versión de la plantilla?"; then
          $DRY_RUN && continue
          cp -p "$f" "$TARGET/$rel"
        else
          log "         [mantenido] $rel (se conserva la versión del destino)"
        fi
      fi
    fi
  done < <(find "$TEMPLATE_ROOT/docs" -type f -print0)
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
  [[ -f "$TARGET/graphify-out/graph.json" ]] \
    || warn "El grafo de conocimiento no existe: créalo en el destino con 'graphify update .' (skill sdd-onboard-project)"
  [[ -e "$TARGET/install.sh" ]] && warn "install.sh no debía copiarse al destino"
  log ""
  log "Pasos manuales pendientes en el destino:"
  log "  1. npm install dentro de .opencode/ (dependencia @opencode-ai/plugin)"
  log "  2. (Opcional, solo Claude Code) npx skills en el destino"
  log "  3. Onboarding: graphify update . y flujo de la skill sdd-onboard-project"
  return 0
}

# ---------------------------------------------------------------------------
main() {
  parse_args "$@"
  TEMPLATE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

  [[ -d "$TARGET" ]] || die "El destino no existe: $TARGET"
  TARGET="$(cd "$TARGET" && pwd)"

  check_prereqs

  if $DRY_RUN; then
    recognize_target
    dry_run_plan
    return 0
  fi

  recognize_target
  report_recognition
  log "Confirmación de seguridad: se escribirá configuración en el destino."
  log "Nada se sobrescribe sin backup previo (.sdd-backup-<fecha>/)."
  confirm "¿Continuar con la instalación?" || die "Instalación cancelada por el usuario. Nada fue escrito."

  init_openspec
  inject_spanish_context
  manage_agents_md
  copy_payload
  post_checks
  log ""
  log "[OK] Instalación SDD completada en: $TARGET"
  return 0
}

main "$@"
