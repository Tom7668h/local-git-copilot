# 🛡️ Local Git Copilot & Pre-Commit DevSecOps Agent

> **Privacy-First Offline AI Git Copilot & DevSecOps Secret Scanner**  
> Powered by Local LLMs (**Ollama**) and deterministic Shannon-Entropy Heuristics. 100% air-gapped, zero cloud telemetry, GDPR/DSGVO-compliant.

---

## 🌟 Overview & Architecture

Modern enterprise development demands agility without compromising compliance or leaking sensitive credentials. **`local-git-copilot`** acts as an intelligent local security and workflow agent embedded directly into your Git lifecycle:

1. **Pre-Commit Secret Auditing:** Analyzes staged diffs for AWS keys, JWT tokens, private cryptographic keys, and high-entropy passwords using Shannon entropy formula $H(X) = -\sum p(x) \log_2 p(x)$.
2. **Conventional Commit Synthesis:** Automatically formulates structured Conventional Commits (`<type>(<scope>): <subject>`) using your local Ollama LLM (`llama3`, `qwen2.5-coder`, `deepseek-r1`) or high-fidelity offline heuristic fallbacks.
3. **Automated AI Code Review:** Evaluates code risk, identifies potential anti-patterns, verifies test coverage, and renders an interactive DevSecOps audit checklist.
4. **Zero-Configuration Pre-Commit Hook:** Easily registers into `.git/hooks/pre-commit` to prevent secret leakage in CI/CD and developer machines.

```
       [ Developer Staged Changes ]
                    │
                    ▼
     ┌───────────────────────────────┐
     │ DevSecOps Secret Scanner      │
     │  - Regex Pattern Detection    │
     │  - Shannon Entropy Analysis   │
     └──────┬─────────────────┬──────┘
            │ Violations?     │ Clean
            ▼                 ▼
   [ 🚨 Reject & Warn ]  ┌─────────────────────────────────┐
                         │ Dual-Mode Intelligence Engine   │
                         │  • Ollama Local LLM             │
                         │  • Offline Heuristic Fallback   │
                         └────────────────┬────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │ Interactive Commit & Review TUI │
                         │  • Conventional Commit Options  │
                         │  • DevSecOps Risk Checklist     │
                         └────────────────┬────────────────┘
                                          │ User Choice
                                          ▼
                                 [ git commit -m ]
```

---

## 🚀 Key Features

- **🔒 100% Offline & Private:** Operates entirely within your local machine. No external APIs, no OpenAI or Anthropic tokens, zero source code telemetry.
- **⚡ Dual-Engine Operation:**
  - **Local LLM Mode:** Automatically detects and connects to Ollama on `http://localhost:11434` (supports `llama3`, `qwen2.5-coder`, `deepseek-r1:1.5b`, `tinyllama`).
  - **Offline Heuristic Mode:** High-precision deterministic parser that infers conventional types (`feat`, `fix`, `test`, `docs`, `ci`, `build`) directly from diff semantics if Ollama is not installed.
- **🔍 Deep Secret Auditing:**
  - `SEC-001`: AWS Access Key IDs (`AKIA...`)
  - `SEC-002`: AWS Secret Access Keys
  - `SEC-003`: Private Keys (`RSA`, `EC`, `OPENSSH`, `DSA`, `PGP`)
  - `SEC-004`: Bearer / JSON Web Tokens (JWT)
  - `SEC-005`: Generic API Keys and Bearer Secrets
  - `SEC-006`: High-Entropy Passwords & Tokens (Shannon Entropy > 3.5)
- **📋 Automated AI Code Reviewer:** Assesses risk level (`LOW`, `MEDIUM`, `HIGH`), highlights key module changes, and provides best practice recommendations.
- **🪝 One-Click Hook Integration:** Installs a pre-commit shell hook to reject uncommitted secrets in all future commits.

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 20+ (LTS)
- Git 2.30+
- *(Optional)* [Ollama](https://ollama.com/) with any model installed (e.g. `ollama run llama3:instruct` or `ollama run qwen2.5-coder`)

### Setup
```bash
git clone https://github.com/Tom7668h/local-git-copilot.git
cd local-git-copilot
npm install
npm run build
```

---

## 📖 CLI Usage & Commands

### 1. Check System & LLM Status
Verifies Ollama connectivity, active model, and git repository state:
```bash
npx local-copilot status
# or
npm run dev -- status
```

### 2. Audit Staged Changes & Commit with AI
Runs the secret audit on staged files, queries the local AI model for 3 Conventional Commit suggestions, and lets you pick or customize the message:
```bash
npx local-copilot commit
# Or stage all files and commit in one go:
npx local-copilot commit -a
```

### 3. Standalone DevSecOps Secret Scan
Scans staged diff or current working directory for secrets:
```bash
# Scan working tree
npm run scan

# Scan only staged changes (returns exit code 1 on failure)
npm run dev -- scan --staged
```

### 4. AI Code Review
Performs a deep architectural and security review of your staged changes:
```bash
npm run review
```

### 5. Install Git Pre-Commit Hook
Registers the pre-commit hook into `.git/hooks/pre-commit`:
```bash
npm run dev -- hook install
```

---

## 🧪 Testing

Comprehensive test suites cover entropy calculations, secret detection rules, heuristic conventional commit synthesis, and code review generators:

```bash
npm test
```

Expected output:
```
 ✓ tests/unit/ollama-copilot.test.ts  (4 tests)
 ✓ tests/unit/secret-scanner.test.ts  (7 tests)

 Test Files  2 passed (2)
      Tests  11 passed (11)
```

---

## 📂 Project Structure

```
local-git-copilot/
├── bin/
│   └── copilot.js                       # Executable CLI wrapper
├── src/
│   ├── cli.ts                           # Commander & Inquirer CLI application
│   ├── models/
│   │   └── types.ts                     # TypeScript data contracts & interfaces
│   └── services/
│       ├── git.service.ts               # Git diff parser, status & hook manager
│       ├── secret-scanner.service.ts    # Shannon entropy & regex secret auditor
│       └── ollama-copilot.service.ts    # Local LLM client & heuristic fallback
├── tests/
│   └── unit/
│       ├── secret-scanner.test.ts       # Secret detection & entropy unit tests
│       └── ollama-copilot.test.ts       # Commit generation & review unit tests
├── dist/                                # Compiled JavaScript & type definitions
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## 📄 License
MIT © Tom7668h
