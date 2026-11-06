# Propuesta: documenter-delegation

## Why

Define el contrato de delegación documental: los subagentes entregan una solicitud estructurada al `coordinador`, este la consolida y la despacha al rol lógico `documentador`, que ejecuta con un perfil configurado y credenciales resueltas fuera del proyecto.

## What Changes

- Solicitud documental estructurada
- Consolidación y despacho por el coordinador
- Perfiles del documentador
- Credenciales fuera del manifiesto
- Fallback seguro sin perfil adecuado
- Validación de solicitud incompleta

## Impact

Snapshot histórico de la capability `documenter-delegation`, consolidado desde
`openspec/specs/documenter-delegation/spec.md` durante la migración al layout nativo
(2026-11-06). No es un change nuevo: registra los requisitos que tenía la
capability en el motor legacy, sin actualizarlos.
