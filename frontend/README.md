# Optimora AI

Enterprise AI Operating System — a white-label, multi-tenant platform where businesses build entire AI workforces (departments, managers, AI employees) that collaborate, loop, self-correct, and improve.

This repository implements the frozen architecture and Engineering Master Specification documented in the planning record. **Architecture is frozen**; changes require an Architecture Change Request (ACR). See the EMS for the authoritative spec and the implementation backlog.

## Monorepo layout

- `apps/` — `web` (tenant dashboard), `admin` (platform-owner console), `docs`, `status`
- `services/` — `cognition`, `execution`, `governance`, `platform`, `knowledge`, `marketplace`
- `packages/` — shared libraries: `org-graph`, `agent-contract`, `ai`, `events`, `db`, `auth-core`, `ui`, `sdk`, `plugin-sdk`, `extension-sdk`, `config`
- `infra/` — Terraform, Helm, k8s manifests, policy bundles (populated by T-1.3+)

## Toolchain

- Node `>=22`, package manager **pnpm** (via Corepack), build orchestration **Turborepo**
- TypeScript, ESLint (flat config), Prettier, Vitest

## Common commands

```bash
corepack pnpm install      # install all workspace dependencies
corepack pnpm build        # build every package
corepack pnpm lint         # lint every package
corepack pnpm typecheck    # typecheck every package
corepack pnpm test         # run all tests
```

## Status

Phase 0 (foundation skeleton) — in progress. See the implementation backlog (EMS.4) and execution order (EMS.5).
