export type UserRole = 'STUDENT' | 'COMPANY_ADMIN' | 'COMPANY_MEMBER' | 'COMPANY_VIEWER' | 'UNIVERSITY_ADMIN';
export type UserStatus =
  | 'PENDING_OTP'
  | 'PENDING_ORG_VERIFICATION'
  | 'PENDING_ORG_APPROVAL'
  | 'ACTIVE'
  | 'SUSPENDED';
export type OrgStatus = 'PENDING_OTP' | 'ACTIVE' | 'SUSPENDED';
export type OrgVerificationStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
export type OrgJoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type StartupStatus = 'DRAFT' | 'SUBMITTED' | 'NEEDS_CHANGES' | 'APPROVED' | 'ARCHIVED' | 'REJECTED';
export type OpportunityStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type ProjectStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type ApplicationStatus = 'SUBMITTED' | 'SHORTLISTED' | 'INTERVIEW' | 'SELECTED' | 'REJECTED' | 'WITHDRAWN';
export type JoinRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
export type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
export type BudgetType = 'paid' | 'unpaid' | 'equity';
export type FileContext =
  | 'startup_logo'
  | 'startup_media'
  | 'resume'
  | 'portfolio'
  | 'opportunity'
  | 'org_logo'
  | 'application'
  | 'message'
  | 'org_verification_document';
export type LoginNextStep = 'MFA_SETUP' | 'MFA_VERIFY';

export interface PendingContext {
  type: 'ORG_VERIFICATION_PENDING' | 'ORG_APPROVAL_PENDING' | 'ORG_APPROVAL_REJECTED';
  orgName?: string;
  reviewNotes?: string | null;
  joinRequestStatus?: OrgJoinRequestStatus;
  joinRequestNote?: string | null;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  orgId: string | null;
  mfaEnabled?: boolean;
  emailVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  pendingContext?: PendingContext | null;
  org?: {
    id: string;
    name: string;
    status: OrgStatus;
    verificationStatus: OrgVerificationStatus;
    verificationReviewNotes: string | null;
  } | null;
  studentProfile?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  orgPermissions?: OrgPermissions | null;
}

export interface OrgPermissions {
  canManageMembers?: boolean;
  canInviteMembers?: boolean;
  canManageOpportunities?: boolean;
  canManageProjects?: boolean;
}

export interface StudentProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  major: string | null;
  gradYear: number | null;
  bio: string | null;
  skills: string[];
  resumeUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioItem {
  id: string;
  profileId: string;
  title: string;
  description: string | null;
  url: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Org {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  status: OrgStatus;
  verificationStatus?: OrgVerificationStatus;
  verificationSubmittedAt?: string | null;
  verificationReviewedAt?: string | null;
  verificationReviewNotes?: string | null;
  verifiedDomains?: string[];
  isVerifiedBadge: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Startup {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  stage: string | null;
  tags: string[];
  logoUrl: string | null;
  status: StartupStatus;
  adminFeedback: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StartupMember {
  id: string;
  startupId: string;
  profileId: string;
  role: 'founder' | 'member';
  joinedAt: string;
  profile?: StudentProfile;
}

export interface JoinRequest {
  id: string;
  startupId: string;
  profileId: string;
  message: string | null;
  formAnswers?: Record<string, string>;
  status: JoinRequestStatus;
  threadId: string | null;
  createdAt: string;
  updatedAt: string;
  profile?: StudentProfile;
  startup?: Startup;
}

export interface Opportunity {
  id: string;
  orgId: string;
  title: string;
  description: string | null;
  requirements: string | null;
  budgetType: BudgetType | null;
  budgetRange: string | null;
  tags: string[];
  status: OpportunityStatus;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  org?: Org;
}

export interface Application {
  id: string;
  opportunityId: string;
  profileId: string;
  coverLetter: string | null;
  resumeUrl: string | null;
  formAnswers?: Record<string, string>;
  status: ApplicationStatus;
  threadId: string | null;
  createdAt: string;
  updatedAt: string;
  opportunity?: Opportunity;
  profile?: StudentProfile;
  statusHistory?: ApplicationStatusHistoryEntry[];
}

export interface Project {
  id: string;
  orgId: string;
  title: string;
  description: string | null;
  requirements: string | null;
  budgetType: BudgetType | null;
  budgetRange: string | null;
  estimatedDuration: string | null;
  deadline: string | null;
  tags: string[];
  status: ProjectStatus;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  org?: Org;
}

export interface ProjectSubmission {
  id: string;
  projectId: string;
  profileId: string;
  coverLetter: string | null;
  resumeUrl: string | null;
  formAnswers?: Record<string, string>;
  status: ApplicationStatus;
  threadId: string | null;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  profile?: StudentProfile;
  statusHistory?: ProjectSubmissionStatusHistoryEntry[];
}

export interface ProjectSubmissionStatusHistoryEntry {
  id: string;
  projectSubmissionId: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedBy: string;
  note: string | null;
  createdAt: string;
}

export interface ApplicationStatusHistoryEntry {
  id: string;
  applicationId: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedBy: string;
  note: string | null;
  createdAt: string;
}

export interface MessageThread {
  id: string;
  createdAt: string;
  updatedAt: string;
  encryptionRequired?: boolean;
  currentKeyVersion?: number;
  isLegacyPlaintextThread?: boolean;
  joinRequest?: JoinRequest;
  application?: Application;
  projectSubmission?: ProjectSubmission;
  messages?: Message[];
  lastMessage?: Message;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  content: string | null;
  ciphertext?: string | null;
  iv?: string | null;
  keyVersion?: number | null;
  encryptionVersion?: number | null;
  isEncrypted?: boolean;
  senderKeyFingerprint?: string | null;
  createdAt: string;
}

export interface UserMessageKey {
  userId: string;
  publicKeyPem: string;
  fingerprint: string;
  algorithm: string;
  createdAt: string;
}

export interface MessageKeyEnvelope {
  userId: string;
  keyVersion: number;
  wrappedThreadKey: string;
  recipientKeyFingerprint: string;
  wrappedByUserId?: string;
  createdAt?: string;
}

export interface ThreadCryptoContext {
  threadId: string;
  encryptionRequired: boolean;
  currentKeyVersion: number;
  isLegacyPlaintextThread: boolean;
  participants: string[];
  keys: UserMessageKey[];
  keyEnvelopes: MessageKeyEnvelope[];
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: 'STARTUP' | 'OPPORTUNITY' | 'PROJECT' | 'USER' | 'MESSAGE' | 'ORG';
  targetId: string;
  reporterReason: string;
  evidenceText: string | null;
  evidenceMessageId: string | null;
  status: ReportStatus;
  resolution: string | null;
  adminNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface FileRecord {
  id: string;
  s3Key: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  context: string;
  contextId: string;
  uploadedBy: string;
  createdAt: string;
}

// ----- Request payloads -----

export interface StudentSignupPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface CompanySignupPayload {
  email: string;
  password: string;
  companyName: string;
  firstName: string;
  lastName: string;
  verificationDocumentKeys: string[];
}

export interface CompanyDocUploadPayload {
  filename: string;
  mimeType: 'application/pdf';
  sizeBytes: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface VerifyOtpPayload {
  email: string;
  code: string;
}

export interface ResendOtpPayload {
  email: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  newPassword: string;
}

export interface MfaSetupStartPayload {
  challengeToken: string;
}

export interface MfaSetupCompletePayload {
  challengeToken: string;
  code: string;
}

export interface MfaVerifyPayload {
  challengeToken: string;
  code?: string;
  backupCode?: string;
}

export interface MfaRegenerateBackupCodesPayload {
  code: string;
}

export interface UpdateStudentProfilePayload {
  firstName?: string;
  lastName?: string;
  major?: string | null;
  gradYear?: number | null;
  bio?: string | null;
  skills?: string[];
  linkedinUrl?: string | null;
  githubUrl?: string | null;
}

export interface CreatePortfolioItemPayload {
  title: string;
  description?: string | null;
  url?: string | null;
  imageUrl?: string | null;
}

export interface UpdatePortfolioItemPayload extends Partial<CreatePortfolioItemPayload> { }

export interface CreateStartupPayload {
  name: string;
  tagline?: string | null;
  description?: string | null;
  stage?: string | null;
  tags?: string[];
  logoUrl?: string | null;
}

export interface UpdateStartupPayload extends Partial<CreateStartupPayload> { }

export interface CreateOpportunityPayload {
  title: string;
  description?: string | null;
  requirements?: string | null;
  budgetType?: BudgetType | null;
  budgetRange?: string | null;
  tags?: string[];
}

export interface UpdateOpportunityPayload extends Partial<CreateOpportunityPayload> { }

export interface CreateProjectPayload {
  title: string;
  description?: string | null;
  requirements?: string | null;
  budgetType?: BudgetType | null;
  budgetRange?: string | null;
  estimatedDuration?: string | null;
  deadline?: string | null;
  tags?: string[];
}

export interface UpdateProjectPayload extends Partial<CreateProjectPayload> { }

export interface CreateApplicationPayload {
  coverLetter?: string | null;
  resumeUrl?: string | null;
}

export interface CreateProjectSubmissionPayload {
  coverLetter?: string | null;
  resumeUrl?: string | null;
}

export interface UpdateApplicationStatusPayload {
  status: 'SHORTLISTED' | 'INTERVIEW' | 'SELECTED' | 'REJECTED';
  note?: string | null;
}

export interface UpdateProjectSubmissionStatusPayload {
  status: 'SHORTLISTED' | 'INTERVIEW' | 'SELECTED' | 'REJECTED';
  note?: string | null;
}

export interface CreateJoinRequestPayload {
  message?: string | null;
}

export interface UpdateJoinRequestPayload {
  status: 'ACCEPTED' | 'REJECTED';
}

export interface SendMessagePayload {
  content?: string;
  ciphertext?: string;
  iv?: string;
  keyVersion?: number;
  encryptionVersion?: number;
  senderKeyFingerprint?: string;
  keyEnvelopes?: MessageKeyEnvelope[];
}

export interface UpdateOrgPayload {
  name?: string;
  description?: string | null;
  website?: string | null;
  logoUrl?: string | null;
}

export interface AddOrgMemberPayload {
  email: string;
  role: 'COMPANY_ADMIN' | 'COMPANY_MEMBER' | 'COMPANY_VIEWER';
}

export interface UpdateMemberPermissionsPayload {
  role?: 'COMPANY_ADMIN' | 'COMPANY_MEMBER' | 'COMPANY_VIEWER';
  orgPermissions?: OrgPermissions | null;
}

export interface ReviewOrgJoinRequestPayload {
  action: 'APPROVE' | 'REJECT';
  adminNote?: string | null;
}

export interface PresignUploadPayload {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  context: FileContext;
  contextId: string;
}

export interface PresignResumePayload {
  filename: string;
  mimeType: 'application/pdf';
  sizeBytes: number;
}

export interface CreateReportPayload {
  targetType: 'STARTUP' | 'OPPORTUNITY' | 'PROJECT' | 'USER' | 'MESSAGE' | 'ORG';
  targetId: string;
  reporterReason: string;
  evidenceText?: string | null;
  evidenceMessageId?: string | null;
}

export interface ReviewStartupPayload {
  decision: 'APPROVED' | 'NEEDS_CHANGES' | 'REJECTED';
  feedback?: string | null;
}

export interface UpdateUserStatusPayload {
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface UpdateOrgStatusPayload {
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface ResolveReportPayload {
  resolution: 'RESOLVED' | 'DISMISSED';
  adminNotes?: string | null;
}

export interface ReviewOrgVerificationPayload {
  action: 'APPROVE' | 'REJECT';
  reviewNotes?: string | null;
  verifiedDomains?: string[];
}

// ----- Response wrappers -----

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn?: string;
}

export interface LoginResponse {
  accessToken?: string;
  expiresIn?: string;
  nextStep?: LoginNextStep;
  challengeToken?: string;
}

export interface PresignResponse {
  uploadUrl: string;
  key: string;
  confirmToken: string;
  expiresAt: string;
}

export interface AdminDashboardStats {
  activeUsers: number;
  organizations: number;
  pendingStartups: number;
  openReports: number;
}

export interface CompanyDocUploadResponse {
  uploadUrl: string;
  key: string;
  expiresAt: string;
}

export interface MfaSetupStartResponse {
  secret: string;
  otpauthUrl: string;
}

export interface MfaSetupCompleteResponse extends AuthTokens {
  backupCodes: string[];
}

export interface MfaVerifyResponse extends AuthTokens {
  usedBackupCode: boolean;
}

export interface MfaStatus {
  mfaEnabled: boolean;
  backupCodesRemaining: number;
}

export interface MfaBackupCodesResponse {
  backupCodes: string[];
}

export interface AuthSession {
  id: string;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface RevokeOtherSessionsResponse {
  revokedCount: number;
}

export interface OrgJoinRequest {
  id: string;
  orgId: string;
  userId: string;
  status: OrgJoinRequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface OrgVerificationDocument {
  id: string;
  filename: string;
  createdAt: string;
  downloadUrl: string;
  expiresAt: string;
}

export interface OrgVerificationDocumentListResponse {
  org: { id: string; name: string };
  items: OrgVerificationDocument[];
}

export interface AdminResetMfaResponse {
  success: boolean;
}

export interface SearchResult {
  type: 'startup' | 'opportunity' | 'project' | 'student' | 'organization';
  id: string;
  title: string;
  subtitle: string | null;
}
