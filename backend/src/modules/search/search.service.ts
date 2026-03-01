import { StartupStatus, OpportunityStatus, OrgStatus, UserStatus, UserRole } from '@prisma/client';
import { db } from '../../connectors/db.js';
import { SearchQuery } from './search.validators.js';

interface SearchResult {
    startups: Array<{
        id: string;
        name: string;
        tagline: string | null;
        logoUrl: string | null;
        type: 'startup';
    }>;
    opportunities: Array<{
        id: string;
        title: string;
        description: string | null;
        orgName: string;
        type: 'opportunity';
    }>;
    students: Array<{
        id: string;
        firstName: string;
        lastName: string;
        major: string | null;
        type: 'student';
    }>;
    orgs: Array<{
        id: string;
        name: string;
        description: string | null;
        type: 'org';
    }>;
}

/**
 * Unified search across multiple entities
 */
export async function search(
    userId: string,
    query: SearchQuery
): Promise<SearchResult> {
    const { q, type, limit } = query;
    const searchTerm = q.toLowerCase();

    const result: SearchResult = {
        startups: [],
        opportunities: [],
        students: [],
        orgs: [],
    };

    // Get user role for authorization
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { role: true, orgId: true },
    });

    if (!user) {
        return result;
    }

    // Search startups (students only see approved)
    if (type === 'all' || type === 'startups') {
        const startups = await db.startup.findMany({
            where: {
                status: StartupStatus.APPROVED,
                OR: [
                    { name: { contains: searchTerm, mode: 'insensitive' } },
                    { tagline: { contains: searchTerm, mode: 'insensitive' } },
                    { tags: { hasSome: [searchTerm] } },
                ],
            },
            take: limit,
            select: {
                id: true,
                name: true,
                tagline: true,
                logoUrl: true,
            },
        });

        result.startups = startups.map((s) => ({ ...s, type: 'startup' as const }));
    }

    // Search opportunities (published only)
    if (type === 'all' || type === 'opportunities') {
        const opportunities = await db.opportunity.findMany({
            where: {
                status: OpportunityStatus.PUBLISHED,
                org: { status: OrgStatus.ACTIVE },
                OR: [
                    { title: { contains: searchTerm, mode: 'insensitive' } },
                    { description: { contains: searchTerm, mode: 'insensitive' } },
                    { tags: { hasSome: [searchTerm] } },
                ],
            },
            take: limit,
            select: {
                id: true,
                title: true,
                description: true,
                org: { select: { name: true } },
            },
        });

        result.opportunities = opportunities.map((o) => ({
            id: o.id,
            title: o.title,
            description: o.description,
            orgName: o.org.name,
            type: 'opportunity' as const,
        }));
    }

    // Search students (company/admin only)
    if (
        (type === 'all' || type === 'students') &&
        (user.role === UserRole.COMPANY_ADMIN ||
            user.role === UserRole.COMPANY_MEMBER ||
            user.role === UserRole.UNIVERSITY_ADMIN)
    ) {
        const students = await db.studentProfile.findMany({
            where: {
                user: { status: UserStatus.ACTIVE },
                OR: [
                    { firstName: { contains: searchTerm, mode: 'insensitive' } },
                    { lastName: { contains: searchTerm, mode: 'insensitive' } },
                    { major: { contains: searchTerm, mode: 'insensitive' } },
                    { skills: { hasSome: [searchTerm] } },
                ],
            },
            take: limit,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                major: true,
            },
        });

        result.students = students.map((s) => ({ ...s, type: 'student' as const }));
    }

    // Search orgs (all authenticated users)
    if (type === 'all' || type === 'orgs') {
        const orgs = await db.org.findMany({
            where: {
                status: OrgStatus.ACTIVE,
                verificationStatus: 'APPROVED',
                OR: [
                    { name: { contains: searchTerm, mode: 'insensitive' } },
                    { description: { contains: searchTerm, mode: 'insensitive' } },
                ],
            },
            take: limit,
            select: {
                id: true,
                name: true,
                description: true,
            },
        });

        result.orgs = orgs.map((o) => ({ ...o, type: 'org' as const }));
    }

    return result;
}
