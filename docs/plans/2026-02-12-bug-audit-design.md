# Comprehensive Bug Audit Design

**Date**: 2026-02-12
**Status**: Approved
**Goal**: Find and fix all bugs across the entire Ovo Focus codebase (~97 files, ~43K LOC)

---

## Methodology: Parallel Multi-Agent Sweep

5 specialized agents audit distinct domains simultaneously, followed by consolidation and fixes.

### Agent Assignments

| Agent | Domain | Files | Focus Areas |
|-------|--------|-------|-------------|
| State Auditor | State management & persistence | GameContext.tsx, storage.ts, reducers, types | State machine violations, data corruption, persistence race conditions, reducer logic |
| Hook Auditor | React hooks & lifecycle | useTimer, useAppState, useCalendar, useResponsive, all hooks | Memory leaks, stale closures, cleanup failures, dependency arrays, infinite loops |
| UI Auditor | Components & animations | All src/components/, egg/, session/, stats/ | Animation leaks, layout bugs, error boundaries, accessibility, prop issues |
| Service Auditor | Services, utils & data | src/services/, src/utils/, src/data/, src/i18n/ | Unhandled errors, data integrity, edge cases, i18n gaps, calculation bugs |
| Screen Auditor | App screens & integration | app/*.tsx, cross-cutting concerns | Navigation bugs, prop drilling, missing loading states, integration edge cases |

### Bug Classification

- **Critical**: Crashes, data loss, security issues
- **High**: Incorrect behavior visible to users, state corruption
- **Medium**: Edge cases, poor error handling, minor UX issues
- **Low**: Code quality, potential future issues, minor inconsistencies

### Deliverables

1. Consolidated bug report at `docs/plans/2026-02-12-bug-audit-report.md`
2. Code fixes for all bugs, committed to the branch
3. Updated project memory with new patterns/lessons

### Exclusions

- Pre-existing TypeScript errors (11 known in translations, quickActionsService, shareService, levelBonuses, storage.test)
- Styling/design preferences (not bugs)
- Performance optimization (unless clear bug like memory leak)
