#!/usr/bin/env node
/**
 * spectralis CLI entrypoint
 * 
 * CONVENTION: Subcommand Registration
 * ------------------------------------
 * This file defines the CLI interface using commander. Each subcommand follows:
 *   1. Import the handler from '../commands/<name>'
 *   2. Register with program.command('<name> [args]')
 *   3. Add .description() for --help
 *   4. Add .option() for flags (use -d, --dry-run as primary; --demo, --dd as aliases)
 *   5. Add .action() that calls the handler and sets process.exitCode
 * 
 * New subcommands automatically appear in --help output.
 * Keep interface concerns here; implementation logic lives in commands/<name>.ts.
 */
import { Command } from 'commander';
import { resolveAgent } from '../agents/profiles';
import { runInit } from '../commands/init';
import { runDoctor } from '../commands/doctor';
import { runCheck } from '../commands/check';
import { runUpdate } from '../commands/update';
import { runStatus } from '../commands/status';
import { runConfig } from '../commands/config';
import { runDistill } from '../commands/distill';
import { runSkills } from '../commands/skills';
import { runSpecCommand } from '../commands/spec';
import { runProjects } from '../commands/projects';
import { runSeed } from '../commands/seed';
import { runNotesInit, runNotesSync } from '../commands/notes';
import { runBacklog } from '../commands/backlog';
import { runWikiSearch } from '../commands/wiki-search';
import { runBump } from '../commands/bump';
import { runView } from '../commands/view';
import { runTask } from '../commands/task';
import { maybePrintUpdateNotice } from '../core/version-check';
import { currentPalette, printLogo } from '../util/ui';

const pkg = require('../../package.json') as { version: string };

// Handle --v alias before commander processes arguments
if (process.argv.includes('--v')) {
  const v = pkg.version;
  console.log('╔════════════════╗');
  console.log(`║   v${v.padEnd(12)}║`);
  console.log('╚════════════════╝');
  process.exit(0);
}

const program = new Command();

program.hook('preAction', () => {
  maybePrintUpdateNotice(pkg.version);
});

program
  .name('spectralis')
  .description('SDD template installer CLI (init, update, doctor)')
  .version(pkg.version);

program.addHelpText('before', printLogo('doctor', currentPalette()) + '\n');

program.addHelpText('after', `
Comandos por grupo:

  Instalación
    init [destino]        Instala la plantilla SDD en un proyecto
    doctor                Verifica prerrequisitos del host (git, node, graphify)
    bump [level]          Sube versión (patch|minor|major); --spectralis para el propio paquete

  Sincronización
    update [destino]      Sincroniza el destino con la plantilla (--check, --prune)
    status [destino]      Estado del harness instalado
    config [destino]      Muestra/modifica configuración
    skills [destino]      Detecta skills y refresca _INDEX_SKILLS.json

  Specs (SDD)
    spec <action>         create | migrate | archive | status | validate
    view [change]         Vista read-only de changes activos (--archived)
    task <change> <id>    Actualiza progreso de una tarea (--done/--undone)
    check                 Valida flujo SDD (repo, REGISTRY, brain, TDD)

  Vault / Brain
    notes init|sync       Gestiona manuales en el second brain
    projects              Estado de changes en todos los proyectos locales
    seed                  Carga inicial de 05_wiki/
    backlog <proyecto>     Lista notas de backlog
    wiki search <p> [q]   Busca en la wiki agregada
    distill <proyecto>    Destila specs a 05_wiki/

  Utilidades
    --v                   Muestra la versión
    --help                Muestra esta ayuda

Ejemplos:
  $ spectralis init                     # Instalar en el directorio actual
  $ spectralis update --check           # Verificar actualizaciones sin aplicar
  $ spectralis view                     # Ver changes activos
  $ spectralis spec create my-change --nombre "My change"
`);

program
  .command('init [destino]')
  .description('Install the SDD template into a destination project')
  .option('--agent <agente>', 'target agent (opencode | antigravity | claude | codex | all)')
  .option('--all', 'select every available tool without interactive menu')
  .option('-d, --dry-run', 'show the full plan without writing anything')
  .option('--demo', 'alias for --dry-run')
  .option('--dd', 'alias for --dry-run')
  .option('--yes', 'non-interactive mode (always with backup)')
  .option('--obsidian', 'force obsidian orchestration (notes sync) even if obsidianSync=0')
  .option('--no-obsidian', 'disable obsidian orchestration even if obsidianSync=1')
  .action(
    async (
      destino: string | undefined,
      opts: { agent?: string; dryRun?: boolean; demo?: boolean; dd?: boolean; yes?: boolean; obsidian?: boolean; noObsidian?: boolean; all?: boolean }
    ) => {
      // Agent validation happens before any write-capable action.
      resolveAgent(opts.agent);
      const code = await runInit({ destino, agent: opts.agent, dryRun: opts.dryRun || opts.demo || opts.dd, yes: opts.yes, obsidian: opts.obsidian, noObsidian: opts.noObsidian, all: opts.all });
      process.exitCode = code;
    }
  );

program
  .command('update [destino]')
  .description('Update an installed SDD harness to the latest template')
  .option('-d, --dry-run', 'show the update plan without writing anything')
  .option('--demo', 'alias for --dry-run')
  .option('--dd', 'alias for --dry-run')
  .option('-c, --check', 'check for updates without writing (exit 0=up-to-date, 1=updates, 2=error)')
  .option('--yes', 'non-interactive mode (always with backup)')
  .option('-a, --auto', 'apply all updates without asking (alias for --yes + autoUpdate config)')
  .option('--prune', 'delete retired files whose hash matches the manifest (backup first, fs only)')
  .option('--repair-agents', 'rebuild the managed AGENTS.md block (repairs skipped-* states with backup + confirmation)')
  .option('--agent <agente>', 'target agent profile (opencode | antigravity | claude | codex | all)')
  .option('--obsidian', 'force obsidian orchestration (notes sync) even if obsidianSync=0')
  .option('--no-obsidian', 'disable obsidian orchestration even if obsidianSync=1')
  .action(
    async (
      destino: string | undefined,
      opts: { dryRun?: boolean; demo?: boolean; dd?: boolean; check?: boolean; yes?: boolean; auto?: boolean; prune?: boolean; repairAgents?: boolean; agent?: string; obsidian?: boolean; noObsidian?: boolean }
    ) => {
      if (opts.agent) resolveAgent(opts.agent);
      const code = await runUpdate({ destino, dryRun: opts.dryRun || opts.demo || opts.dd, check: opts.check, yes: opts.yes, auto: opts.auto, prune: opts.prune, repairAgents: opts.repairAgents, obsidian: opts.obsidian, noObsidian: opts.noObsidian });
      process.exitCode = code;
    }
  );

program
  .command('doctor')
  .description('Verify prerequisites on this host (git, node, graphify)')
  .action(async () => {
    const code = await runDoctor();
    process.exitCode = code;
  });

program
  .command('bump [level]')
  .description('Bump version (patch | minor | major). Defaults to patch. Components are 0-99 and wrap 99→0.')
  .option('-d, --dry-run', 'show the new version without writing')
  .option('--spectralis', 'bump spectralis own version (package.json)')
  .option('--project', 'bump project version (.sdd-manifest.json)')
  .action(async (level: 'patch' | 'minor' | 'major' | undefined, opts: { dryRun?: boolean; spectralis?: boolean; project?: boolean }) => {
    const code = await runBump({ level: level ?? 'patch', dryRun: opts.dryRun, spectralis: opts.spectralis, project: opts.project });
    process.exitCode = code;
  });

program
  .command('check')
  .description('Validate SDD flow consistency (repo, REGISTRY, brain), vault note IDs and TDD ordering')
  .option('-r, --registry', 'check repo ↔ REGISTRY ↔ brain consistency')
  .option('-i, --ids', 'validate vault note IDs (format, uniqueness, _INDEX_ID, tipo)')
  .option('-t, --tdd', 'validate TDD ordering (Step K) in tasks.md of active changes')
  .option('--rules', 'validate the centralized agent-rules contract (duplicates/contradictions)')
  .option('--agents', 'validate the managed AGENTS.md block against the template (drift detection)')
  .option('-v, --vault-root <path>', 'vault root path (default: from config)')
  .option('-p, --project-root <path>', 'project root (default: from config or cwd)')
  .action(async (opts: { registry?: boolean; ids?: boolean; tdd?: boolean; rules?: boolean; agents?: boolean; vaultRoot?: string; projectRoot?: string }) => {
    const code = await runCheck({ registry: opts.registry, ids: opts.ids, tdd: opts.tdd, rules: opts.rules, agents: opts.agents, vaultRoot: opts.vaultRoot, projectRoot: opts.projectRoot });
    process.exitCode = code;
  });

program
  .command('status [destino]')
  .description('Show installed SDD harness status (version, tools, health)')
  .action(async (destino: string | undefined) => {
    const code = await runStatus({ destino });
    process.exitCode = code;
  });

program
  .command('config [destino]')
  .description('Show or modify SDD harness configuration')
  .option('-l, --list', 'list all effective routes with origin')
  .option('-g, --get <key>', 'get value of a route key')
  .option('-v, --vault <path>', 'set vault_root (use --global for machine-wide)')
  .option('-r, --resources <path>', 'set resources_dir (use --global for machine-wide)')
  .option('-s, --set <key=value>', 'set a route key=value (use --global for machine-wide)')
  .option('--global', 'apply to global config (machine-wide)')
  .action(async (destino: string | undefined, opts: { list?: boolean; get?: string; vault?: string; resources?: string; set?: string; global?: boolean }) => {
    const code = await runConfig({ destino, ...opts });
    process.exitCode = code;
  });

program
  .command('distill <project>')
  .description('Extract knowledge from project specs into 05_wiki/')
  .option('-d, --dry-run', 'show the distillation plan without writing anything')
  .option('--demo', 'alias for --dry-run')
  .option('--dd', 'alias for --dry-run')
  .option('-p, --project-root <path>', 'path to the real project code for stack detection')
  .option('-v, --vault-root <path>', 'vault root path (default: from config)')
  .action(
    async (
      project: string,
      opts: { dryRun?: boolean; demo?: boolean; dd?: boolean; projectRoot?: string; vaultRoot?: string }
    ) => {
      const code = await runDistill({ project, dryRun: opts.dryRun || opts.demo || opts.dd, projectRoot: opts.projectRoot, vaultRoot: opts.vaultRoot });
      process.exitCode = code;
    }
  );

program
  .command('skills [destino]')
  .description('Detect project skills and generate _INDEX_SKILLS.json + system-reminder')
  .option('-d, --dry-run', 'show the skills that would be indexed without writing anything')
  .option('--demo', 'alias for --dry-run')
  .option('--dd', 'alias for --dry-run')
  .action(
    async (
      destino: string | undefined,
      opts: { dryRun?: boolean; demo?: boolean; dd?: boolean }
    ) => {
      const code = await runSkills({ destino, dryRun: opts.dryRun || opts.demo || opts.dd });
      process.exitCode = code;
    }
  );

program
  .command('spec <action> [project] [specId]')
  .description('Spec workflow: init/complete for vault specs, create/migrate/archive/status/validate for repo changes')
  .option('-v, --vault-root <path>', 'vault root path (default: from config)')
  .option('-p, --project-root <path>', 'project root for REGISTRY.md (default: from config)')
  .option('-n, --nombre <text>', 'human readable name of the change (spec create)')
  .option('--force', 'archive even when tasks are pending and overwrite an existing brain summary (spec archive)')
  .option('-d, --dry-run', 'show the migration plan without writing anything (spec migrate)')
  .option('--wiki-project <name>', 'wiki folder of the brain summary (spec archive)')
  .action(
    async (
      action: string,
      project: string | undefined,
      specId: string | undefined,
      opts: { vaultRoot?: string; projectRoot?: string; nombre?: string; force?: boolean; dryRun?: boolean; wikiProject?: string }
    ) => {
      const positionals = [project, specId].filter((value): value is string => typeof value === 'string');
      const code = await runSpecCommand(action, positionals, opts);
      process.exitCode = code;
    }
  );

program
  .command('projects')
  .description('Show the status of the changes across all local projects')
  .option('--json', 'output as JSON')
  .action(async (opts: { json?: boolean }) => {
    const code = await runProjects(opts);
    process.exitCode = code;
  });

program
  .command('seed')
  .description('Initial load: populate 05_wiki/ from discovered projects')
  .option('-p, --project <name>', 'seed only a specific project')
  .option('-d, --dry-run', 'show what would be seeded')
  .option('--demo', 'alias for --dry-run')
  .option('--dd', 'alias for --dry-run')
  .action(async (opts: { project?: string; dryRun?: boolean; demo?: boolean; dd?: boolean }) => {
    const code = await runSeed({ project: opts.project, dryRun: opts.dryRun || opts.demo || opts.dd });
    process.exitCode = code;
  });

program
  .command('view [change]')
  .description('Show the state of the active changes (read-only)')
  .option('-p, --project-root <path>', 'project root (default: the project of the current directory)')
  .option('--archived', 'list or inspect archived changes (spec/_archived)')
  .action(async (change: string | undefined, opts: { projectRoot?: string; archived?: boolean }) => {
    const code = await runView({ change, projectRoot: opts.projectRoot, archived: opts.archived });
    process.exitCode = code;
  });

program
  .command('task <change> <taskId>')
  .description('Update the progress of a task and mirror it in tasks.md')
  .option('--done', 'mark the task as done')
  .option('--undone', 'mark the task as not done')
  .option('--estado <status>', 'task status (todo | in-progress | done)')
  .option('--porcentaje <n>', 'task percentage (0-100)')
  .option('-p, --project-root <path>', 'project root (default: the project of the current directory)')
  .action(
    async (
      change: string,
      taskId: string,
      opts: { done?: boolean; undone?: boolean; estado?: string; porcentaje?: string; projectRoot?: string }
    ) => {
      const porcentaje = opts.porcentaje === undefined ? undefined : Number(opts.porcentaje);
      const code = await runTask({
        change,
        taskId,
        done: opts.done,
        undone: opts.undone,
        estado: opts.estado,
        porcentaje,
        projectRoot: opts.projectRoot
      });
      process.exitCode = code;
    }
  );

const notesCmd = program
  .command('notes')
  .description('Manage technical manuals between the template and the second brain');

notesCmd
  .command('init [destino]')
  .description('Create the notes/manuals folder structure in the second brain (or info fallback)')
  .option('-d, --dry-run', 'show the target and subfolders without creating anything')
  .option('--demo', 'alias for --dry-run')
  .option('--dd', 'alias for --dry-run')
  .action(
    async (
      destino: string | undefined,
      opts: { dryRun?: boolean; demo?: boolean; dd?: boolean }
    ) => {
      const code = await runNotesInit({ destino, dryRun: opts.dryRun || opts.demo || opts.dd });
      process.exitCode = code;
    }
  );

notesCmd
  .command('sync [destino]')
  .description('Sync canonical manuals from notes/ to the second brain (or info fallback)')
  .option('-d, --dry-run', 'show the manuals that would be synced without writing anything')
  .option('--demo', 'alias for --dry-run')
  .option('--dd', 'alias for --dry-run')
  .option('--yes', 'non-interactive mode (always with backup)')
  .action(
    async (
      destino: string | undefined,
      opts: { dryRun?: boolean; demo?: boolean; dd?: boolean; yes?: boolean }
    ) => {
      const code = await runNotesSync({ destino, dryRun: opts.dryRun || opts.demo || opts.dd, yes: opts.yes });
      process.exitCode = code;
    }
  );

program
  .command('backlog <proyecto>')
  .description('List backlog notes from a project\'s _Notas/ folder')
  .option('--json', 'output as JSON')
  .option('--status <status>', 'filter by status (pendiente, completado, sin-estado, todos)')
  .action(async (proyecto: string, opts: { json?: boolean; status?: string }) => {
    const code = await runBacklog({ project: proyecto, json: opts.json, statusFilter: opts.status });
    process.exitCode = code;
  });

const wikiCmd = program
  .command('wiki')
  .description('Search and explore the wiki knowledge base');

wikiCmd
  .command('search <proyecto> [query]')
  .description('Search in a project\'s wiki aggregated files (arquitectura, decisiones, operacion, historial)')
  .option('--json', 'output as JSON')
  .option('--file <nombre>', 'limit search to a specific file (e.g., decisiones.md)')
  .option('-v, --vault-root <path>', 'vault root path (default: from config)')
  .action(async (proyecto: string, query: string | undefined, opts: { json?: boolean; file?: string; vaultRoot?: string }) => {
    const code = await runWikiSearch({ project: proyecto, query, json: opts.json, file: opts.file, vaultRoot: opts.vaultRoot });
    process.exitCode = code;
  });

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(`[ERROR] ${err.message}`);
  process.exitCode = 1;
});