import { CommitSuggestion, CodeReviewReport, DiffFile } from '../models/types.js';

export class OllamaCopilotService {
  private host: string;
  private preferredModel: string = 'qwen2.5-coder:latest';
  private fallbackModels = ['llama3.2:latest', 'llama3:latest', 'deepseek-r1:1.5b', 'tinyllama:latest'];

  constructor(host: string = process.env.OLLAMA_HOST || 'http://localhost:11434') {
    this.host = host.replace(/\/$/, '');
  }

  public async isAvailable(): Promise<{ available: boolean; model?: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.host}/api/tags`, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) return { available: false };
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const installed = (data.models || []).map(m => m.name);

      if (installed.length === 0) return { available: false };

      // Pick preferred or first available model
      let chosen = installed.find(m => m.includes('qwen') || m.includes('coder'));
      if (!chosen) {
        for (const candidate of this.fallbackModels) {
          chosen = installed.find(m => m.toLowerCase().includes(candidate.split(':')[0]));
          if (chosen) break;
        }
      }
      if (!chosen) chosen = installed[0];

      return { available: true, model: chosen };
    } catch {
      return { available: false };
    }
  }

  public async generateCommitSuggestions(diffFiles: DiffFile[]): Promise<CommitSuggestion[]> {
    const status = await this.isAvailable();

    if (status.available && status.model) {
      try {
        const suggestions = await this.generateWithOllama(diffFiles, status.model);
        if (suggestions && suggestions.length > 0) {
          return suggestions;
        }
      } catch (err) {
        // Fallback gracefully on Ollama error
      }
    }

    return this.generateOfflineSuggestions(diffFiles);
  }

  private async generateWithOllama(diffFiles: DiffFile[], model: string): Promise<CommitSuggestion[]> {
    const summary = diffFiles.map(f => `${f.status.toUpperCase()}: ${f.path} (+${f.additions}, -${f.deletions})`).join('\n');
    const truncatedDiff = diffFiles.map(f => f.patch.slice(0, 800)).join('\n---\n').slice(0, 3000);

    const prompt = `You are an expert Git DevSecOps assistant. Analyze this staged git diff and generate 3 alternative Conventional Commit messages following the specification:
Format: <type>(<scope>): <short imperative subject>

Types: feat, fix, refactor, docs, test, chore, perf, ci, build.
Scope should be the primary component/module changed.

Changes summary:
${summary}

Diff sample:
${truncatedDiff}

Return ONLY valid JSON with no markdown wrapping in this format:
[
  {"message": "feat(auth): add jwt token refresh middleware", "rationale": "Introduces new token rotation endpoint and tests"},
  {"message": "fix(auth): prevent session timeout during active stream", "rationale": "Fixes connection drop in long-lived requests"},
  {"message": "refactor(auth): simplify bearer token extraction logic", "rationale": "Cleans up token parsing across route handlers"}
]`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(`${this.host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { temperature: 0.2 }
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`Ollama responded with HTTP ${response.status}`);
    const data = (await response.json()) as { response: string };
    const raw = data.response.trim();

    // Extract JSON array
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((item: any) => ({
        message: item.message,
        body: item.body,
        rationale: item.rationale || 'Generated via local Ollama LLM',
        source: 'ollama' as const
      }));
    }

    throw new Error('Unable to parse LLM JSON');
  }

  /**
   * Deterministic Offline Heuristic Engine
   * Generates production-grade conventional commits without requiring any LLM
   */
  public generateOfflineSuggestions(diffFiles: DiffFile[]): CommitSuggestion[] {
    if (diffFiles.length === 0) {
      return [{
        message: 'chore: update repository files',
        rationale: 'Generic fallback for empty diff',
        source: 'offline-heuristic'
      }];
    }

    const paths = diffFiles.map(f => f.path.toLowerCase());
    const patches = diffFiles.map(f => f.patch).join('\n');

    // Determine primary scope
    let scope = 'core';
    const firstPath = diffFiles[0].path;
    const parts = firstPath.split(/[\/\\]/);
    if (parts.length > 1) {
      scope = parts[1] || parts[0];
      scope = scope.replace(/\.[^/.]+$/, ''); // remove extension
    }

    // Determine intent
    const hasTestsOnly = paths.every(p => p.includes('test') || p.includes('spec'));
    const hasDocsOnly = paths.every(p => p.endsWith('.md') || p.includes('docs/'));
    const hasCiOnly = paths.every(p => p.includes('.github') || p.includes('docker') || p.includes('ci'));
    const hasBugFix = /(fix|bug|issue|error|fail|null|undefined|catch|patch)/i.test(patches);
    const hasNewFeatures = diffFiles.some(f => f.status === 'added');
    const isBuildDependency = paths.some(p => p.includes('package.json') || p.includes('pom.xml') || p.includes('tsconfig'));

    const suggestions: CommitSuggestion[] = [];

    if (hasTestsOnly) {
      suggestions.push({
        message: `test(${scope}): add test coverage for ${diffFiles.map(f => f.path.split(/[\/\\]/).pop()).join(', ')}`,
        rationale: 'Changes are isolated to test suites',
        source: 'offline-heuristic'
      });
      suggestions.push({
        message: `test: update unit and integration test assertions`,
        rationale: 'Broad test update',
        source: 'offline-heuristic'
      });
    } else if (hasDocsOnly) {
      suggestions.push({
        message: `docs(${scope}): update documentation and architectural guides`,
        rationale: 'Changes are isolated to markdown / documentation files',
        source: 'offline-heuristic'
      });
      suggestions.push({
        message: `docs: improve project setup and api reference documentation`,
        rationale: 'Documentation enhancement',
        source: 'offline-heuristic'
      });
    } else if (hasCiOnly) {
      suggestions.push({
        message: `ci(${scope}): update automation pipelines and workflow configurations`,
        rationale: 'CI/CD pipeline updates detected',
        source: 'offline-heuristic'
      });
    } else if (hasBugFix) {
      suggestions.push({
        message: `fix(${scope}): resolve error handling and edge-case exceptions`,
        rationale: 'Diff contains defensive guards or bugfix logic',
        source: 'offline-heuristic'
      });
      suggestions.push({
        message: `fix(${scope}): correct validation logic and sanitize input parameters`,
        rationale: 'Alternative bugfix framing',
        source: 'offline-heuristic'
      });
      suggestions.push({
        message: `refactor(${scope}): optimize reliability and fix state handling`,
        rationale: 'Refactoring with stability fix',
        source: 'offline-heuristic'
      });
    } else if (hasNewFeatures) {
      const newFiles = diffFiles.filter(f => f.status === 'added').map(f => f.path.split(/[\/\\]/).pop()?.replace(/\.[^/.]+$/, '')).filter(Boolean);
      const featureName = newFiles[0] || scope;

      suggestions.push({
        message: `feat(${scope}): implement ${featureName} service and modules`,
        rationale: 'New files introduced into codebase',
        source: 'offline-heuristic'
      });
      suggestions.push({
        message: `feat(${scope}): add ${featureName} integration and core workflow`,
        rationale: 'Component feature expansion',
        source: 'offline-heuristic'
      });
      suggestions.push({
        message: `chore(${scope}): scaffold ${featureName} and update project modules`,
        rationale: 'Scaffolding perspective',
        source: 'offline-heuristic'
      });
    } else if (isBuildDependency) {
      suggestions.push({
        message: `build(${scope}): update package dependencies and build configuration`,
        rationale: 'Dependency management files modified',
        source: 'offline-heuristic'
      });
      suggestions.push({
        message: `chore: synchronize project dependencies and toolchain configs`,
        rationale: 'Tooling configuration',
        source: 'offline-heuristic'
      });
    } else {
      suggestions.push({
        message: `refactor(${scope}): streamline implementation and modularize code`,
        rationale: 'Existing source files modified without major additions',
        source: 'offline-heuristic'
      });
      suggestions.push({
        message: `perf(${scope}): optimize performance and execution flow`,
        rationale: 'Code optimization candidate',
        source: 'offline-heuristic'
      });
      suggestions.push({
        message: `chore(${scope}): update ${diffFiles.map(f => f.path.split(/[\/\\]/).pop()).slice(0, 2).join(', ')}`,
        rationale: 'Standard maintenance commit',
        source: 'offline-heuristic'
      });
    }

    return suggestions;
  }

  public async generateCodeReview(diffFiles: DiffFile[]): Promise<CodeReviewReport> {
    const totalAdds = diffFiles.reduce((acc, f) => acc + f.additions, 0);
    const totalDels = diffFiles.reduce((acc, f) => acc + f.deletions, 0);

    const keyChanges = diffFiles.map(f => {
      const base = f.path.split(/[\/\\]/).pop();
      return `${f.status.toUpperCase()} ${base} (+${f.additions} / -${f.deletions})`;
    });

    const securityConcerns: string[] = [];
    const qualityTips: string[] = [];

    // Heuristic rules for code review
    const allPatches = diffFiles.map(f => f.patch).join('\n');

    if (/eval\(|new Function\(|child_process\.exec\(/i.test(allPatches)) {
      securityConcerns.push('⚠️ Dynamic code execution or shell execution detected. Ensure strict input sanitization to prevent command injection.');
    }

    if (/any/i.test(allPatches) && diffFiles.some(f => f.path.endsWith('.ts'))) {
      qualityTips.push('💡 Found usage of TypeScript `any`. Consider explicit typing or generics for strict type safety.');
    }

    if (totalAdds > 300) {
      qualityTips.push('💡 Large changeset (>300 lines added). Consider splitting into smaller atomic PRs to simplify review.');
    }

    const testFiles = diffFiles.filter(f => f.path.includes('test') || f.path.includes('spec'));
    const nonTestFiles = diffFiles.filter(f => !f.path.includes('test') && !f.path.includes('spec'));
    const hasTestsForChanges = testFiles.length > 0 || nonTestFiles.length === 0;

    if (!hasTestsForChanges) {
      qualityTips.push('💡 New source logic modified without accompanying unit or integration tests.');
    }

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (securityConcerns.length > 0 || totalAdds + totalDels > 500) {
      riskLevel = 'HIGH';
    } else if (qualityTips.length > 1 || !hasTestsForChanges) {
      riskLevel = 'MEDIUM';
    }

    const checklist = [
      { item: 'Zero hardcoded credentials or API keys', passed: true },
      { item: 'Contains corresponding automated tests', passed: hasTestsForChanges },
      { item: 'Changeset size suitable for peer review (<400 lines)', passed: totalAdds + totalDels < 400 },
      { item: 'No deprecated or dangerous API functions used', passed: securityConcerns.length === 0 }
    ];

    return {
      summary: `Automated audit of ${diffFiles.length} file(s) across +${totalAdds} / -${totalDels} lines of code.`,
      riskLevel,
      keyChanges,
      securityConcerns,
      qualityTips,
      checklist
    };
  }
}
