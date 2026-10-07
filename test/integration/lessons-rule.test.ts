import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const TEMPLATE_AGENTS = join(REPO, 'AGENTS.md');

test('la plantilla AGENTS.md distribuye la regla de Lessons', () => {
  const content = readFileSync(TEMPLATE_AGENTS, 'utf8');

  assert.match(
    content,
    /^## Lessons$/m,
    'AGENTS.md debe contener la sección "## Lessons"'
  );
  assert.ok(
    content.includes('Cuando X, haz Y'),
    'AGENTS.md debe contener el marcador "Cuando X, haz Y"'
  );
  assert.ok(
    content.includes('_Notas/_lessons.md'),
    'AGENTS.md debe referenciar la ruta "_Notas/_lessons.md"'
  );
});
