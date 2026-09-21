# Design: add-gitignore-managed-refresh

## Context

`GITIGNORE_ENTRIES` (install.sh:79) define las entradas del bloque gestionado. `manage_gitignore()` (install.sh:790) hoy: si hay sentinel -> skip sin comparar; si no, añade solo las entradas que el archivo no cubra ya en otras secciones. `Personal_Dotfiles` tiene el bloque congelado con 4 entradas y `.claude/` como untracked. Ver proposal.md.

## Goals / Non-Goals

**Goals:**
- `.claude/` queda descartado del versionado en instalaciones nuevas y existentes
- El bloque gestionado se auto-repara en cada update (mismo patrón que AGENTS.md)

**Non-Goals:**
- No tocar el resto del `.gitignore` del destino (secciones propias)
- No eliminar entradas del bloque que ya no estén en la lista (solo añadir faltantes)
- No ignorar `docs/requirements/` (REGISTRY y briefings se versionan por trazabilidad)

## Decisions

### D1: Reescritura del bloque completo con la lista vigente, no append de líneas sueltas
El bloque se regenera con todas las entradas aplicables (las cubiertas por otras secciones del archivo se omiten, como ya hace el código hoy). Garantiza orden estable y bloque autodescriptivo. Alternativa descartada: insertar líneas sueltas dentro del bloque existente (dif de líneas más frágil y desorden acumulado).

### D2: Omisión por cobertura externa se calcula contra el archivo completo, no solo el bloque
Se conserva el comportamiento vigente: una entrada ya ignorada por una sección propia del destino (ej. `.opencode/` en Personal_Dotfiles) no se duplica dentro del bloque. El cálculo de "aplicables" se hace contra el `.gitignore` completo excluyendo el propio bloque gestionado.

### D3: Backup + confirmación, consistente con la política anti-corrupción
Aunque añadir líneas de ignorado es de bajo riesgo, se aplica el mismo tratamiento que el refresco de AGENTS.md: backup con `backup_file` (ya perezoso desde `update-installer-managed-agents-block`) y `confirm`. En `--yes` el confirm se responde afirmativamente.

## Risks / Trade-offs

- [Reescritura del bloque altera el orden de entradas del bloque viejo] → Aceptado: el bloque es gestionado ("no editar a mano"), el orden pasa a ser el canónico de la lista.
- [Entrada `.claude/` ignora proyectos donde el usuario SÍ quiere versionar skills de Claude Code] → Mitigación: el usuario puede rechazar el confirm (queda `[mantenido]`) o mover esas skills a `.agents/skills/` (versionadas... no: `.agents/` también está ignorado). Documentado en el manual si surge la necesidad; por defecto descartar es la política del instalador.

## Migration Plan

Sin migración. Rollback: git revert; los destinos conservan backup del `.gitignore`.

## Open Questions

Ninguna.
