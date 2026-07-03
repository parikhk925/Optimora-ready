/**
 * RBAC persistence + role assignment (T-2.6).
 *
 * Roles/permissions/assignments are stored as data and feed the existing
 * authorize() flow via buildUserPrincipal (effective permission set). All DB
 * work runs on a tenant-scoped TxClient, so RLS enforces tenant isolation and
 * role assignment is inherently tenant/org scoped.
 */
import type { TxClient } from "@optimora/db";
import type { UserPrincipal } from "@optimora/auth-core";

export class RoleNotFoundError extends Error {}
export class RoleImmutableError extends Error {}

/** Read-only permissions for the built-in org_member role. */
const MEMBER_PERMISSIONS = ["organization:read", "api_key:read", "domain:read", "role:read"];

export interface RoleView {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
  orgId: string | null;
  permissions: string[];
}

async function permissionIdsByKey(
  tx: TxClient,
  keys: string[],
): Promise<{ id: string; key: string }[]> {
  if (keys.length === 0) return [];
  return tx.permission.findMany({ where: { key: { in: keys } }, select: { id: true, key: true } });
}

async function loadRole(tx: TxClient, roleId: string): Promise<RoleView | null> {
  const role = await tx.role.findUnique({
    where: { id: roleId },
    select: {
      id: true,
      key: true,
      name: true,
      isSystem: true,
      orgId: true,
      rolePermissions: { select: { permission: { select: { key: true } } } },
    },
  });
  if (!role) return null;
  return {
    id: role.id,
    key: role.key,
    name: role.name,
    isSystem: role.isSystem,
    orgId: role.orgId,
    permissions: role.rolePermissions.map((rp) => rp.permission.key),
  };
}

export async function listRoles(tx: TxClient): Promise<RoleView[]> {
  const roles = await tx.role.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      key: true,
      name: true,
      isSystem: true,
      orgId: true,
      rolePermissions: { select: { permission: { select: { key: true } } } },
    },
  });
  return roles.map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    isSystem: r.isSystem,
    orgId: r.orgId,
    permissions: r.rolePermissions.map((rp) => rp.permission.key),
  }));
}

export interface CreateRoleInput {
  key: string;
  name: string;
  permissions: string[];
}

export async function createRole(
  tx: TxClient,
  tenantId: string,
  orgId: string,
  input: CreateRoleInput,
  isSystem = false,
): Promise<RoleView> {
  const perms = await permissionIdsByKey(tx, input.permissions);
  const role = await tx.role.create({
    data: { tenantId, orgId, key: input.key, name: input.name, isSystem },
    select: { id: true, key: true, name: true, isSystem: true, orgId: true },
  });
  if (perms.length > 0) {
    await tx.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: role.id, permissionId: p.id, tenantId })),
    });
  }
  return { ...role, permissions: perms.map((p) => p.key) };
}

export interface UpdateRoleInput {
  name?: string;
  permissions?: string[];
}

export async function updateRole(
  tx: TxClient,
  tenantId: string,
  roleId: string,
  input: UpdateRoleInput,
): Promise<RoleView> {
  const existing = await loadRole(tx, roleId);
  if (!existing) throw new RoleNotFoundError(roleId);
  if (existing.isSystem) throw new RoleImmutableError(roleId);

  if (input.name !== undefined) {
    await tx.role.update({ where: { id: roleId }, data: { name: input.name } });
  }
  if (input.permissions !== undefined) {
    const perms = await permissionIdsByKey(tx, input.permissions);
    await tx.rolePermission.deleteMany({ where: { roleId } });
    if (perms.length > 0) {
      await tx.rolePermission.createMany({
        data: perms.map((p) => ({ roleId, permissionId: p.id, tenantId })),
      });
    }
  }
  const updated = await loadRole(tx, roleId);
  return updated!;
}

export async function deleteRole(tx: TxClient, roleId: string): Promise<void> {
  const existing = await loadRole(tx, roleId);
  if (!existing) throw new RoleNotFoundError(roleId);
  if (existing.isSystem) throw new RoleImmutableError(roleId);
  await tx.role.delete({ where: { id: roleId } });
}

/** Assign a role to a membership. Returns false if either side is not visible. */
export async function assignRole(
  tx: TxClient,
  tenantId: string,
  membershipId: string,
  roleId: string,
): Promise<boolean> {
  const [membership, role] = await Promise.all([
    tx.membership.findUnique({ where: { id: membershipId }, select: { id: true } }),
    tx.role.findUnique({ where: { id: roleId }, select: { id: true } }),
  ]);
  if (!membership || !role) return false;
  await tx.membershipRole.upsert({
    where: { membershipId_roleId: { membershipId, roleId } },
    create: { membershipId, roleId, tenantId },
    update: {},
  });
  return true;
}

export async function removeRole(
  tx: TxClient,
  membershipId: string,
  roleId: string,
): Promise<boolean> {
  const res = await tx.membershipRole.deleteMany({ where: { membershipId, roleId } });
  return res.count > 0;
}

/** Create the built-in org_admin / org_member roles for an org (idempotent). */
export async function seedSystemRoles(
  tx: TxClient,
  tenantId: string,
  orgId: string,
): Promise<{ adminRoleId: string; memberRoleId: string }> {
  const allPerms = await tx.permission.findMany({ select: { key: true } });
  const admin = await ensureSystemRole(
    tx,
    tenantId,
    orgId,
    "org_admin",
    "Organization Admin",
    allPerms.map((p) => p.key),
  );
  const member = await ensureSystemRole(
    tx,
    tenantId,
    orgId,
    "org_member",
    "Organization Member",
    MEMBER_PERMISSIONS,
  );
  return { adminRoleId: admin.id, memberRoleId: member.id };
}

async function ensureSystemRole(
  tx: TxClient,
  tenantId: string,
  orgId: string,
  key: string,
  name: string,
  permissions: string[],
): Promise<RoleView> {
  const existing = await tx.role.findFirst({
    where: { tenantId, orgId, key },
    select: { id: true },
  });
  if (existing) {
    const view = await loadRole(tx, existing.id);
    return view!;
  }
  return createRole(tx, tenantId, orgId, { key, name, permissions }, true);
}

/**
 * Build the authorize() principal for a user in an org from persisted RBAC data:
 * role keys + the union of their permissions. Empty when the user has no
 * membership/roles (so authorize() fails closed for them).
 */
export async function buildUserPrincipal(
  tx: TxClient,
  userId: string,
  orgId: string,
  tenantId: string,
): Promise<UserPrincipal> {
  const membership = await tx.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
    select: {
      memberRoles: {
        select: {
          role: {
            select: {
              key: true,
              rolePermissions: { select: { permission: { select: { key: true } } } },
            },
          },
        },
      },
    },
  });

  const roles: string[] = [];
  const permissions = new Set<string>();
  for (const mr of membership?.memberRoles ?? []) {
    roles.push(mr.role.key);
    for (const rp of mr.role.rolePermissions) permissions.add(rp.permission.key);
  }

  return { type: "user", id: userId, tenantId, orgId, roles, permissions: [...permissions] };
}
