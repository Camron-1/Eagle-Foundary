const configuredApiBase =
  typeof import.meta.env.VITE_API_BASE === 'string'
    ? import.meta.env.VITE_API_BASE.trim()
    : '';

export const API_BASE = configuredApiBase
  ? configuredApiBase.replace(/\/+$/, '')
  : '';

export const endpoints = {
  health: '/health',

  auth: {
    studentSignup: '/api/auth/student/signup',
    companySignupDocumentUploadUrl: '/api/auth/company/signup/document-upload-url',
    companySignup: '/api/auth/company/signup',
    verifyOtp: '/api/auth/verify-otp',
    resendOtp: '/api/auth/resend-otp',
    login: '/api/auth/login',
    mfaSetupStart: '/api/auth/mfa/setup/start',
    mfaSetupComplete: '/api/auth/mfa/setup/complete',
    mfaVerify: '/api/auth/mfa/verify',
    mfaStatus: '/api/auth/mfa/status',
    mfaBackupCodesRegenerate: '/api/auth/mfa/backup-codes/regenerate',
    sessions: '/api/auth/sessions',
    revokeSession: (id: string) => `/api/auth/sessions/${id}`,
    revokeOtherSessions: '/api/auth/sessions/revoke-others',
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
    me: '/api/auth/me',
  },

  students: {
    me: '/api/students/me',
    portfolio: '/api/students/me/portfolio',
    portfolioItem: (id: string) => `/api/students/me/portfolio/${id}`,
    resumePresign: '/api/students/me/resume/presign',
    publicProfile: (id: string) => `/api/students/${id}/public`,
  },

  startups: {
    create: '/api/startups',
    list: '/api/startups',
    detail: (id: string) => `/api/startups/${id}`,
    update: (id: string) => `/api/startups/${id}`,
    submit: (id: string) => `/api/startups/${id}/submit`,
    archive: (id: string) => `/api/startups/${id}/archive`,
    team: (id: string) => `/api/startups/${id}/team`,
    joinRequests: (id: string) => `/api/startups/${id}/join-requests`,
    createJoinRequest: (id: string) => `/api/startups/${id}/join-requests`,
  },

  joinRequests: {
    me: '/api/join-requests/me',
    cancel: (id: string) => `/api/join-requests/${id}/cancel`,
    update: (id: string) => `/api/join-requests/${id}`,
  },

  opportunities: {
    list: '/api/opportunities',
    detail: (id: string) => `/api/opportunities/${id}`,
    create: '/api/opportunities',
    update: (id: string) => `/api/opportunities/${id}`,
    publish: (id: string) => `/api/opportunities/${id}/publish`,
    close: (id: string) => `/api/opportunities/${id}/close`,
    orgMe: '/api/opportunities/org/me',
    applications: (id: string) => `/api/opportunities/${id}/applications`,
    createApplication: (id: string) => `/api/opportunities/${id}/applications`,
  },

  applications: {
    me: '/api/applications/me',
    detail: (id: string) => `/api/applications/${id}`,
    withdraw: (id: string) => `/api/applications/${id}/withdraw`,
    updateStatus: (id: string) => `/api/applications/${id}/status`,
  },

  orgs: {
    list: '/api/orgs',
    detail: (orgId: string) => `/api/orgs/${orgId}`,
    me: '/api/orgs/me',
    updateMe: '/api/orgs/me',
    members: '/api/orgs/me/members',
    removeMember: (memberId: string) => `/api/orgs/me/members/${memberId}`,
    joinRequests: '/api/orgs/me/join-requests',
    reviewJoinRequest: (id: string) => `/api/orgs/me/join-requests/${id}`,
  },

  messages: {
    registerKey: '/api/messages/keys/register',
    myKey: '/api/messages/keys/me',
    threads: '/api/messages/threads',
    thread: (id: string) => `/api/messages/threads/${id}`,
    threadCryptoContext: (id: string) => `/api/messages/threads/${id}/crypto-context`,
    threadMessages: (id: string) => `/api/messages/threads/${id}/messages`,
    sendMessage: (id: string) => `/api/messages/threads/${id}/messages`,
  },

  notifications: {
    list: '/api/notifications',
    unreadCount: '/api/notifications/unread-count',
    readAll: '/api/notifications/read-all',
    read: (id: string) => `/api/notifications/${id}/read`,
    delete: (id: string) => `/api/notifications/${id}`,
  },

  files: {
    presign: '/api/files/presign',
    confirm: '/api/files/confirm',
    download: (id: string) => `/api/files/${id}/download`,
    delete: (id: string) => `/api/files/${id}`,
  },

  search: '/api/search',

  admin: {
    dashboard: '/api/admin/dashboard',
    pendingStartups: '/api/admin/startups/pending',
    reviewStartup: (id: string) => `/api/admin/startups/${id}/review`,
    users: '/api/admin/users',
    updateUserStatus: (id: string) => `/api/admin/users/${id}/status`,
    resetUserMfa: (id: string) => `/api/admin/users/${id}/mfa/reset`,
    orgs: '/api/admin/orgs',
    updateOrgStatus: (id: string) => `/api/admin/orgs/${id}/status`,
    orgVerifications: '/api/admin/orgs/verifications',
    orgVerificationDocs: (id: string) => `/api/admin/orgs/${id}/verification-docs`,
    reviewOrgVerification: (id: string) => `/api/admin/orgs/${id}/verification`,
    auditLogs: '/api/admin/audit-logs',
  },

  reports: {
    create: '/api/reports',
    me: '/api/reports/me',
    pending: '/api/reports/pending',
    resolve: (id: string) => `/api/reports/${id}/resolve`,
  },
} as const;
