import { Request, Response, NextFunction } from 'express';
import * as filesService from './files.service.js';
import { success, noContent } from '../../utils/response.js';
import { PresignUploadInput, ConfirmUploadInput } from './files.validators.js';

/**
 * POST /files/presign
 */
export async function presignUpload(
    req: Request<unknown, unknown, PresignUploadInput>,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const result = await filesService.getUploadUrl(req.user!.userId, req.body);
        success(res, result);
    } catch (error) {
        next(error);
    }
}

/**
 * POST /files/confirm
 */
export async function confirmUpload(
    req: Request<unknown, unknown, ConfirmUploadInput>,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const file = await filesService.confirmUpload(req.user!.userId, req.body);
        success(res, {
            id: file.id,
            filename: file.filename,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            context: file.context,
            contextId: file.contextId,
            uploadedBy: file.uploadedBy,
            createdAt: file.createdAt,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /files/:id/download
 */
export async function getDownloadUrl(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const result = await filesService.getDownloadUrl(req.user!.userId, req.params.id);
        success(res, result);
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /files/:id
 */
export async function deleteFile(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        await filesService.deleteUploadedFile(req.user!.userId, req.params.id);
        noContent(res);
    } catch (error) {
        next(error);
    }
}
