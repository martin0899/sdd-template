# Tasks: view-archived

## 1. Tests TDD

- [x] (TDD) 1.1 test/commands/view.test.ts: listado `--archived` renderiza fila con id/fecha, done/x y no lista activos sin flag
- [x] (TDD) 1.2 test: change archived sin `change.json` renderiza `—` en fecha y estados derivados de `tasks.md`
- [x] (TDD) 1.3 test: detail `view <id> --archived` renderiza tasks.md del archive
- [x] (TDD) 1.4 test: sin `_archived` exit 0 y mensaje "no hay changes archived"
- [x] (TDD) 1.5 test: view --archived no escribe progress.json ni muta el tree

## 2. Implementación

- [x] (TDD) 2.0 Tests 1.1–1.5 en rojo antes de tocar la implementación
- [x] 2.1 `ViewOptions.archived` + listArchivedChanges + renderArchivedList en view.ts
- [x] 2.2 `--archived` pasando renderDetail sobre `spec/_archived/<id>`
- [x] 2.3 wire: option `--archived` en bin/spectralis.ts y paso a runView

## 3. Regresión y docs

- [x] 3.1 test existente (sin flag) sigue verde sin tocarlo
- [x] 3.2 `npm test` baseline + tsc limpio
- [x] 3.3 smoke real: 36 capabilities aparecen con `view --archived`
- [x] 3.4 README.md + docs/spec-native.md + help del bin
