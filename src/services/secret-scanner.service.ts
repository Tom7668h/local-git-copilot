import { SecretViolation, Severity } from '../models/types.js';

interface SecretRule {
  id: string;
  name: string;
  severity: Severity;
  description: string;
  recommendation: string;
  regex: RegExp;
  minEntropy?: number;
}

export class SecretScannerService {
  private rules: SecretRule[] = [
    {
      id: 'SEC-001',
      name: 'AWS Access Key ID',
      severity: 'CRITICAL',
      description: 'Hardcoded AWS Access Key ID detected.',
      recommendation: 'Move credentials to AWS Secrets Manager, IAM roles, or local ~/.aws/credentials.',
      regex: /(?:^|[^A-Z0-9])(AKIA[0-9A-Z]{16})(?:[^A-Z0-9]|$)/
    },
    {
      id: 'SEC-002',
      name: 'AWS Secret Access Key',
      severity: 'CRITICAL',
      description: 'AWS Secret Access Key assignment found.',
      recommendation: 'Revoke and rotate the exposed AWS key immediately in AWS IAM console.',
      regex: /(?:aws[_\-\s]*(?:secret|key|access)[\w\-_]*)\s*[:=]\s*['"]?([a-zA-Z0-9/+=]{40})['"]?/i
    },
    {
      id: 'SEC-003',
      name: 'Private Cryptographic Key',
      severity: 'CRITICAL',
      description: 'Private key block (RSA/EC/SSH/PGP) detected in plain text.',
      recommendation: 'Remove private keys from source control. Use ssh-agent, Vault, or encrypted keystores.',
      regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/
    },
    {
      id: 'SEC-004',
      name: 'JSON Web Token (JWT)',
      severity: 'HIGH',
      description: 'Hardcoded JWT authorization/session token detected.',
      recommendation: 'Do not commit bearer tokens. Generate tokens dynamically at runtime.',
      regex: /eyJ[a-zA-Z0-9_\-]{10,}\.eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]+/
    },
    {
      id: 'SEC-005',
      name: 'Generic API / Auth Secret Key',
      severity: 'HIGH',
      description: 'Generic API key or authentication token assignment pattern.',
      recommendation: 'Load API keys via process.env and store in an ignored .env file or secret manager.',
      regex: /(?:api[_\-]?key|client[_\-]?secret|auth[_\-]?token|app[_\-]?secret)\s*[:=]\s*['"]([a-zA-Z0-9_\-.]{16,})['"]/i
    },
    {
      id: 'SEC-006',
      name: 'High-Entropy Password / Secret Token',
      severity: 'HIGH',
      description: 'Suspicious credential or password field with high Shannon entropy.',
      recommendation: 'Never hardcode passwords or sensitive credentials into source code.',
      regex: /(?:password|passwd|db_pass|secret_val)\s*[:=]\s*['"]([^'"]{10,})['"]/i,
      minEntropy: 3.5
    }
  ];

  /**
   * Calculates the Shannon Entropy of a string: H(X) = -sum(p * log2(p))
   */
  public calculateEntropy(str: string): number {
    if (!str || str.length === 0) return 0;
    const freqs: Record<string, number> = {};
    for (const char of str) {
      freqs[char] = (freqs[char] || 0) + 1;
    }
    const len = str.length;
    let entropy = 0;
    for (const char in freqs) {
      const p = freqs[char] / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  /**
   * Mask a secret string for display in logs/CLI, keeping only first 2 and last 2 characters
   */
  public maskSecret(secret: string): string {
    if (secret.length <= 6) return '******';
    const head = secret.slice(0, 2);
    const tail = secret.slice(-2);
    const maskedLength = Math.min(secret.length - 4, 16);
    return `${head}${'*'.repeat(maskedLength)}${tail}`;
  }

  /**
   * Scans a file's content or diff patch line by line
   */
  public scanContent(filePath: string, content: string, isDiff: boolean = false): SecretViolation[] {
    const violations: SecretViolation[] = [];
    const lines = content.split(/\r?\n/);

    let currentLineNumber = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (isDiff) {
        // In git diff, only analyze added or modified lines (+)
        // Skip header lines (+++, ---, @@)
        if (line.startsWith('+++') || line.startsWith('---')) continue;
        if (line.startsWith('@@')) {
          const match = line.match(/\+([0-9]+)/);
          if (match) currentLineNumber = parseInt(match[1], 10) - 1;
          continue;
        }
        if (!line.startsWith('+')) {
          if (!line.startsWith('-')) currentLineNumber++;
          continue;
        }
        currentLineNumber++;
      } else {
        currentLineNumber = i + 1;
      }

      // Check against all rules
      for (const rule of this.rules) {
        const match = line.match(rule.regex);
        if (match) {
          const matchedSecret = match[1] || match[0];

          // If rule requires minimum entropy check
          if (rule.minEntropy !== undefined) {
            const entropy = this.calculateEntropy(matchedSecret);
            if (entropy < rule.minEntropy) {
              continue; // Skip false positive low-entropy string
            }
          }

          violations.push({
            file: filePath,
            line: currentLineNumber,
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            description: rule.description,
            matchPreview: this.maskSecret(matchedSecret.trim()),
            recommendation: rule.recommendation
          });
        }
      }
    }

    return violations;
  }
}
