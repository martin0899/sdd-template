# Propuesta: manuals-second-brain-sync

## Why

Capacidad que mantiene actualizado el conjunto de manuales canónicos del arnés SDD distribuidos al segundo cerebro. Reduce el inventario de temas gestionados por `notes init`/`notes sync` a los vigentes (`architecture`, `local-ai`, `spectralis-cli`), eliminando los manuales que duplican información de skills del arnés o del manual del CLI, y garantiza que el manual único del CLI (`notes/spectralis-cli/manual.md`) documente cada comando con formato completo y verificable.

## What Changes

- Manuales canónicos distribuibles
- Índices coherentes
- Suite de tests alineada
- Formato completo por comando en el manual único
- Inventario de comandos correcto en el manual y la nota

## Impact

Snapshot histórico de la capability `manuals-second-brain-sync`, consolidado desde
`openspec/specs/manuals-second-brain-sync/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
