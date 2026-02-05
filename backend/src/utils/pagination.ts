import { z } from 'zod';
import { PAGINATION } from '../config/constants.js';

export const paginationQuerySchema = z.object({
    cursor: z.string().optional(),
    limit: z
        .string()
        .optional()
        .transform((val) => {
            if (!val) return PAGINATION.DEFAULT_LIMIT;
            const num = parseInt(val, 10);
            if (isNaN(num) || num < 1) return PAGINATION.DEFAULT_LIMIT;
            return Math.min(num, PAGINATION.MAX_LIMIT);
        }),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface CursorPaginationResult<T> {
    items: T[];
    nextCursor: string | null;
    hasMore: boolean;
}

/**
 * Build Prisma cursor pagination options
 */
export function buildCursorPagination(
    cursor: string | undefined,
    limit: number,
    idField: string = 'id'
): {
    take: number;
    skip?: number;
    cursor?: Record<string, string>;
} {
    const options: {
        take: number;
        skip?: number;
        cursor?: Record<string, string>;
    } = {
        take: limit + 1, // Fetch one extra to determine if there are more
    };

    if (cursor) {
        options.cursor = { [idField]: cursor };
        options.skip = 1; // Skip the cursor itself
    }

    return options;
}

/**
 * Process cursor pagination results
 */
export function processCursorPagination<T extends { id: string }>(
    items: T[],
    limit: number
): CursorPaginationResult<T> {
    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore && resultItems.length > 0
        ? resultItems[resultItems.length - 1].id
        : null;

    return {
        items: resultItems,
        nextCursor,
        hasMore,
    };
}

/**
 * Build offset pagination options (for simpler use cases)
 */
export function buildOffsetPagination(
    page: number = 1,
    limit: number = PAGINATION.DEFAULT_LIMIT
): {
    skip: number;
    take: number;
} {
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), PAGINATION.MAX_LIMIT);

    return {
        skip: (validPage - 1) * validLimit,
        take: validLimit,
    };
}

/**
 * Calculate total pages for offset pagination
 */
export function calculateTotalPages(total: number, limit: number): number {
    return Math.ceil(total / limit);
}
