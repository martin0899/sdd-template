#!/usr/bin/env bash
# =============================================================================
# qa/qa-coverage-gate.sh
#
# Compuerta minima de QA (Nivel 0 + Nivel 1) SIN herramientas externas:
#   Nivel 0a - typecheck con el compilador del repo (tsc -p tsconfig.test.json)
#   Nivel 0b - escaneo de secretos (gitleaks si esta disponible; si no, grep
#              de alta confianza sobre el contenido nuevo del cambio)
#   Nivel 1  - suite completa con la cobertura nativa de node
#              (node --test --experimental-test-coverage) + cobertura de
#              subprocesos (NODE_V8_COVERAGE) + diff coverage de las lineas
#              cambiadas por el cambio
#
# Reglas duras de este script:
#   - NO instala nada: sin `npm install`, sin `npm ci`, sin addons.
#   - NO usa comandos git destructivos: solo lectura (diff, ls-files, rev-parse).
#   - gitleaks es opcional: si no esta instalado se usa el escaneo grep.
#   - No toca ficheros versionados: solo escribe en $WORK_DIR (.test-tmp/...).
#
# Uso:   timeout 300 ./qa/qa-coverage-gate.sh
# Env:   DIFF_FILES                  ficheros src cuyo diff se mide
#        DIFF_COVERAGE_THRESHOLD     umbral de diff coverage (por defecto 80)
#        GLOBAL_COVERAGE_THRESHOLD   umbral de cobertura global (por defecto 85)
#        WORK_DIR                    directorio temporal de trabajo
#        TEST_TIMEOUT                timeout de la suite en segundos (240)
#        SUITE_ATTEMPTS              intentos de la suite ante fallos (3)
# =============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT" || { echo "[FATAL] no se puede entrar en $REPO_ROOT"; exit 2; }

DIFF_FILES="${DIFF_FILES:-src/commands/update.ts src/core/manifest.ts src/bin/spectralis.ts}"
DIFF_COVERAGE_THRESHOLD="${DIFF_COVERAGE_THRESHOLD:-80}"
GLOBAL_COVERAGE_THRESHOLD="${GLOBAL_COVERAGE_THRESHOLD:-85}"
WORK_DIR="${WORK_DIR:-$REPO_ROOT/.test-tmp/qa-coverage-gate}"
TEST_TIMEOUT="${TEST_TIMEOUT:-240}"
SUITE_ATTEMPTS="${SUITE_ATTEMPTS:-3}"

LCOV_FILE="$WORK_DIR/lcov.info"
V8_DIR="$WORK_DIR/v8cov"
ANALYZER="$WORK_DIR/diff-coverage.mjs"
PATTERNS_FILE="$WORK_DIR/secret-patterns.txt"

LEVEL0_OK=1
LEVEL1_OK=1
NOTES=()

say() { printf '%s\n' "$*"; }
hr() { printf '%s\n' "------------------------------------------------------------"; }

# -----------------------------------------------------------------------------
# 0. Preflight
# -----------------------------------------------------------------------------
hr
say "[gate] repo      : $REPO_ROOT"
say "[gate] work dir  : $WORK_DIR"
say "[gate] diff files: $DIFF_FILES"

mkdir -p "$WORK_DIR" "$V8_DIR" || { echo "[FATAL] no se puede crear $WORK_DIR"; exit 2; }
rm -f "$LCOV_FILE"
rm -rf "$V8_DIR"
mkdir -p "$V8_DIR"

if ! command -v node >/dev/null 2>&1; then
  say "[FATAL] node no esta instalado"; exit 2
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 22 ]; then
  say "[FATAL] se requiere node >= 22 (detectado: $(node --version))"; exit 2
fi
if ! command -v git >/dev/null 2>&1; then
  say "[FATAL] git no esta instalado"; exit 2
fi
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  say "[FATAL] $REPO_ROOT no es un repositorio git"; exit 2
fi

# Localizador del compilador TypeScript ya instalado en el repo (nunca se instala).
TSC=""
for cand in node_modules/typescript/bin/tsc node_modules/.bin/tsc; do
  if [ -f "$REPO_ROOT/$cand" ]; then TSC="$REPO_ROOT/$cand"; break; fi
done
if [ -z "$TSC" ]; then
  say "[FATAL] no se encuentra typescript local (node_modules/typescript/bin/tsc)."
  say "       No se instala nada en este script: ejecuta 'npm install' fuera del gate."
  exit 2
fi
say "[gate] node      : $(node --version)"
say "[gate] tsc       : ${TSC#$REPO_ROOT/}"
hr

# -----------------------------------------------------------------------------
# NIVEL 0a - typecheck (el mismo compilador y proyecto que usa `npm test`)
# -----------------------------------------------------------------------------
say "== NIVEL 0a: typecheck (tsc -p tsconfig.test.json) =="
if node "$TSC" -p tsconfig.test.json --noEmit; then
  say "[PASS] typecheck: sin errores de tipos"
else
  say "[FAIL] typecheck: tsc -p tsconfig.test.json reporta errores"
  LEVEL0_OK=0
fi
hr

# -----------------------------------------------------------------------------
# NIVEL 0b - escaneo de secretos
# -----------------------------------------------------------------------------
write_patterns() {
  # Los patrones no pueden coincidir consigo mismos (el escaner no se escanea a
  # si mismo: qa/qa-coverage-gate.sh esta excluido del barrido).
  cat > "$PATTERNS_FILE" <<'PATTERNS_EOF'
-----BEGIN [A-Z ]*PRIVATE KEY-----
sk-[A-Za-z0-9]{20,}
ghp_[A-Za-z0-9]{20,}
gho_[A-Za-z0-9]{20,}
ghu_[A-Za-z0-9]{20,}
ghs_[A-Za-z0-9]{20,}
ghr_[A-Za-z0-9]{20,}
github_pat_[A-Za-z0-9_]{20,}
AKIA[0-9A-Z]{16}
ASIA[0-9A-Z]{16}
AIza[0-9A-Za-z_-]{35}
xox[baprs]-[A-Za-z0-9-]{10,}
eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}
([Pp]assword|[Pp]asswd|[Pp]wd)[ \t]*=[ \t]*["']?[A-Za-z0-9!@#$%^&*_.-]{8,}
PATTERNS_EOF
}

is_excluded() {
  case "$1" in
    # el propio escaner contiene los patrones de deteccion: no se escanea a si mismo
    qa/qa-coverage-gate.sh) return 0 ;;
    node_modules/*|*/node_modules/*) return 0 ;;
    dist/*|*/dist/*|dist-test/*|*/dist-test/*) return 0 ;;
    graphify-out/*|*/graphify-out/*|.git/*|*/.git/*) return 0 ;;
    .test-tmp/*|*/.test-tmp/*|openspec/*|*/openspec/*) return 0 ;;
    *.lock|package-lock.json|pnpm-lock.yaml|yarn.lock) return 0 ;;
    test/fixtures/*|*/test/fixtures/*) return 0 ;;
    *.png|*.jpg|*.jpeg|*.gif|*.pdf|*.zip|*.tar|*.gz) return 0 ;;
  esac
  return 1
}

scan_secrets_grep() {
  local findings="$WORK_DIR/secret-findings.txt"
  : > "$findings"
  local scanned=0 f
  # (a) lineas anadidas por el cambio (staged + unstaged vs HEAD)
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    is_excluded "$f" && continue
    [ -f "$f" ] || continue
    scanned=$((scanned + 1))
    git diff HEAD -- "$f" 2>/dev/null | grep -E '^\+' | grep -E -i -f "$PATTERNS_FILE" \
      | sed "s|^|$f: |" >> "$findings"
  done < <(git diff --name-only HEAD 2>/dev/null)
  # (b) ficheros nuevos sin seguimiento: todo su contenido es contenido nuevo
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    is_excluded "$f" && continue
    [ -f "$f" ] || continue
    scanned=$((scanned + 1))
    grep -E -i -n -f "$PATTERNS_FILE" "$f" 2>/dev/null | sed "s|^|$f: |" >> "$findings"
  done < <(git ls-files --others --exclude-standard 2>/dev/null)
  echo "$scanned"
  [ -s "$findings" ]
}

say "== NIVEL 0b: escaneo de secretos =="
write_patterns
if command -v gitleaks >/dev/null 2>&1; then
  say "[info] gitleaks encontrado: $(gitleaks version 2>/dev/null | head -1)"
  GITLEAKS_OK=0
  if gitleaks git --staged --no-banner --redact >/dev/null 2>&1; then
    GITLEAKS_OK=1
  elif gitleaks protect --staged --no-banner --redact >/dev/null 2>&1; then
    GITLEAKS_OK=1
  elif gitleaks detect --no-git --source "$REPO_ROOT" --no-banner --redact >/dev/null 2>&1; then
    GITLEAKS_OK=1
  fi
  if [ "$GITLEAKS_OK" -eq 1 ]; then
    say "[PASS] gitleaks: sin secretos detectados"
  else
    say "[FAIL] gitleaks: secretos detectados (ver arriba)"
    LEVEL0_OK=0
  fi
  say "[info] el escaneo grep de alta confianza tambien se ejecuta como red de seguridad"
fi
SCANNED="$(scan_secrets_grep | head -1)"
if grep -q . "$WORK_DIR/secret-findings.txt" 2>/dev/null; then
  say "[FAIL] escaneo de secretos: coincidencias de alta confianza"
  head -20 "$WORK_DIR/secret-findings.txt" | sed 's/^/       /'
  LEVEL0_OK=0
else
  say "[PASS] escaneo de secretos: sin coincidencias ($SCANNED ficheros analizados)"
fi
hr

# -----------------------------------------------------------------------------
# NIVEL 1 - suite con cobertura y diff coverage
# -----------------------------------------------------------------------------
say "== NIVEL 1: suite con cobertura nativa de node =="

# 1.1 Build de produccion (script `prepare` del repo) para que la cobertura de
#     subprocesos refleje el codigo actual que ejecutan los tests.
say "[info] compilando dist/ (tsc -p tsconfig.json)"
if ! node "$TSC" -p tsconfig.json; then
  say "[FAIL] compilacion de dist/ fallida"
  LEVEL1_OK=0
fi

# 1.2 Build de test con source maps: permite atribuir la cobertura a las lineas
#     .ts originales (no se modifica tsconfig.test.json: son flags de CLI).
say "[info] compilando dist-test/ con source maps (tsc -p tsconfig.test.json --sourceMap)"
if ! node "$TSC" -p tsconfig.test.json --sourceMap --inlineSources; then
  say "[FAIL] compilacion de dist-test/ fallida"
  LEVEL1_OK=0
fi

# 1.3 Suite: la invocacion replica el script `test` del package.json y solo anade
#     la cobertura. NODE_V8_COVERAGE recoge tambien la cobertura de los
#     subprocesos (el CLI se prueba como proceso hijo).
TEST_CMD=(node --test --enable-source-maps --experimental-test-coverage
          --test-reporter=spec --test-reporter=lcov
          --test-reporter-destination=stdout
          "--test-reporter-destination=$LCOV_FILE"
          'dist-test/**/*.test.js')
say "[info] ejecutando: ${TEST_CMD[*]}"
run_suite() {
  if command -v timeout >/dev/null 2>&1; then
    NODE_V8_COVERAGE="$V8_DIR" timeout "$TEST_TIMEOUT" "${TEST_CMD[@]}"
    return $?
  fi
  NODE_V8_COVERAGE="$V8_DIR" "${TEST_CMD[@]}"
  return $?
}
# El repo tiene un test inestable conocido por resolucion de mtime
# (test/core/detect-stack.test.ts -> src/core/detect-stack.ts compara
# `mtimeMs > detected_at` con un timestamp truncado a milisegundos).
# Se permiten SUITE_ATTEMPTS intentos: un fallo reproducible sigue fallando el gate.
ATTEMPT=1
while : ; do
  run_suite
  TEST_STATUS=$?
  if [ "$TEST_STATUS" -eq 0 ]; then
    if [ "$ATTEMPT" -eq 1 ]; then
      say "[PASS] la suite de tests pasa"
    else
      say "[PASS] la suite de tests pasa en el intento $ATTEMPT/$SUITE_ATTEMPTS (fallo inestable previo, ver avisos)"
    fi
    break
  fi
  if [ "$ATTEMPT" -ge "$SUITE_ATTEMPTS" ]; then
    say "[FAIL] la suite de tests falla de forma reproducible en $SUITE_ATTEMPTS intentos (codigo de salida $TEST_STATUS)"
    LEVEL1_OK=0
    break
  fi
  say "[WARN] la suite fallo en el intento $ATTEMPT/$SUITE_ATTEMPTS; se reejecuta para descartar instabilidad"
  ATTEMPT=$((ATTEMPT + 1))
done
hr

# -----------------------------------------------------------------------------
# 1.4 Analizador de cobertura (embebido): diff coverage + cobertura global
# -----------------------------------------------------------------------------
cat > "$ANALYZER" <<'ANALYZER_EOF'
// Analizador de cobertura del gate: cobertura global + diff coverage.
// Entradas: <repo> <lcov> <dir_v8> "<ficheros diff>" <umbral diff> <umbral global>
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const REPO = process.argv[2];
const LCOV = process.argv[3];
const V8DIR = process.argv[4];
const DIFF_FILES = process.argv[5].split(/\s+/).filter(Boolean);
const DIFF_THRESHOLD = Number(process.argv[6] || 80);
const GLOBAL_THRESHOLD = Number(process.argv[7] || 85);

// --- lcov: cobertura en proceso (node ya la atribuya a los .ts originales) ---
const da = new Map();
{
  let cur = null;
  for (const line of readFileSync(LCOV, 'utf8').split('\n')) {
    if (line.startsWith('SF:')) { cur = line.slice(3); da.set(cur, new Map()); }
    else if (line.startsWith('DA:') && cur) {
      const [l, c] = line.slice(3).split(',');
      da.get(cur).set(Number(l), Number(c));
    } else if (line === 'end_of_record') cur = null;
  }
}

// --- decodificador de source maps (linea JS generada -> lineas .ts originales) ---
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function decodeVLQ(str) {
  const out = []; let shift = 0, value = 0;
  for (const ch of str) {
    const digit = B64.indexOf(ch);
    if (digit < 0) throw new Error('caracter base64 invalido: ' + ch);
    const cont = digit & 32;
    value += (digit & 31) << shift;
    if (cont) { shift += 5; }
    else {
      const neg = value & 1; value >>= 1;
      out.push(neg ? -value : value);
      value = 0; shift = 0;
    }
  }
  return out;
}
function jsToTs(mapPath) {
  const map = JSON.parse(readFileSync(mapPath, 'utf8'));
  const gen = new Map();
  let srcIdx = 0, srcLine = 0;
  const segs = map.mappings.split(';');
  for (let i = 0; i < segs.length; i++) {
    let genCol = 0;
    for (const s of segs[i].split(',')) {
      if (!s) continue;
      const f = decodeVLQ(s);
      genCol += f[0];
      if (f.length >= 4) {
        srcIdx += f[1]; srcLine += f[2];
        if (!gen.has(i + 1)) gen.set(i + 1, new Set());
        gen.get(i + 1).add(srcLine + 1);
      }
    }
  }
  return gen;
}

// --- cobertura cruda de V8 (subprocesos) -> lineas JS cubiertas ---
function lineStarts(content) {
  const starts = [0];
  for (let i = 0; i < content.length; i++) if (content.charCodeAt(i) === 10) starts.push(i + 1);
  return starts;
}
const raw = new Map();
if (existsSync(V8DIR)) {
  for (const f of readdirSync(V8DIR)) {
    if (!f.endsWith('.json')) continue;
    let j;
    try { j = JSON.parse(readFileSync(`${V8DIR}/${f}`, 'utf8')); } catch { continue; }
    for (const script of j.result || []) {
      if (!script.url || !script.url.startsWith('file://')) continue;
      const abs = decodeURIComponent(script.url.slice('file://'.length));
      if (!abs.startsWith(REPO + '/')) continue;
      if (!existsSync(abs)) continue;
      const rel = abs.slice(REPO.length + 1);
      const content = readFileSync(abs, 'utf8');
      const starts = lineStarts(content);
      for (const fn of script.functions || []) {
        for (const range of fn.ranges || []) {
          if (!range.count) continue;
          const s = range.startOffset, e = range.endOffset;
          let lo = 0, hi = starts.length - 1, first = starts.length - 1;
          while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (starts[mid] <= s) { first = mid; lo = mid + 1; } else hi = mid - 1;
          }
          for (let li = first; li < starts.length; li++) {
            if (starts[li] >= e) break;
            if (!raw.has(rel)) raw.set(rel, new Set());
            raw.get(rel).add(li + 1);
          }
        }
      }
    }
  }
}

// --- lineas cambiadas por el cambio (git diff -U0 HEAD) ---
function changedLines(file) {
  const out = execFileSync('git', ['diff', '-U0', 'HEAD', '--', file], { cwd: REPO, encoding: 'utf8' });
  const set = new Set();
  for (const m of out.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
    const start = Number(m[1]);
    const count = m[2] === undefined ? 1 : Number(m[2]);
    for (let i = 0; i < count; i++) set.add(start + i);
  }
  return set;
}

// --- por fichero ---
const rows = [];
let totalExec = 0, totalCovered = 0, globalOk = true, estimateMode = false;
for (const f of DIFF_FILES) {
  const tsAbs = `${REPO}/${f}`;
  if (!existsSync(tsAbs)) { console.log(`!! ${f}: no existe`); continue; }
  const jsRel = 'dist-test/' + f.replace(/\.ts$/, '.js');
  const mapPath = `${REPO}/${jsRel}.map`;
  const hasMap = existsSync(mapPath);
  if (!hasMap) estimateMode = true;
  const gen = hasMap ? jsToTs(mapPath) : new Map();
  const executableTs = new Set();
  for (const set of gen.values()) for (const l of set) executableTs.add(l);

  // cobertura de subprocesos: dist/<...> (CLI como proceso hijo) y dist-test/<...>
  const subTs = new Set();
  const jsCandidates = ['dist/' + f.replace(/^src\//, '').replace(/\.ts$/, '.js'), jsRel];
  for (const js of jsCandidates) {
    const covered = raw.get(js);
    if (!covered || !gen.size) continue;
    const jsAbs = `${REPO}/${js}`;
    if (!existsSync(jsAbs)) continue;
    const jsLines = readFileSync(jsAbs, 'utf8').split('\n').length;
    const mappedLines = Math.max(...gen.keys());
    if (mappedLines > jsLines) {
      console.log(`   (aviso) ${js}: cobertura de subproceso descartada (emision distinta a la mapeada)`);
      continue;
    }
    for (const jsLine of covered) for (const tsLine of gen.get(jsLine) || []) subTs.add(tsLine);
  }

  const inProc = da.get(f) || new Map();
  const changed = changedLines(f);
  const src = readFileSync(tsAbs, 'utf8').split('\n');

  const execChanged = [], nonExec = [], coveredLines = [], uncoveredLines = [];
  for (const line of [...changed].sort((a, b) => a - b)) {
    const isExec = executableTs.has(line);
    const hit = (inProc.get(line) ?? 0) > 0 || subTs.has(line);
    if (!isExec) { nonExec.push(line); continue; }
    execChanged.push(line);
    (hit ? coveredLines : uncoveredLines).push(line);
  }
  totalExec += execChanged.length;
  totalCovered += coveredLines.length;

  const universe = new Set([...executableTs]);
  for (const [l, c] of inProc) if (c > 0) universe.add(l);
  let gCov = 0;
  for (const line of universe) if ((inProc.get(line) ?? 0) > 0 || subTs.has(line)) gCov++;
  const gPct = universe.size ? (100 * gCov / universe.size) : 0;
  const dPct = execChanged.length ? (100 * coveredLines.length / execChanged.length) : 100;
  if (gPct < GLOBAL_THRESHOLD) globalOk = false;
  rows.push({ f, gPct, gCov, universe: universe.size, dPct, covered: coveredLines.length, exec: execChanged.length, nonExec: nonExec.length, uncoveredLines, src });
}

console.log('');
console.log('== Cobertura de los archivos tocados por el cambio ==');
console.log('  archivo                        global (lineas)   diff (lineas cambiadas ejecutables)');
for (const r of rows) {
  console.log(`  ${r.f.padEnd(30)} ${r.gPct.toFixed(2).padStart(6)}% (${r.gCov}/${r.universe})   ${r.dPct.toFixed(2).padStart(6)}% (${r.covered}/${r.exec})`);
  if (r.uncoveredLines.length) {
    console.log(`      lineas cambiadas ejecutables sin cubrir (${r.uncoveredLines.length}):`);
    for (const l of r.uncoveredLines.slice(0, 20)) console.log(`        ${l}: ${(r.src[l - 1] || '').trim()}`);
    if (r.uncoveredLines.length > 20) console.log(`        ... +${r.uncoveredLines.length - 20} mas`);
  }
}
const totalPct = totalExec ? (100 * totalCovered / totalExec) : 100;
console.log('');
console.log(`  diff_coverage total: ${totalCovered}/${totalExec} = ${totalPct.toFixed(2)}%  (umbral ${DIFF_THRESHOLD}%) -> ${totalPct >= DIFF_THRESHOLD ? 'PASS' : 'FAIL'}`);
console.log(`  cobertura global por archivo (umbral ${GLOBAL_THRESHOLD}%) -> ${globalOk ? 'PASS' : 'FAIL'}`);
if (estimateMode) console.log('  (modo estimacion: falta el source map de algun fichero)');
process.exit(totalPct >= DIFF_THRESHOLD && globalOk ? 0 : 1);
ANALYZER_EOF

say "== NIVEL 1b: diff coverage y cobertura global =="
if node "$ANALYZER" "$REPO_ROOT" "$LCOV_FILE" "$V8_DIR" "$DIFF_FILES" \
     "$DIFF_COVERAGE_THRESHOLD" "$GLOBAL_COVERAGE_THRESHOLD"; then
  say "[PASS] diff coverage y cobertura global por encima de los umbrales"
else
  say "[FAIL] diff coverage o cobertura global por debajo de los umbrales"
  LEVEL1_OK=0
fi
hr

# -----------------------------------------------------------------------------
# Resumen
# -----------------------------------------------------------------------------
say "== RESUMEN =="
if [ "$LEVEL0_OK" -eq 1 ]; then say "NIVEL 0: PASS (typecheck + escaneo de secretos)"; else say "NIVEL 0: FAIL"; fi
if [ "$LEVEL1_OK" -eq 1 ]; then say "NIVEL 1: PASS (suite + diff coverage)"; else say "NIVEL 1: FAIL"; fi
if [ "$LEVEL0_OK" -eq 1 ] && [ "$LEVEL1_OK" -eq 1 ]; then
  say "GATE: PASS"
  exit 0
fi
say "GATE: FAIL"
exit 1
