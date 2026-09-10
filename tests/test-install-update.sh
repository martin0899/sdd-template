#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="$(mktemp -d /tmp/sdd-install-test.XXXXXX)"
FAKE_BIN="$(mktemp -d /tmp/sdd-install-bin.XXXXXX)"

cleanup() {
  rm -rf "$TARGET" "$FAKE_BIN"
}
trap cleanup EXIT

cat > "$FAKE_BIN/openspec" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == "init" ]]; then
  mkdir -p openspec
  printf 'schema: spec-driven\n' > openspec/config.yaml
fi
EOF
cat > "$FAKE_BIN/graphify" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$FAKE_BIN/openspec" "$FAKE_BIN/graphify"

run_installer() {
  PATH="$FAKE_BIN:$PATH" "$ROOT/install.sh" "$TARGET" "$@"
}

run_installer --yes > /tmp/sdd-install-initial.log
[[ -s "$TARGET/.sdd-manifest.json" ]]
node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$TARGET/.sdd-manifest.json"
! grep -qE 'graphify-out|\.env|node_modules' "$TARGET/.sdd-manifest.json"

before_manifest="$(sha256sum "$TARGET/.sdd-manifest.json")"
run_installer --update --dry-run > /tmp/sdd-install-dry-run.log
grep -q 'sin cambios' /tmp/sdd-install-dry-run.log
after_manifest="$(sha256sum "$TARGET/.sdd-manifest.json")"
[[ "$before_manifest" == "$after_manifest" ]]

printf 'customized destination\n' > "$TARGET/.agents/skills/commit/SKILL.md"
run_installer --update --dry-run > /tmp/sdd-install-conflict.log
grep -q 'conflictos personalizados' /tmp/sdd-install-conflict.log
grep -q '.agents/skills/commit/SKILL.md' /tmp/sdd-install-conflict.log

printf 's\nn\n' | PATH="$FAKE_BIN:$PATH" "$ROOT/install.sh" "$TARGET" --update > /tmp/sdd-install-keep.log
grep -q 'customized destination' "$TARGET/.agents/skills/commit/SKILL.md"

run_installer --update --yes > /tmp/sdd-install-update.log
cmp -s "$ROOT/.agents/skills/commit/SKILL.md" "$TARGET/.agents/skills/commit/SKILL.md"
find "$TARGET" -type f -path '*/.sdd-backup-*/.agents/skills/commit/SKILL.md' -print -quit | grep -q .
[[ "$(grep -cF 'Language preference: All interactions' "$TARGET/openspec/config.yaml")" -eq 1 ]]
[[ "$(grep -cF 'ALWAYS use graphify first' "$TARGET/AGENTS.md")" -eq 1 ]]

printf 'interrupted destination\n' > "$TARGET/.agents/skills/commit/SKILL.md"
cat > "$FAKE_BIN/cp" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ "${SDD_FAIL_COPY:-0}" == "1" ]]; then
  exit 1
fi
exec /usr/bin/cp "$@"
EOF
chmod +x "$FAKE_BIN/cp"
set +e
env SDD_FAIL_COPY=1 PATH="$FAKE_BIN:$PATH" "$ROOT/install.sh" "$TARGET" --update --yes > /tmp/sdd-install-interrupted.log 2>&1
interrupted_status=$?
set -e
[[ "$interrupted_status" -ne 0 ]]
grep -q 'Actualización parcial' /tmp/sdd-install-interrupted.log
rm "$FAKE_BIN/cp"
run_installer --update --yes > /tmp/sdd-install-recovery.log

rm -rf "$TARGET"/.sdd-backup-*
run_installer --update --yes > /tmp/sdd-install-idempotent.log
if find "$TARGET" -maxdepth 1 -type d -name '.sdd-backup-*' -print -quit | grep -q .; then
  printf 'Unexpected backup on idempotent update\n' >&2
  exit 1
fi

node -e 'const fs=require("fs"); const p=process.argv[1]; const d=JSON.parse(fs.readFileSync(p)); d.files.push({path:".agents/skills/retired/SKILL.md",hash:"retired"}); fs.writeFileSync(p, JSON.stringify(d));' "$TARGET/.sdd-manifest.json"
run_installer --update --dry-run > /tmp/sdd-install-retired.log
grep -q 'retired/SKILL.md' /tmp/sdd-install-retired.log

rm "$TARGET/.sdd-manifest.json"
run_installer --update --dry-run > /tmp/sdd-install-legacy.log
grep -q 'instalación antigua' /tmp/sdd-install-legacy.log

# ---------------------------------------------------------------------------
# Política project-local del tooling de agente (bloque .gitignore gestionado)
# ---------------------------------------------------------------------------
GI_TARGET="$(mktemp -d /tmp/sdd-gi-fresh.XXXXXX)"
GI_TRACKED="$(mktemp -d /tmp/sdd-gi-tracked.XXXXXX)"
GI_DRY="$(mktemp -d /tmp/sdd-gi-dry.XXXXXX)"
cleanup() {
  rm -rf "$TARGET" "$FAKE_BIN" "$GI_TARGET" "$GI_TRACKED" "$GI_DRY"
}
trap cleanup EXIT

run_installer_into() {
  PATH="$FAKE_BIN:$PATH" "$ROOT/install.sh" "$1" "${@:2}"
}

# Instalación limpia: bloque marcado con las cinco exclusiones.
run_installer_into "$GI_TARGET" --yes > /tmp/sdd-gi-fresh.log 2>&1
grep -qF '# BEGIN: SDD managed gitignore' "$GI_TARGET/.gitignore"
grep -qF '# END: SDD managed gitignore' "$GI_TARGET/.gitignore"
for gi_entry in 'graphify-out/' '.sdd-backup-*/' '.agents/' '.opencode/' 'skills-lock.json'; do
  [[ "$(grep -cxF "$gi_entry" "$GI_TARGET/.gitignore")" -eq 1 ]]
done

# Idempotencia: segunda instalación no duplica entradas ni el bloque.
gi_before="$(sha256sum "$GI_TARGET/.gitignore")"
run_installer_into "$GI_TARGET" --update --yes > /tmp/sdd-gi-idem.log 2>&1
gi_after="$(sha256sum "$GI_TARGET/.gitignore")"
[[ "$gi_before" == "$gi_after" ]]
[[ "$(grep -cF '# BEGIN: SDD managed gitignore' "$GI_TARGET/.gitignore")" -eq 1 ]]

# Rutas ya versionadas: warning read-only + instalación completa.
git -C "$GI_TRACKED" init -q
mkdir -p "$GI_TRACKED/graphify-out"
printf '{}' > "$GI_TRACKED/graphify-out/graph.json"
git -C "$GI_TRACKED" add graphify-out
git -C "$GI_TRACKED" -c user.email=test@test -c user.name=test commit -qm seed
run_installer_into "$GI_TRACKED" --yes > /tmp/sdd-gi-tracked.log 2>&1
grep -q 'git rm -r --cached' /tmp/sdd-gi-tracked.log
git -C "$GI_TRACKED" ls-files graphify-out | grep -q graph.json

# Dry-run: plan del .gitignore reportado y destino sin escribir.
run_installer_into "$GI_DRY" --dry-run > /tmp/sdd-gi-dry.log 2>&1
grep -q 'Gestión del .gitignore del destino' /tmp/sdd-gi-dry.log
[[ ! -e "$GI_DRY/.gitignore" ]]

printf 'install/update integration tests passed\n'
