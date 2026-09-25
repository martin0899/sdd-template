# Briefing: Spectralis - Sistema de skills

## 1. Estado del código

### Autoskills
- **Módulo actual:** `src/commands/autoskills.ts` - interfaz simple que decide si ejecutar `npx autoskills`
- **Uso:** Solo en `src/commands/init.ts` paso 10 - opt-in después de instalación
- **Patrón:** Función pura `decideAutoskills()` que retorna resultado (executed/pending/reason)
- **Dependencia:** Ejecuta `npx -y autoskills` externo (no es código propio)

### Skills del proyecto
- **Ubicación:** `.agents/skills/` - 21 skills instaladas
- **Índice actual:** `.agents/skills/INDEX.md` - tabla manual con nombre, trigger, ruta
- **Spec vigente:** `openspec/specs/skill-index/spec.md` - requiere actualización manual del índice

### system-reminder
- **No existe implementación actual** - es un concepto nuevo del prompt del agente
- **Referencia:** El prompt del agente (opencode) ya usa `<system-reminder>` para inyectar contexto

## 2. Specs vigentes

### skill-index (MODIFICADO)
- **Estado:** Especificación actual para índice manual de skills
- **Cambio propuesto:** Evolucionar a detección automática + system-reminder
- **Requisitos actuales:**
  - Índice manual `.agents/skills/INDEX.md`
  - Regla de consulta obligatoria en `AGENTS.md`
  - Actualización manual sin hooks

### sdd-installer-gitignore-sync (NO AFECTADO)
- Gestiona `.gitignore` pero no incluye skills

## 3. Contratos API en juego

### Nuevo comando: `spectralis skills`
- **Tipo:** Comando CLI nuevo
- **Parámetros:** Ninguno (detecta automáticamente)
- **Flags:** `--dry-run` (opcional)
- **Salida:** Consola con progreso y resultado

### Flujo propuesto:
```
spectralis skills
  → Escanea: .agents/skills/*/, .claude/skills/*/, .cursor/skills/*/
  → Lee: SKILL.md de cada skill encontrada
  → Genera: _INDEX_SKILLS.md (o lo que se use como directorio)
  → Actualiza: el bloque <system-reminder> del agente con el índice fresco
  → Confirma: "X skills detectadas, índice actualizado"
```

## 4. Realidad de BD

No hay impacto de base de datos. Es un cambio puramente de CLI y archivos.

## 5. Riesgos y preguntas abiertas

### Riesgos identificados:
1. **Compatibilidad hacia atrás:** ¿Se debe mantener el comando `npx autoskills` como fallback?
2. **Ubicación del system-reminder:** ¿Dónde se almacena el template del prompt del agente?
3. **Formato del índice:** ¿Se mantiene `.agents/skills/INDEX.md` o se crea uno nuevo?
4. **Detección de skills:** ¿Qué estructuras de directorios se soportan además de `.agents/skills/`?

### Preguntas abiertas:
1. ¿El usuario quiere mantener compatibilidad con autoskills o eliminarlo completamente?
2. ¿Qué agentes soportan system-reminder? (opencode, claude, cursor, etc.)
3. ¿El índice generado debe ser legible por humanos o solo por máquinas?

## 6. Mapa propuesto

### Actividad ID-01: Eliminar autoskills del CLI
- **Componente:** Backend/CLI
- **Change:** `remove-autoskills`
- **Archivos afectados:**
  - `src/commands/autoskills.ts` (eliminar)
  - `src/commands/init.ts` (remover paso 10)
  - `src/commands/post-checks.ts` (remover referencia)
- **Capa:** Backend

### Actividad ID-02: Crear comando `spectralis skills`
- **Componente:** Backend/CLI
- **Change:** `add-spectralis-skills-command`
- **Archivos afectados:**
  - `src/bin/spectralis.ts` (registrar comando)
  - `src/commands/skills.ts` (nuevo módulo)
- **Capa:** Backend

### Actividad ID-03: Implementar detección automática de skills
- **Componente:** Backend/Core
- **Change:** `add-skill-detection`
- **Archivos afectados:**
  - `src/core/skill-detector.ts` (nuevo módulo)
  - `src/commands/skills.ts` (usar detector)
- **Capa:** Backend

### Actividad ID-04: Integrar system-reminder
- **Componente:** Backend/Core
- **Change:** `add-system-reminder-integration`
- **Archivos afectados:**
  - `src/core/system-reminder.ts` (nuevo módulo)
  - `src/commands/skills.ts` (actualizar prompt)
- **Capa:** Backend

### Actividad ID-05: Actualizar spec skill-index
- **Componente:** Documentación/Spec
- **Change:** `update-skill-index-spec`
- **Archivos afectados:**
  - `openspec/specs/skill-index/spec.md` (modificar)
- **Capa:** Documentación

## 7. Decisiones pendientes

1. **Eliminar autoskills completamente** vs **mantener como fallback**
2. **Soporte multi-agente** vs **solo opencode**
3. **Formato del índice** (markdown vs JSON)
4. **Ubicación del template de system-reminder**

## 8. Próximos pasos

1. Confirmar decisiones con el usuario
2. Crear changes OpenSpec para cada actividad
3. Generar especificaciones por capa
4. Implementar cambios