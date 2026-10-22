import { describe, it, expect } from 'vitest';
import { OllamaCopilotService } from '../../src/services/ollama-copilot.service.js';
import { DiffFile } from '../../src/models/types.js';

describe('OllamaCopilotService', () => {
  const copilot = new OllamaCopilotService();

  it('should generate feature conventional commits for added files', () => {
    const diffFiles: DiffFile[] = [
      {
        path: 'src/services/payment.service.ts',
        status: 'added',
        additions: 120,
        deletions: 0,
        patch: '+export class PaymentService {}'
      }
    ];

    const suggestions = copilot.generateOfflineSuggestions(diffFiles);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].message).toMatch(/^feat\(services\):/);
  });

  it('should generate fix conventional commits when bug keywords are present in diff', () => {
    const diffFiles: DiffFile[] = [
      {
        path: 'src/controllers/auth.controller.ts',
        status: 'modified',
        additions: 10,
        deletions: 2,
        patch: '-if (!user) throw error;\n+if (!user) { logger.warn("Fix null user bug"); return res.status(401); }'
      }
    ];

    const suggestions = copilot.generateOfflineSuggestions(diffFiles);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].message).toMatch(/^fix\(controllers\):/);
  });

  it('should generate test conventional commits when only tests are modified', () => {
    const diffFiles: DiffFile[] = [
      {
        path: 'tests/unit/payment.test.ts',
        status: 'modified',
        additions: 25,
        deletions: 5,
        patch: '+it("should handle refund", () => {});'
      }
    ];

    const suggestions = copilot.generateOfflineSuggestions(diffFiles);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].message).toMatch(/^test\(unit\):/);
  });

  it('should generate comprehensive code review report with risk rating', async () => {
    const diffFiles: DiffFile[] = [
      {
        path: 'src/auth/jwt.ts',
        status: 'modified',
        additions: 45,
        deletions: 12,
        patch: '+const payload: any = verifyToken();'
      }
    ];

    const review = await copilot.generateCodeReview(diffFiles);
    expect(review.riskLevel).toBeDefined();
    expect(review.keyChanges.length).toBe(1);
    expect(review.checklist.length).toBeGreaterThan(0);
    expect(review.qualityTips.some(t => t.includes('any'))).toBe(true);
  });
});
