## Purpose

Añadir el flag `--prune` a `spectralis update` para que borre del disco los archivos clasificados como `retired`, con semántica de seguridad estricta: solo se borran archivos cuyo hash coincida con el del manifiesto, siempre con backup previo, solo fs (nunca git), respetando `--dry-run` y `--check`, y pidiendo confirmación explícita.

## ADDED Requirements

### Requirement: Flag `--prune` en `spectralis update`

El comando `spectralis update` DEBE aceptar el flag `--prune` que activa el borrado de archivos retirados (`status: retired`) del disco del destino, con las siguientes garantías de seguridad.

#### Scenario: `--prune` borra solo archivos con hash coincidente

- **WHEN** el usuario ejecuta `spectralis update --prune` y hay archivos clasificados como `retired`
- **THEN** el sistema compara el hash del archivo en disco con el hash registrado en el manifiesto
- **AND** solo borra archivos cuyo hash coincide exactamente (el usuario no los ha editado)
- **AND** los archivos retirados cuyo hash difiere (editados por el usuario) se reportan pero NO se borran

#### Scenario: `--prune` crea backup previo en `.sdd-backup-*`

- **WHEN** `--prune` va a borrar uno o más archivos
- **THEN** el sistema crea un directorio `.sdd-backup-<timestamp>-<pid>` en el destino
- **AND** copia cada archivo a borrar en ese directorio, conservando su ruta relativa
- **AND** solo después del backup exitoso procede al borrado

#### Scenario: `--prune` usa solo fs, nunca git

- **WHEN** `--prune` borra archivos
- **THEN** el borrado se realiza con operaciones de filesystem (`rmSync` o equivalente)
- **AND** no se invoca ningún comando git (`git rm`, `git add`, etc.)

#### Scenario: `--prune` respeta `--dry-run`

- **WHEN** el usuario ejecuta `spectralis update --prune --dry-run`
- **THEN** el sistema reporta qué archivos serían borrados (con hash-match) y cuáles se preservarían (hash distinto o error de backup)
- **AND** no se crea ningún backup ni se borra ningún archivo

#### Scenario: `--prune` respeta `--check`

- **WHEN** el usuario ejecuta `spectralis update --prune --check`
- **THEN** el sistema reporta el estado de actualización incluyendo los archivos retirados que serían borrados con `--prune`
- **AND** no se realiza ningún borrado ni backup

#### Scenario: `--prune` pide confirmación sin `--yes`

- **WHEN** el usuario ejecuta `spectralis update --prune` sin `--yes` ni `--auto`
- **THEN** el sistema muestra la lista de archivos a borrar y pide confirmación explícita
- **AND** si el usuario declina, no se borra nada y los archivos retirados se reportan como preservados

#### Scenario: `--prune` con `--yes` no pide confirmación

- **WHEN** el usuario ejecuta `spectralis update --prune --yes`
- **THEN** el sistema borra los archivos con hash coincidente sin pedir confirmación
- **AND** el backup se crea igual que con confirmación

#### Scenario: Sin `--prune`, el comportamiento actual se preserva

- **WHEN** el usuario ejecuta `spectralis update` sin `--prune`
- **THEN** los archivos retirados se reportan pero NO se borran del disco (comportamiento idéntico al actual)
- **AND** el manifiesto reescrito los excluye igual que hoy

#### Scenario: `--prune` sin archivos retirados

- **WHEN** el usuario ejecuta `spectralis update --prune` y no hay archivos clasificados como `retired`
- **THEN** el sistema no crea ningún backup ni borra nada
- **AND** reporta que no hay archivos retirados para podar

### Requirement: El manifiesto post-prune excluye los archivos borrados

Tras un `--prune` exitoso, el manifiesto reescrito NO DEBE incluir entradas para los archivos borrados. Los archivos no borrados (hash distinto, error de backup) deben seguir apareciendo como `retired` en el siguiente `update`.

#### Scenario: Manifiesto tras prune exitoso

- **WHEN** `--prune` borra N archivos exitosamente
- **THEN** el manifiesto reescrito contiene N entradas menos
- **AND** los archivos no borrados siguen en el manifiesto para futura detección

#### Scenario: Prune parcial (backup falla para un archivo)

- **WHEN** el backup de un archivo retirado falla (permisos, disco lleno)
- **THEN** ese archivo no se borra
- **AND** se reporta el error con detalle
- **AND** el archivo sigue en el manifiesto para el próximo update
- **AND** los demás archivos con backup exitoso se borran normalmente
