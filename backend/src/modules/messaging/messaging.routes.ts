import { Router } from 'express';
import * as messagingController from './messaging.controller.js';
import { validateBody, validateParams, uuidParamSchema } from '../../middlewares/validate.js';
import { authMiddleware, requireActiveUser } from '../../middlewares/auth.js';
import { registerMessageKeySchema, sendMessageSchema } from './messaging.validators.js';

const router = Router();

router.use(authMiddleware);
router.use(requireActiveUser);

router.post(
    '/keys/register',
    validateBody(registerMessageKeySchema),
    messagingController.registerMessageKey
);

router.get('/keys/me', messagingController.getMyMessageKey);

// Get my threads
router.get('/threads', messagingController.getMyThreads);

// Get thread by ID
router.get(
    '/threads/:id',
    validateParams(uuidParamSchema),
    messagingController.getThread
);

router.get(
    '/threads/:id/crypto-context',
    validateParams(uuidParamSchema),
    messagingController.getThreadCryptoContext
);

// Get messages for thread
router.get(
    '/threads/:id/messages',
    validateParams(uuidParamSchema),
    messagingController.getMessages
);

// Send message
router.post(
    '/threads/:id/messages',
    validateParams(uuidParamSchema),
    validateBody(sendMessageSchema),
    messagingController.sendMessage
);

export default router;
