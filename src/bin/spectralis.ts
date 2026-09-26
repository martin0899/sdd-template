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
import { runUpdate } from '../commands/update';
import { runStatus } from '../commands/status';
import { runConfig } from '../commands/config';
import { runDistill } from '../commands/distill';
import { runSkills } from '../commands/skills';
import { runSpecInit, runSpecComplete } from '../commands/spec';
import { runProjects } from '../commands/projects';
import { runSeed } from '../commands/seed';
import { runNotesInit, runNotesSync } from '../commands/notes';

const pkg = require('../../package.json') as { version: string };

// Handle --v alias before commander processes arguments
if (process.argv.includes('--v')) {
  console.log(pkg.version);
  process.exit(0);
}

const program = new Command();

program
  .name('spectralis')
  .description('SDD template installer CLI (init, update, doctor)')
  .version(pkg.version);

program.addHelpText('after', `
Examples:
  $ spectralis init                     # Install SDD in current directory
  $ spectralis init my-project          # Install SDD in specific directory
  $ spectralis init --demo              # Show plan without writing (alias for --dry-run)
  $ spectralis update                   # Sync installed destination with template
  $ spectralis update --check           # Check for updates without applying
  $ spectralis status                   # Show installed harness status
  $ spectralis config                   # Show harness configuration
  $ spectralis doctor                   # Verify host prerequisites
  $ spectralis skills                   # Detect skills and refresh _INDEX_SKILLS.json
  $ spectralis --v                      # Show version (alias for --version)
`);

program
  .command('init [destino]')
  .description('Install the SDD template into a destination project')
  .option('--agent <agente>', 'target agent (opencode | antigravity | claude | all)')
  .option('-d, --dry-run', 'show the full plan without writing anything')
  .option('--demo', 'alias for --dry-run')
  .option('--dd', 'alias for --dry-run')
  .option('--yes', 'non-interactive mode (always with backup)')
  .option('--obsidian', 'force obsidian orchestration (notes sync) even if obsidianSync=0')
  .option('--no-obsidian', 'disable obsidian orchestration even if obsidianSync=1')
  .action(
    async (
      destino: string | undefined,
      opts: { agent?: string; dryRun?: boolean; demo?: boolean; dd?: boolean; yes?: boolean; obsidian?: boolean; noObsidian?: boolean }
    ) => {
      // Agent validation happens before any write-capable action.
      resolveAgent(opts.agent);
      const code = await runInit({ destino, agent: opts.agent, dryRun: opts.dryRun || opts.demo || opts.dd, yes: opts.yes, obsidian: opts.obsidian, noObsidian: opts.noObsidian });
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
  .option('--agent <agente>', 'target agent profile (opencode | antigravity | claude | all)')
  .option('--obsidian', 'force obsidian orchestration (notes sync) even if obsidianSync=0')
  .option('--no-obsidian', 'disable obsidian orchestration even if obsidianSync=1')
  .action(
    async (
      destino: string | undefined,
      opts: { dryRun?: boolean; demo?: boolean; dd?: boolean; check?: boolean; yes?: boolean; auto?: boolean; agent?: string; obsidian?: boolean; noObsidian?: boolean }
    ) => {
      if (opts.agent) resolveAgent(opts.agent);
      const code = await runUpdate({ destino, dryRun: opts.dryRun || opts.demo || opts.dd, check: opts.check, yes: opts.yes, auto: opts.auto, obsidian: opts.obsidian, noObsidian: opts.noObsidian });
      process.exitCode = code;
    }
  );

program
  .command('doctor')
  .description('Verify prerequisites on this host (git, node, openspec, graphify)')
  .action(async () => {
    const code = await runDoctor();
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
  .command('spec <action> <project> <specId>')
  .description('Spec workflow: init creates folder structure, complete validates and distills')
  .option('-v, --vault-root <path>', 'vault root path (default: from config)')
  .option('-p, --project-root <path>', 'project root for REGISTRY.md (default: from config)')
  .action(
    async (
      action: string,
      project: string,
      specId: string,
      opts: { vaultRoot?: string; projectRoot?: string }
    ) => {
      if (action === 'init') {
        const code = await runSpecInit({ project, specId, vaultRoot: opts.vaultRoot });
        process.exitCode = code;
      } else if (action === 'complete') {
        const code = await runSpecComplete({ project, specId, vaultRoot: opts.vaultRoot, projectRoot: opts.projectRoot });
        process.exitCode = code;
      } else {
        console.error(`[ERROR] Unknown action: ${action}. Use "init" or "complete".`);
        process.exitCode = 1;
      }
    }
  );

program
  .command('projects')
  .description('Show OpenSpec status across all local projects')
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

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(`[ERROR] ${err.message}`);
  process.exitCode = 1;
});