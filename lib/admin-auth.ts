'use client';

import { AuthClient } from './auth';
import { createApi } from './api';
import { createAdminApi } from './admin-api';

// Re-export types so pages can import everything from one place
export type { AdminStats, AdminUser, AdminMatch, AdminCategory, AdminReport, AdminUniversity, AdminQuestion, ActivityPoint, Paginated, AdminCampus, AdminCampusLandmark, CampusLayout, AdminUserStatsResponse } from './admin-api';

/** Single shared AuthClient for all admin pages. */
export const adminAuth = new AuthClient();

/**
 * API instance that does NOT retry on 401 — it just fails.
 * This prevents the infinite doRefresh loop when the token is stale.
 * AdminShell handles 401s by redirecting to /admin/login.
 */
const api = createApi(
  () => adminAuth.getToken(),
  async () => null, // never retry — let the caller handle it
);

/** Pre-built admin API using the non-retrying API client. */
export const adminApi = {
  ...createAdminApi(api),
  changePassword: (current_password: string, new_password: string) =>
    api.post('/auth/change-password', { current_password, new_password }),
};
