---
name: documenter-delegation
description: Contrato de delegación documental — los subagentes entregan una solicitud estructurada al coordinador, este la consolida y despacha al rol documentador; nunca publiques por tu cuenta.
author: spectralis
version: 1.0.0
---

# documenter-delegation

Contrato de solicitud, consolidación y despacho del trabajo documental entre los subagentes, el `coordinador` y el rol lógico **`documentador`**. Dispara con: "trabajo documental", "solicitud documental", "delegar documentación", "cierre documental".

## Frontera de responsabilidad

- **Los subagentes solicitan, nunca publican.** Si detectas trabajo documental (crear/actualizar `briefing.md`, `resumen.md`, `tests.md`, notas `obsidian-*`, wiki o documentos del cerebro), **no escribas ni sincronices por tu cuenta** en el cerebro ni en `05_wiki/`.
- Entrega al `coordinador` una **solicitud estructurada** completa (ver esquema) y deja que él la despache.
- **Publicación directa prohibida**: si intentas publicar sin pasar por el coordinador, la operación no está permitida; canaliza el trabajo como solicitud.

## Esquema de la solicitud (campos obligatorios)

| Campo | Tipo | Descripción |
|---|---|---|
| `mode` | `sdd` \| `odd` | Modo efectivo del cambio |
| `changeId` | string | ID del cambio |
| `affectedPaths` | string[] | Rutas/artefactos afectados |
| `testEvidence` | string | Evidencia de pruebas (comando y resultado) |
| `risk` | `low` \| `medium` \| `high` | Riesgo estimado |
| `pending` | string[] | Pendientes explícitos, si existen |

Una solicitud sin todos los campos es **rechazada** indicando los campos faltantes (validador determinista `validateDocumenterRequest` en `src/core/documenter-request.ts`) y **no se despacha** al `documentador`.

## Consolidación y despacho (el coordinador)

1. El `coordinador` consolida las solicitudes del mismo cambio en **un único despacho**.
2. Mantiene **un solo ejecutor documental activo por cambio** (no lanza un segundo documentador en paralelo).
3. Despacha solo **perfiles configurados**, seleccionando según política, riesgo y disponibilidad.

## Perfiles del documentador

- **`documentador-local`**: documentación rutinaria y de bajo riesgo.
- **`documentador-suscripcion`**: trabajos que requieren mayor capacidad o calidad.

El `coordinador` elige el perfil según riesgo/disponibilidad y solo despacha perfiles configurados.

## Credenciales

- Las credenciales de proveedor de cualquier perfil viven en **configuración/autenticación local** (config global, auth del sistema, secretos del entorno).
- **Nunca** en `.sdd-manifest.json` ni en artefactos versionados (el manifiesto declara `secrets`, `local-config` y `generated-artifacts` como excluidos: respétalos).
- Si el documentador necesita un proveedor, resuelve la credencial desde la configuración local; no la inventes ni la guardes en el proyecto.

## Fallback seguro (sin perfil adecuado)

- Si no hay un perfil configurado adecuado, el `documentador` **resuelve la parte segura** del trabajo con su modelo asignado, o
- **declara la tarea como pendiente explícita** (con su evidencia y motivo).
- **Nunca inventes evidencia de pruebas** ni **bloquees en silencio** el cierre.

## Referencias

- Validador: `src/core/documenter-request.ts` (pure, sin LLM).
- Regla de activación: bloque gestionado de `AGENTS.md`.
- Este contrato referencia el contrato central de reglas del ciclo: `.agents/skills/agent-rules-contract/SKILL.md` (CYCLE-04 define la regla de documentación una sola vez).