import { OpportunityStatus, OrgStatus } from '@prisma/client';
import { db } from '../../connectors/db.js';
import * as opportunitiesRepo from './opportunities.repo.js';
import { AppError, NotFoundError, ForbiddenError } from '../../middlewares/errorHandler.js';
import { ErrorCode } from '../../utils/response.js';
import { publish } from '../../events/publish.js';
import { buildOpportunityPublishedEvent } from '../../events/builders.js';
import { CreateOpportunityInput, UpdateOpportunityInput, ListOpportunitiesQuery } from './opportunities.validators.js';

/**
 * Create opportunity (company admin only)
 */
export async function createOpportunity(orgId: string, data: CreateOpportunityInput) {
    const org = await db.org.findUnique({ where: { id: orgId } });

    if (!org) {
        throw new NotFoundError('Organization');
    }

    if (org.status !== OrgStatus.ACTIVE || org.verificationStatus !== 'APPROVED') {
        throw new AppError(ErrorCode.ORG_SUSPENDED, 'Organization is not active', 403);
    }

    return opportunitiesRepo.createOpportunity({
        orgId,
        title: data.title,
        description: data.description,
        requirements: data.requirements,
        budgetType: data.budgetType,
        budgetRange: data.budgetRange,
        tags: data.tags,
    });
}

/**
 * Get opportunity by ID
 */
export async function getOpportunityById(id: string, _userId?: string, orgId?: string) {
    const opportunity = await opportunitiesRepo.findById(id);

    if (!opportunity) {
        throw new NotFoundError('Opportunity');
    }

    // If published and org is active, anyone can view
    if (
        opportunity.status === OpportunityStatus.PUBLISHED &&
        opportunity.org.status === OrgStatus.ACTIVE &&
        opportunity.org.verificationStatus === 'APPROVED'
    ) {
        return opportunity;
    }

    // Otherwise, only org members can view
    if (orgId && opportunity.orgId === orgId) {
        return opportunity;
    }

    throw new NotFoundError('Opportunity');
}

/**
 * Update opportunity (company admin only)
 */
export async function updateOpportunity(
    opportunityId: string,
    orgId: string,
    data: UpdateOpportunityInput
) {
    const opportunity = await opportunitiesRepo.findById(opportunityId);

    if (!opportunity) {
        throw new NotFoundError('Opportunity');
    }

    if (opportunity.orgId !== orgId) {
        throw new ForbiddenError('Access denied');
    }

    if (opportunity.status === OpportunityStatus.CLOSED) {
        throw new AppError(ErrorCode.CONFLICT, 'Cannot edit closed opportunities', 400);
    }

    return opportunitiesRepo.updateOpportunity(opportunityId, data);
}

/**
 * Publish opportunity
 */
export async function publishOpportunity(opportunityId: string, orgId: string) {
    const opportunity = await opportunitiesRepo.findById(opportunityId);

    if (!opportunity) {
        throw new NotFoundError('Opportunity');
    }

    if (opportunity.orgId !== orgId) {
        throw new ForbiddenError('Access denied');
    }

    if (opportunity.status !== OpportunityStatus.DRAFT) {
        throw new AppError(ErrorCode.CONFLICT, 'Only draft opportunities can be published', 400);
    }

    // Validate required fields
    if (!opportunity.title || !opportunity.description) {
        throw new AppError(
            ErrorCode.VALIDATION_ERROR,
            'Title and description are required before publishing',
            400
        );
    }

    const updated = await opportunitiesRepo.updateOpportunity(opportunityId, {
        status: OpportunityStatus.PUBLISHED,
        publishedAt: new Date(),
    });

    // Publish event
    const event = buildOpportunityPublishedEvent(
        opportunityId,
        opportunity.title,
        opportunity.orgId,
        opportunity.org.name
    );
    await publish(event.type, event.payload);

    return updated;
}

/**
 * Close opportunity
 */
export async function closeOpportunity(opportunityId: string, orgId: string) {
    const opportunity = await opportunitiesRepo.findById(opportunityId);

    if (!opportunity) {
        throw new NotFoundError('Opportunity');
    }

    if (opportunity.orgId !== orgId) {
        throw new ForbiddenError('Access denied');
    }

    if (opportunity.status !== OpportunityStatus.PUBLISHED) {
        throw new AppError(ErrorCode.CONFLICT, 'Only published opportunities can be closed', 400);
    }

    return opportunitiesRepo.updateOpportunity(opportunityId, {
        status: OpportunityStatus.CLOSED,
        closedAt: new Date(),
    });
}

/**
 * List opportunities for students
 */
export async function listOpportunities(query: ListOpportunitiesQuery) {
    return opportunitiesRepo.listPublishedOpportunities(query.cursor, query.limit, {
        budgetType: query.budgetType,
        tags: query.tags,
        search: query.search,
    });
}

/**
 * List org's opportunities
 */
export async function listOrgOpportunities(
    orgId: string,
    query: ListOpportunitiesQuery
) {
    return opportunitiesRepo.listByOrgId(
        orgId,
        query.cursor,
        query.limit,
        query.status as OpportunityStatus | undefined
    );
}
