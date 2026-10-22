export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface SecretViolation {
  file: string;
  line: number;
  ruleId: string;
  ruleName: string;
  severity: Severity;
  description: string;
  matchPreview: string;
  recommendation: string;
}

export type FileChangeStatus = 'added' | 'modified' | 'deleted' | 'renamed';

export interface DiffFile {
  path: string;
  oldPath?: string;
  status: FileChangeStatus;
  additions: number;
  deletions: number;
  patch: string;
}

export interface GitRepoStatus {
  staged: DiffFile[];
  unstaged: DiffFile[];
  untracked: string[];
  branch: string;
  isClean: boolean;
  totalAdditions: number;
  totalDeletions: number;
}

export interface CommitSuggestion {
  message: string;
  body?: string;
  rationale: string;
  source: 'ollama' | 'offline-heuristic';
}

export interface CodeReviewReport {
  summary: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  keyChanges: string[];
  securityConcerns: string[];
  qualityTips: string[];
  checklist: { item: string; passed: boolean }[];
}
