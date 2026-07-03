/**
 * RBAC admin routes (T-2.6). Every route is permission-guarded via requirePermission,
 * so the Policy Engine authorizes the caller using real persisted RBAC data.
 */
import type { FastifyInstance } from "fastify";
import type { AuditSink } from "@optimora/auth-core";
import {
  assignRole,
  createRole,
  deleteRole,
  listRoles,
  removeRole,
  RoleImmutableError,
  RoleNotFoundError,
  updateRole,
} from "./service.js";
import { requirePermission } from "./guard.js";

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

export function registerRbacRoutes(
  app: FastifyInstance,
  authSecret: string,
  sink?: AuditSink,
): void {
  app.get("/v1/roles", async (req, reply) => {
    const caller = await requirePermission(req, reply, authSecret, "role:read", sink);
    if (!caller) return reply;
    const roles = await req.runScoped!((tx) => listRoles(tx));
    return reply.send({ roles });
  });

  app.post("/v1/roles", async (req, reply) => {
    const caller = await requirePermission(req, reply, authSecret, "role:create", sink);
    if (!caller) return reply;
    const body = req.body as { key?: unknown; name?: unknown; permissions?: unknown } | undefined;
    if (typeof body?.key !== "string" || typeof body?.name !== "string") {
      return reply.code(400).send({ error: "key_and_name_required" });
    }
    const permissions =
      Array.isArray(body.permissions) && body.permissions.every((p) => typeof p === "string")
        ? (body.permissions as string[])
        : [];
    const ctx = req.tenantContext!;
    try {
      const role = await req.runScoped!((tx) =>
        createRole(tx, ctx.tenantId, ctx.orgId!, {
          key: body.key as string,
          name: body.name as string,
          permissions,
        }),
      );
      return reply.code(201).send(role);
    } catch (err) {
      if (isUniqueViolation(err)) return reply.code(409).send({ error: "role_exists" });
      throw err;
    }
  });

  app.patch("/v1/roles/:id", async (req, reply) => {
    const caller = await requirePermission(req, reply, authSecret, "role:update", sink);
    if (!caller) return reply;
    const { id } = req.params as { id: string };
    const body = req.body as { name?: unknown; permissions?: unknown } | undefined;
    const input: { name?: string; permissions?: string[] } = {};
    if (typeof body?.name === "string") input.name = body.name;
    if (Array.isArray(body?.permissions) && body!.permissions.every((p) => typeof p === "string")) {
      input.permissions = body!.permissions as string[];
    }
    const ctx = req.tenantContext!;
    try {
      const role = await req.runScoped!((tx) => updateRole(tx, ctx.tenantId, id, input));
      return reply.send(role);
    } catch (err) {
      if (err instanceof RoleNotFoundError)
        return reply.code(404).send({ error: "role_not_found" });
      if (err instanceof RoleImmutableError)
        return reply.code(409).send({ error: "system_role_immutable" });
      throw err;
    }
  });

  app.delete("/v1/roles/:id", async (req, reply) => {
    const caller = await requirePermission(req, reply, authSecret, "role:delete", sink);
    if (!caller) return reply;
    const { id } = req.params as { id: string };
    try {
      await req.runScoped!((tx) => deleteRole(tx, id));
      return reply.send({ ok: true });
    } catch (err) {
      if (err instanceof RoleNotFoundError)
        return reply.code(404).send({ error: "role_not_found" });
      if (err instanceof RoleImmutableError)
        return reply.code(409).send({ error: "system_role_immutable" });
      throw err;
    }
  });

  app.post("/v1/memberships/:membershipId/roles", async (req, reply) => {
    const caller = await requirePermission(req, reply, authSecret, "role:assign", sink);
    if (!caller) return reply;
    const { membershipId } = req.params as { membershipId: string };
    const body = req.body as { roleId?: unknown } | undefined;
    if (typeof body?.roleId !== "string") return reply.code(400).send({ error: "roleId_required" });
    const ctx = req.tenantContext!;
    const ok = await req.runScoped!((tx) =>
      assignRole(tx, ctx.tenantId, membershipId, body.roleId as string),
    );
    if (!ok) return reply.code(404).send({ error: "membership_or_role_not_found" });
    return reply.code(201).send({ ok: true });
  });

  app.delete("/v1/memberships/:membershipId/roles/:roleId", async (req, reply) => {
    const caller = await requirePermission(req, reply, authSecret, "role:assign", sink);
    if (!caller) return reply;
    const { membershipId, roleId } = req.params as { membershipId: string; roleId: string };
    const removed = await req.runScoped!((tx) => removeRole(tx, membershipId, roleId));
    if (!removed) return reply.code(404).send({ error: "assignment_not_found" });
    return reply.send({ ok: true });
  });
}
