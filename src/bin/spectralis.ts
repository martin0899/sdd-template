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
  .action(
    async (
      destino: string | undefined,
      opts: { agent?: string; dryRun?: boolean; demo?: boolean; dd?: boolean; yes?: boolean }
    ) => {
      // Agent validation happens before any write-capable action.
      resolveAgent(opts.agent);
      const code = await runInit({ destino, agent: opts.agent, dryRun: opts.dryRun || opts.demo || opts.dd, yes: opts.yes });
      process.exitCode = code;
    }
  );

program
  .command('update [destino]')
  .description('Re-sync an installed destination with the current template')
  .option('-d, --dry-run', 'show the update plan without writing anything')
  .option('--demo', 'alias for --dry-run')
  .option('--dd', 'alias for --dry-run')
  .option('--check', 'check for updates without applying (exit 0=up-to-date, 1=updates available, 2=error)')
  .option('--yes', 'non-interactive mode (always with backup)')
  .option('--agent <agente>', 'target agent profile (opencode | antigravity | claude | all)')
  .action(
    async (
      destino: string | undefined,
      opts: { dryRun?: boolean; demo?: boolean; dd?: boolean; check?: boolean; yes?: boolean; agent?: string }
    ) => {
      if (opts.agent) resolveAgent(opts.agent);
      const code = await runUpdate({ destino, dryRun: opts.dryRun || opts.demo || opts.dd, check: opts.check, yes: opts.yes });
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
  .description('Show installed SDD harness configuration (read-only)')
  .action(async (destino: string | undefined) => {
    const code = await runConfig({ destino });
    process.exitCode = code;
  });

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(`[ERROR] ${err.message}`);
  process.exitCode = 1;
});
