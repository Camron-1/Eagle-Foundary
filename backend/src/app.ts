import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { env } from './config/env.js';
import { requestIdMiddleware } from './middlewares/requestId.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { generalRateLimiter } from './middlewares/rateLimit.js';
import { initSentry, setupSentryErrorHandler } from './connectors/sentry.js';

// Import routes
import authRoutes from './modules/auth/auth.routes.js';
import studentsRoutes from './modules/students/students.routes.js';
import orgsRoutes from './modules/orgs/orgs.routes.js';
import startupsRoutes from './modules/startups/startups.routes.js';
import joinRequestsRoutes from './modules/joinRequests/joinRequests.routes.js';
import opportunitiesRoutes from './modules/opportunities/opportunities.routes.js';
import applicationsRoutes from './modules/applications/applications.routes.js';
import messagingRoutes from './modules/messaging/messaging.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import filesRoutes from './modules/files/files.routes.js';
import searchRoutes from './modules/search/search.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import moderationRoutes from './modules/moderation/moderation.routes.js';

// Import nested route controllers
import * as joinRequestsController from './modules/joinRequests/joinRequests.controller.js';
import * as applicationsController from './modules/applications/applications.controller.js';
import { validateBody, validateParams, uuidParamSchema } from './middlewares/validate.js';
import { authMiddleware, requireActiveUser } from './middlewares/auth.js';
import { requireStudent, requireCompanyMember } from './middlewares/rbac.js';
import { createJoinRequestSchema } from './modules/joinRequests/joinRequests.validators.js';

const app = express();
app.disable('x-powered-by');

// Initialize Sentry
initSentry();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
const configuredOrigins = env.CORS_ORIGINS;
const allowAnyOrigin = configuredOrigins.includes('*');

if (env.NODE_ENV === 'production' && configuredOrigins.length === 1 && configuredOrigins[0] === '*') {
    throw new Error('Wildcard CORS origin is not allowed in production. Please specify explicit origins.');
}

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            callback(null, true);
            return;
        }

        if (allowAnyOrigin && env.NODE_ENV !== 'production') {
            callback(null, true);
            return;
        }

        const allowed = configuredOrigins.includes(origin);
        if (!allowed) {
            console.warn(`CORS: rejected origin "${origin}"`);
        }
        callback(null, allowed);
    },
    credentials: true,
    optionsSuccessStatus: 204,
}));
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request ID for tracing
app.use(requestIdMiddleware);

// Rate limiting for all API routes
app.use('/api', generalRateLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/orgs', orgsRoutes);
app.use('/api/startups', startupsRoutes);
app.use('/api/join-requests', joinRequestsRoutes);
app.use('/api/opportunities', opportunitiesRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/messages', messagingRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', moderationRoutes);

// Nested routes for startups -> join-requests
app.post(
    '/api/startups/:id/join-requests',
    authMiddleware,
    requireActiveUser,
    requireStudent,
    validateParams(uuidParamSchema),
    validateBody(createJoinRequestSchema),
    joinRequestsController.createJoinRequest
);

app.get(
    '/api/startups/:id/join-requests',
    authMiddleware,
    requireActiveUser,
    requireStudent,
    validateParams(uuidParamSchema),
    joinRequestsController.getStartupJoinRequests
);

// Nested routes for opportunities -> applications
app.post(
    '/api/opportunities/:id/applications',
    authMiddleware,
    requireActiveUser,
    requireStudent,
    validateParams(uuidParamSchema),
    applicationsController.createApplication
);

app.get(
    '/api/opportunities/:id/applications',
    authMiddleware,
    requireActiveUser,
    requireCompanyMember,
    validateParams(uuidParamSchema),
    applicationsController.getOpportunityApplications
);

// Setup Sentry error handler (must be before other error handlers)
setupSentryErrorHandler(app);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export { app };
