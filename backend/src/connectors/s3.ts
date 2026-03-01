import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';
import { FILE_LIMITS } from '../config/constants.js';
import { logger } from './logger.js';

const s3Client = new S3Client({
    region: env.AWS_REGION,
    ...(env.AWS_ACCESS_KEY_ID &&
        env.AWS_SECRET_ACCESS_KEY && {
        credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
    }),
});

export interface PresignedUploadResult {
    uploadUrl: string;
    key: string;
    expiresAt: Date;
}

export interface PresignedDownloadResult {
    downloadUrl: string;
    expiresAt: Date;
}

/**
 * Generate a presigned URL for uploading a file to S3
 */
export async function generatePresignedUploadUrl(
    key: string,
    contentType: string,
    contentLength: number
): Promise<PresignedUploadResult> {
    const command = new PutObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        ContentLength: contentLength,
        ...(env.AWS_KMS_KEY_ID
            ? {
                ServerSideEncryption: 'aws:kms',
                SSEKMSKeyId: env.AWS_KMS_KEY_ID,
            }
            : {}),
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
        expiresIn: FILE_LIMITS.PRESIGNED_URL_EXPIRY_SECONDS,
    });

    const expiresAt = new Date(Date.now() + FILE_LIMITS.PRESIGNED_URL_EXPIRY_SECONDS * 1000);

    logger.debug({ key, contentType }, 'Generated presigned upload URL');

    return { uploadUrl, key, expiresAt };
}

/**
 * Generate a presigned URL for downloading a file from S3
 */
export async function generatePresignedDownloadUrl(key: string): Promise<PresignedDownloadResult> {
    const command = new GetObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: key,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, {
        expiresIn: FILE_LIMITS.PRESIGNED_URL_EXPIRY_SECONDS,
    });

    const expiresAt = new Date(Date.now() + FILE_LIMITS.PRESIGNED_URL_EXPIRY_SECONDS * 1000);

    logger.debug({ key }, 'Generated presigned download URL');

    return { downloadUrl, expiresAt };
}

/**
 * Delete a file from S3
 */
export async function deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: key,
    });

    await s3Client.send(command);
    logger.debug({ key }, 'Deleted file from S3');
}

/**
 * Generate a unique S3 key for a file
 */
export function generateS3Key(
    contextType: string,
    contextId: string,
    filename: string
): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${contextType}/${contextId}/${timestamp}-${sanitizedFilename}`;
}

export { s3Client };
