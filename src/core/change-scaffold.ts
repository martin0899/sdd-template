import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeChangeJson, type ChangeJson } from './change-json';

/**
 * Seeds of a new change.
 *
 * The scaffold is minimal on purpose: it gives the change its three planning
 * artifacts and its metadata, so the work can start without the OpenSpec CLI.
 */
export interface ScaffoldedChange {
  /** Absolute path of the folder of the change. */
  dir: string;
  /** Metadata written in `change.json`. */
  change: ChangeJson;
}

function proposalSeed(changeId: string): string {
  return `# Propuesta: ${changeId}

## Why

## What Changes

## Impact
`;
}

function tasksSeed(changeId: string): string {
  // No checkbox on purpose: the first progress entry carries no task until
  // the worklist declares them.
  return `# Tasks: ${changeId}

## 1. Trabajo
`;
}

function designSeed(changeId: string): string {
  return `# Design: ${changeId}

## Context

## Goals / Non-Goals

## Decisions
`;
}

/**
 * Creates the folder of a change with its seeds and its `change.json`.
 *
 * It never overwrites: when the folder already exists the call throws and
 * the caller reports it as a conflict.
 */
export function scaffoldChange(dir: string, changeId: string, nombre = ''): ScaffoldedChange {
  if (existsSync(dir)) {
    throw new Error(`the change already exists: ${dir}`);
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'proposal.md'), proposalSeed(changeId), 'utf8');
  writeFileSync(join(dir, 'tasks.md'), tasksSeed(changeId), 'utf8');
  writeFileSync(join(dir, 'design.md'), designSeed(changeId), 'utf8');

  const change: ChangeJson = {
    id: changeId,
    nombre,
    fecha: new Date().toISOString().slice(0, 10),
    estado: 'open',
    resumen: { abstracto: '' },
    enlaces: []
  };
  writeChangeJson(dir, change);
  return { dir, change };
}
