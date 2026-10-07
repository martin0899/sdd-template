---
name: agent-rules-contract
description: Contrato central de las reglas del ciclo SDD/ODD — define una sola vez, referencia en vez de redefinir; invoca la interfaz central de Spectralis, no dupliques el ciclo.
author: spectralis
version: 1.0.0
---

# agent-rules-contract

Contrato único y compartido de las reglas del ciclo SDD/ODD. Dispara con: "reglas del ciclo", "contrato de agentes", "duplicación de reglas", "centralizar reglas".

## Reglas canónicas (identificadores estables)

| ID | Fase | Regla |
|----|------|-------|
| CYCLE-01 | planning | Un solo ejecutor activo por cambio (no se ejecutan dos rutas en paralelo). |
| CYCLE-02 | execution | `apply` ejecuta solo las tareas existentes (no replanifica ni relanza tras delegar). |
| CYCLE-03 | review | La revisión la hace gertrudis: reporta y no modifica, con veredicto cerrado y evidencia. |
| CYCLE-04 | documentation | El trabajo documental se solicita al coordinador; nunca publiques por tu cuenta. |

## Regla de referencia

- Toda regla del ciclo se define **una sola vez** en este contrato.
- Los archivos gobernados (`.agents/skills/*`, comandos y agentes) **referencian este contrato** en lugar de reescribir el texto de una regla.
- Si una convención del ciclo no está en el contrato, **unifícala aquí** antes de aplicarla; no la dejes como variante local por repo.

## Migración gradual (límites de rol)

- Los archivos gobernados migran **por etapas**, conservando los límites de rol de `coordinador`, `planificador`, `implementador`, `gertrudis` y `documentador`.
- Un rol aún no migrado conserva su comportamiento previo; no se fuerza la migración de golpe.
- Las superficies vendor (`.opencode/commands/opsx-*.md`, `.opencode/skills/openspec-*`) son **referencia externa**: no se editan.

## OpenSpec: backend SDD no reimplementado

- OpenSpec permanece como backend SDD opcional detrás de la interfaz central de Spectralis.
- Este contrato describe **reglas del ciclo**, no un motor SDD paralelo: no se copia la lógica interna de OpenSpec.

## Detección

- `spectralis check --rules` detecta reglas duplicadas (advertencia) y contradicciones de la misma fase (error) entre los archivos gobernados.
- Los agentes invocan la interfaz central de Spectralis y no duplican el ciclo ni inventan convenciones por repositorio.