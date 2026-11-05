import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSpecCommand, type SpecCommandHandlers } from '../../src/commands/spec';

interface RecordedCall {
  handler: string;
  opts: Record<string, unknown>;
}

function recordingHandlers(calls: RecordedCall[]): SpecCommandHandlers {
  const record = (handler: string) => async (opts: unknown): Promise<number> => {
    calls.push({ handler, opts: opts as Record<string, unknown> });
    return 0;
  };
  return {
    init: record('init'),
    complete: record('complete'),
    create: record('create'),
    migrate: record('migrate'),
    archive: record('archive')
  } as unknown as SpecCommandHandlers;
}

test('spec init delegates to the init handler with the project and the spec id', async () => {
  const calls: RecordedCall[] = [];
  const code = await runSpecCommand('init', ['my-project', 'my-spec'], {}, recordingHandlers(calls));
  assert.equal(code, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].handler, 'init');
  assert.equal(calls[0].opts.project, 'my-project');
  assert.equal(calls[0].opts.specId, 'my-spec');
});

test('spec complete delegates to the complete handler with the project and the spec id', async () => {
  const calls: RecordedCall[] = [];
  const code = await runSpecCommand('complete', ['my-project', 'my-spec'], {}, recordingHandlers(calls));
  assert.equal(code, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].handler, 'complete');
  assert.equal(calls[0].opts.project, 'my-project');
  assert.equal(calls[0].opts.specId, 'my-spec');
});

test('spec create delegates to the create handler with the change id', async () => {
  const calls: RecordedCall[] = [];
  const code = await runSpecCommand('create', ['my-change'], {}, recordingHandlers(calls));
  assert.equal(code, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].handler, 'create');
  assert.equal(calls[0].opts.changeId, 'my-change');
});

test('spec migrate delegates to the migrate handler without requiring positionals', async () => {
  const calls: RecordedCall[] = [];
  const code = await runSpecCommand('migrate', [], {}, recordingHandlers(calls));
  assert.equal(code, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].handler, 'migrate');
});

test('spec archive delegates to the archive handler with the change id', async () => {
  const calls: RecordedCall[] = [];
  const code = await runSpecCommand('archive', ['my-change'], {}, recordingHandlers(calls));
  assert.equal(code, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].handler, 'archive');
  assert.equal(calls[0].opts.changeId, 'my-change');
});

test('spec init without project or spec id fails with exit code 1 and a usage message', async () => {
  const calls: RecordedCall[] = [];
  const missingProject = await runSpecCommand('init', ['only-project'], {}, recordingHandlers(calls));
  const missingSpecId = await runSpecCommand('init', [], {}, recordingHandlers(calls));
  assert.equal(missingProject, 1);
  assert.equal(missingSpecId, 1);
  assert.equal(calls.length, 0, 'the handler must not be called');
});

test('spec complete without project or spec id fails with exit code 1 and a usage message', async () => {
  const calls: RecordedCall[] = [];
  const code = await runSpecCommand('complete', [], {}, recordingHandlers(calls));
  assert.equal(code, 1);
  assert.equal(calls.length, 0, 'the handler must not be called');
});

test('spec create without a change id fails with exit code 1 and a usage message', async () => {
  const calls: RecordedCall[] = [];
  const code = await runSpecCommand('create', [], {}, recordingHandlers(calls));
  assert.equal(code, 1);
  assert.equal(calls.length, 0, 'the handler must not be called');
});

test('spec archive without a change id fails with exit code 1 and a usage message', async () => {
  const calls: RecordedCall[] = [];
  const code = await runSpecCommand('archive', [], {}, recordingHandlers(calls));
  assert.equal(code, 1);
  assert.equal(calls.length, 0, 'the handler must not be called');
});

test('an unknown action fails with exit code 1 listing the valid actions', async () => {
  const calls: RecordedCall[] = [];
  const code = await runSpecCommand('destroy', ['whatever'], {}, recordingHandlers(calls));
  assert.equal(code, 1);
  assert.equal(calls.length, 0, 'no handler must be called');
});

test('spec init keeps the backwards compatible options', async () => {
  const calls: RecordedCall[] = [];
  const code = await runSpecCommand(
    'init',
    ['my-project', 'my-spec'],
    { vaultRoot: '/tmp/vault-root', projectRoot: '/tmp/project-root' },
    recordingHandlers(calls)
  );
  assert.equal(code, 0);
  assert.equal(calls[0].opts.vaultRoot, '/tmp/vault-root');
  assert.equal(calls[0].opts.projectRoot, '/tmp/project-root');
});

test('spec create forwards the nombre flag and spec archive forwards the force flag', async () => {
  const calls: RecordedCall[] = [];
  const handlers = recordingHandlers(calls);
  await runSpecCommand('create', ['my-change'], { nombre: 'Mi cambio' }, handlers);
  await runSpecCommand('archive', ['my-change'], { force: true }, handlers);
  assert.equal(calls[0].opts.nombre, 'Mi cambio');
  assert.equal(calls[1].opts.force, true);
});

test('spec migrate forwards the dry-run flag', async () => {
  const calls: RecordedCall[] = [];
  const code = await runSpecCommand('migrate', [], { dryRun: true }, recordingHandlers(calls));
  assert.equal(code, 0);
  assert.equal(calls[0].opts.dryRun, true);
});
