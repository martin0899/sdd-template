import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { checkRulesContract } from '../../src/core/rules-contract';

const REPO = join(__dirname, '..', '..', '..');

/** Every file under a directory (recursively), used to scan documentation surfaces. */
function collectFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full));
    else out.push(full);
  }
  return out;
}

/**
 * SHA-256 of a skill folder, reproducing the hashing algorithm of the EXTERNAL
 * `skills` CLI tool (the third-party package manager that produces the
 * `skills-lock.json` format consumed here).
 *
 * This is NOT a spectralis `src/` function: the repo ships no implementation of
 * it — `src/` never touches `skills-lock.json`. The algorithm (every file's
 * relative path plus its content, sorted by path) was validated empirically
 * against the real lock entries: 5 of the 6 entries in `skills-lock.json` are
 * reproduced exactly (only the obsolete `find-skills` hash differs).
 */
function skillFolderHash(dir: string): string {
  const files: Array<{ path: string; content: Buffer }> = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        files.push({
          path: relative(dir, full).split(sep).join('/'),
          content: readFileSync(full)
        });
      }
    }
  };
  walk(dir);
  files.sort((a, b) => a.path.localeCompare(b.path));
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file.path);
    hash.update(file.content);
  }
  return hash.digest('hex');
}

/**
 * close-out-consolidate-residual: cierre de los cinco residuos documentales
 * que dejó `consolidate-rules-eliminate-ollama-optimize-tokens`.
 *
 * Contrato verificado (sin cambios de comportamiento del CLI):
 *  1. la spec viva de tokens declara el router de 22–28 líneas;
 *  2. no quedan referencias a Ollama en docs/skills/README y el manual
 *     `local-ai` es un stub neutral que redirige a graphify y al cerebro;
 *  3. `subagent-contract` remite al contrato central de reglas del ciclo;
 *  4. `graphify-usage` documenta la navegación del vault Obsidian;
 *  5. `skills-lock.json` fija la skill `grilling` en el estado local.
 */

test('la spec viva de optimize-token-consumption declara el router de 22–28 líneas', () => {
  const spec = readFileSync(
    join(REPO, 'openspec', 'specs', 'optimize-token-consumption', 'spec.md'),
    'utf8'
  );
  assert.ok(
    spec.includes('22–28 lines'),
    'la spec viva debe declarar el rango de 22–28 líneas'
  );
  assert.ok(
    !spec.includes('~40 lines'),
    'la spec viva no debe conservar el rango obsoleto de ~40 líneas'
  );
});

test('no quedan referencias a Ollama en la documentación, las skills ni el README', () => {
  const surfaces = ['notes', '.agents', 'docs'].flatMap((dir) =>
    collectFiles(join(REPO, dir))
  );
  surfaces.push(join(REPO, 'README.md'));

  const hits = surfaces
    .filter((file) => /ollama/i.test(readFileSync(file, 'utf8')))
    .map((file) => relative(REPO, file));

  assert.deepEqual(hits, [], `superficies con referencias a Ollama: ${hits.join(', ')}`);
});

test('el manual local-ai es un stub neutral que redirige a graphify y a los manuales del cerebro', () => {
  const stub = readFileSync(join(REPO, 'notes', 'local-ai', 'manual.md'), 'utf8');
  assert.match(stub, /^# /m, 'el stub debe conservar un título');
  assert.ok(stub.includes('graphify-out/'), 'el stub debe apuntar al grafo de graphify');
  assert.ok(
    stub.includes('03_Recursos/02_Sistemas_info/'),
    'el stub debe apuntar a los manuales del cerebro'
  );
  assert.ok(!/ollama/i.test(stub), 'el stub no debe mencionar Ollama');
  assert.ok(
    stub.split('\n').length < 40,
    'el stub debe seguir siendo mínimo (título + redirecciones)'
  );
});

test('el comando notes sigue publicando el subdirectorio local-ai (ruta stub ratificada)', () => {
  const source = readFileSync(join(REPO, 'src', 'commands', 'notes.ts'), 'utf8');
  // Localización insensible al formato: no se acopla a los espacios, a los
  // saltos de línea, al tipo declarado ni al estilo de comillas de la
  // constante; solo se exige que SUBDIRS declare la lista de subdirectorios.
  const declaration = source.match(/SUBDIRS\b[^=\n]*=\s*\[([^\]]*)\]/);
  assert.ok(declaration, 'SUBDIRS debe seguir declarado en src/commands/notes.ts');
  const names = [...declaration[1].matchAll(/(['"`])([^'"`]*)\1/g)].map((m) => m[2]);
  assert.ok(
    names.includes('local-ai'),
    `SUBDIRS debe conservar local-ai: el stub se publica al cerebro (declarado: ${names.join(', ')})`
  );
});

test('subagent-contract remite al contrato central de reglas del ciclo', () => {
  const contract = readFileSync(
    join(REPO, '.agents', 'skills', 'subagent-contract', 'SKILL.md'),
    'utf8'
  );
  assert.ok(
    contract.includes('agent-rules-contract'),
    'la skill debe referenciar el contrato central de reglas del ciclo'
  );
  assert.ok(
    contract.includes('.agents/skills/agent-rules-contract/SKILL.md'),
    'la skill debe apuntar a la ruta del contrato central'
  );

  const warnings = checkRulesContract(REPO).filter((finding) => finding.severity === 'warning');
  assert.deepEqual(
    warnings.filter((finding) => finding.artifact.includes('subagent-contract')),
    [],
    'subagent-contract no debe redefinir reglas ya definidas en el contrato central'
  );
});

test('las reglas del ciclo citadas en subagent-contract se atribuyen al contrato central', () => {
  const contract = readFileSync(
    join(REPO, '.agents', 'skills', 'subagent-contract', 'SKILL.md'),
    'utf8'
  );
  const quoted = ['reporta y NO modifica', 'un solo ejecutor activo'];
  for (const phrase of quoted) {
    const lines = contract
      .split('\n')
      .filter((line) => line.includes(phrase));
    assert.ok(lines.length > 0, `la skill debe seguir exponiendo "${phrase}"`);
    for (const line of lines) {
      assert.ok(
        line.includes('agent-rules-contract'),
        `"${phrase}" debe atribuirse al contrato central: ${line.trim()}`
      );
    }
  }
});

test('graphify-usage documenta la navegación del vault Obsidian', () => {
  const skill = readFileSync(
    join(REPO, '.agents', 'skills', 'graphify-usage', 'SKILL.md'),
    'utf8'
  );
  assert.ok(
    skill.includes('## Navegación del vault Obsidian'),
    'la skill debe incluir la sección de navegación del vault'
  );
  for (const target of ['01_Proyectos/', 'graphify-out/wiki/index.md', 'openspec/specs/']) {
    assert.ok(
      skill.includes(target),
      `la sección de navegación debe apuntar a ${target}`
    );
  }
});

test('skills-lock.json fija la skill grilling en el estado local', () => {
  const lock = JSON.parse(readFileSync(join(REPO, 'skills-lock.json'), 'utf8'));
  const entry = lock.skills.grilling;
  assert.ok(entry, 'grilling debe seguir registrada en skills-lock.json');
  assert.equal(
    entry.sourceType,
    'local',
    'la entrada debe usar sourceType local: un resync no debe sobrescribir el trigger local'
  );
  assert.equal(
    resolve(REPO, entry.source),
    join(REPO, '.agents', 'skills', 'grilling'),
    'la entrada debe apuntar a la skill local'
  );
  assert.equal(
    entry.skillPath,
    undefined,
    'una entrada local no lleva la ruta remota de skillPath'
  );
  assert.equal(
    entry.computedHash,
    skillFolderHash(join(REPO, '.agents', 'skills', 'grilling')),
    'el hash debe reflejar el estado local de la skill'
  );
});

test('la skill grilling conserva el trigger grill-me', () => {
  const skill = readFileSync(
    join(REPO, '.agents', 'skills', 'grilling', 'SKILL.md'),
    'utf8'
  );
  assert.ok(skill.includes('grill-me'), 'la skill local debe conservar el trigger grill-me');
});
