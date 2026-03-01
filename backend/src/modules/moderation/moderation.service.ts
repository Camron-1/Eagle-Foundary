import { db } from '../../connectors/db.js';
import { NotFoundError, ForbiddenError } from '../../middlewares/errorHandler.js';
import { CreateReportInput, ResolveReportInput, ListAdminQuery } from '../admin/admin.validators.js';

/**
 * Create a report
 */
export async function createReport(userId: string, data: CreateReportInput) {
    // Validate target exists
    let targetExists = false;

    switch (data.targetType) {
        case 'STARTUP':
            targetExists = !!(await db.startup.findUnique({ where: { id: data.targetId } }));
            break;
        case 'OPPORTUNITY':
            targetExists = !!(await db.opportunity.findUnique({ where: { id: data.targetId } }));
            break;
        case 'USER':
            targetExists = !!(await db.user.findUnique({ where: { id: data.targetId } }));
            break;
        case 'MESSAGE':
            targetExists = !!(await db.message.findUnique({ where: { id: data.targetId } }));
            break;
        case 'ORG':
            targetExists = !!(await db.org.findUnique({ where: { id: data.targetId } }));
            break;
        default:
            throw new ForbiddenError('Invalid target type');
    }

    if (!targetExists) {
        throw new NotFoundError('Target');
    }

    if (data.evidenceMessageId) {
        const evidenceMessageExists = await db.message.findUnique({
            where: { id: data.evidenceMessageId },
            select: { id: true },
        });
        if (!evidenceMessageExists) {
            throw new NotFoundError('Evidence message');
        }
    }

    return db.report.create({
        data: {
            reporterId: userId,
            targetType: data.targetType,
            targetId: data.targetId,
            reporterReason: data.reporterReason,
            evidenceText: data.evidenceText,
            evidenceMessageId: data.evidenceMessageId,
            status: 'PENDING',
        },
    });
}

/**
 * Get pending reports (admin)
 */
export async function getPendingReports(query: ListAdminQuery) {
    const take = query.limit + 1;

    const reports = await db.report.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take,
        ...(query.cursor && {
            cursor: { id: query.cursor },
            skip: 1,
        }),
        include: {
            reporter: {
                select: {
                    id: true,
                    email: true,
                    studentProfile: { select: { firstName: true, lastName: true } },
                },
            },
        },
    });

    const hasMore = reports.length > query.limit;
    const items = hasMore ? reports.slice(0, query.limit) : reports;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
}

/**
 * Resolve a report
 */
export async function resolveReport(
    adminUserId: string,
    reportId: string,
    data: ResolveReportInput
) {
    const report = await db.report.findUnique({
        where: { id: reportId },
    });

    if (!report) {
        throw new NotFoundError('Report');
    }

    // Apply action based on resolution
    if (data.resolution === 'USER_SUSPENDED' && report.targetType === 'USER') {
        await db.user.update({
            where: { id: report.targetId },
            data: { status: 'SUSPENDED' },
        });
    } else if (data.resolution === 'ORG_SUSPENDED' && report.targetType === 'OPPORTUNITY') {
        const opportunity = await db.opportunity.findUnique({
            where: { id: report.targetId },
        });
        if (opportunity) {
            await db.org.update({
                where: { id: opportunity.orgId },
                data: { status: 'SUSPENDED' },
            });
        }
    } else if (data.resolution === 'ORG_SUSPENDED' && report.targetType === 'ORG') {
        await db.org.update({
            where: { id: report.targetId },
            data: { status: 'SUSPENDED' },
        });
    } else if (data.resolution === 'CONTENT_REMOVED') {
        // Archive the content
        if (report.targetType === 'STARTUP') {
            await db.startup.update({
                where: { id: report.targetId },
                data: { status: 'ARCHIVED' },
            });
        } else if (report.targetType === 'OPPORTUNITY') {
            await db.opportunity.update({
                where: { id: report.targetId },
                data: { status: 'CLOSED' },
            });
        }
    }

    // Update report
    const updatedReport = await db.report.update({
        where: { id: reportId },
        data: {
            status: 'RESOLVED',
            resolution: data.resolution,
            adminNotes: data.adminNotes,
            resolvedBy: adminUserId,
            resolvedAt: new Date(),
        },
    });

    // Create audit log
    await db.auditLog.create({
        data: {
            userId: adminUserId,
            action: `REPORT_${data.resolution}`,
            targetType: 'REPORT',
            targetId: reportId,
            details: { resolution: data.resolution, adminNotes: data.adminNotes },
        },
    });

    return updatedReport;
}

/**
 * Get reports by user
 */
export async function getMyReports(userId: string, query: ListAdminQuery) {
    const take = query.limit + 1;

    const reports = await db.report.findMany({
        where: { reporterId: userId },
        orderBy: { createdAt: 'desc' },
        take,
        ...(query.cursor && {
            cursor: { id: query.cursor },
            skip: 1,
        }),
    });

    const hasMore = reports.length > query.limit;
    const items = hasMore ? reports.slice(0, query.limit) : reports;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
}
