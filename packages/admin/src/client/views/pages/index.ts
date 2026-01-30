/**
 * Default Page Components
 *
 * Pre-built page components for common admin UI pages.
 * These are used by coreAdminModule and can be imported for customization.
 */

// Dashboard
export { DashboardPage, type DashboardPageProps } from "./dashboard-page";

// Auth pages
export { LoginPage, type LoginPageProps } from "./login-page";
export {
  ForgotPasswordPage,
  type ForgotPasswordPageProps,
} from "./forgot-password-page";
export {
  ResetPasswordPage,
  type ResetPasswordPageProps,
} from "./reset-password-page";
export { InvitePage, type InvitePageProps } from "./invite-page";
export {
  AcceptInvitePage,
  type AcceptInvitePageProps,
} from "./accept-invite-page";
export { SetupPage, type SetupPageProps } from "./setup-page";
