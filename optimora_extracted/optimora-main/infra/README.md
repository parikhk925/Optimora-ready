# infra/

Infrastructure for Optimora.

## `docker/` — Local development stack (active)

`docker-compose.dev.yml` runs the frozen V2 data/execution-plane components
locally for development and tests:

| Service     | Port(s)     | Purpose                                    |
| ----------- | ----------- | ------------------------------------------ |
| PostgreSQL  | 5433 (host) | OLTP source of truth (+ Temporal schema)   |
| Redis       | 6380 (host) | cache / locks / rate limits / working mem  |
| Qdrant      | 6333 / 6334 | vector store (memory + knowledge)          |
| ClickHouse  | 8123 / 9000 | OLAP (run_steps, usage, audit, analytics)  |
| Temporal    | 7233        | durable workflow engine                    |
| Temporal UI | 8233        | workflow inspector (http://localhost:8233) |

### Commands (from repo root)

```bash
pnpm infra:up       # start the stack (detached)
pnpm infra:ps       # show service status/health
pnpm infra:logs     # tail logs
pnpm infra:down     # stop (keep volumes)
pnpm infra:reset    # stop and delete volumes (clean slate)
pnpm infra:config   # validate/print resolved compose config
```

Copy `.env.example` to `.env` for connection strings matching this stack.

## `terraform/` — Cloud IaC (deferred)

AWS provisioning is deferred to a dedicated future task. See `terraform/README.md`.
The frozen deployment architecture (V2 §18) is unchanged by this deferral.
