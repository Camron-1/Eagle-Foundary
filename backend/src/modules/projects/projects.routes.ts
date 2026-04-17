import { Router } from 'express';
import * as projectsController from './projects.controller.js';
import { validateBody, validateParams, uuidParamSchema } from '../../middlewares/validate.js';
import { authMiddleware, requireActiveUser } from '../../middlewares/auth.js';
import { requireCompanyMember, requireOrgPermission } from '../../middlewares/rbac.js';
import { createProjectSchema, updateProjectSchema } from './projects.validators.js';

const router = Router();

router.get('/', projectsController.listProjects);

router.get('/:id', validateParams(uuidParamSchema), projectsController.getProject);

router.use(authMiddleware);
router.use(requireActiveUser);

router.post('/', requireOrgPermission('canManageProjects'), validateBody(createProjectSchema), projectsController.createProject);

router.patch(
    '/:id',
    requireOrgPermission('canManageProjects'),
    validateParams(uuidParamSchema),
    validateBody(updateProjectSchema),
    projectsController.updateProject
);

router.post('/:id/publish', requireOrgPermission('canManageProjects'), validateParams(uuidParamSchema), projectsController.publishProject);

router.post('/:id/close', requireOrgPermission('canManageProjects'), validateParams(uuidParamSchema), projectsController.closeProject);

router.get('/org/me', requireCompanyMember, projectsController.listOrgProjects);

export default router;
