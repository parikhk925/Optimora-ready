/**
 * Optimora platform gateway (T-1.6).
 * Resolves every request to a tenant context (fail-closed) and injects it into
 * the DB session (RLS active) before any handler runs.
 */
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import { getPrisma, withTenantContext, type TxClient } from "@optimora/db";
import {
  resolveTenantContext,
  type ResolvedTenantContext,
  type TenantLookup,
} from "./tenant-resolution.js";
import { createSystemLookup } from "./lookup.js";
import type { DomainProvider } from "./domain/provider.js";
import { StubDomainProvider } from "./domain/stub-provider.js";
import {
  DomainNotFoundError,
  DomainValidationError,
  listDomains,
  requestDomain,
  verifyDomain,
} from "./domain/service.js";
import { StubEmailSender, ResendEmailSender, type EmailSender } from "./auth/providers.js";
import {
  AuthError,
  logout,
  readSession,
  refreshSession,
  requestMagicLink,
  verifyMagicLink,
  type AuthDeps,
} from "./auth/service.js";
import { REFRESH_TTL_SECONDS } from "./auth/tokens.js";
import { createApiKey, listApiKeys, revokeApiKey } from "./auth/api-key.js";
import { registerRbacRoutes } from "./rbac/routes.js";
import { registerCapabilityRoutes } from "./auth/capability-routes.js";
import { registerAdminRoutes } from "./admin/routes.js";
import { registerBillingRoutes } from "./billing/routes.js";
import { registerPublicRoutes } from "./public/routes.js";
import { registerOnboardingRoutes } from "./onboarding/routes.js";
import { registerDemoRoutes } from "./demo/routes.js";
import { LogAuditSink } from "./audit/sink.js";
import type { AuditSink } from "@optimora/auth-core";

/** Run DB work scoped to the resolved tenant (RLS active). */
type RunScoped = <T>(fn: (tx: TxClient) => PromiseLike<T>) => Promise<T>;

declare module "fastify" {
  interface FastifyRequest {
    tenantContext: ResolvedTenantContext | null;
    // Null until the onRequest hook resolves a tenant; non-null on protected routes.
    runScoped: RunScoped | null;
  }
}

/** Routes that do not require a resolved tenant. */
const PUBLIC_PATHS = new Set(["/healthz", "/readyz"]);

export interface BuildServerOptions {
  lookup?: TenantLookup;
  baseDomains?: string[];
  domainProvider?: DomainProvider;
  authSecret?: string;
  emailSender?: EmailSender;
  /** Mark auth cookies Secure (set true behind HTTPS in production). */
  secureCookies?: boolean;
  /** Sink for authorization audit events (default: structured log sink). */
  auditSink?: AuditSink;
}

const REFRESH_COOKIE = "optimora_refresh";

function singleHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const app = Fastify({ logger: false });
  const lookup = options.lookup ?? createSystemLookup();
  const baseDomains = options.baseDomains ?? process.env.BASE_DOMAINS?.split(",") ?? [];
  const domainProvider = options.domainProvider ?? new StubDomainProvider();
  const authSecret =
    options.authSecret ?? process.env.AUTH_SECRET ?? "dev-insecure-secret-change-me-please-32+";
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailSender =
    options.emailSender ??
    (resendApiKey
      ? new ResendEmailSender(resendApiKey)
      : (() => {
          if (process.env.NODE_ENV !== "test") {
            console.warn(
              "[platform] RESEND_API_KEY not set — magic-link emails will not be delivered (using StubEmailSender).",
            );
          }
          return new StubEmailSender();
        })());
  const secureCookies = options.secureCookies ?? process.env.NODE_ENV === "production";
  const auditSink = options.auditSink ?? new LogAuditSink();

  app.register(cookie);

  function authDeps(req: FastifyRequest): AuthDeps {
    // Magic-link URLs must point at the WEB APP (which owns /login and adds the
    // tenant header via its own proxy route), never at this API's own host —
    // a browser clicking the link sends no custom headers, so if the link
    // pointed here directly, tenant resolution would always fail closed.
    if (process.env.WEB_APP_URL) {
      return { secret: authSecret, sender: emailSender, baseUrl: process.env.WEB_APP_URL };
    }
    const host = singleHeader(req.headers.host) ?? "localhost";
    const proto = singleHeader(req.headers["x-forwarded-proto"]) ?? "http";
    return { secret: authSecret, sender: emailSender, baseUrl: `${proto}://${host}` };
  }

  app.decorateRequest("tenantContext", null);
  // Placeholder; replaced per request in the hook below.
  app.decorateRequest("runScoped", null);

  app.addHook("onRequest", async (req: FastifyRequest, reply) => {
    const path = req.url.split("?")[0] ?? req.url;
    if (PUBLIC_PATHS.has(path)) return;

    const ctx = await resolveTenantContext(
      {
        host: singleHeader(req.headers.host),
        headers: {
          "x-optimora-tenant": singleHeader(req.headers["x-optimora-tenant"]),
          "x-optimora-org": singleHeader(req.headers["x-optimora-org"]),
          "x-optimora-api-key": singleHeader(req.headers["x-optimora-api-key"]),
          authorization: singleHeader(req.headers.authorization),
        },
      },
      lookup,
      { baseDomains },
    );

    if (!ctx) {
      // Fail closed: no valid tenant => 401, before any handler/data access.
      await reply.code(401).send({ error: "unresolved_tenant" });
      return reply;
    }

    req.tenantContext = ctx;
    req.runScoped = (fn) =>
      withTenantContext(getPrisma(), { tenantId: ctx.tenantId, orgId: ctx.orgId }, fn);
    return undefined;
  });

  // ---- Routes ----
  app.get("/healthz", async () => ({ status: "ok" }));
  app.get("/readyz", async () => ({ status: "ready" }));

  // Returns the resolved tenant, read back through RLS (proves the context is active).
  app.get("/v1/me", async (req) => {
    const ctx = req.tenantContext!;
    const tenant = await req.runScoped!((tx) =>
      tx.tenant.findUnique({ where: { id: ctx.tenantId } }),
    );
    return { tenantId: ctx.tenantId, orgId: ctx.orgId ?? null, via: ctx.via, tenant };
  });

  // RLS-filtered: only the resolved tenant's organizations are visible.
  app.get("/v1/organizations", async (req) => {
    const orgs = await req.runScoped!((tx) => tx.organization.findMany());
    return { organizations: orgs };
  });

  // ---- Custom domains (T-1.7) ----
  app.post("/v1/domains", async (req, reply) => {
    const body = req.body as { domain?: unknown } | undefined;
    const domain = body?.domain;
    if (typeof domain !== "string" || domain.length === 0) {
      return reply.code(400).send({ error: "domain_required" });
    }
    const ctx = req.tenantContext!;
    try {
      const result = await req.runScoped!((tx) =>
        requestDomain(tx, domainProvider, ctx.tenantId, domain),
      );
      return reply.code(201).send(result);
    } catch (err) {
      if (err instanceof DomainValidationError) {
        return reply.code(400).send({ error: "invalid_domain" });
      }
      // Prisma unique-constraint violation (domain already registered).
      if (typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002") {
        return reply.code(409).send({ error: "domain_taken" });
      }
      throw err;
    }
  });

  app.get("/v1/domains", async (req) => {
    const domains = await req.runScoped!((tx) => listDomains(tx));
    return { domains };
  });

  app.post("/v1/domains/:domain/verify", async (req, reply) => {
    const { domain } = req.params as { domain: string };
    try {
      const status = await req.runScoped!((tx) => verifyDomain(tx, domainProvider, domain));
      return reply.send({ domain: domain.toLowerCase(), status });
    } catch (err) {
      if (err instanceof DomainNotFoundError) {
        return reply.code(404).send({ error: "domain_not_found" });
      }
      throw err;
    }
  });

  // ---- Auth: magic-link + JWT/refresh (T-2.1) ----
  function setRefreshCookie(reply: import("fastify").FastifyReply, token: string): void {
    reply.setCookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookies,
      path: "/",
      maxAge: REFRESH_TTL_SECONDS,
    });
  }
  function clearRefreshCookie(reply: import("fastify").FastifyReply): void {
    reply.clearCookie(REFRESH_COOKIE, { path: "/" });
  }
  function readRefresh(req: FastifyRequest): string | undefined {
    const fromCookie = req.cookies?.[REFRESH_COOKIE];
    if (fromCookie) return fromCookie;
    const body = req.body as { refreshToken?: unknown } | undefined;
    return typeof body?.refreshToken === "string" ? body.refreshToken : undefined;
  }

  app.post("/v1/auth/magic-link", async (req, reply) => {
    const body = req.body as { email?: unknown } | undefined;
    if (typeof body?.email !== "string" || body.email.length === 0) {
      return reply.code(400).send({ error: "email_required" });
    }
    const ctx = req.tenantContext!;
    const deps = authDeps(req);
    try {
      await req.runScoped!((tx) => requestMagicLink(tx, deps, ctx.tenantId, body.email as string));
    } catch (err) {
      if (err instanceof AuthError) return reply.code(400).send({ error: "invalid_email" });
      throw err;
    }
    // No account enumeration: always ok for well-formed requests.
    return reply.send({ ok: true });
  });

  app.post("/v1/auth/magic-link/verify", async (req, reply) => {
    const body = req.body as { token?: unknown } | undefined;
    if (typeof body?.token !== "string" || body.token.length === 0) {
      return reply.code(400).send({ error: "token_required" });
    }
    const ctx = req.tenantContext!;
    const deps = authDeps(req);
    try {
      const issued = await req.runScoped!((tx) =>
        verifyMagicLink(tx, deps, ctx.tenantId, body.token as string),
      );
      setRefreshCookie(reply, issued.refreshToken);
      return reply.send({ accessToken: issued.accessToken, user: issued.user });
    } catch (err) {
      if (err instanceof AuthError) return reply.code(401).send({ error: "invalid_token" });
      throw err;
    }
  });

  app.post("/v1/auth/refresh", async (req, reply) => {
    const raw = readRefresh(req);
    if (!raw) return reply.code(401).send({ error: "no_refresh_token" });
    const ctx = req.tenantContext!;
    const deps = authDeps(req);
    try {
      const issued = await req.runScoped!((tx) => refreshSession(tx, deps, ctx.tenantId, raw));
      setRefreshCookie(reply, issued.refreshToken);
      return reply.send({ accessToken: issued.accessToken, user: issued.user });
    } catch (err) {
      if (err instanceof AuthError) {
        clearRefreshCookie(reply);
        return reply.code(401).send({ error: "invalid_refresh" });
      }
      throw err;
    }
  });

  app.post("/v1/auth/logout", async (req, reply) => {
    const raw = readRefresh(req);
    if (raw) await req.runScoped!((tx) => logout(tx, raw));
    clearRefreshCookie(reply);
    return reply.send({ ok: true });
  });

  // ---- API keys (T-2.4) — org-scoped management ----
  app.post("/v1/api-keys", async (req, reply) => {
    const ctx = req.tenantContext!;
    if (!ctx.orgId) return reply.code(400).send({ error: "org_required" });
    const body = req.body as { name?: unknown; scopes?: unknown } | undefined;
    if (typeof body?.name !== "string" || body.name.length === 0) {
      return reply.code(400).send({ error: "name_required" });
    }
    const scopes =
      Array.isArray(body.scopes) && body.scopes.every((s) => typeof s === "string")
        ? (body.scopes as string[])
        : [];
    const created = await req.runScoped!((tx) =>
      createApiKey(tx, ctx.orgId!, body.name as string, scopes),
    );
    return reply.code(201).send(created);
  });

  app.get("/v1/api-keys", async (req, reply) => {
    const ctx = req.tenantContext!;
    if (!ctx.orgId) return reply.code(400).send({ error: "org_required" });
    const keys = await req.runScoped!((tx) => listApiKeys(tx));
    return reply.send({ apiKeys: keys });
  });

  app.delete("/v1/api-keys/:id", async (req, reply) => {
    const ctx = req.tenantContext!;
    if (!ctx.orgId) return reply.code(400).send({ error: "org_required" });
    const { id } = req.params as { id: string };
    const revoked = await req.runScoped!((tx) => revokeApiKey(tx, id));
    if (!revoked) return reply.code(404).send({ error: "api_key_not_found" });
    return reply.send({ ok: true });
  });

  app.get("/v1/auth/session", async (req, reply) => {
    const auth = singleHeader(req.headers.authorization);
    const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : undefined;
    if (!token) return reply.code(401).send({ error: "no_token" });
    const ctx = req.tenantContext!;
    const claims = await readSession(authSecret, ctx.tenantId, token);
    if (!claims) return reply.code(401).send({ error: "invalid_token" });
    return reply.send({
      user: { id: claims.sub, email: claims.email },
      tenantId: claims.tenantId,
    });
  });

  // ---- Admin / Control Plane API (E9 Admin API) ----
  registerAdminRoutes(app);

  // ---- Billing / Plans / Entitlement (E9 Billing) ----
  registerBillingRoutes(app);

  // ---- Public API / Client SDK (E9 Public API) ----
  registerPublicRoutes(app);

  // ---- Onboarding (T-23.1) ----
  registerOnboardingRoutes(app);

  // ---- Demo workflow / first agent run (T-24.1) ----
  registerDemoRoutes(app);

  // ---- RBAC admin (T-2.6) ----
  registerRbacRoutes(app, authSecret, auditSink);

  // ---- Capability tokens (T-2.8) ----
  registerCapabilityRoutes(app, authSecret, auditSink);

  return app;
}
