# Design: tool-prerequisites

## Context

Determinar qué herramientas externas son prerequisito según la filosofía del proyecto, de modo que el ciclo ODD funcione sin OpenSpec y el modo SDD lo exija de forma explícita.

## Decisions

- **OpenSpec como prerequisito incondicional**: El sistema SHALL tratar `openspec` como prerequisito en todos los proyectos, sin excepción por modo.
- **`doctor` reporta OpenSpec como requisito**: El sistema SHALL indicar en `spectralis doctor` que `openspec` es un requisito, mostrando si está disponible en el host.
- **Error claro cuando falta OpenSpec**: El sistema SHALL fallar con un mensaje claro, incluida una ayuda de instalación, cuando `openspec` falta.
- **`init` ejecuta `openspec init`**: El sistema SHALL ejecutar `openspec init` durante la instalación del proyecto.

## Verification

4 requisitos condensados desde
`openspec/specs/tool-prerequisites/spec.md` (68 líneas en el original).
