import { apiClient } from './apiClient';

export interface PermissionCatalogEntry {
  code: string;
  name: string;
  module: string;
}

export interface UserPermissionsResponse {
  user: { id: number; firstName: string; lastName: string; email: string };
  roles: { code: string; name: string }[];
  roleDerivedPermissions: PermissionCatalogEntry[];
  directPermissions: PermissionCatalogEntry[];
}

export const userPermissionService = {
  getUserPermissions: (userId: number) =>
    apiClient.get<UserPermissionsResponse>(`/users/${userId}/permissions`),

  grantPermission: (userId: number, code: string, reason?: string) =>
    apiClient.post(`/users/${userId}/permissions`, { code, reason }),

  revokePermission: (userId: number, code: string) =>
    apiClient.delete(`/users/${userId}/permissions/${encodeURIComponent(code)}`),

  searchPermissionCatalog: (search: string) =>
    apiClient.getRaw('/admin/permissions', { search, limit: 20 }) as Promise<{ data: PermissionCatalogEntry[] }>,
};
