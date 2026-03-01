// User status
export const UserStatus = {
    PENDING_OTP: 'PENDING_OTP',
    PENDING_ORG_VERIFICATION: 'PENDING_ORG_VERIFICATION',
    PENDING_ORG_APPROVAL: 'PENDING_ORG_APPROVAL',
    ACTIVE: 'ACTIVE',
    SUSPENDED: 'SUSPENDED',
} as const;

export type UserStatusType = (typeof UserStatus)[keyof typeof UserStatus];

// User roles
export const UserRole = {
    STUDENT: 'STUDENT',
    COMPANY_ADMIN: 'COMPANY_ADMIN',
    COMPANY_MEMBER: 'COMPANY_MEMBER',
    UNIVERSITY_ADMIN: 'UNIVERSITY_ADMIN',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

// Org status
export const OrgStatus = {
    PENDING_OTP: 'PENDING_OTP',
    ACTIVE: 'ACTIVE',
    SUSPENDED: 'SUSPENDED',
} as const;

export type OrgStatusType = (typeof OrgStatus)[keyof typeof OrgStatus];

// OTP purpose
export const OtpPurpose = {
    SIGNUP_VERIFY: 'SIGNUP_VERIFY',
    PASSWORD_RESET: 'PASSWORD_RESET',
} as const;

export type OtpPurposeType = (typeof OtpPurpose)[keyof typeof OtpPurpose];

// Startup status
export const StartupStatus = {
    DRAFT: 'DRAFT',
    SUBMITTED: 'SUBMITTED',
    NEEDS_CHANGES: 'NEEDS_CHANGES',
    APPROVED: 'APPROVED',
    ARCHIVED: 'ARCHIVED',
} as const;

export type StartupStatusType = (typeof StartupStatus)[keyof typeof StartupStatus];

// Opportunity status
export const OpportunityStatus = {
    DRAFT: 'DRAFT',
    PUBLISHED: 'PUBLISHED',
    CLOSED: 'CLOSED',
} as const;

export type OpportunityStatusType = (typeof OpportunityStatus)[keyof typeof OpportunityStatus];

// Application status
export const ApplicationStatus = {
    SUBMITTED: 'SUBMITTED',
    SHORTLISTED: 'SHORTLISTED',
    INTERVIEW: 'INTERVIEW',
    SELECTED: 'SELECTED',
    REJECTED: 'REJECTED',
    WITHDRAWN: 'WITHDRAWN',
} as const;

export type ApplicationStatusType = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

// Join request status
export const JoinRequestStatus = {
    PENDING: 'PENDING',
    ACCEPTED: 'ACCEPTED',
    REJECTED: 'REJECTED',
    CANCELLED: 'CANCELLED',
} as const;

export type JoinRequestStatusType = (typeof JoinRequestStatus)[keyof typeof JoinRequestStatus];

// Report status
export const ReportStatus = {
    OPEN: 'OPEN',
    REVIEWING: 'REVIEWING',
    RESOLVED: 'RESOLVED',
    DISMISSED: 'DISMISSED',
} as const;

export type ReportStatusType = (typeof ReportStatus)[keyof typeof ReportStatus];

// Startup member roles
export const StartupMemberRole = {
    FOUNDER: 'founder',
    MEMBER: 'member',
} as const;

export type StartupMemberRoleType = (typeof StartupMemberRole)[keyof typeof StartupMemberRole];

// Pagination defaults
export const PAGINATION = {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
} as const;

// File upload limits
export const FILE_LIMITS = {
    MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf'],
    PRESIGNED_URL_EXPIRY_SECONDS: 3600, // 1 hour
} as const;

// Context types for file attachments
export const FileContextType = {
    STARTUP_LOGO: 'startup_logo',
    STARTUP_MEDIA: 'startup_media',
    RESUME: 'resume',
    PORTFOLIO: 'portfolio',
    OPPORTUNITY: 'opportunity',
    ORG_LOGO: 'org_logo',
    ORG_VERIFICATION_DOCUMENT: 'org_verification_document',
    APPLICATION: 'application',
    MESSAGE: 'message',
} as const;

export type FileContextTypeType = (typeof FileContextType)[keyof typeof FileContextType];

// Allowed file types for upload
export const ALLOWED_FILE_TYPES = {
    images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    documents: ['application/pdf'],
    all: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
} as const;

// Report target types
export const ReportTargetType = {
    STARTUP: 'startup',
    OPPORTUNITY: 'opportunity',
    USER: 'user',
    MESSAGE: 'message',
} as const;

export type ReportTargetTypeType = (typeof ReportTargetType)[keyof typeof ReportTargetType];

// Admin actions
export const AdminAction = {
    STARTUP_APPROVED: 'startup_approved',
    STARTUP_REJECTED: 'startup_rejected',
    STARTUP_NEEDS_CHANGES: 'startup_needs_changes',
    ORG_SUSPENDED: 'org_suspended',
    ORG_UNSUSPENDED: 'org_unsuspended',
    ORG_VERIFIED: 'org_verified',
    ORG_UNVERIFIED: 'org_unverified',
    USER_SUSPENDED: 'user_suspended',
    USER_UNSUSPENDED: 'user_unsuspended',
    REPORT_WARNED: 'report_warned',
    REPORT_TAKEDOWN: 'report_takedown',
    REPORT_DISMISSED: 'report_dismissed',
} as const;

export type AdminActionType = (typeof AdminAction)[keyof typeof AdminAction];

// Budget types for opportunities
export const BudgetType = {
    PAID: 'paid',
    UNPAID: 'unpaid',
    EQUITY: 'equity',
} as const;

export type BudgetTypeType = (typeof BudgetType)[keyof typeof BudgetType];

// Notification types
export const NotificationType = {
    OTP_SENT: 'otp_sent',
    STARTUP_SUBMITTED: 'startup_submitted',
    STARTUP_APPROVED: 'startup_approved',
    STARTUP_NEEDS_CHANGES: 'startup_needs_changes',
    STARTUP_REJECTED: 'startup_rejected',
    JOIN_REQUEST_RECEIVED: 'join_request_received',
    JOIN_REQUEST_ACCEPTED: 'join_request_accepted',
    JOIN_REQUEST_REJECTED: 'join_request_rejected',
    APPLICATION_RECEIVED: 'application_received',
    APPLICATION_STATUS_CHANGED: 'application_status_changed',
    NEW_MESSAGE: 'new_message',
    SECURITY_NEW_LOGIN: 'security_new_login',
    SECURITY_MFA_ENABLED: 'security_mfa_enabled',
    SECURITY_MFA_RESET: 'security_mfa_reset',
    ORG_VERIFICATION_APPROVED: 'org_verification_approved',
    ORG_VERIFICATION_REJECTED: 'org_verification_rejected',
} as const;

export type NotificationTypeType = (typeof NotificationType)[keyof typeof NotificationType];

export const EncryptionConstants = {
    DEFAULT_KEY_VERSION: 1,
    DEFAULT_ENCRYPTION_VERSION: 1,
    MESSAGE_PREVIEW_REDACTED: 'New encrypted message',
} as const;
