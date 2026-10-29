import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { erpService, type Brand } from '@services/erpService';
import { chatSocket } from '@services/chatSocket';
import { useAuthStore } from '@store/authStore';
import { getPrimaryRole } from '@utils/role';

export const BRAND_LOGOS: Record<string, string> = {
  VM: '/brands/visamax.jpeg', KS: '/brands/kuriossat.jpeg', BM: '/brands/beadmax.jpeg', MF: '/brands/maxfood.jpeg',
};

export function useBrands() {
  const q = useQuery({ queryKey: ['erp-brands'], queryFn: () => erpService.brands(), staleTime: 5 * 60_000 });
  const brands: Brand[] = q.data?.brands ?? [];
  const departments: any[] = q.data?.departments ?? [];
  const byCode = (code?: string | null) => {
    if (!code) return undefined;
    const c = code.toUpperCase();
    return brands.find((b) => b.code === c) || brands.find((b) => c.startsWith(`${b.code}-`));
  };
  const byDepartmentId = (id?: number | string | null) => {
    if (!id) return undefined;
    const d = departments.find((x) => String(x.id) === String(id));
    if (!d) return undefined;
    return brands.find((b) => String(b.departmentId) === String(d.id) || String(b.departmentId) === String(d.parentDepartmentId));
  };
  const logo = (b?: Brand) => (b ? (b.logoUrl || BRAND_LOGOS[b.code]) : undefined);
  return { ...q, brands, departments, byCode, byDepartmentId, logo, headOffice: q.data?.headOffice };
}

/**
 * Subscribes to the backend's live `erp:changed` events and refreshes any
 * query whose key starts with one of the given entity names — so two people
 * working on the same record always see the latest data.
 */
export function useLiveRefresh(entities: string[]) {
  const qc = useQueryClient();
  useEffect(() => {
    const handler = (e: { entity: string }) => {
      if (!entities.includes(e?.entity)) return;
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === 'string' && (q.queryKey[0] as string).startsWith(`erp:${e.entity}`) });
      if (e.entity === 'payment') qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === 'string' && (q.queryKey[0] as string).startsWith('erp:') });
    };
    chatSocket.on('erp:changed', handler);
    return () => chatSocket.off('erp:changed', handler);
  }, [qc, entities.join(',')]);
}

export function useRole() {
  const user = useAuthStore((s) => s.user);
  const tokens = useAuthStore((s) => s.tokens);
  const role = getPrimaryRole(user, tokens?.accessToken);
  return {
    role, user,
    isSuper: role === 'superadmin',
    isManagement: role === 'superadmin' || role === 'admin',
    canManageContent: role === 'superadmin' || role === 'admin' || role === 'hr' || role === 'hod',
  };
}
