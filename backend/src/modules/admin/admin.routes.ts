import { Router } from 'express';
import * as adminController from './admin.controller.js';
import { validateBody, validateParams, validateQuery, uuidParamSchema } from '../../middlewares/validate.js';
import { authMiddleware, requireActiveUser } from '../../middlewares/auth.js';
import { requireUniversityAdmin } from '../../middlewares/rbac.js';
import {
    listOrgVerificationsQuerySchema,
    reviewOrgVerificationSchema,
    reviewStartupSchema,
    updateOrgStatusSchema,
    updateUserStatusSchema,
} from './admin.validators.js';

const router = Router();

// All admin routes require authentication and university admin role
router.use(authMiddleware);
router.use(requireActiveUser);
router.use(requireUniversityAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Startup review
router.get('/startups/pending', adminController.getPendingStartups);

router.post(
    '/startups/:id/review',
    validateParams(uuidParamSchema),
    validateBody(reviewStartupSchema),
    adminController.reviewStartup
);

// User management
router.get('/users', adminController.listUsers);

router.patch(
    '/users/:id/status',
    validateParams(uuidParamSchema),
    validateBody(updateUserStatusSchema),
    adminController.updateUserStatus
);

router.post(
    '/users/:id/mfa/reset',
    validateParams(uuidParamSchema),
    adminController.resetUserMfa
);

// Org management
router.get('/orgs', adminController.listOrgs);

router.patch(
    '/orgs/:id/status',
    validateParams(uuidParamSchema),
    validateBody(updateOrgStatusSchema),
    adminController.updateOrgStatus
);

router.get(
    '/orgs/verifications',
    validateQuery(listOrgVerificationsQuerySchema),
    adminController.listOrgVerifications
);

router.get(
    '/orgs/:id/verification-docs',
    validateParams(uuidParamSchema),
    adminController.getOrgVerificationDocuments
);

router.patch(
    '/orgs/:id/verification',
    validateParams(uuidParamSchema),
    validateBody(reviewOrgVerificationSchema),
    adminController.reviewOrgVerification
);

// Audit logs
router.get('/audit-logs', adminController.getAuditLogs);

export default router;
