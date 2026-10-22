# 🛡️ Local Git Copilot & Pre-Commit DevSecOps Agent

[![TypeScript](https://img.shields.io/badge/Language-TypeScript%20Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Local AI](https://img.shields.io/badge/Local%20AI-Ollama%20%2F%20Llama%203-22C55E?logo=ollama&logoColor=white)](https://ollama.com/)
[![DevSecOps](https://img.shields.io/badge/DevSecOps-Secret%20Scanner-E11D48?logo=security&logoColor=white)](https://csrc.nist.gov/)
[![Shannon Entropy](https://img.shields.io/badge/Entropy-Mathematical%20Heuristic-6366F1)](https://en.wikipedia.org/wiki/Entropy_(information_theory))
[![Vitest](https://img.shields.io/badge/Tests-11%20Passed-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> 🌐 **Sprache / Language:** [🇩🇪 Zur deutschen Version](#-deutsche-dokumentation) | [🇬🇧 Switch to English Version](#-english-documentation)

---

## 🇩🇪 Deutsche Dokumentation

Ein datenschutzorientierter, lokaler **Git DevSecOps Copilot & Pre-Commit Secret Scanner**, angetrieben durch lokale KI (**Ollama**) und mathematische Shannon-Entropie-Heuristiken. Funktioniert **100% offline**, ohne externe Cloud-Abhängigkeiten und vollständig DSGVO-konform.

---

### 🎯 Problemstellung & Business Value

In modernen Entwicklungsumgebungen führen Zeitdruck und unachtsame Commits regelmäßig zu gravierenden Sicherheitsvorfällen: Hardcodierte AWS-Keys, API-Tokens, Passwörter oder private Schlüssel geraten versehentlich in öffentliche Repositories. Gleichzeitig verlangsamen inkonsistente Commit-Nachrichten und fehlende Code-Reviews die Zusammenarbeit in Entwicklerteams.

**`local-git-copilot`** löst dies direkt auf dem Rechner der Entwickler:
1. **Automatischer Pre-Commit Secret Scan:** Prüft staged Diffs in Echtzeit auf AWS-Schlüssel, JWT-Tokens, private Keys und Passwörter anhand regulärer Ausdrücke und Shannon-Entropie $H(X) = -\sum p(x) \log_2 p(x)$. Gefährliche Commits werden sofort blockiert.
2. **Conventional Commit Generierung:** Formuliert präzise Conventional Commits (`feat(auth): ...`, `fix(db): ...`) über das lokale Ollama LLM (`llama3`, `qwen2.5-coder`, `deepseek`) oder einen deterministischen Heuristik-Fallback.
3. **Lokales KI-Code-Review:** Analysiert Risiko, listet geänderte Module auf, erkennt Anti-Patterns und stellt eine automatisierte DevSecOps-Checkliste bereit.
4. **1-Klick Pre-Commit Hook:** Installiert sich direkt in `.git/hooks/pre-commit` und schützt das Repository dauerhaft.

---

### 🏗️ Architektur & Ablauf

```
       [ Entwickler: Staged Changes (git add) ]
                          │
                          ▼
         ┌─────────────────────────────────┐
         │ DevSecOps Secret Scanner        │
         │  • Regex Pattern Detection      │
         │  • Shannon-Entropie Analyse     │
         └────────┬───────────────┬────────┘
                  │ Treffer?      │ Sicher
                  ▼               ▼
         [ 🚨 Commit Abort ] ┌─────────────────────────────────┐
                             │ Dual-Intelligence Engine        │
                             │  • Lokales Ollama LLM           │
                             │  • Deterministischer Heuristik- │
                             │    Fallback                     │
                             └────────────────┬────────────────┘
                                              │
                                              ▼
                             ┌─────────────────────────────────┐
                             │ Interaktives Terminal-Menü      │
                             │  • Conventional Commit Auswahl  │
                             │  • KI-Code-Review & Checkliste  │
                             └────────────────┬────────────────┘
                                              │ Auswahl bestätigt
                                              ▼
                                     [ git commit -m ]
```

---

### 🚀 Schnellstart

#### Voraussetzungen
- Node.js 20+ (LTS)
- Git
- *(Optional)* [Ollama](https://ollama.com/) lokal installiert

#### Installation & Build
```powershell
git clone https://github.com/Tom7668h/local-git-copilot.git
cd local-git-copilot
npm install
npm run build
```

---

### 💻 CLI-Befehle

```powershell
# 1. Status prüfen (Ollama-Verbindung, Git-Branch, Staged Files)
npm run dev -- status

# 2. Interaktives Commit mit Secret-Check & KI-Nachrichtengenerierung
npm run dev -- commit
# Oder alle Änderungen stagen und committen:
npm run dev -- commit -a

# 3. Secret-Scan manuell ausführen (für CI/CD oder Hook)
npm run scan
npm run dev -- scan --staged

# 4. Lokales KI-Code-Review für gestagte Änderungen
npm run review

# 5. Git Pre-Commit Hook registrieren
npm run dev -- hook install
```

---

### 🧪 Tests
```powershell
npm test
```
```text
 ✓ tests/unit/ollama-copilot.test.ts  (4 tests)
 ✓ tests/unit/secret-scanner.test.ts  (7 tests)

 Test Files  2 passed (2)
      Tests  11 passed (11)
```

---

<br><br>

---

## 🇬🇧 English Documentation

A privacy-first, offline **Git DevSecOps Copilot & Pre-Commit Secret Scanner** powered by local LLMs (**Ollama**) and mathematical Shannon-Entropy analysis. Runs **100% offline**, zero cloud telemetry, fully GDPR/DSGVO compliant.

---

### 🎯 The Enterprise Problem & Solution

Developer pressure and human error frequently lead to leaked secrets: hardcoded AWS credentials, API tokens, passwords, or cryptographic private keys pushed into source control. Additionally, unstructured commit histories and absent peer reviews decrease code quality.

**`local-git-copilot`** embeds automated security and intelligence directly into the local Git workflow:
1. **Pre-Commit Secret Auditing:** Analyzes staged diffs for AWS keys, JWTs, private keys, and high-entropy passwords using Shannon entropy formula $H(X) = -\sum p(x) \log_2 p(x)$. Commits containing secrets are immediately rejected.
2. **Conventional Commit Synthesis:** Formulates structured Conventional Commits (`feat(...)`, `fix(...)`, etc.) using your local Ollama LLM (`llama3`, `qwen2.5-coder`, `deepseek`) or deterministic heuristics.
3. **Automated AI Code Review:** Evaluates code risk, identifies potential anti-patterns, checks test coverage, and renders an interactive DevSecOps audit checklist.
4. **Zero-Configuration Pre-Commit Hook:** Easily registers into `.git/hooks/pre-commit` to prevent secret leaks across entire teams.

---

### ✨ Key Features

- **🔒 100% Offline & Sovereign:** Operates completely inside the local machine. Zero external API calls, zero source code telemetry.
- **⚡ Dual-Engine Operation:**
  - **Local LLM Mode:** Connects to Ollama on `http://localhost:11434` (supporting `llama3`, `qwen2.5-coder`, `deepseek-r1`, `tinyllama`).
  - **Offline Heuristic Mode:** High-precision deterministic parser that infers conventional types (`feat`, `fix`, `test`, `docs`, `ci`, `build`) directly from diff semantics if Ollama is not installed.
- **🔍 Deep Secret Auditing:** Detects AWS Keys (`SEC-001`/`SEC-002`), Private Keys (`SEC-003`), JWTs (`SEC-004`), Generic API Keys (`SEC-005`), and High-Entropy Passwords (`SEC-006`).
- **📋 Automated AI Code Reviewer:** Assesses risk level (`LOW`, `MEDIUM`, `HIGH`) and validates code changes against a security checklist.

---

### 🚀 Quickstart

```bash
git clone https://github.com/Tom7668h/local-git-copilot.git
cd local-git-copilot
npm install
npm run build

# Check status
npm run dev -- status

# Run automated commit
npm run dev -- commit
```

---

### 🧪 Automated Tests
```bash
npm test
```
```text
 ✓ tests/unit/ollama-copilot.test.ts  (4 tests)
 ✓ tests/unit/secret-scanner.test.ts  (7 tests)

 Test Files  2 passed (2)
      Tests  11 passed (11)
```

---

### 📄 License
MIT © Tom7668h
