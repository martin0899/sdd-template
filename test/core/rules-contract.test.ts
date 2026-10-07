import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkRulesContract, CYCLE_RULES } from '../../src/core/rules-contract';

const created: string[] = [];
function scratch(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  created.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.length = 0;
});

function contractPath(root: string, name = 'agent-rules-contract'): string {
  return join(root, '.agents', 'skills', name, 'SKILL.md');
}

function writeContract(root: string): void {
  const path = contractPath(root);
  mkdirSync(join(root, '.agents', 'skills', 'agent-rules-contract'), { recursive: true });
  writeFileSync(path, '# agent-rules-contract\n\nContrato central de reglas del ciclo.\n', 'utf8');
}

function skillFile(root: string, name: string, content: string): void {
  mkdirSync(join(root, '.agents', 'skills', name), { recursive: true });
  writeFileSync(join(root, '.agents', 'skills', name, 'SKILL.md'), content, 'utf8');
}

test('checkRulesContract: conjunto limpio (contrato + referencias) no reporta hallazgos', () => {
  const root = scratch('sp-rules-clean-');
  writeContract(root);
  skillFile(
    root,
    'alpha',
    '---\nname: alpha\ndescription: demo\n---\n\n# alpha\n\nReferencia al contrato: .agents/skills/agent-rules-contract/SKILL.md\n'
  );
  assert.deepEqual(checkRulesContract(root), []);
});

test('checkRulesContract: archivo que redefine el texto de una regla ya definida → duplicado (warning)', () => {
  const root = scratch('sp-rules-dupe-');
  writeContract(root);
  skillFile(root, 'beta', `# beta\n\nRegla del ciclo: ${CYCLE_RULES[0].phrase}\n`);
  const findings = checkRulesContract(root);
  const warnings = findings.filter((f) => f.severity === 'warning');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].artifact, /beta/);
  assert.match(warnings[0].suggestion, /agent-rules-contract/);
});

test('checkRulesContract: dos archivos con afirmaciones incompatibles para la misma fase → contradicción (error)', () => {
  const root = scratch('sp-rules-contra-');
  writeContract(root);
  skillFile(root, 'one', `# one\n\n${CYCLE_RULES[0].phrase}\n`);
  skillFile(root, 'two', '# two\n\npueden ejecutarse dos ejecutores activos por cambio\n');
  const errors = checkRulesContract(root).filter((f) => f.severity === 'error');
  assert.equal(errors.length, 1);
  assert.match(errors[0].artifact, /one|two/);
  assert.match(errors[0].suggestion, /contrat/i);
});

test('checkRulesContract: superficies vendor no se tratan como fuentes editables', () => {
  const root = scratch('sp-rules-vendor-');
  writeContract(root);
  mkdirSync(join(root, '.opencode', 'commands'), { recursive: true });
  writeFileSync(join(root, '.opencode', 'commands', 'opsx-apply.md'), `# opsx-apply\n\n${CYCLE_RULES[0].phrase}\n`);
  mkdirSync(join(root, '.opencode', 'skills', 'openspec-x'), { recursive: true });
  writeFileSync(join(root, '.opencode', 'skills', 'openspec-x', 'SKILL.md'), CYCLE_RULES[1].phrase);
  assert.deepEqual(checkRulesContract(root), []);
});

test('checkRulesContract: skill no migrado reporta duplicado; migrado (referencia al contrato) no reporta', () => {
  const root = scratch('sp-rules-migrate-');
  writeContract(root);
  skillFile(root, 'legacy', `# legacy\n\n${CYCLE_RULES[3].phrase}\n`);
  const before = checkRulesContract(root).filter((f) => f.severity === 'warning');
  assert.equal(before.length, 1);

  skillFile(root, 'legacy', '# legacy\n\nReferencia: .agents/skills/agent-rules-contract/SKILL.md\n');
  const after = checkRulesContract(root).filter((f) => f.severity === 'warning');
  assert.deepEqual(after, []);
});