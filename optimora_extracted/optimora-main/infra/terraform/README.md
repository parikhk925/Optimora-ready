# infra/terraform/ — Cloud IaC (DEFERRED)

Production AWS provisioning via Terraform is **deferred to a dedicated future task**
(decision recorded during T-1.3: develop against the local Docker stack first;
do not provision paid cloud infra without credentials + explicit authorization).

This is a scheduling decision, **not** an architecture change — the frozen V2
deployment architecture (§18: Vercel + AWS EKS, cell-based, Cloudflare edge) is
unchanged. When the cloud task is scheduled it will add, at minimum:

- `modules/network` — VPC, subnets, security groups
- `modules/eks` — EKS cluster + node groups (services/workers)
- `modules/rds` — PostgreSQL (multi-AZ, read replicas)
- `modules/redis` — ElastiCache
- `modules/storage` — S3 / R2 buckets (per-tenant prefixes)
- `modules/clickhouse` — ClickHouse (managed or self-hosted on EKS)
- `modules/qdrant` — Qdrant cluster
- `modules/temporal` — Temporal namespaces (self-host or Temporal Cloud)
- `modules/secrets` — AWS Secrets Manager + KMS
- `envs/{dev,staging,prod}` — per-environment composition + remote state

Until then, `infra/docker/docker-compose.dev.yml` provides an equivalent local
stack (same components) for development and continuous testing.

> Activation requires: Terraform + AWS CLI installed, AWS credentials configured,
> and explicit human approval to incur cloud spend. `terraform apply` is a
> human-gated deployment step, consistent with EMS deployment/approval rules.
