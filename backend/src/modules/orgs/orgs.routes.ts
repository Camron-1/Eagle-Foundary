import { Router } from 'express';
import * as orgsController from './orgs.controller.js';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate.js';
import { authMiddleware, requireActiveUser, optionalAuthMiddleware } from '../../middlewares/auth.js';
import { requireCompanyAdmin, requireCompanyMember } from '../../middlewares/rbac.js';
import { z } from 'zod';
import {
    addMemberSchema,
    listOrgJoinRequestsQuerySchema,
    reviewOrgJoinRequestSchema,
    updateOrgSchema,
} from './orgs.validators.js';

const router = Router();

const orgIdParamSchema = z.object({ orgId: z.string().uuid() });
const memberIdParamSchema = z.object({ memberId: z.string().uuid() });
const joinRequestIdParamSchema = z.object({ id: z.string().uuid() });

// Public routes
router.get('/', optionalAuthMiddleware, orgsController.listOrgs);

// Protected routes
router.get(
    '/me',
    authMiddleware,
    requireActiveUser,
    requireCompanyMember,
    orgsController.getMyOrg
);

router.put(
    '/me',
    authMiddleware,
    requireActiveUser,
    requireCompanyMember,
    validateBody(updateOrgSchema),
    orgsController.updateMyOrg
);

router.get(
    '/me/members',
    authMiddleware,
    requireActiveUser,
    requireCompanyMember,
    orgsController.getMembers
);

router.post(
    '/me/members',
    authMiddleware,
    requireActiveUser,
    requireCompanyAdmin,
    validateBody(addMemberSchema),
    orgsController.addMember
);

router.delete(
    '/me/members/:memberId',
    authMiddleware,
    requireActiveUser,
    requireCompanyAdmin,
    validateParams(memberIdParamSchema),
    orgsController.removeMember
);

router.get(
    '/me/join-requests',
    authMiddleware,
    requireActiveUser,
    requireCompanyAdmin,
    validateQuery(listOrgJoinRequestsQuerySchema),
    orgsController.listOrgJoinRequests
);

router.patch(
    '/me/join-requests/:id',
    authMiddleware,
    requireActiveUser,
    requireCompanyAdmin,
    validateParams(joinRequestIdParamSchema),
    validateBody(reviewOrgJoinRequestSchema),
    orgsController.reviewOrgJoinRequest
);

// Public org profile route (must come after /me routes)
router.get(
    '/:orgId',
    validateParams(orgIdParamSchema),
    orgsController.getOrgById
);

export default router;
