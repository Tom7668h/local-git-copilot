import { describe, it, expect } from 'vitest';
import { SecretScannerService } from '../../src/services/secret-scanner.service.js';

describe('SecretScannerService', () => {
  const scanner = new SecretScannerService();

  it('should accurately calculate Shannon entropy for low and high entropy strings', () => {
    const lowEntropy = scanner.calculateEntropy('aaaaaaaaaa');
    expect(lowEntropy).toBe(0);

    const moderateEntropy = scanner.calculateEntropy('abcdefghij');
    expect(moderateEntropy).toBeGreaterThan(3.0);

    const highEntropy = scanner.calculateEntropy('W7$kP!9#mZq2@vL&');
    expect(highEntropy).toBeGreaterThan(3.8);
  });

  it('should mask secrets preserving only start and end characters', () => {
    const masked = scanner.maskSecret('AKIAIOSFODNN7EXAMPLE');
    expect(masked.startsWith('AK')).toBe(true);
    expect(masked.endsWith('LE')).toBe(true);
    expect(masked).toContain('******');
  });

  it('should detect AWS Access Key IDs', () => {
    const diff = `
+const awsKey = "AKIA1234567890ABCDEF";
    `;
    const violations = scanner.scanContent('config.ts', diff, true);
    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('SEC-001');
    expect(violations[0].severity).toBe('CRITICAL');
  });

  it('should detect Private Key header blocks', () => {
    const diff = `
+-----BEGIN RSA PRIVATE KEY-----
+MIIEowIBAAKCAQEA0t...
+-----END RSA PRIVATE KEY-----
    `;
    const violations = scanner.scanContent('server.pem', diff, true);
    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('SEC-003');
    expect(violations[0].severity).toBe('CRITICAL');
  });

  it('should detect JSON Web Tokens (JWT)', () => {
    const diff = `
+const authHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    `;
    const violations = scanner.scanContent('api.ts', diff, true);
    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('SEC-004');
    expect(violations[0].severity).toBe('HIGH');
  });

  it('should detect generic API keys with high entropy', () => {
    const diff = `
+const apiKey = "sk_live_9384fjk3920dfjk29482";
    `;
    const violations = scanner.scanContent('.env', diff, true);
    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('SEC-005');
  });

  it('should NOT flag normal clean code', () => {
    const diff = `
+export function calculateTax(amount: number): number {
+  return amount * 0.19;
+}
+const status = "ACTIVE";
    `;
    const violations = scanner.scanContent('tax.ts', diff, true);
    expect(violations.length).toBe(0);
  });
});
