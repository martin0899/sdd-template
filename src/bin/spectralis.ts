#!/usr/bin/env node
import { Command } from 'commander';
import { resolveAgent } from '../agents/profiles';
import { runInit } from '../commands/init';
import { runDoctor } from '../commands/doctor';
import { runUpdate } from '../commands/update';

const pkg = require('../../package.json') as { version: string };

const program = new Command();

program
  .name('spectralis')
  .description('SDD template installer CLI (init, update, doctor)')
  .version(pkg.version);

program
  .command('init [destino]')
  .description('Install the SDD template into a destination project')
  .option('--agent <agente>', 'target agent (opencode | antigravity | claude | all)')
  .option('--dry-run', 'show the full plan without writing anything')
  .option('--yes', 'non-interactive mode (always with backup)')
  .action(
    async (
      destino: string | undefined,
      opts: { agent?: string; dryRun?: boolean; yes?: boolean }
    ) => {
      // Agent validation happens before any write-capable action.
      resolveAgent(opts.agent);
      const code = await runInit({ destino, agent: opts.agent, dryRun: opts.dryRun, yes: opts.yes });
      process.exitCode = code;
    }
  );

program
  .command('update')
  .description('Re-sync an installed destination (pending: bash fallback)')
  .action(async () => {
    const code = await runUpdate();
    process.exitCode = code;
  });

program
  .command('doctor')
  .description('Verify prerequisites on this host (git, node, openspec, graphify)')
  .action(async () => {
    const code = await runDoctor();
    process.exitCode = code;
  });

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(`[ERROR] ${err.message}`);
  process.exitCode = 1;
});
