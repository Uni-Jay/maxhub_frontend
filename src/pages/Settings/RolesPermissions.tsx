import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Edit2, Check, X, ChevronDown, ChevronUp, Lock, Unlock, Search, UserCog, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { staffService } from '@services/staffService';
import { userPermissionService } from '@services/userPermissionService';
import { cn } from '@utils/cn';
import type { StaffMember } from '@/types';

type Role = 'superadmin' | 'admin' | 'hr' | 'hod' | 'staff';

interface RoleConfig { role: Role; label: string; color: string; description: string; note?: string; }

const ROLE_CONFIGS: RoleConfig[] = [
  { role:'superadmin', label:'Super Admin (CEO)',        color:'bg-red-600',    description:'Full system access — all modules, all settings, all data' },
  { role:'admin',      label:'Admin (Head of Admin)',    color:'bg-rose-600',   description:'Administrative oversight — staff, HR, operations, payroll, reports' },
  { role:'hr',         label:'HR',                      color:'bg-violet-600', description:'Human resources — recruitment, onboarding, appraisals, leave, training' },
  { role:'hod',        label:'Head of Department',      color:'bg-indigo-600', description:'Departmental head — team tasks, projects, attendance, weekly reports' },
  { role:'staff',      label:'Staff',                   color:'bg-cyan-600',   description:'All staff members — tasks, attendance, payslips, leave, chat', note: 'Positions such as Accountant, Instructor, Receptionist are assigned here with extra user-level permissions.' },
];

const MODULES = ['Dashboard','Staff','HR','Attendance','Leave','Payroll','Projects','Tasks','CRM','Clients','Inventory','LMS','Messages','Video Calls','Calendar','Files','Invoices','Analytics','AI Assistant','Audit Logs','Reports','Settings'];

const BASE_PERMISSIONS: Record<Role, string[]> = {
  superadmin: MODULES,
  admin:      ['Dashboard','Staff','HR','Attendance','Leave','Payroll','Projects','Tasks','CRM','Clients','Calendar','Files','Invoices','Analytics','Reports','Settings'],
  hr:         ['Dashboard','Staff','HR','Attendance','Leave','Payroll','Messages','Calendar','Files','Reports'],
  hod:        ['Dashboard','Staff','Attendance','Projects','Tasks','LMS','Messages','Calendar','Files','Analytics'],
  staff:      ['Dashboard','Attendance','Leave','Tasks','Messages','Video Calls','Calendar','Files','AI Assistant'],
};

export default function RolesPermissions() {
  const [expanded, setExpanded] = useState<Role | null>(null);
  const [editing, setEditing] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Record<Role, string[]>>({ ...BASE_PERMISSIONS });
  const [saved, setSaved] = useState<Role | null>(null);

  useQuery({
    queryKey: ['roles-permissions'],
    queryFn: async () => {
      try { return await apiClient.get('/settings/roles'); }
      catch { return null; }
    },
  });

  const togglePermission = (role: Role, module: string) => {
    setPermissions(prev => {
      const current = prev[role] || [];
      const has = current.includes(module);
      return { ...prev, [role]: has ? current.filter(m => m !== module) : [...current, module] };
    });
  };

  const saveRole = (role: Role) => {
    setEditing(null);
    setSaved(role);
    setTimeout(() => setSaved(null), 2000);
    // would call apiClient.put('/settings/roles', { role, permissions: permissions[role] })
  };

  const canEdit = (role: Role) => role !== 'superadmin';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="h-6 w-6 text-indigo-600" /> Roles & Permissions
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Configure what each role can access in the system</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-3 flex items-center gap-3">
        <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Super Admin permissions cannot be changed. Expand any role to view or edit module access.
        </p>
      </div>

      <div className="space-y-3">
        {ROLE_CONFIGS.map(cfg => {
          const rolePerms = permissions[cfg.role] || [];
          const isExpanded = expanded === cfg.role;
          const isEditing = editing === cfg.role;
          const wasSaved = saved === cfg.role;

          return (
            <motion.div key={cfg.role} layout
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none" onClick={() => setExpanded(isExpanded ? null : cfg.role)}>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0', cfg.color)}>
                  <Shield className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 dark:text-white">{cfg.label}</p>
                    <span className="text-[11px] px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full font-mono">{cfg.role}</span>
                    {wasSaved && <span className="text-[11px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">Saved</span>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cfg.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    {rolePerms.length}/{MODULES.length} modules
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </div>

              {/* Expanded permissions */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }}
                    className="overflow-hidden border-t border-gray-100 dark:border-gray-700">
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Module Permissions</p>
                        {canEdit(cfg.role) && (
                          isEditing ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => { setEditing(null); setPermissions(p => ({ ...p, [cfg.role]: BASE_PERMISSIONS[cfg.role] })); }}
                                className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                <X className="h-3.5 w-3.5" /> Cancel
                              </button>
                              <button onClick={() => saveRole(cfg.role)}
                                className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition">
                                <Check className="h-3.5 w-3.5" /> Save Changes
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setEditing(cfg.role)}
                              className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
                              <Edit2 className="h-3.5 w-3.5" /> Edit Permissions
                            </button>
                          )
                        )}
                      </div>
                      {cfg.note && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 mb-3">{cfg.note}</p>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {MODULES.map(module => {
                          const hasAccess = rolePerms.includes(module);
                          return (
                            <div key={module}
                              onClick={() => isEditing && canEdit(cfg.role) ? togglePermission(cfg.role, module) : undefined}
                              className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition',
                                hasAccess
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                                  : 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600',
                                isEditing && canEdit(cfg.role) ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                              )}>
                              {hasAccess
                                ? <Unlock className="h-3 w-3 text-indigo-500 flex-shrink-0" />
                                : <Lock className="h-3 w-3 flex-shrink-0" />}
                              {module}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <UserPermissionOverrides />
    </div>
  );
}

/**
 * Grant or revoke a specific PermissionCode for one user directly —
 * without changing their role. Backed by /api/users/:userId/permissions,
 * which AuthenticationService.ts already merges into that user's JWT
 * alongside their role-derived permissions, so a grant here takes effect
 * immediately on next login/refresh — no role change needed.
 */
function UserPermissionOverrides() {
  const qc = useQueryClient();
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [permSearch, setPermSearch] = useState('');
  const [grantReason, setGrantReason] = useState('');

  const { data: staffResults } = useQuery({
    queryKey: ['user-override-staff-search', staffSearch],
    queryFn: () => staffService.getAll({ search: staffSearch, limit: 10 }),
    enabled: staffSearch.length >= 2,
  });
  const staffOptions: StaffMember[] = staffResults?.data ?? [];

  const { data: userPerms, isLoading: loadingPerms } = useQuery({
    queryKey: ['user-permissions', selectedStaff?.userId],
    queryFn: () => userPermissionService.getUserPermissions(selectedStaff!.userId),
    enabled: !!selectedStaff,
  });

  const { data: catalogResults } = useQuery({
    queryKey: ['permission-catalog-search', permSearch],
    queryFn: () => userPermissionService.searchPermissionCatalog(permSearch),
    enabled: permSearch.length >= 2,
  });
  const catalogOptions = catalogResults?.data ?? [];
  const directCodes = new Set((userPerms?.directPermissions ?? []).map(p => p.code));
  const roleDerivedCodes = new Set((userPerms?.roleDerivedPermissions ?? []).map(p => p.code));

  const grantMutation = useMutation({
    mutationFn: (code: string) => userPermissionService.grantPermission(selectedStaff!.userId, code, grantReason || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-permissions', selectedStaff?.userId] });
      setPermSearch('');
      setGrantReason('');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (code: string) => userPermissionService.revokePermission(selectedStaff!.userId, code),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-permissions', selectedStaff?.userId] }),
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-5">
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <UserCog className="h-5 w-5 text-indigo-600" /> Individual Permission Overrides
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Grant a specific permission to one person without changing their role — e.g. an Administrative Staff member who needs a couple of HOD-level permissions but shouldn't become HOD.
        </p>
      </div>

      {/* Staff picker */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={selectedStaff ? `${selectedStaff.firstName} ${selectedStaff.lastName}` : staffSearch}
          onChange={e => { setStaffSearch(e.target.value); setSelectedStaff(null); }}
          placeholder="Search staff by name or email…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {!selectedStaff && staffSearch.length >= 2 && staffOptions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg max-h-56 overflow-y-auto">
            {staffOptions.map(s => (
              <button key={s.id} onClick={() => { setSelectedStaff(s); setStaffSearch(''); }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
                <span className="font-medium text-gray-900 dark:text-white">{s.firstName} {s.lastName}</span>
                <span className="text-xs text-gray-400">{s.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedStaff && (
        <div className="space-y-4">
          {loadingPerms ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : userPerms ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{userPerms.user.firstName} {userPerms.user.lastName}</span>
                {userPerms.roles.map(r => (
                  <span key={r.code} className="text-[11px] font-mono px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">{r.code}</span>
                ))}
                <span className="text-xs text-gray-400">{userPerms.roleDerivedPermissions.length} role-derived permission{userPerms.roleDerivedPermissions.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Direct overrides */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Direct Overrides ({userPerms.directPermissions.length})</p>
                {userPerms.directPermissions.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No individual permissions granted yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {userPerms.directPermissions.map(p => (
                      <div key={p.code} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900 dark:text-white truncate">{p.name}</p>
                          <p className="text-[11px] font-mono text-indigo-500">{p.code}</p>
                        </div>
                        <button onClick={() => revokeMutation.mutate(p.code)} disabled={revokeMutation.isPending}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0" title="Revoke">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add a permission */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Grant a Permission</p>
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    value={permSearch}
                    onChange={e => setPermSearch(e.target.value)}
                    placeholder="Search permission codes (e.g. broadcast, meeting, leave)…"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {permSearch.length >= 2 && catalogOptions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                      {catalogOptions.map(p => {
                        const already = directCodes.has(p.code) || roleDerivedCodes.has(p.code);
                        return (
                          <button key={p.code} disabled={already} onClick={() => grantMutation.mutate(p.code)}
                            className={cn('w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left transition',
                              already ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700')}>
                            <div className="min-w-0">
                              <p className="text-sm text-gray-900 dark:text-white truncate">{p.name}</p>
                              <p className="text-[11px] font-mono text-gray-400">{p.code}</p>
                            </div>
                            {already ? (
                              <span className="text-[11px] text-gray-400 flex-shrink-0">Already has it</span>
                            ) : (
                              <Plus className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <input
                  value={grantReason}
                  onChange={e => setGrantReason(e.target.value)}
                  placeholder="Reason (optional, e.g. covers HOD duties for Sales)"
                  className="w-full mt-2 max-w-md px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
