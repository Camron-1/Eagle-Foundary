import { lazy, Suspense } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { ToastContainer } from '@/components/ui/toast';
import { CommandPalette } from '@/components/ui/command-palette';

import AuthGuard from '@/app/guards/AuthGuard';
import GuestGuard from '@/app/guards/GuestGuard';
import ActiveUserGuard from '@/app/guards/ActiveUserGuard';
import RoleGuard from '@/app/guards/RoleGuard';
import AppShell from '@/components/layout/AppShell';
import AuthShell from '@/components/layout/AuthShell';

const LandingPage = lazy(() => import('@/features/landing/LandingPage'));

const SignupRolePage = lazy(() => import('@/pages/auth/SignupRolePage'));
const StudentSignupPage = lazy(() => import('@/pages/auth/StudentSignupPage'));
const CompanySignupPage = lazy(() => import('@/pages/auth/CompanySignupPage'));
const VerifyOtpPage = lazy(() => import('@/pages/auth/VerifyOtpPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const MfaSetupPage = lazy(() => import('@/pages/auth/MfaSetupPage'));
const MfaChallengePage = lazy(() => import('@/pages/auth/MfaChallengePage'));
const PendingApprovalPage = lazy(() => import('@/pages/auth/PendingApprovalPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));

const StudentDashboardPage = lazy(() => import('@/pages/student/DashboardPage'));
const ProfileSettingsPage = lazy(() => import('@/pages/student/ProfileSettingsPage'));
const PortfolioPage = lazy(() => import('@/pages/student/PortfolioPage'));
const MyStartupsPage = lazy(() => import('@/pages/student/MyStartupsPage'));
const StartupEditorPage = lazy(() => import('@/pages/student/StartupEditorPage'));
const StartupTeamPage = lazy(() => import('@/pages/student/StartupTeamPage'));
const StartupJoinRequestsPage = lazy(() => import('@/pages/student/StartupJoinRequestsPage'));
const MyJoinRequestsPage = lazy(() => import('@/pages/student/MyJoinRequestsPage'));
const MyApplicationsPage = lazy(() => import('@/pages/student/MyApplicationsPage'));

const OrgProfilePage = lazy(() => import('@/pages/company/OrgProfilePage'));
const OrgMembersPage = lazy(() => import('@/pages/company/OrgMembersPage'));
const OpportunitiesBoardPage = lazy(() => import('@/pages/company/OpportunitiesBoardPage'));
const OpportunityEditorPage = lazy(() => import('@/pages/company/OpportunityEditorPage'));
const OpportunityApplicationsPage = lazy(() => import('@/pages/company/OpportunityApplicationsPage'));
const ApplicationReviewPage = lazy(() => import('@/pages/company/ApplicationReviewPage'));

const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const StartupReviewsPage = lazy(() => import('@/pages/admin/StartupReviewsPage'));
const StartupReviewDetailPage = lazy(() => import('@/pages/admin/StartupReviewDetailPage'));
const UserManagementPage = lazy(() => import('@/pages/admin/UserManagementPage'));
const OrgManagementPage = lazy(() => import('@/pages/admin/OrgManagementPage'));
const AuditLogsPage = lazy(() => import('@/pages/admin/AuditLogsPage'));
const ModerationReportsPage = lazy(() => import('@/pages/admin/ModerationReportsPage'));

const StartupsDiscoveryPage = lazy(() => import('@/pages/discovery/StartupsPage'));
const StartupDetailPage = lazy(() => import('@/pages/discovery/StartupDetailPage'));
const OpportunitiesDiscoveryPage = lazy(() => import('@/pages/discovery/OpportunitiesPage'));
const OpportunityDetailPage = lazy(() => import('@/pages/discovery/OpportunityDetailPage'));
const OrganizationsDiscoveryPage = lazy(() => import('@/pages/discovery/OrganizationsPage'));
const OrganizationDetailPage = lazy(() => import('@/pages/discovery/OrganizationDetailPage'));
const StudentPublicProfilePage = lazy(() => import('@/pages/discovery/StudentPublicProfilePage'));

const DashboardRedirectPage = lazy(() => import('@/pages/app/DashboardPage'));
const MessagesPage = lazy(() => import('@/pages/app/MessagesPage'));
const ThreadPage = lazy(() => import('@/pages/app/ThreadPage'));
const NotificationsPage = lazy(() => import('@/pages/app/NotificationsPage'));
const SearchPage = lazy(() => import('@/pages/app/SearchPage'));
const MyReportsPage = lazy(() => import('@/pages/app/MyReportsPage'));
const SecurityPage = lazy(() => import('@/pages/app/SecurityPage'));

const NotFoundPage = lazy(() => import('@/pages/system/NotFoundPage'));
const UnauthorizedPage = lazy(() => import('@/pages/system/UnauthorizedPage'));
const DocsPage = lazy(() => import('@/pages/system/DocsPage'));
const PrivacyPage = lazy(() => import('@/pages/system/PrivacyPage'));
const TermsPage = lazy(() => import('@/pages/system/TermsPage'));
const ContactPage = lazy(() => import('@/pages/system/ContactPage'));

function RootLayout(): JSX.Element {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-black" />}>
      <Outlet />
      <ToastContainer />
      <CommandPalette />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Public
      { path: '/', element: <LandingPage /> },
      { path: '/unauthorized', element: <UnauthorizedPage /> },
      { path: '/docs', element: <DocsPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/terms', element: <TermsPage /> },
      { path: '/contact', element: <ContactPage /> },

      // Guest-only (auth pages)
      {
        element: <GuestGuard />,
        children: [
          {
            element: <AuthShell />,
            children: [
              { path: '/sign-up', element: <SignupRolePage /> },
              { path: '/sign-up/student', element: <StudentSignupPage /> },
              { path: '/sign-up/company', element: <CompanySignupPage /> },
              { path: '/verify-otp', element: <VerifyOtpPage /> },
              { path: '/login', element: <LoginPage /> },
              { path: '/mfa/setup', element: <MfaSetupPage /> },
              { path: '/mfa/challenge', element: <MfaChallengePage /> },
              { path: '/forgot-password', element: <ForgotPasswordPage /> },
              { path: '/reset-password', element: <ResetPasswordPage /> },
            ],
          },
        ],
      },

      // Authenticated routes
      {
        element: <AuthGuard />,
        children: [
          { path: '/pending-approval', element: <PendingApprovalPage /> },
          {
            element: <ActiveUserGuard />,
            children: [
              // Dashboard redirect
              { path: '/dashboard', element: <DashboardRedirectPage /> },

              // App shell wrapping all authed pages
              {
                element: <AppShell />,
                children: [
                  // Student routes
                  {
                    element: <RoleGuard allowed={['STUDENT']} />,
                    children: [
                      { path: '/student/dashboard', element: <StudentDashboardPage /> },
                      { path: '/student/profile', element: <ProfileSettingsPage /> },
                      { path: '/student/portfolio', element: <PortfolioPage /> },
                      { path: '/student/startups', element: <MyStartupsPage /> },
                      { path: '/student/startups/new', element: <StartupEditorPage /> },
                      { path: '/student/startups/:id/edit', element: <StartupEditorPage /> },
                      { path: '/student/startups/:id/team', element: <StartupTeamPage /> },
                      { path: '/student/startups/:id/join-requests', element: <StartupJoinRequestsPage /> },
                      { path: '/student/join-requests', element: <MyJoinRequestsPage /> },
                      { path: '/student/applications', element: <MyApplicationsPage /> },
                    ],
                  },

                  // Company routes
                  {
                    element: <RoleGuard allowed={['COMPANY_ADMIN', 'COMPANY_MEMBER']} />,
                    children: [
                      { path: '/company/org', element: <OrgProfilePage /> },
                      { path: '/company/opportunities', element: <OpportunitiesBoardPage /> },
                      { path: '/company/opportunities/:id/applications', element: <OpportunityApplicationsPage /> },
                    ],
                  },
                  {
                    element: <RoleGuard allowed={['COMPANY_ADMIN']} />,
                    children: [
                      { path: '/company/org/members', element: <OrgMembersPage /> },
                      { path: '/company/opportunities/new', element: <OpportunityEditorPage /> },
                      { path: '/company/opportunities/:id/edit', element: <OpportunityEditorPage /> },
                      { path: '/company/opportunities/applications/:id', element: <ApplicationReviewPage /> },
                    ],
                  },

                  // Admin routes
                  {
                    element: <RoleGuard allowed={['UNIVERSITY_ADMIN']} />,
                    children: [
                      { path: '/admin', element: <AdminDashboardPage /> },
                      { path: '/admin/startups/reviews', element: <StartupReviewsPage /> },
                      { path: '/admin/startups/:id/review', element: <StartupReviewDetailPage /> },
                      { path: '/admin/users', element: <UserManagementPage /> },
                      { path: '/admin/orgs', element: <OrgManagementPage /> },
                      { path: '/admin/audit-logs', element: <AuditLogsPage /> },
                      { path: '/admin/reports', element: <ModerationReportsPage /> },
                    ],
                  },

                  // Discovery (authenticated)
                  { path: '/startups', element: <StartupsDiscoveryPage /> },
                  { path: '/startups/:id', element: <StartupDetailPage /> },
                  { path: '/opportunities', element: <OpportunitiesDiscoveryPage /> },
                  { path: '/opportunities/:id', element: <OpportunityDetailPage /> },
                  { path: '/organizations', element: <OrganizationsDiscoveryPage /> },
                  { path: '/organizations/:id', element: <OrganizationDetailPage /> },

                  // Student public profile (company/admin only)
                  {
                    element: <RoleGuard allowed={['COMPANY_ADMIN', 'COMPANY_MEMBER', 'UNIVERSITY_ADMIN']} />,
                    children: [
                      { path: '/students/:id', element: <StudentPublicProfilePage /> },
                    ],
                  },

                  // Shared pages
                  { path: '/messages', element: <MessagesPage /> },
                  { path: '/messages/:threadId', element: <ThreadPage /> },
                  { path: '/notifications', element: <NotificationsPage /> },
                  { path: '/search', element: <SearchPage /> },
                  { path: '/settings/security', element: <SecurityPage /> },
                  { path: '/reports', element: <MyReportsPage /> },
                ],
              },
            ],
          },
        ],
      },

      // 404 catch-all
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
