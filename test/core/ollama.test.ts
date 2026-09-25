import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectOllama, listOllamaModels, configureLlm } from '../../src/core/ollama';
import { readLlmConfig, writeGlobalConfig, readGlobalConfig } from '../../src/core/config';

test('detectOllama returns unavailable when host unreachable', async () => {
  process.env.OLLAMA_HOST = 'http://localhost:1'; // port 1 = connection refused
  const result = await detectOllama();
  assert.equal(result.available, false);
  assert.equal(result.models.length, 0);
  delete process.env.OLLAMA_HOST;
});

test('listOllamaModels returns empty when unavailable', async () => {
  process.env.OLLAMA_HOST = 'http://localhost:1';
  const models = await listOllamaModels();
  assert.equal(models.length, 0);
  delete process.env.OLLAMA_HOST;
});

test('configureLlm writes config and returns it', async () => {
  const original = readGlobalConfig();
  try {
    const llm = await configureLlm('test-model:latest');
    assert.equal(llm.model, 'test-model:latest');
    assert.equal(llm.enabled, true);
    const read = readLlmConfig();
    assert.equal(read.model, 'test-model:latest');
    assert.equal(read.enabled, true);
  } finally {
    writeGlobalConfig(original);
  }
});
