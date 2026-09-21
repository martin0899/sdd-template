---
name: exploration-briefing
description: Mandatory briefing gate before turning an OpenSpec exploration into a change. Use when an exploration session crystallizes, the user asks to proceed/capture the work, or before running openspec new change after an explore session - produce a code-grounded briefing (closed decisions, findings, open questions, proposed scope) and wait for explicit user confirmation before any write.
author: SDD-template
version: 1.0.0
---

# exploration-briefing

Checkpoint obligatorio entre una exploración OpenSpec y la creación de un change. **Ningún `openspec new change` ni escritura de artefactos ocurre hasta que el usuario confirme explícitamente el briefing.**

## Cuándo dispara

- La exploración cristaliza (emergen decisiones cerradas o el usuario pide continuar/proceder/capturar)
- El usuario menciona "briefing", "resumen de exploración" o "genera la propuesta"
- Tras una sesión de explore, antes de cualquier `openspec new change`

No aplica a: preguntas y respuestas rutinarias, apply, archive, ni trabajo fuera de exploraciones.

## El briefing (proactivo, sin que lo pidan)

Presenta en el chat, en español, antes de escribir nada:

```
+----------------------------------------------------------+
| BRIEFING: <tema de la exploracion>                       |
+----------------------------------------------------------+
| Decisiones cerradas:                                     |
|   - D1: <decision> -> <valor elegido>                    |
|   - D2: ...                                              |
|                                                          |
| Hallazgos del codigo (verificados, no supuestos):        |
|   - <ruta/archivo>:<linea> - <funcion/modulo> -> <hecho> |
|                                                          |
| Preguntas abiertas (solo si hay ambiguedad material):    |
|   - Q1: <pregunta concreta>                              |
|                                                          |
| Alcance propuesto del change:                            |
|   - nombre: <change-name>                                |
|   - artefactos: proposal, specs (capabilities), design,  |
|     tasks  (solo los que el usuario pidio capturar)      |
+----------------------------------------------------------+
```

- **Hallazgos citan código real** (archivo, función, línea) verificado durante la exploración. Si un hallazgo no está verificado, va como supuesto marcado, nunca como hecho.
- **Con ambigüedad material**: lista las preguntas y ESPERA las respuestas antes de pedir confirmación.
- **Sin ambigüedad**: declara que la exploración está clara y pide confirmación directa de sí/no: *"¿Genero el change `<nombre>` con estos artefactos?"*

## La compuerta (no escribir sin sí)

- Sin confirmación explícita del usuario: cero acciones de escritura — ni `openspec new change`, ni artefactos, ni archivos de configuración.
- El `openspec new change` se ejecuta solo tras el "sí" del usuario, y crea **únicamente** el alcance confirmado.
- Si durante la captura emerge un artefacto o capability fuera del alcance confirmado: nómbralo y vuelve a preguntar antes de escribirlo.
- Respuestas a preguntas de diseño o aclaraciones **nunca** cuentan como consentimiento de escritura.

## Relación con el resto del flujo

- La regla siempre activa vive en el bloque gestionado de `AGENTS.md` (misma vía que la regla graphify-first); esta skill es el cuerpo del protocolo.
- Después de la confirmación, el flujo es el estándar: `openspec new change` -> artefactos con `openspec instructions` -> `/opsx-apply` -> `/opsx-archive`.
- Si la exploración partió de una nota de requerimiento, esta compuerta convive con `spec-from-note` (mismo principio: nada se escribe sin confirmación).
