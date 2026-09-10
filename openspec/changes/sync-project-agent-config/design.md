## Context

La instalación actual ya reconoce conflictos, ofrece `--dry-run`, crea backups y copia un payload definido por `install.sh`. Sin embargo, trata principalmente el destino como una instalación inicial y no conserva un inventario explícito que permita distinguir archivos gestionados por la plantilla de archivos creados o personalizados después. Este diseño amplía esas capacidades sin modificar el código de aplicación del proyecto destino. La motivación y el alcance están en `proposal.md`; los contratos observables están en las specs de esta change.

## Goals / Non-Goals

**Goals:**

- Reutilizar el reconocimiento y la política anti-corrupción existentes para una operación de actualización.
- Mantener un inventario versionado de archivos gestionados y de la fuente de plantilla.
- Comparar contenido antes de copiar y clasificar los resultados de forma determinista.
- Permitir actualización completa o selectiva, siempre con plan previo, backup y reporte.
- Mantener compatibilidad con destinos instalados antes de que exista el inventario.

**Non-Goals:**

- Actualizar dependencias, código de negocio o configuraciones específicas del stack del proyecto destino.
- Resolver automáticamente conflictos en archivos que el usuario personalizó.
- Sincronizar `openspec/changes/`, `graphify-out/`, secretos, configuraciones locales o artefactos generados.
- Convertir la plantilla en un servicio remoto de actualización automática.

## Decisions

### 1. Extender `install.sh` con modo de actualización explícito

Se añadirá un modo `--update <project-path>` o equivalente documentado, reutilizando el reconocimiento de prerrequisitos, comparación, confirmación y backup. La instalación sin `--update` conservará su semántica actual para no cambiar inesperadamente el comportamiento de proyectos nuevos.

**Alternativa descartada:** exigir un script separado. Duplicaría la lógica de seguridad y permitiría que instalación y actualización diverjan.

### 2. Usar un manifiesto de sincronización en el destino

Tras una instalación o actualización confirmada, el destino conservará un archivo de metadata gestionado por la plantilla, por ejemplo `.sdd-manifest.json`, con la versión de la plantilla, fecha, origen y lista de rutas gestionadas con sus hashes. El archivo no contendrá secretos ni contenido de archivos.

Para destinos antiguos sin manifiesto, el sistema inferirá el estado usando los marcadores existentes y el payload conocido, mostrará que la confianza es limitada y creará el manifiesto solo después de una sincronización confirmada.

**Alternativa descartada:** inferir siempre el estado desde timestamps o versiones de skills. Los timestamps no son reproducibles y los frontmatter individuales no cubren comandos, documentación ni reglas agregadas.

### 3. Clasificar por hash y conservar el estado conocido

Cada ruta gestionada se clasificará comparando el hash del archivo destino, el hash registrado previamente y el hash actual de la plantilla:

- destino igual a plantilla: `sin cambios`;
- destino igual al hash registrado y plantilla diferente: `actualizable`;
- destino distinto del hash registrado y plantilla diferente: `personalizado/conflicto`;
- ruta nueva en plantilla: `nuevo`;
- ruta registrada que ya no está en plantilla: `retirado`, nunca eliminado automáticamente.

Los archivos sin hash previo se tratarán como conflicto potencial si existen en el destino. Las rutas sensibles o generadas se excluirán antes de este cálculo.

### 4. Separar plan, decisión y aplicación

El flujo tendrá tres fases: reconocimiento sin escritura, plan con decisiones por archivo y aplicación transaccional por archivo. El plan se mostrará en `--dry-run` y en modo normal antes de cualquier backup o copia. Cada reemplazo aceptado crea el backup fechado antes de escribir; un fallo conserva los backups y reporta el estado parcial.

### 5. Mantener personalizaciones fuera del payload automático

Las reglas propias de `AGENTS.md`, `openspec/config.yaml` y documentación del destino se conservarán mediante merge controlado, marcadores idempotentes o decisión explícita. No se usarán reemplazos completos para archivos con contenido del destino. Las skills y comandos administrados por la plantilla sí podrán actualizarse como archivos completos cuando el usuario acepte el conflicto y exista backup.

### 6. Verificación posterior y compatibilidad

Después de aplicar el plan, el sistema validará la presencia de las rutas esperadas, la integridad del manifiesto y la ausencia de duplicación de bloques gestionados. Se mantendrá la instalación manual documentada como alternativa para entornos sin Bash, usando el mismo modelo de comparación y backup.

## Risks / Trade-offs

- [Destinos antiguos no tienen hashes] → Clasificar archivos existentes como conflictos potenciales y generar el manifiesto solo tras confirmación.
- [La actualización puede quedar parcial por un error de permisos o disco] → Aplicar por archivo, conservar backups y emitir un reporte recuperable; no ocultar el primer error.
- [El payload puede retirar una skill o comando] → Clasificarlo como `retirado` y nunca eliminarlo automáticamente; solicitar decisión separada.
- [Los hashes no detectan cambios semánticos equivalentes] → Tratar cualquier diferencia binaria como cambio y dejar la revisión semántica al usuario.
- [Una plantilla compartida puede contener reglas no aplicables al destino] → Excluir rutas declaradas como locales o generadas y mantener las decisiones de stack fuera de este sincronizador.

## Migration Plan

1. Implementar el manifiesto y el modo `--update` sin cambiar la instalación inicial.
2. Ejecutar `--dry-run` contra un proyecto destino representativo y revisar clasificaciones.
3. Actualizar el proyecto con confirmación explícita, verificando backups y el manifiesto.
4. Documentar la migración manual y los casos de conflicto.
5. Para rollback, restaurar desde `.sdd-backup-<fecha>/` y eliminar o restaurar el manifiesto asociado; la aplicación no requiere rollback propio porque no se modifica.
