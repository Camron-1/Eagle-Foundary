import { User } from '@prisma/client';
import { OrgPermissions, UserRole } from '../config/constants.js';

export function parseOrgPermissions(jsonStr: unknown): OrgPermissions {
    if (!jsonStr || typeof jsonStr !== 'object') {
        return {};
    }
    return jsonStr as OrgPermissions;
}

export function getEffectiveOrgPermissions(user: User): OrgPermissions {
    const overrides = parseOrgPermissions(user.orgPermissions);

    // Admin locked defaults
    if (user.role === UserRole.COMPANY_ADMIN) {
        return {
            ...overrides,
            // Always lock to true
            canManageMembers: true,
            canInviteMembers: true,
            canManageOpportunities: true,
            canManageProjects: true,
        };
    }

    if (user.role === UserRole.COMPANY_MEMBER) {
        return {
            canManageMembers: false,
            canInviteMembers: true,
            canManageOpportunities: true,
            canManageProjects: true,
            ...overrides,
        };
    }

    if (user.role === UserRole.COMPANY_VIEWER) {
        return {
            canManageMembers: false,
            canInviteMembers: false,
            canManageOpportunities: false,
            canManageProjects: false,
            ...overrides,
        };
    }

    return {
        canManageMembers: false,
        canInviteMembers: false,
        canManageOpportunities: false,
        canManageProjects: false,
        ...overrides,
    };
}
