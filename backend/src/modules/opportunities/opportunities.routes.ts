import { Router } from 'express';
import * as opportunitiesController from './opportunities.controller.js';
import { validateBody, validateParams, uuidParamSchema } from '../../middlewares/validate.js';
import { authMiddleware, requireActiveUser } from '../../middlewares/auth.js';
import { requireCompanyMember, requireOrgPermission } from '../../middlewares/rbac.js';
import { createOpportunitySchema, updateOpportunitySchema } from './opportunities.validators.js';

const router = Router();

// Public routes (listing)
router.get('/', opportunitiesController.listOpportunities);

router.get(
    '/:id',
    validateParams(uuidParamSchema),
    opportunitiesController.getOpportunity
);

// Protected routes
router.use(authMiddleware);
router.use(requireActiveUser);

// Company routes
router.post(
    '/',
    requireOrgPermission('canManageOpportunities'),
    validateBody(createOpportunitySchema),
    opportunitiesController.createOpportunity
);

router.patch(
    '/:id',
    requireOrgPermission('canManageOpportunities'),
    validateParams(uuidParamSchema),
    validateBody(updateOpportunitySchema),
    opportunitiesController.updateOpportunity
);

router.post(
    '/:id/publish',
    requireOrgPermission('canManageOpportunities'),
    validateParams(uuidParamSchema),
    opportunitiesController.publishOpportunity
);

router.post(
    '/:id/close',
    requireOrgPermission('canManageOpportunities'),
    validateParams(uuidParamSchema),
    opportunitiesController.closeOpportunity
);

// Get org's opportunities
router.get('/org/me', requireCompanyMember, opportunitiesController.listOrgOpportunities);

export default router;
