#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { select, input, confirm } from '@inquirer/prompts';
import { GitService } from './services/git.service.js';
import { SecretScannerService } from './services/secret-scanner.service.js';
import { OllamaCopilotService } from './services/ollama-copilot.service.js';

const program = new Command();
const gitService = new GitService();
const scanner = new SecretScannerService();
const copilot = new OllamaCopilotService();

function printBanner() {
  console.log(chalk.bold.cyan(`
   ____ _ _          ____            _ _       _   
  / ___(_) |_       / ___|___  _ __ (_) | ___ | |_ 
 | |  _| | __|_____| |   / _ \\| '_ \\| | |/ _ \\| __|
 | |_| | | |_|_____| |__| (_) | |_) | | | (_) | |_ 
  \\____|_|\\__|      \\____\\___/| .__/|_|_|\\___/ \\__|
                              |_|                   
`));
  console.log(chalk.dim('🛡️  Privacy-First Offline AI Git Copilot & DevSecOps Secret Scanner\n'));
}

/**
 * Audit staged files for hardcoded secrets
 */
function auditSecrets(): boolean {
  const stagedDiff = gitService.getStagedDiff();
  if (!stagedDiff) return true;

  const violations = scanner.scanContent('staged-changes', stagedDiff, true);
  if (violations.length > 0) {
    console.log(chalk.bold.red(`\n🚨 CRITICAL SECURITY ALERT: ${violations.length} hardcoded secret(s) detected!`));
    console.log(chalk.red('--------------------------------------------------------------------------------'));
    for (const v of violations) {
      console.log(chalk.yellow(`[${v.ruleId}] ${v.ruleName} (${chalk.bold.red(v.severity)})`));
      console.log(`  File/Context: Line ~${v.line}`);
      console.log(`  Preview:      ${chalk.bgRed.white(` ${v.matchPreview} `)}`);
      console.log(`  Guidance:     ${chalk.cyan(v.recommendation)}\n`);
    }
    console.log(chalk.bold.red('❌ Commit aborted to prevent secret leakage.'));
    console.log(chalk.dim('Please remove secrets from staged files before committing.\n'));
    return false;
  }
  return true;
}

/**
 * Commit Command
 */
program
  .command('commit')
  .description('Audit staged changes, generate AI conventional commits, and commit')
  .option('-a, --all', 'Automatically stage all modified files before commit')
  .action(async (options) => {
    printBanner();

    if (!gitService.isInsideGitRepo()) {
      console.log(chalk.red('❌ Error: Current directory is not inside a git repository.'));
      process.exit(1);
    }

    if (options.all) {
      console.log(chalk.blue('📦 Staging all tracked and untracked changes...'));
      gitService.stageAll();
    }

    let status = gitService.getStatus();

    if (status.staged.length === 0) {
      if (status.unstaged.length > 0 || status.untracked.length > 0) {
        console.log(chalk.yellow('⚠️ No files staged for commit. Found unstaged changes.'));
        const shouldStage = await confirm({
          message: 'Would you like to stage all changes now?',
          default: true
        });
        if (shouldStage) {
          gitService.stageAll();
          status = gitService.getStatus();
        } else {
          console.log(chalk.dim('Commit cancelled. Please run `git add` on the files you wish to commit.'));
          return;
        }
      } else {
        console.log(chalk.green('✨ Working tree clean. Nothing to commit!'));
        return;
      }
    }

    console.log(chalk.bold(`\n🔍 Performing DevSecOps Secret Scan on ${status.staged.length} staged file(s)...`));
    const passedAudit = auditSecrets();
    if (!passedAudit) {
      process.exit(1);
    }
    console.log(chalk.green('  ✅ Secret audit passed! Zero sensitive credentials detected.'));

    console.log(chalk.bold(`\n🧠 Generating Conventional Commit suggestions...`));
    const ollamaStatus = await copilot.isAvailable();
    if (ollamaStatus.available) {
      console.log(chalk.cyan(`  🤖 Using Local LLM via Ollama: ${chalk.bold(ollamaStatus.model)}`));
    } else {
      console.log(chalk.dim('  ⚡ Ollama not detected. Using high-fidelity Offline Heuristic Engine.'));
    }

    const suggestions = await copilot.generateCommitSuggestions(status.staged);

    const choices = suggestions.map((s, idx) => ({
      name: `${chalk.bold.green(s.message)} \n    ${chalk.dim(`↳ ${s.rationale}`)}`,
      value: s.message
    }));

    choices.push({
      name: chalk.yellow('✏️  Write custom commit message manually...'),
      value: '__CUSTOM__'
    });

    const selectedMessage = await select({
      message: 'Select a commit message:',
      choices
    });

    let finalMessage = selectedMessage;
    if (selectedMessage === '__CUSTOM__') {
      finalMessage = await input({
        message: 'Enter commit message:',
        validate: (val) => val.trim().length > 0 || 'Commit message cannot be empty'
      });
    }

    try {
      gitService.commit(finalMessage);
      console.log(chalk.bold.green(`\n🎉 Commit successful on branch [${status.branch}]!`));
      console.log(chalk.dim(`Message: "${finalMessage}"\n`));
    } catch (err: any) {
      console.log(chalk.red(`❌ Commit failed: ${err.message}`));
    }
  });

/**
 * Scan Command
 */
program
  .command('scan')
  .description('Scan working tree or staged diff for secrets and sensitive tokens')
  .option('--staged', 'Scan only staged changes', false)
  .action((options) => {
    printBanner();
    if (!gitService.isInsideGitRepo()) {
      console.log(chalk.red('❌ Error: Current directory is not inside a git repository.'));
      process.exit(1);
    }

    const diff = options.staged ? gitService.getStagedDiff() : gitService.getWorkingTreeDiff() || gitService.getStagedDiff();
    if (!diff) {
      console.log(chalk.green('✅ No diff found to scan. Repository working tree is clean.'));
      process.exit(0);
    }

    const violations = scanner.scanContent('git-diff', diff, true);
    if (violations.length === 0) {
      console.log(chalk.bold.green('✅ DevSecOps Secret Scan: PASS! Zero leaked credentials found.'));
      process.exit(0);
    } else {
      console.log(chalk.bold.red(`🚨 DevSecOps Secret Scan: FAILED! Found ${violations.length} violation(s):\n`));
      for (const v of violations) {
        console.log(chalk.red(`  • [${v.ruleId}] ${v.ruleName} (${v.severity})`));
        console.log(`    Line: ${v.line} | Preview: ${chalk.bgRed.white(` ${v.matchPreview} `)}`);
        console.log(`    Fix:  ${v.recommendation}\n`);
      }
      process.exit(1);
    }
  });

/**
 * Review Command
 */
program
  .command('review')
  .description('Perform local AI code review on staged changes')
  .action(async () => {
    printBanner();
    if (!gitService.isInsideGitRepo()) {
      console.log(chalk.red('❌ Error: Current directory is not inside a git repository.'));
      process.exit(1);
    }

    const status = gitService.getStatus();
    if (status.staged.length === 0) {
      console.log(chalk.yellow('⚠️ No staged files found. Please stage files using `git add` to review them.'));
      return;
    }

    console.log(chalk.bold.cyan(`\n🔍 Performing Local AI Code Review for ${status.staged.length} file(s)...\n`));
    const review = await copilot.generateCodeReview(status.staged);

    const riskColor = review.riskLevel === 'HIGH' ? chalk.bold.red : review.riskLevel === 'MEDIUM' ? chalk.bold.yellow : chalk.bold.green;
    console.log(`📊 Risk Assessment: ${riskColor(`[${review.riskLevel}]`)}`);
    console.log(chalk.dim(`Summary: ${review.summary}\n`));

    console.log(chalk.bold('📁 Changed Files:'));
    for (const c of review.keyChanges) {
      console.log(`  • ${c}`);
    }

    if (review.securityConcerns.length > 0) {
      console.log(chalk.bold.red('\n🛡️ Security Considerations:'));
      for (const s of review.securityConcerns) {
        console.log(`  ${s}`);
      }
    }

    if (review.qualityTips.length > 0) {
      console.log(chalk.bold.yellow('\n💡 Quality & Architecture Tips:'));
      for (const q of review.qualityTips) {
        console.log(`  ${q}`);
      }
    }

    console.log(chalk.bold.cyan('\n📋 DevSecOps Quality Checklist:'));
    for (const item of review.checklist) {
      const icon = item.passed ? chalk.green('✔') : chalk.red('✖');
      console.log(`  ${icon} ${item.item}`);
    }
    console.log('');
  });

/**
 * Hook Command
 */
program
  .command('hook')
  .description('Manage git hook integrations')
  .argument('<action>', 'install | remove')
  .action((action) => {
    if (action === 'install') {
      try {
        const res = gitService.installPreCommitHook();
        console.log(chalk.green(`\n✅ Successfully installed pre-commit secret audit hook!`));
        console.log(chalk.dim(`Hook location: ${res.hookPath}\n`));
      } catch (err: any) {
        console.log(chalk.red(`❌ Failed to install hook: ${err.message}`));
      }
    } else {
      console.log(chalk.yellow('Supported actions: "install"'));
    }
  });

/**
 * Status Command
 */
program
  .command('status')
  .description('Display status of Ollama connection, Git repository, and secret scanner')
  .action(async () => {
    printBanner();
    const inRepo = gitService.isInsideGitRepo();
    console.log(chalk.bold('Repository Status:'));
    console.log(`  Git Repo:      ${inRepo ? chalk.green('✔ Active') : chalk.red('✖ Not in a git repo')}`);
    if (inRepo) {
      const s = gitService.getStatus();
      console.log(`  Branch:        ${chalk.cyan(s.branch)}`);
      console.log(`  Staged Files:  ${s.staged.length > 0 ? chalk.green(s.staged.length) : chalk.dim('0')}`);
      console.log(`  Unstaged Files:${s.unstaged.length > 0 ? chalk.yellow(s.unstaged.length) : chalk.dim('0')}`);
      console.log(`  Untracked:     ${s.untracked.length > 0 ? chalk.dim(s.untracked.length) : chalk.dim('0')}`);
    }

    console.log(chalk.bold('\nLocal AI Status:'));
    const ollama = await copilot.isAvailable();
    if (ollama.available) {
      console.log(`  Ollama Server: ${chalk.green('✔ Connected (http://localhost:11434)')}`);
      console.log(`  Active Model:  ${chalk.cyan(ollama.model)}`);
    } else {
      console.log(`  Ollama Server: ${chalk.yellow('⚡ Offline / Not Running')}`);
      console.log(`  Fallback:      ${chalk.green('✔ High-Fidelity Heuristic Engine Active')}`);
    }
    console.log('');
  });

// Default to 'commit' if no argument passed
if (process.argv.length <= 2) {
  process.argv.push('commit');
}

program.parse(process.argv);
