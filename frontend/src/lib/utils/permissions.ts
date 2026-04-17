import { User, OrgPermissions } from '@/lib/api/types';

export function getEffectiveOrgPermissions(user: User | null): OrgPermissions {
  if (!user || (!['COMPANY_ADMIN', 'COMPANY_MEMBER', 'COMPANY_VIEWER'].includes(user.role))) {
    return {
      canManageMembers: false,
      canInviteMembers: false,
      canManageOpportunities: false,
      canManageProjects: false,
    };
  }

  const overrides: OrgPermissions = user.orgPermissions || {};

  if (user.role === 'COMPANY_ADMIN') {
    return {
      canManageMembers: true,
      canInviteMembers: true,
      canManageOpportunities: true,
      canManageProjects: true,
      ...overrides,
      // Force admin true overrides after
      ...({} as any),
    };
  }

  if (user.role === 'COMPANY_MEMBER') {
    return {
      canManageMembers: false,
      canInviteMembers: true,
      canManageOpportunities: true,
      canManageProjects: true,
      ...overrides,
    };
  }

  if (user.role === 'COMPANY_VIEWER') {
    return {
      canManageMembers: false,
      canInviteMembers: false,
      canManageOpportunities: false,
      canManageProjects: false,
      ...overrides,
    };
  }

  return {};
}

export function hasOrgPermission(user: User | null, permission: keyof OrgPermissions): boolean {
  const perms = getEffectiveOrgPermissions(user);
  return !!perms[permission];
}
