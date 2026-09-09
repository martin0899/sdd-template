# sdd-template-install — Delta

## MODIFIED Requirements

### Requirement: Manifiesto de payload

El instalador DEBE (MUST) basarse en un manifiesto explícito que define qué viaja al destino y qué se queda en el repo plantilla. El instalador (`install.sh`), el README de la plantilla y los artefactos de trabajo de `openspec/changes/` del repo plantilla NO viajan al destino. La documentación de referencia del proyecto destino es `README.md` y los manuales de `docs/`; NO existe un archivo-guía de CLI suelto (`sdd-cli-guide.md` ya no forma parte de la plantilla).

#### Scenario: Payload exacto
- **WHEN** se completa la instalación
- **THEN** el destino contiene exactamente: `openspec/` (con contexto español), `.agents/skills/` (sin las skills retiradas), `.opencode/` (comandos, skills y configuración de paquete), `docs/`
- **AND** el destino NO contiene `install.sh`, ni los cambios activos del repo plantilla, ni `sdd-cli-guide.md`

#### Scenario: Manifiesto sin guía de CLI
- **WHEN** se inspecciona el manifiesto de `install.sh` o el resultado de un `--dry-run`
- **THEN** `sdd-cli-guide.md` no aparece como elemento del payload
