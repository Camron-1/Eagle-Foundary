import { ApplicationStatus, OrgStatus, ProjectStatus } from '@prisma/client';
import { db } from '../../connectors/db.js';
import * as projectSubmissionsRepo from './projectSubmissions.repo.js';
import * as projectsRepo from '../projects/projects.repo.js';
import { AppError, ForbiddenError, NotFoundError } from '../../middlewares/errorHandler.js';
import { ErrorCode } from '../../utils/response.js';
import { publish } from '../../events/publish.js';
import {
    buildProjectSubmissionStatusChangedEvent,
    buildProjectSubmissionSubmittedEvent,
} from '../../events/builders.js';
import {
    CreateProjectSubmissionInput,
    ListProjectSubmissionsQuery,
    UpdateProjectSubmissionStatusInput,
} from './projectSubmissions.validators.js';
import { decryptJsonValue, encryptJsonValue, type EncryptedEnvelope } from '../../utils/fieldEncryption.js';
import { logger } from '../../connectors/logger.js';

const SENSITIVE_FORM_ANSWER_KEYS = new Set([
    'address',
    'phone',
    'dob',
    'dateOfBirth',
    'ssn',
    'governmentId',
    'taxId',
    'passportNumber',
    'licenseNumber',
]);

function splitSensitiveAnswers(
    value: Record<string, unknown> | undefined
): { publicAnswers?: Record<string, unknown>; sensitiveAnswers?: Record<string, unknown> } {
    if (!value) {
        return {};
    }

    const publicAnswers: Record<string, unknown> = {};
    const sensitiveAnswers: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
        if (SENSITIVE_FORM_ANSWER_KEYS.has(key)) {
            sensitiveAnswers[key] = item;
        } else {
            publicAnswers[key] = item;
        }
    }

    return {
        publicAnswers: Object.keys(publicAnswers).length > 0 ? publicAnswers : undefined,
        sensitiveAnswers: Object.keys(sensitiveAnswers).length > 0 ? sensitiveAnswers : undefined,
    };
}

export async function createProjectSubmission(
    userId: string,
    projectId: string,
    data: CreateProjectSubmissionInput
) {
    const profile = await db.studentProfile.findUnique({
        where: { userId },
        include: { user: { select: { email: true } } },
    });

    if (!profile) {
        throw new NotFoundError('Student profile');
    }

    const project = await projectsRepo.findById(projectId);

    if (!project) {
        throw new NotFoundError('Project');
    }

    if (project.status !== ProjectStatus.PUBLISHED) {
        throw new AppError(ErrorCode.CONFLICT, 'Project is not accepting submissions', 400);
    }

    if (project.org.status !== OrgStatus.ACTIVE || project.org.verificationStatus !== 'APPROVED') {
        throw new AppError(ErrorCode.CONFLICT, 'Organization is not active', 400);
    }

    const existing = await projectSubmissionsRepo.findExistingProjectSubmission(projectId, profile.id);
    if (existing) {
        throw new AppError(ErrorCode.CONFLICT, 'You have already submitted for this project', 409);
    }

    let coverLetter = data.coverLetter;
    let resumeUrl = data.resumeUrl;
    let sanitizedFormAnswers: Record<string, unknown> | undefined;
    let sensitivePayloadEncrypted: Record<string, unknown> | undefined;

    if (data.formAnswers && typeof data.formAnswers === 'object') {
        const { coverLetter: faCover, resumeUrl: faResume, ...rest } = data.formAnswers;
        if (!coverLetter && faCover) coverLetter = faCover;
        if (!resumeUrl && faResume) resumeUrl = faResume;

        const split = splitSensitiveAnswers(rest);
        sanitizedFormAnswers = split.publicAnswers;

        if (split.sensitiveAnswers) {
            sensitivePayloadEncrypted = (await encryptJsonValue(
                split.sensitiveAnswers,
                'project_submission_form_answers',
                `${projectId}:${profile.id}`
            )) as unknown as Record<string, unknown>;
        }
    }

    const submission = await projectSubmissionsRepo.createProjectSubmission({
        projectId,
        profileId: profile.id,
        coverLetter,
        resumeUrl,
        formAnswers: sanitizedFormAnswers,
        sensitivePayloadEncrypted,
    });

    const event = buildProjectSubmissionSubmittedEvent(
        submission.id,
        projectId,
        project.title,
        profile.userId,
        profile.user.email,
        `${profile.firstName} ${profile.lastName}`,
        ''
    );
    await publish(event.type, event.payload);

    return submission;
}

export async function getMyProjectSubmissions(userId: string, query: ListProjectSubmissionsQuery) {
    const profile = await db.studentProfile.findUnique({
        where: { userId },
        select: { id: true },
    });

    if (!profile) {
        throw new NotFoundError('Student profile');
    }

    return projectSubmissionsRepo.listByProfileId(
        profile.id,
        query.cursor,
        query.limit,
        query.status as ApplicationStatus | undefined
    );
}

export async function withdrawProjectSubmission(userId: string, projectSubmissionId: string) {
    const profile = await db.studentProfile.findUnique({
        where: { userId },
        select: { id: true },
    });

    if (!profile) {
        throw new NotFoundError('Student profile');
    }

    const submission = await projectSubmissionsRepo.findById(projectSubmissionId);

    if (!submission) {
        throw new NotFoundError('Project submission');
    }

    if (submission.profileId !== profile.id) {
        throw new ForbiddenError('Not your project submission');
    }

    if (submission.status === ApplicationStatus.WITHDRAWN) {
        throw new AppError(ErrorCode.CONFLICT, 'Project submission already withdrawn', 400);
    }

    return db.$transaction(async (tx) => {
        await projectSubmissionsRepo.addStatusHistory(
            {
                projectSubmissionId,
                fromStatus: submission.status,
                toStatus: ApplicationStatus.WITHDRAWN,
                changedBy: userId,
            },
            tx
        );

        return projectSubmissionsRepo.updateProjectSubmission(
            projectSubmissionId,
            { status: ApplicationStatus.WITHDRAWN },
            tx
        );
    });
}

export async function getProjectSubmissions(
    orgId: string,
    projectId: string,
    query: ListProjectSubmissionsQuery
) {
    const project = await projectsRepo.findById(projectId);

    if (!project) {
        throw new NotFoundError('Project');
    }

    if (project.orgId !== orgId) {
        throw new ForbiddenError('Access denied');
    }

    return projectSubmissionsRepo.listByProjectId(
        projectId,
        query.cursor,
        query.limit,
        query.status as ApplicationStatus | undefined
    );
}

export async function getProjectSubmissionById(orgId: string, projectSubmissionId: string) {
    const submission = await projectSubmissionsRepo.findById(projectSubmissionId);

    if (!submission) {
        throw new NotFoundError('Project submission');
    }

    if (submission.project.orgId !== orgId) {
        throw new ForbiddenError('Access denied');
    }

    if (submission.sensitivePayloadEncrypted && typeof submission.sensitivePayloadEncrypted === 'object') {
        try {
            const sensitiveAnswers = await decryptJsonValue<Record<string, unknown>>(
                submission.sensitivePayloadEncrypted as unknown as EncryptedEnvelope,
                'project_submission_form_answers',
                `${submission.projectId}:${submission.profileId}`
            );

            const mergedFormAnswers = {
                ...(typeof submission.formAnswers === 'object' && submission.formAnswers
                    ? (submission.formAnswers as Record<string, unknown>)
                    : {}),
                ...sensitiveAnswers,
            };

            return {
                ...submission,
                formAnswers: mergedFormAnswers,
            };
        } catch (err) {
            logger.warn(
                { err, submissionId: submission.id, projectId: submission.projectId, profileId: submission.profileId },
                'Failed to decrypt sensitive form answers'
            );
        }
    }

    return submission;
}

export async function updateProjectSubmissionStatus(
    userId: string,
    orgId: string,
    projectSubmissionId: string,
    data: UpdateProjectSubmissionStatusInput
) {
    const submission = await projectSubmissionsRepo.findById(projectSubmissionId);

    if (!submission) {
        throw new NotFoundError('Project submission');
    }

    if (submission.project.orgId !== orgId) {
        throw new ForbiddenError('Access denied');
    }

    if (submission.status === ApplicationStatus.WITHDRAWN) {
        throw new AppError(ErrorCode.CONFLICT, 'Cannot update withdrawn project submissions', 400);
    }

    const newStatus = data.status as ApplicationStatus;

    const { updated } = await db.$transaction(async (tx) => {
        let txThreadId = submission.threadId;
        if (!txThreadId && (newStatus === ApplicationStatus.SHORTLISTED || newStatus === ApplicationStatus.SELECTED)) {
            const thread = await tx.messageThread.create({ data: {} });
            txThreadId = thread.id;
        }

        await projectSubmissionsRepo.addStatusHistory(
            {
                projectSubmissionId,
                fromStatus: submission.status,
                toStatus: newStatus,
                changedBy: userId,
                note: data.note,
            },
            tx
        );

        const txUpdated = await projectSubmissionsRepo.updateProjectSubmission(
            projectSubmissionId,
            {
                status: newStatus,
                ...(txThreadId ? { threadId: txThreadId } : {}),
            },
            tx
        );

        return { updated: txUpdated, threadId: txThreadId };
    });

    const event = buildProjectSubmissionStatusChangedEvent(
        projectSubmissionId,
        submission.project.id,
        submission.project.title,
        submission.profile.userId,
        submission.profile.user.email,
        `${submission.profile.firstName} ${submission.profile.lastName}`,
        submission.status,
        newStatus
    );
    await publish(event.type, event.payload);

    return updated;
}
