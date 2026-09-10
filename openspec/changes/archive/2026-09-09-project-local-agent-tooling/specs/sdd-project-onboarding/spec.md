# sdd-project-onboarding — Delta Spec

## MODIFIED Requirements

### Requirement: Indagación del código con graphify

La skill de onboarding DEBE (MUST) ejecutar `graphify update .` sobre el proyecto destino para construir el grafo de conocimiento, y DEBE (MUST) comentar la estructura del código al usuario (arquitectura, módulos, relaciones principales) antes de cualquier propuesta de reglas o adaptación de documentación. La skill DEBE (MUST) tratar `graphify-out/` como artefacto machine-local: nunca se versiona en el repositorio destino y se reconstruye con `graphify update .` tras clonar el proyecto o cambiar de máquina, sin coste de API.

#### Scenario: Proyecto instalado con código existente
- **WHEN** el onboarding corre sobre un proyecto existente con código
- **THEN** se ejecuta `graphify update .` y se presenta al usuario un comentario estructurado del proyecto (stack inferido, módulos, patrón arquitectónico, integraciones)

#### Scenario: Graph desactualizado tras cambios
- **WHEN** el proyecto ya tiene `graphify-out/` pero el código cambió desde el último grafo
- **THEN** el onboarding refresca el grafo con `graphify update .` antes de comentar

#### Scenario: Clon en máquina nueva sin grafo
- **WHEN** el proyecto se acaba de clonar (o cambia de máquina) y no tiene `graphify-out/`
- **THEN** la skill reconstruye el grafo con `graphify update .` antes de comentar la estructura
- **AND** instruye que el grafo nunca se versiona en el repositorio por ser regenerable sin coste
