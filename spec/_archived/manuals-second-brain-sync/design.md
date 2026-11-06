# Design: manuals-second-brain-sync

## Context

Capacidad que mantiene actualizado el conjunto de manuales canónicos del arnés SDD distribuidos al segundo cerebro.

## Decisions

- **Manuales canónicos distribuibles**: El sistema SHALL distribuir al cerebro únicamente los manuales canónicos vigentes de `notes/` (`architecture`, `local-ai`, `spectralis-cli`), y NO los manuales que duplican información de skills (`git-workflow`,…
- **Índices coherentes**: Los índices de manuales (`README.md` y `notes/README.md`) SHALL reflejar únicamente los manuales vigentes, sin enlaces rotos ni entradas de manuales eliminados.
- **Suite de tests alineada**: Los tests de `notes` SHALL verificar el mecanismo de creación y sincronización usando temas vigentes, sin asertar manuales eliminados.
- **Formato completo por comando en el manual único**: El manual único `notes/spectralis-cli/manual.md` SHALL documentar cada comando del CLI con sintaxis, tabla o lista de parámetros (nombre, descripción, default, requerido), uso y al menos 3 ejemplos con output esperado.
- **Inventario de comandos correcto en el manual y la nota**: El manual y la nota fuente SHALL reflejar el inventario real de comandos del CLI, sin comandos inexistentes y sin omitir comandos existentes.

## Verification

5 requisitos condensados desde
`openspec/specs/manuals-second-brain-sync/spec.md` (80 líneas en el original).
