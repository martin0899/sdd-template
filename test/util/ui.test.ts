import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isColorSupported,
  check,
  cross,
  dim,
  bold,
  green,
  red,
  printBanner,
  phaseLine,
  promptMark,
  noColor
} from '../../src/util/ui';

test('fallback mode (noColor) emits zero escape sequences', () => {
  const plain = `${noColor.check} ${noColor.cross} ${noColor.dim('text')} ${noColor.green('ok')}`;
  assert.ok(!plain.includes('\x1b['), plain);
  assert.equal(noColor.check, '[OK]');
  assert.equal(noColor.cross, '[FAIL]');
});

test('helpers accept a palette and return styled or plain outputs', () => {
  const off = { green: noColor.green, red: noColor.red, dim: noColor.dim, bold: noColor.bold, check: noColor.check, cross: noColor.cross, prompt: noColor.prompt };
  assert.equal(off.green('x'), 'x');
  assert.equal(off.dim('y'), 'y');
  assert.equal(off.prompt('q'), '◆ q');

  const raw = noColor; // plain palette
  assert.equal(check(raw), '[OK]');
  assert.equal(cross(raw), '[FAIL]');
  assert.match(off.prompt('q'), /◆/); // marker survives, color does not
});

test('phaseLine uses ansi palette by default and plain in noColor', () => {
  const styled = phaseLine(3, 12, 'openspec init', 'created', undefined);
  0
  assert.match(styled, /openspec init/);
  assert.match(styled, /created/);

  const plain = phaseLine(3, 12, 'openspec init', 'created', noColor);
  assert.ok(!plain.includes('\x1b['));
  assert.match(plain, /openspec init/);
});

test('banner shows brand and both versions; noColor has no escapes', () => {
  const styled = printBanner('1.0.0', '1.0.0');
  assert.match(styled, /spectralis/i);
  assert.match(styled, /1\.0\.0/);
  assert.match(styled, /template/);

  const plain = printBanner('1.0.0', '1.0.0', noColor);
  assert.ok(!plain.includes('\x1b['));
  assert.match(plain, /spectralis/i);
  assert.match(plain, /Spec-Driven/);
});

test('promptMark prefixes questions with the diamond marker', () => {
  assert.match(promptMark('Question?'), /Question\?/);
  assert.match(promptMark('Question?', noColor), /◆/);
  const plain = promptMark('Question?', noColor);
  assert.ok(!plain.includes('\x1b['));
});
