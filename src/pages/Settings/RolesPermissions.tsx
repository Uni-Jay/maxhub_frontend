import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Edit2, Check, X, ChevronDown, ChevronUp, Lock, Unlock } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { cn } from '@utils/cn';

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
    </div>
  );
}
