import {
    EventType,
    OtpRequestedPayload,
    StartupEventPayload,
    ApplicationEventPayload,
    JoinRequestEventPayload,
    MessageEventPayload,
    OpportunityEventPayload,
    ProjectEventPayload,
    ProjectSubmissionEventPayload,
} from './eventTypes.js';

/**
 * Build OTP requested event payload
 */
export function buildOtpRequestedEvent(
    email: string,
    otp: string,
    purpose: 'signup' | 'password_reset',
    expiresAt: Date
): { type: string; payload: OtpRequestedPayload } {
    return {
        type: purpose === 'signup'
            ? EventType.EMAIL_OTP_REQUESTED
            : EventType.EMAIL_PASSWORD_RESET_OTP_REQUESTED,
        payload: {
            email,
            otp,
            purpose,
            expiresAt: expiresAt.toISOString(),
        },
    };
}

/**
 * Build startup submitted event payload
 */
export function buildStartupSubmittedEvent(
    startupId: string,
    startupName: string,
    founderId: string,
    founderEmail: string
): { type: string; payload: StartupEventPayload } {
    return {
        type: EventType.STARTUP_SUBMITTED,
        payload: {
            startupId,
            startupName,
            founderId,
            founderEmail,
        },
    };
}

/**
 * Build startup approved event payload
 */
export function buildStartupApprovedEvent(
    startupId: string,
    startupName: string,
    founderId: string,
    founderEmail: string
): { type: string; payload: StartupEventPayload } {
    return {
        type: EventType.STARTUP_APPROVED,
        payload: {
            startupId,
            startupName,
            founderId,
            founderEmail,
        },
    };
}

/**
 * Build startup needs changes event payload
 */
export function buildStartupNeedsChangesEvent(
    startupId: string,
    startupName: string,
    founderId: string,
    founderEmail: string,
    feedback: string
): { type: string; payload: StartupEventPayload } {
    return {
        type: EventType.STARTUP_NEEDS_CHANGES,
        payload: {
            startupId,
            startupName,
            founderId,
            founderEmail,
            feedback,
        },
    };
}

/**
 * Build startup rejected event payload
 */
export function buildStartupRejectedEvent(
    startupId: string,
    startupName: string,
    founderId: string,
    founderEmail: string,
    feedback: string
): { type: string; payload: StartupEventPayload } {
    return {
        type: EventType.STARTUP_REJECTED,
        payload: {
            startupId,
            startupName,
            founderId,
            founderEmail,
            feedback,
        },
    };
}

/**
 * Build application submitted event payload
 */
export function buildApplicationSubmittedEvent(
    applicationId: string,
    opportunityId: string,
    opportunityTitle: string,
    applicantId: string,
    applicantEmail: string,
    applicantName: string,
    companyEmail: string
): { type: string; payload: ApplicationEventPayload } {
    return {
        type: EventType.APPLICATION_SUBMITTED,
        payload: {
            applicationId,
            opportunityId,
            opportunityTitle,
            applicantId,
            applicantEmail,
            applicantName,
            companyEmail,
        },
    };
}

/**
 * Build application status changed event payload
 */
export function buildApplicationStatusChangedEvent(
    applicationId: string,
    opportunityId: string,
    opportunityTitle: string,
    applicantId: string,
    applicantEmail: string,
    applicantName: string,
    fromStatus: string,
    toStatus: string
): { type: string; payload: ApplicationEventPayload } {
    return {
        type: EventType.APPLICATION_STATUS_CHANGED,
        payload: {
            applicationId,
            opportunityId,
            opportunityTitle,
            applicantId,
            applicantEmail,
            applicantName,
            fromStatus,
            toStatus,
        },
    };
}

/**
 * Build join request created event payload
 */
export function buildJoinRequestCreatedEvent(
    joinRequestId: string,
    startupId: string,
    startupName: string,
    requesterId: string,
    requesterEmail: string,
    requesterName: string,
    founderId: string,
    founderEmail: string
): { type: string; payload: JoinRequestEventPayload } {
    return {
        type: EventType.JOIN_REQUEST_CREATED,
        payload: {
            joinRequestId,
            startupId,
            startupName,
            requesterId,
            requesterEmail,
            requesterName,
            founderId,
            founderEmail,
        },
    };
}

/**
 * Build join request accepted event payload
 */
export function buildJoinRequestAcceptedEvent(
    joinRequestId: string,
    startupId: string,
    startupName: string,
    requesterId: string,
    requesterEmail: string,
    requesterName: string,
    founderId: string,
    founderEmail: string
): { type: string; payload: JoinRequestEventPayload } {
    return {
        type: EventType.JOIN_REQUEST_ACCEPTED,
        payload: {
            joinRequestId,
            startupId,
            startupName,
            requesterId,
            requesterEmail,
            requesterName,
            founderId,
            founderEmail,
        },
    };
}

/**
 * Build new message event payload
 */
export function buildNewMessageEvent(
    messageId: string,
    threadId: string,
    senderId: string,
    senderName: string,
    recipientId: string,
    recipientEmail: string,
    preview: string
): { type: string; payload: MessageEventPayload } {
    return {
        type: EventType.MESSAGE_NEW,
        payload: {
            messageId,
            threadId,
            senderId,
            senderName,
            recipientId,
            recipientEmail,
            preview,
        },
    };
}

/**
 * Build message sent event payload (simplified version for messaging service)
 */
export function buildMessageSentEvent(
    messageId: string,
    threadId: string,
    senderId: string,
    recipientId: string,
    preview: string
): { type: string; payload: MessageEventPayload } {
    return {
        type: EventType.MESSAGE_NEW,
        payload: {
            messageId,
            threadId,
            senderId,
            senderName: '',
            recipientId,
            recipientEmail: '',
            preview,
        },
    };
}

/**
 * Build opportunity published event payload
 */
export function buildOpportunityPublishedEvent(
    opportunityId: string,
    opportunityTitle: string,
    orgId: string,
    orgName: string
): { type: string; payload: OpportunityEventPayload } {
    return {
        type: EventType.OPPORTUNITY_PUBLISHED,
        payload: {
            opportunityId,
            opportunityTitle,
            orgId,
            orgName,
        },
    };
}

/**
 * Build project published event payload
 */
export function buildProjectPublishedEvent(
    projectId: string,
    projectTitle: string,
    orgId: string,
    orgName: string
): { type: string; payload: ProjectEventPayload } {
    return {
        type: EventType.PROJECT_PUBLISHED,
        payload: {
            projectId,
            projectTitle,
            orgId,
            orgName,
        },
    };
}

/**
 * Build project closed event payload
 */
export function buildProjectClosedEvent(
    projectId: string,
    projectTitle: string,
    orgId: string,
    orgName: string
): { type: string; payload: ProjectEventPayload } {
    return {
        type: EventType.PROJECT_CLOSED,
        payload: {
            projectId,
            projectTitle,
            orgId,
            orgName,
        },
    };
}

/**
 * Build project submission created event payload
 */
export function buildProjectSubmissionSubmittedEvent(
    projectSubmissionId: string,
    projectId: string,
    projectTitle: string,
    applicantId: string,
    applicantEmail: string,
    applicantName: string,
    companyEmail: string
): { type: string; payload: ProjectSubmissionEventPayload } {
    return {
        type: EventType.PROJECT_SUBMISSION_SUBMITTED,
        payload: {
            projectSubmissionId,
            projectId,
            projectTitle,
            applicantId,
            applicantEmail,
            applicantName,
            companyEmail,
        },
    };
}

/**
 * Build project submission status changed event payload
 */
export function buildProjectSubmissionStatusChangedEvent(
    projectSubmissionId: string,
    projectId: string,
    projectTitle: string,
    applicantId: string,
    applicantEmail: string,
    applicantName: string,
    fromStatus: string,
    toStatus: string
): { type: string; payload: ProjectSubmissionEventPayload } {
    return {
        type: EventType.PROJECT_SUBMISSION_STATUS_CHANGED,
        payload: {
            projectSubmissionId,
            projectId,
            projectTitle,
            applicantId,
            applicantEmail,
            applicantName,
            fromStatus,
            toStatus,
        },
    };
}
