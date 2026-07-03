# CLAUDE.md — Low-Token Execution Rules

## Core rule
Operate in strict low-token execution mode. Be concise, scoped, and implementation-focused.

## Token discipline
1. Do not re-read the whole repo unless explicitly required.
2. Do not summarize all previous phases unless asked.
3. Do not scan unrelated packages.
4. Do not paste long architecture explanations.
5. Do not repeat completed task history.
6. Do not output large file contents unless asked.
7. Keep responses short: plan, files changed, tests run, result.
8. Prefer existing exports/types instead of reopening implementation files unless necessary.
9. Read only files directly required for the current task.
10. Use targeted search/read commands instead of broad repo scans.

## Execution discipline
1. Work one task at a time.
2. Before implementing a new task, provide a compact plan.
3. The plan must include:
   - exact files/packages likely to be touched
   - tests to add or run
   - scope
   - non-goals
4. Wait for approval if the task scope is unclear.
5. Do not redesign architecture.
6. Do not introduce new infrastructure unless the EMS explicitly requires it.
7. No ACR unless the frozen architecture cannot support the task.
8. Preserve green gates.

## Testing discipline
1. Run targeted tests first.
2. Run full repo gates only before commit.
3. After small edits, do not run every test suite.
4. Before commit, run the required affected suites and full gates.
5. Report only:
   - tests run
   - pass/fail result
   - fixes made if any

## Optimora / WorkforceOS architecture rules
1. Preserve tenant isolation.
2. Preserve RLS and fail-closed behavior.
3. Preserve audit/outbox event patterns.
4. Preserve the existing Task Engine.
5. Preserve the Agent ABI.
6. Preserve the Org Graph.
7. Preserve the Policy Engine.
8. Preserve the Cognition Plane.
9. Do not call paid AI models unless the EMS task explicitly requires it.
10. Use provider abstractions and deterministic stubs where external services are not required yet.
11. Do not build UI unless the EMS task requires UI.
12. Do not mutate live agent definitions automatically.
13. Keep changes versioned, auditable, and testable.

## Response format
For each task, respond in this compact format:

### Plan
- Scope:
- Files/packages:
- Tests:
- Non-goals:

### Result
- Changed:
- Tests:
- Commit:
- Notes:

Avoid long summaries unless explicitly requested.
