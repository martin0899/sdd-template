# Design: documenter-delegation

## Context

Define el contrato de delegación documental: los subagentes entregan una solicitud estructurada al `coordinador`, este la consolida y la despacha al rol lógico `documentador`, que ejecuta con un perfil configurado y credenciales resueltas fuera del proyecto.

## Decisions

- **Solicitud documental estructurada**: Todo subagente que detecte trabajo documental SHALL entregar al `coordinador` una **solicitud estructurada** que incluya, como mínimo: modo (`sdd` u `odd`), ID del cambio, rutas/artefactos afectados, evidencia de…
- **Consolidación y despacho por el coordinador**: El `coordinador` SHALL consolidar las solicitudes documentales del mismo cambio y despacharlas al rol lógico `documentador`.
- **Perfiles del documentador**: El sistema SHALL definir al menos dos perfiles del rol `documentador`: `documentador-local`, para documentación rutinaria y de bajo riesgo, y `documentador-suscripcion`, para trabajos que requieran mayor capacidad o…
- **Credenciales fuera del manifiesto**: El sistema SHALL mantener las credenciales de proveedor de cualquier perfil del `documentador` en la configuración/autenticación local y NO SHALL almacenarlas en el manifiesto del proyecto (`.sdd-manifest.json`) ni en…
- **Fallback seguro sin perfil adecuado**: Cuando no exista un perfil adecuado, el sistema SHALL resolver la parte segura del trabajo documental o devolver la tarea como pendiente explícita.
- **Validación de solicitud incompleta**: El sistema SHALL validar que toda solicitud documental incluye los campos obligatorios (modo, ID del cambio, rutas/artefactos afectados, evidencia de pruebas, riesgo y pendientes).

## Verification

6 requisitos condensados desde
`openspec/specs/documenter-delegation/spec.md` (91 líneas en el original).
