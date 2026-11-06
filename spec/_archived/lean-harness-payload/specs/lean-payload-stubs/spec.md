## Purpose

Sustituir los tres manuales LTI del payload documental (`docs/api-spec.yml`, `docs/data-model.md`, `docs/development_guide.md`) por stubs neutros de stack que sirvan como placeholders iniciales en proyectos destino, sin contenido específico de ningún producto.

## ADDED Requirements

### Requirement: Stubs neutros en lugar de manuales LTI

El arnés SDD DEBE distribuir stubs neutros de stack en los tres archivos documentales del payload, reemplazando el contenido LTI actual. Los stubs DELEN contener únicamente placeholders genéricos e instrucciones para que el proceso `sdd-onboard-project` los rellene con el stack específico del proyecto.

#### Scenario: `docs/api-spec.yml` es un esqueleto OpenAPI 3 neutro

- **WHEN** `spectralis init` copia los archivos del payload al destino
- **THEN** `docs/api-spec.yml` contiene un esqueleto OpenAPI 3.0 con una ruta `/health` y `schemas` vacío
- **AND** no contiene referencias a LTI, ATS, ni ninguna entidad de producto específico
- **AND** su tamaño es inferior a 30 líneas

#### Scenario: `docs/data-model.md` es un placeholder con instrucción de graphify

- **WHEN** `spectralis init` copia los archivos del payload al destino
- **THEN** `docs/data-model.md` contiene un placeholder `{{entities}}` y una instrucción para usar `graphify` con el fin de generar el modelo de datos
- **AND** no contiene modelos, tablas ni entidades de producto específico
- **AND** su tamaño es inferior a 20 líneas

#### Scenario: `docs/development_guide.md` tiene secciones con placeholders

- **WHEN** `spectralis init` copia los archivos del payload al destino
- **THEN** `docs/development_guide.md` contiene las secciones `Setup`, `Commands`, `Structure` y `Environment` con placeholders genéricos
- **AND** no contiene instrucciones de clonado de repositorios ajenos, credenciales hardcodeadas ni referencias a LTI ATS
- **AND** su tamaño es inferior a 40 líneas

#### Scenario: `update` distribuye los stubs igual que los archivos originales

- **WHEN** `spectralis update` clasifica los archivos del payload
- **THEN** los tres stubs se distribuyen con el mismo mecanismo (`listDocsFiles()` + `classify-update.ts`) que los archivos originales
- **AND** no se requiere ningún cambio en la plomería de copia

#### Scenario: El relleno específico de stack es responsabilidad de `sdd-onboard-project`

- **WHEN** un proyecto destino necesita rellenar los stubs con su stack específico
- **THEN** el proceso `sdd-onboard-project` es el responsable de detectar el stack y rellenar los placeholders
- **AND** el arnés SDD no duplica lógica de detección de stack en la distribución del payload

### Requirement: Los stubs no alteran el mecanismo de exclusión

Los stubs documentales DEBEN seguir las mismas reglas de exclusión que los archivos documentales actuales (`PAYLOAD_DOCS_EXCLUDE`, `COMPOSED_STANDARDS`, `isExcludedPath`). No se añade ningún caso especial de exclusión o inclusión para los stubs.

#### Scenario: `graphify-out` y `manuals` siguen excluidos

- **WHEN** `listDocsFiles()` recorre `docs/`
- **THEN** los subdirectorios `graphify-out` y `manuals` siguen excluidos del payload
- **AND** los stubs en la raíz de `docs/` se incluyen normalmente
