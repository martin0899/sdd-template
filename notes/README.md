# Notes — Manuales canónicos del repo

Esta carpeta es la **fuente canónica** de los manuales técnicos de spectralis. Vive únicamente en el repo plantilla y **NO viaja ni se clona** a los proyectos donde se instala: `spectralis init` / `spectralis update` nunca copian `notes/` al destino.

Los manuales se sincronizan al segundo cerebro (el **cerebro**) mediante:

```bash
spectralis notes init    # crea la estructura en 02_Sistemas_info/ (o info/ como fallback)
spectralis notes sync    # copia estos manuales al cerebro
```

## Estructura

Cada tema tiene una subcarpeta con su manual (`manual.md`):

```
notes/
├── README.md                 ← este índice
├── architecture/manual.md
├── local-ai/manual.md
└── spectralis-cli/manual.md
```

## Reglas

- **Formato**: solo archivos `.md` (Markdown).
- **Naming**: `kebab-case` para archivos y subcarpetas.
- **Idioma**: documentación en inglés.
- **Fuente**: manuales generados con consultas al grafo de Graphify.

## Generar un manual

1. `graphify query` para reunir información del grafo
2. `graphify path` para trazar relaciones entre componentes
3. `graphify explain` para explicaciones de concepto
4. Crear el manual en la subcarpeta del tema siguiendo la convención
5. Solo Markdown

## Índice

| Tema | Descripción |
|------|-------------|
| [Architecture](architecture/manual.md) | Arquitectura del arnés SDD: capas del CLI, inventario de comandos, flujo install/update, doctor, segundo cerebro y convenciones |
| [spectralis CLI](spectralis-cli/manual.md) | Uso estándar del CLI instalador SDD: comandos, opciones, matriz de agentes, versionado y garantías anti-corrupción |
| [Local AI](local-ai/manual.md) | Guía de IA local (Ollama) para tareas de baja demanda |