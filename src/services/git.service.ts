import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DiffFile, FileChangeStatus, GitRepoStatus } from '../models/types.js';

export class GitService {
  constructor(private workingDir: string = process.cwd()) {}

  public isInsideGitRepo(): boolean {
    try {
      const out = execSync('git rev-parse --is-inside-work-tree', {
        cwd: this.workingDir,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore']
      });
      return out.trim() === 'true';
    } catch {
      return false;
    }
  }

  public getGitRoot(): string {
    const out = execSync('git rev-parse --show-toplevel', {
      cwd: this.workingDir,
      encoding: 'utf-8'
    });
    return out.trim();
  }

  public getCurrentBranch(): string {
    try {
      const out = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: this.workingDir,
        encoding: 'utf-8'
      });
      return out.trim();
    } catch {
      return 'main';
    }
  }

  public getStagedDiff(): string {
    try {
      return execSync('git diff --cached --unified=3', {
        cwd: this.workingDir,
        encoding: 'utf-8'
      });
    } catch {
      return '';
    }
  }

  public getWorkingTreeDiff(): string {
    try {
      return execSync('git diff --unified=3', {
        cwd: this.workingDir,
        encoding: 'utf-8'
      });
    } catch {
      return '';
    }
  }

  public parseUnifiedDiff(diffOutput: string): DiffFile[] {
    if (!diffOutput || diffOutput.trim() === '') return [];

    const files: DiffFile[] = [];
    const diffBlocks = diffOutput.split(/^diff --git /m).filter(b => b.trim().length > 0);

    for (const block of diffBlocks) {
      const lines = block.split(/\r?\n/);
      const headerLine = lines[0]; // e.g., "a/src/server.ts b/src/server.ts"
      const match = headerLine.match(/a\/(.+?)\s+b\/(.+?)$/);
      const filePath = match ? match[2] : headerLine.split(' ').pop() || 'unknown';

      let status: FileChangeStatus = 'modified';
      if (block.includes('new file mode')) {
        status = 'added';
      } else if (block.includes('deleted file mode')) {
        status = 'deleted';
      } else if (block.includes('similarity index')) {
        status = 'renamed';
      }

      let additions = 0;
      let deletions = 0;
      for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          additions++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          deletions++;
        }
      }

      files.push({
        path: filePath,
        status,
        additions,
        deletions,
        patch: block
      });
    }

    return files;
  }

  public getStatus(): GitRepoStatus {
    const stagedDiff = this.getStagedDiff();
    const stagedFiles = this.parseUnifiedDiff(stagedDiff);

    const unstagedDiff = this.getWorkingTreeDiff();
    const unstagedFiles = this.parseUnifiedDiff(unstagedDiff);

    let untracked: string[] = [];
    try {
      const out = execSync('git status --porcelain', {
        cwd: this.workingDir,
        encoding: 'utf-8'
      });
      const lines = out.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        if (line.startsWith('??')) {
          untracked.push(line.slice(3).trim());
        }
      }
    } catch {
      untracked = [];
    }

    let totalAdditions = 0;
    let totalDeletions = 0;
    for (const f of stagedFiles) {
      totalAdditions += f.additions;
      totalDeletions += f.deletions;
    }

    return {
      staged: stagedFiles,
      unstaged: unstagedFiles,
      untracked,
      branch: this.getCurrentBranch(),
      isClean: stagedFiles.length === 0 && unstagedFiles.length === 0 && untracked.length === 0,
      totalAdditions,
      totalDeletions
    };
  }

  public stageAll(): void {
    execSync('git add -A', { cwd: this.workingDir });
  }

  public stageFiles(files: string[]): void {
    if (files.length === 0) return;
    const quoted = files.map(f => `"${f}"`).join(' ');
    execSync(`git add ${quoted}`, { cwd: this.workingDir });
  }

  public commit(message: string): string {
    // Escape double quotes and backslashes
    const cleanMsg = message.replace(/"/g, '\\"');
    const out = execSync(`git commit -m "${cleanMsg}"`, {
      cwd: this.workingDir,
      encoding: 'utf-8'
    });
    return out.trim();
  }

  public installPreCommitHook(): { success: boolean; hookPath: string } {
    const root = this.getGitRoot();
    const hooksDir = path.join(root, '.git', 'hooks');
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }

    const hookPath = path.join(hooksDir, 'pre-commit');
    const hookContent = `#!/bin/sh
# local-git-copilot automated pre-commit DevSecOps hook
# Checks for hardcoded secrets before allowing commit

ROOT="$(git rev-parse --show-toplevel)"
echo "🛡️  Running local-git-copilot pre-commit secret audit..."

if [ -f "$ROOT/dist/cli.js" ]; then
  node "$ROOT/dist/cli.js" scan --staged
else
  npx --no-install tsx "$ROOT/src/cli.ts" scan --staged
fi

EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "❌ Commit rejected! Secret scanner detected sensitive data in staged changes."
  echo "👉 Run 'npm run scan' to inspect violations and remediation tips."
  exit 1
fi

echo "✅ Secret audit passed cleanly."
exit 0
`;

    fs.writeFileSync(hookPath, hookContent, { encoding: 'utf-8', mode: 0o755 });
    return { success: true, hookPath };
  }
}
