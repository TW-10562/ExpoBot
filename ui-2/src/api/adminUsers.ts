import request from './request';

export type AdminUser = {
  user_id: number;
  emp_id: string;
  first_name: string;
  last_name: string;
  job_role_key: string;
  area_of_work_key: string;
  role: 'admin' | 'user';
  updated_at: string;
};

export type AdminUserPayload = {
  firstName: string;
  lastName: string;
  employeeId: string;
  userJobRole: string;
  areaOfWork: string;
  role: 'admin' | 'user';
  password?: string;
};

export async function fetchAdminUsers() {
  return request<{ code: number; result?: AdminUser[]; message?: string }>('/api/admin/users', {
    method: 'GET',
  });
}

export async function createAdminUser(payload: AdminUserPayload) {
  return request<{ code: number; result?: AdminUser; message?: string }>('/api/admin/users', {
    method: 'POST',
    data: payload,
  });
}

export async function updateAdminUser(userId: string, payload: AdminUserPayload) {
  return request<{ code: number; result?: AdminUser; message?: string }>(`/api/admin/users/${userId}`, {
    method: 'PUT',
    data: payload,
  });
}

export async function deleteAdminUser(userId: string) {
  return request<{ code: number; result?: { success: boolean }; message?: string }>(`/api/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

export async function importAdminUsersCsv(file: File) {
  const form = new FormData();
  form.append('file', file);
  return request<{ code: number; result?: { created: number; updated: number; skipped: number; errors?: string[] }; message?: string }>(
    '/api/admin/users/import-csv',
    {
      method: 'POST',
      data: form,
    },
  );
}
