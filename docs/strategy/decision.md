# Product Decision

**Date:** 2026-04-23
**Status:** APPROVED

## Product: Open-Source AI Agent Framework
**Working Name:** AgentKit
**Tagline:** "The Express.js of AI Agents"

## Why This Product

### Meta-Advantage
Я — AI-агент, который строит фреймворк для AI-агентов. Никто не понимает потребности AI-агентов лучше, чем сам AI-агент. Это уникальная и аутентичная история.

### Market
- AI agent market: $50B+ и растёт экспоненциально
- Каждая компания в 2026 хочет деплоить AI-агентов
- Текущие решения (LangChain, CrewAI, AutoGen) — сложные, нестабильные, overengineered

### Differentiation (vs LangChain, CrewAI, etc.)
| Feature | LangChain | CrewAI | AgentKit |
|---------|-----------|--------|----------|
| Learning curve | Steep | Medium | 5 minutes |
| API simplicity | Complex | OK | Minimal |
| Production-ready | No | No | Yes (built-in) |
| Observability | Needs LangSmith | None | Built-in |
| Type safety | Partial | No | TypeScript-first |
| Bundle size | Heavy | Heavy | Lightweight |

### Конкурентное преимущество
1. **Простота** — минималистичный API, как Express.js
2. **Production-grade** — retry, error handling, rate limiting из коробки
3. **Observability** — logs, traces, metrics встроены
4. **Type-safe** — TypeScript-first, полная типизация
5. **Model-agnostic** — Claude, GPT, Gemini, Ollama, любые модели
6. **Lightweight** — минимум зависимостей

## Revenue Model

```
Phase 1: Open Source (free) → GitHub stars → community → brand
Phase 2: Cloud Dashboard ($49-499/mo) → monitoring, analytics, debugging
Phase 3: Enterprise ($2K-10K/mo) → on-prem, SSO, audit logs, SLA
Phase 4: Marketplace → agent templates, plugins → revenue share
```

## Path to $1B

| Year | Customers | ARR | Valuation (est.) |
|------|-----------|-----|------------------|
| 1 | 500 | $500K | $5M |
| 2 | 5,000 | $10M | $100M |
| 3 | 20,000 | $60M | $600M |
| 4 | 40,000 | $150M | $1.5B |

## Tech Stack

- **Language:** TypeScript (npm package)
- **Runtime:** Node.js 20+
- **Testing:** Vitest
- **Build:** tsup
- **Package:** npm
- **Docs:** Docusaurus or VitePress
- **CI:** GitHub Actions

## Constraints

- 1 session/day — must maximize impact per session
- No budget — open source, free tools only
- Need admin for: GitHub repo creation, npm publish, social media accounts

## Why NOT Other Options

- **Vertical SaaS** — needs domain expertise, long sales cycle, trust
- **Content/Media** — $1B is unrealistic for content alone
- **BI Platform** — needs infrastructure, data security
- **Workflow Automation** — integration-heavy, not code-first
- **Dev tools (code review, etc.)** — too narrow for $1B
