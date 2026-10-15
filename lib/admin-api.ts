import type { Api } from './api';

export interface AdminStats {
  totalUsers: number;
  totalMatches: number;
  totalQuestions: number;
  totalCategories: number;
  openReports: number;
  totalUniversities: number;
  matchesToday: number;
  signupsThisWeek: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  rating: number;
  xp: number;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  matches_drawn: number;
  university_id: string | null;
  university?: { id: string; name: string; short_name: string } | null;
  is_admin: boolean;
  created_at: string;
}

export interface AdminMatch {
  id: string;
  type: string;
  ranked: boolean;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  question_count: number;
  participants: { id: string; user_id: string; score: number }[];
  created_at: string;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  count: number;
}

export interface AdminReport {
  id: string;
  reporter_id: string;
  reporter?: { id: string; username: string };
  subject_type: string;
  subject_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
}

export interface AdminUniversity {
  id: string;
  name: string;
  short_name: string;
  country: string;
  email_domains: string[];
  points: number;
  logo_url: string | null;
  color_a: string;
  color_b: string;
  pattern: string;
  created_at: string;
}

export interface AdminQuestion {
  id: string;
  category_id: string;
  category: { id: string; name: string; slug: string };
  difficulty: string;
  text: string;
  options: string[];
  correct_option_index: number;
  bonus_text: string | null;
  bonus_options: string[] | null;
  source: string | null;
  active: boolean;
  created_at: string;
}

export function createAdminApi(api: Api) {
  return {
    fetchStats: () => api.get<AdminStats>('/admin/stats'),

    fetchUsers: (page = 1, limit = 20, q?: string) =>
      api.get<Paginated<AdminUser>>(`/admin/users?page=${page}&limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
    fetchUser: (id: string) => api.get<AdminUser>(`/admin/users/${id}`),
    updateUser: (id: string, data: { is_admin?: boolean; university_id?: string | null }) =>
      api.patch<AdminUser>(`/admin/users/${id}`, data),

    fetchQuestions: (page = 1, limit = 50, filters?: { category_id?: string; difficulty?: string; active?: string }) => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filters?.category_id) params.set('category_id', filters.category_id);
      if (filters?.difficulty) params.set('difficulty', filters.difficulty);
      if (filters?.active !== undefined) params.set('active', filters.active);
      return api.get<Paginated<AdminQuestion>>(`/questions?${params}`);
    },
    fetchQuestion: (id: string) => api.get<AdminQuestion>(`/questions/${id}`),
    createQuestion: (data: any) => api.post<AdminQuestion>('/questions', data),
    updateQuestion: (id: string, data: any) => api.put<AdminQuestion>(`/questions/${id}`, data),
    deleteQuestion: (id: string) => api.del(`/questions/${id}`),

    fetchMatches: (page = 1, limit = 20, filters?: { status?: string; type?: string }) => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filters?.status) params.set('status', filters.status);
      if (filters?.type) params.set('type', filters.type);
      return api.get<Paginated<AdminMatch>>(`/admin/matches?${params}`);
    },
    fetchMatch: (id: string) => api.get<AdminMatch>(`/admin/matches/${id}`),

    fetchCategories: () => api.get<AdminCategory[]>('/admin/categories'),
    createCategory: (data: { name: string; slug: string }) => api.post('/categories', data),
    updateCategory: (id: string, data: { name?: string; slug?: string; active?: boolean }) =>
      api.put(`/categories/${id}`, data),
    deleteCategory: (id: string) => api.del(`/categories/${id}`),

    fetchReports: (page = 1, limit = 20) =>
      api.get<Paginated<AdminReport>>(`/reports?page=${page}&limit=${limit}`),
    updateReportStatus: (id: string, status: string) =>
      api.patch(`/reports/${id}/status`, { status }),

    fetchUniversities: (page = 1, limit = 20, q?: string) =>
      api.get<Paginated<AdminUniversity>>(`/universities?page=${page}&limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
    createUniversity: (data: any) => api.post('/universities', data),
    updateUniversity: (id: string, data: any) => api.put(`/universities/${id}`, data),
    deleteUniversity: (id: string) => api.del(`/universities/${id}`),
  };
}
