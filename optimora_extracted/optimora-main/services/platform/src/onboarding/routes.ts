/**
 * Onboarding routes (T-23.1).
 * Thin HTTP surface over the agency service for the frontend onboarding wizard.
 * All operations are tenant-scoped via RLS (req.runScoped!).
 */
import type { FastifyInstance } from "fastify";
import {
  createAgencyProfile,
  updateAgencyProfile,
  getAgencyProfile,
  createClientWorkspace,
  listClientWorkspaces,
  AgencyProfileNotFoundError,
  AgencyProfileAlreadyExistsError,
  InvalidLocaleError,
  InvalidCurrencyError,
  InvalidClientRegionError,
  InvalidModuleError,
  MalformedAgencyConfigError,
  type SupportedLocale,
  type SupportedCurrency,
  type AllowedClientRegion,
  type AgencyModule,
} from "@optimora/agency";

export function registerOnboardingRoutes(app: FastifyInstance): void {
  // ── Agency profile ──────────────────────────────────────────────────────

  /** GET /v1/onboarding/status — check whether agency profile exists */
  app.get("/v1/onboarding/status", async (req, reply) => {
    const ctx = req.tenantContext!;
    if (!ctx.orgId) return reply.code(400).send({ error: "org_required" });
    const agencyCtx = { tenantId: ctx.tenantId, orgId: ctx.orgId, actorId: "onboarding" };
    try {
      const profile = await req.runScoped!((tx) => getAgencyProfile(tx, agencyCtx));
      const workspaces = await req.runScoped!((tx) => listClientWorkspaces(tx, agencyCtx));
      return reply.send({
        hasAgencyProfile: true,
        hasClientWorkspace: workspaces.length > 0,
        profile: {
          agencyName: profile.agencyName,
          brandName: profile.brandName,
          defaultLocale: profile.defaultLocale,
          defaultCurrency: profile.defaultCurrency,
          allowedClientRegions: profile.allowedClientRegions,
          enabledModules: profile.enabledModules,
          whiteLabelEnabled: profile.whiteLabelEnabled,
        },
      });
    } catch (err) {
      if (err instanceof AgencyProfileNotFoundError) {
        return reply.send({ hasAgencyProfile: false, hasClientWorkspace: false });
      }
      throw err;
    }
  });

  /** POST /v1/onboarding/agency-profile — create or update agency profile */
  app.post("/v1/onboarding/agency-profile", async (req, reply) => {
    const ctx = req.tenantContext!;
    if (!ctx.orgId) return reply.code(400).send({ error: "org_required" });

    const body = req.body as Record<string, unknown>;
    if (typeof body?.agencyName !== "string" || !body.agencyName.trim())
      return reply.code(400).send({ error: "agency_name_required" });
    if (typeof body?.brandName !== "string" || !body.brandName.trim())
      return reply.code(400).send({ error: "brand_name_required" });

    const agencyCtx = { tenantId: ctx.tenantId, orgId: ctx.orgId, actorId: "onboarding" };
    const input = {
      agencyName: (body.agencyName as string).trim(),
      brandName: (body.brandName as string).trim(),
      logoUrl: typeof body.logoUrl === "string" ? body.logoUrl : undefined,
      accentColor: typeof body.accentColor === "string" ? body.accentColor : undefined,
      supportEmail: typeof body.supportEmail === "string" ? body.supportEmail : undefined,
      defaultLocale: (typeof body.defaultLocale === "string" ? body.defaultLocale : "en-US") as SupportedLocale,
      defaultCurrency: (typeof body.defaultCurrency === "string" ? body.defaultCurrency : "USD") as SupportedCurrency,
      allowedClientRegions: (Array.isArray(body.allowedClientRegions) ? body.allowedClientRegions : ["GLOBAL"]) as AllowedClientRegion[],
      enabledModules: (Array.isArray(body.enabledModules) ? body.enabledModules : ["runtime", "memory"]) as AgencyModule[],
      whiteLabelEnabled: body.whiteLabelEnabled === true,
      customDomainEnabled: body.customDomainEnabled === true,
    };

    try {
      let profile;
      try {
        profile = await req.runScoped!((tx) => updateAgencyProfile(tx, agencyCtx, input));
      } catch (innerErr) {
        if (innerErr instanceof AgencyProfileNotFoundError) {
          profile = await req.runScoped!((tx) => createAgencyProfile(tx, agencyCtx, input));
        } else throw innerErr;
      }
      return reply.code(200).send({ profile });
    } catch (err) {
      if (err instanceof InvalidLocaleError) return reply.code(400).send({ error: "invalid_locale", message: (err as Error).message });
      if (err instanceof InvalidCurrencyError) return reply.code(400).send({ error: "invalid_currency", message: (err as Error).message });
      if (err instanceof InvalidClientRegionError) return reply.code(400).send({ error: "invalid_region", message: (err as Error).message });
      if (err instanceof InvalidModuleError) return reply.code(400).send({ error: "invalid_module", message: (err as Error).message });
      if (err instanceof MalformedAgencyConfigError) return reply.code(400).send({ error: "malformed_config", message: (err as Error).message });
      if (err instanceof AgencyProfileAlreadyExistsError) return reply.code(409).send({ error: "profile_exists" });
      throw err;
    }
  });

  // ── Client workspace ─────────────────────────────────────────────────────

  /** POST /v1/onboarding/client-workspace — create the first client workspace */
  app.post("/v1/onboarding/client-workspace", async (req, reply) => {
    const ctx = req.tenantContext!;
    if (!ctx.orgId) return reply.code(400).send({ error: "org_required" });

    const body = req.body as Record<string, unknown>;
    if (typeof body?.clientName !== "string" || !body.clientName.trim())
      return reply.code(400).send({ error: "client_name_required" });

    const agencyCtx = { tenantId: ctx.tenantId, orgId: ctx.orgId, actorId: "onboarding" };
    const input = {
      clientName: (body.clientName as string).trim(),
      industry: typeof body.industry === "string" ? body.industry : undefined,
      countryCode: typeof body.countryCode === "string" ? body.countryCode : "GLOBAL",
      region: typeof body.region === "string" ? body.region : undefined,
      enabledModules: (Array.isArray(body.enabledModules) ? body.enabledModules : ["runtime", "memory"]) as AgencyModule[],
      enabledAgents: Array.isArray(body.enabledAgents) ? body.enabledAgents as string[] : [],
      status: "pending" as const,
    };

    try {
      const workspace = await req.runScoped!((tx) => createClientWorkspace(tx, agencyCtx, input));
      return reply.code(201).send({ workspace });
    } catch (err) {
      if (err instanceof InvalidClientRegionError) return reply.code(400).send({ error: "invalid_region", message: (err as Error).message });
      if (err instanceof InvalidModuleError) return reply.code(400).send({ error: "invalid_module", message: (err as Error).message });
      throw err;
    }
  });
}
