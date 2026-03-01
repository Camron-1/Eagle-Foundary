import { OrgStatus, ProjectStatus } from '@prisma/client';
import { db } from '../../connectors/db.js';
import * as projectsRepo from './projects.repo.js';
import { AppError, ForbiddenError, NotFoundError } from '../../middlewares/errorHandler.js';
import { ErrorCode } from '../../utils/response.js';
import { publish } from '../../events/publish.js';
import { buildProjectPublishedEvent, buildProjectClosedEvent } from '../../events/builders.js';
import { CreateProjectInput, ListProjectsQuery, UpdateProjectInput } from './projects.validators.js';

function normalizeDeadline(value?: string | null): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value.trim() === '') return null;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid deadline', 400);
    }
    return parsed;
}

export async function createProject(orgId: string, data: CreateProjectInput) {
    const org = await db.org.findUnique({ where: { id: orgId } });

    if (!org) {
        throw new NotFoundError('Organization');
    }

    if (org.status !== OrgStatus.ACTIVE || org.verificationStatus !== 'APPROVED') {
        throw new AppError(ErrorCode.ORG_SUSPENDED, 'Organization is not active', 403);
    }

    return projectsRepo.createProject({
        orgId,
        title: data.title,
        description: data.description,
        requirements: data.requirements,
        budgetType: data.budgetType,
        budgetRange: data.budgetRange,
        estimatedDuration: data.estimatedDuration,
        deadline: normalizeDeadline(data.deadline),
        tags: data.tags,
        customQuestions: data.customQuestions ?? undefined,
    });
}

export async function getProjectById(id: string, orgId?: string) {
    const project = await projectsRepo.findById(id);

    if (!project) {
        throw new NotFoundError('Project');
    }

    if (
        project.status === ProjectStatus.PUBLISHED &&
        project.org.status === OrgStatus.ACTIVE &&
        project.org.verificationStatus === 'APPROVED'
    ) {
        return project;
    }

    if (orgId && project.orgId === orgId) {
        return project;
    }

    throw new NotFoundError('Project');
}

export async function updateProject(projectId: string, orgId: string, data: UpdateProjectInput) {
    const project = await projectsRepo.findById(projectId);

    if (!project) {
        throw new NotFoundError('Project');
    }

    if (project.orgId !== orgId) {
        throw new ForbiddenError('Access denied');
    }

    if (project.status === ProjectStatus.CLOSED) {
        throw new AppError(ErrorCode.CONFLICT, 'Cannot edit closed projects', 400);
    }

    if (project.org.status !== OrgStatus.ACTIVE || project.org.verificationStatus !== 'APPROVED') {
        throw new AppError(ErrorCode.ORG_SUSPENDED, 'Organization is not active', 403);
    }

    return projectsRepo.updateProject(projectId, {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.requirements !== undefined ? { requirements: data.requirements } : {}),
        ...(data.budgetType !== undefined ? { budgetType: data.budgetType } : {}),
        ...(data.budgetRange !== undefined ? { budgetRange: data.budgetRange } : {}),
        ...(data.estimatedDuration !== undefined ? { estimatedDuration: data.estimatedDuration } : {}),
        ...(data.deadline !== undefined ? { deadline: normalizeDeadline(data.deadline) } : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
        ...(data.customQuestions !== undefined ? { customQuestions: data.customQuestions } : {}),
    });
}

export async function publishProject(projectId: string, orgId: string) {
    const project = await projectsRepo.findById(projectId);

    if (!project) {
        throw new NotFoundError('Project');
    }

    if (project.orgId !== orgId) {
        throw new ForbiddenError('Access denied');
    }

    if (project.status !== ProjectStatus.DRAFT) {
        throw new AppError(ErrorCode.CONFLICT, 'Only draft projects can be published', 400);
    }

    if (project.org.status !== OrgStatus.ACTIVE || project.org.verificationStatus !== 'APPROVED') {
        throw new AppError(ErrorCode.ORG_SUSPENDED, 'Organization is not active', 403);
    }

    if (!project.title || !project.description) {
        throw new AppError(
            ErrorCode.VALIDATION_ERROR,
            'Title and description are required before publishing',
            400
        );
    }

    const updated = await projectsRepo.updateProject(projectId, {
        status: ProjectStatus.PUBLISHED,
        publishedAt: new Date(),
    });

    const event = buildProjectPublishedEvent(projectId, project.title, project.orgId, project.org.name);
    await publish(event.type, event.payload);

    return updated;
}

export async function closeProject(projectId: string, orgId: string) {
    const project = await projectsRepo.findById(projectId);

    if (!project) {
        throw new NotFoundError('Project');
    }

    if (project.orgId !== orgId) {
        throw new ForbiddenError('Access denied');
    }

    if (project.status !== ProjectStatus.PUBLISHED) {
        throw new AppError(ErrorCode.CONFLICT, 'Only published projects can be closed', 400);
    }

    if (project.org.status !== OrgStatus.ACTIVE || project.org.verificationStatus !== 'APPROVED') {
        throw new AppError(ErrorCode.ORG_SUSPENDED, 'Organization is not active', 403);
    }

    const updated = await projectsRepo.updateProject(projectId, {
        status: ProjectStatus.CLOSED,
        closedAt: new Date(),
    });

    const event = buildProjectClosedEvent(projectId, project.title, project.orgId, project.org.name);
    await publish(event.type, event.payload);

    return updated;
}

export async function listProjects(query: ListProjectsQuery) {
    return projectsRepo.listPublishedProjects(query.cursor, query.limit, {
        budgetType: query.budgetType,
        tags: query.tags,
        search: query.search,
    });
}

export async function listOrgProjects(orgId: string, query: ListProjectsQuery) {
    return projectsRepo.listByOrgId(orgId, query.cursor, query.limit, query.status as ProjectStatus | undefined);
}
