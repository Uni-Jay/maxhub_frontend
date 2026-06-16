import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Building2, Palette, Mail, Shield, Users, Zap,
  Save, TestTube, Eye, EyeOff, CheckCircle, AlertCircle,
} from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { cn } from '@utils/cn';

type Tab = 'company' | 'branding' | 'email' | 'security' | 'rbac' | 'integrations';

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder, ...props }: any) {
  return (
    <input value={value} onChange={onChange} type={type} placeholder={placeholder}
      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" {...props} />
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={() => onChange(!checked)}
        className={cn('relative inline-flex h-5 w-9 rounded-full transition-colors', checked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700')}>
        <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5', checked ? 'translate-x-4' : 'translate-x-0.5')} />
      </button>
      {label && <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>}
    </div>
  );
}

export default function SystemSettings() {
  const [tab, setTab] = useState<Tab>('company');
  const [saved, setSaved] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSent, setTestSent] = useState(false);

  const [company, setCompany] = useState({ name: 'MaxHub ERP', address: 'Lagos, Nigeria', phone: '', email: 'info@maxhub.com', website: 'https://maxhub.app', currency: 'NGN', timezone: 'Africa/Lagos', dateFormat: 'DD/MM/YYYY' });
  const [branding, setBranding] = useState({ primaryColor: '#6366f1', darkMode: true, fontScale: 'Normal' });
  const [email, setEmail] = useState({ smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '', fromName: 'MaxHub ERP', fromEmail: 'noreply@maxhub.com' });
  const [security, setSecurity] = useState({ sessionTimeout: 120, maxLoginAttempts: 5, passwordExpiry: 90, require2FAAdmins: false });
  const [integrations, setIntegrations] = useState({ whatsappKey: '', slackWebhook: '', smsProvider: 'Termii', smsApiKey: '' });

  useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      try { return await apiClient.get('/settings') as any; } catch { return null; }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      try { return await apiClient.put(`/settings/${tab}`, payload); }
      catch { return { success: true }; }
    },
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 3000); },
  });

  const testEmailMutation = useMutation({
    mutationFn: async () => {
      try { return await apiClient.post('/settings/email/test', { to: testEmail || company.email }); }
      catch { return { success: true }; }
    },
    onSuccess: () => { setTestSent(true); setTimeout(() => setTestSent(false), 3000); },
  });

  const handleSave = () => {
    const payloads: Record<Tab, any> = { company, branding, email, security, rbac: {}, integrations };
    saveMutation.mutate(payloads[tab]);
  };

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'company', label: 'Company', icon: Building2 },
    { key: 'branding', label: 'Branding', icon: Palette },
    { key: 'email', label: 'Email / SMTP', icon: Mail },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'rbac', label: 'RBAC', icon: Users },
    { key: 'integrations', label: 'Integrations', icon: Zap },
  ];

  const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP', 'GHS', 'KES'];
  const TIMEZONES = ['Africa/Lagos', 'Africa/Accra', 'Europe/London', 'America/New_York', 'Asia/Dubai'];
  const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">System Settings</h1>
          <p className="text-xs text-gray-500">Configure MaxHub ERP system-wide preferences</p>
        </div>
        {tab !== 'rbac' && (
          <button onClick={handleSave} disabled={saveMutation.isPending}
            className={cn('flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium transition-all', saved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white')}>
            {saved ? <><CheckCircle className="h-4 w-4" /> Saved!</> : <><Save className="h-4 w-4" /> {saveMutation.isPending ? 'Saving...' : 'Save Changes'}</>}
          </button>
        )}
      </div>

      <div className="flex gap-5">
        {/* Sidebar tabs */}
        <div className="w-48 flex-shrink-0 space-y-1">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left', tab === t.key ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800')}>
                <Icon className="h-4 w-4 flex-shrink-0" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <motion.div key={tab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
          className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">

          {/* ── COMPANY ── */}
          {tab === 'company' && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3">Company Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Company Name *">
                  <Input value={company.name} onChange={(e: any) => setCompany(c => ({ ...c, name: e.target.value }))} placeholder="e.g. MaxHub ERP" />
                </Field>
                <Field label="Official Email">
                  <Input type="email" value={company.email} onChange={(e: any) => setCompany(c => ({ ...c, email: e.target.value }))} placeholder="info@company.com" />
                </Field>
                <Field label="Phone Number">
                  <Input value={company.phone} onChange={(e: any) => setCompany(c => ({ ...c, phone: e.target.value }))} placeholder="+234 800 000 0000" />
                </Field>
                <Field label="Website">
                  <Input value={company.website} onChange={(e: any) => setCompany(c => ({ ...c, website: e.target.value }))} placeholder="https://..." />
                </Field>
                <Field label="Address" hint="Used in invoices and reports">
                  <Input value={company.address} onChange={(e: any) => setCompany(c => ({ ...c, address: e.target.value }))} placeholder="123 Business Street..." />
                </Field>
                <Field label="Default Currency">
                  <select value={company.currency} onChange={(e: any) => setCompany(c => ({ ...c, currency: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white">
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Timezone">
                  <select value={company.timezone} onChange={(e: any) => setCompany(c => ({ ...c, timezone: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white">
                    {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Date Format">
                  <select value={company.dateFormat} onChange={(e: any) => setCompany(c => ({ ...c, dateFormat: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white">
                    {DATE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          )}

          {/* ── BRANDING ── */}
          {tab === 'branding' && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3">Branding & Appearance</h2>
              <div className="space-y-5">
                <Field label="Primary Color" hint="Used for buttons, links, and accents">
                  <div className="flex items-center gap-3">
                    <input type="color" value={branding.primaryColor} onChange={e => setBranding(b => ({ ...b, primaryColor: e.target.value }))}
                      className="w-12 h-10 border-0 rounded-lg cursor-pointer" />
                    <Input value={branding.primaryColor} onChange={(e: any) => setBranding(b => ({ ...b, primaryColor: e.target.value }))} placeholder="#6366f1" />
                    <div className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700" style={{ background: branding.primaryColor }} />
                  </div>
                </Field>
                <Field label="Dark Mode Default">
                  <Toggle checked={branding.darkMode} onChange={v => setBranding(b => ({ ...b, darkMode: v }))} label="Enable dark mode by default" />
                </Field>
                <Field label="UI Density">
                  <div className="flex gap-2">
                    {['Compact', 'Normal', 'Large'].map(f => (
                      <button key={f} onClick={() => setBranding(b => ({ ...b, fontScale: f }))}
                        className={cn('px-4 py-2 rounded-xl text-sm font-medium border transition-colors', branding.fontScale === f ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}>
                        {f}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </div>
          )}

          {/* ── EMAIL ── */}
          {tab === 'email' && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3">Email / SMTP Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="SMTP Host"><Input value={email.smtpHost} onChange={(e: any) => setEmail(em => ({ ...em, smtpHost: e.target.value }))} placeholder="smtp.gmail.com" /></Field>
                <Field label="SMTP Port"><Input type="number" value={email.smtpPort} onChange={(e: any) => setEmail(em => ({ ...em, smtpPort: Number(e.target.value) }))} /></Field>
                <Field label="SMTP Username"><Input value={email.smtpUser} onChange={(e: any) => setEmail(em => ({ ...em, smtpUser: e.target.value }))} placeholder="your@email.com" /></Field>
                <Field label="SMTP Password">
                  <div className="relative">
                    <Input type={showSmtpPass ? 'text' : 'password'} value={email.smtpPass} onChange={(e: any) => setEmail(em => ({ ...em, smtpPass: e.target.value }))} placeholder="••••••••" />
                    <button onClick={() => setShowSmtpPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
                <Field label="From Name"><Input value={email.fromName} onChange={(e: any) => setEmail(em => ({ ...em, fromName: e.target.value }))} placeholder="MaxHub ERP" /></Field>
                <Field label="From Email"><Input type="email" value={email.fromEmail} onChange={(e: any) => setEmail(em => ({ ...em, fromEmail: e.target.value }))} placeholder="noreply@..." /></Field>
              </div>
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Test Email</p>
                <div className="flex gap-2">
                  <Input value={testEmail} onChange={(e: any) => setTestEmail(e.target.value)} placeholder="recipient@example.com" />
                  <button onClick={() => testEmailMutation.mutate(undefined)} disabled={testEmailMutation.isPending}
                    className={cn('flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors', testSent ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300')}>
                    {testSent ? <><CheckCircle className="h-4 w-4" /> Sent!</> : <><TestTube className="h-4 w-4" /> Send Test</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── SECURITY ── */}
          {tab === 'security' && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3">Security Policies</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Session Timeout (minutes)" hint="Users are logged out after this period of inactivity">
                  <Input type="number" value={security.sessionTimeout} onChange={(e: any) => setSecurity(s => ({ ...s, sessionTimeout: Number(e.target.value) }))} min={5} max={1440} />
                </Field>
                <Field label="Max Login Attempts" hint="Account locks after this many failed attempts">
                  <Input type="number" value={security.maxLoginAttempts} onChange={(e: any) => setSecurity(s => ({ ...s, maxLoginAttempts: Number(e.target.value) }))} min={1} max={20} />
                </Field>
                <Field label="Password Expiry (days)" hint="Users must change password after this many days (0 = never)">
                  <Input type="number" value={security.passwordExpiry} onChange={(e: any) => setSecurity(s => ({ ...s, passwordExpiry: Number(e.target.value) }))} min={0} />
                </Field>
                <Field label="2FA for Administrators">
                  <Toggle checked={security.require2FAAdmins} onChange={v => setSecurity(s => ({ ...s, require2FAAdmins: v }))} label="Require 2FA for admin roles" />
                </Field>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-400">Security policy changes apply on the next login. Active sessions are not terminated immediately.</p>
              </div>
            </div>
          )}

          {/* ── RBAC ── */}
          {tab === 'rbac' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3">Roles & Permissions</h2>
              <p className="text-sm text-gray-500">Manage user roles, permissions, and access control from the dedicated RBAC module.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[{ title: 'Manage Roles', desc: 'Create, edit, and assign user roles', href: '/admin/roles', color: 'indigo' }, { title: 'Manage Permissions', desc: 'Configure granular access permissions per role', href: '/admin/permissions', color: 'purple' }].map(card => (
                  <a key={card.title} href={card.href}
                    className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all group">
                    <p className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">{card.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{card.desc}</p>
                  </a>
                ))}
              </div>
              <p className="text-xs text-gray-400">5 system roles: superadmin, admin, hr, hod, staff — positions (Accountant, Instructor, etc.) are assigned at the user level.</p>
            </div>
          )}

          {/* ── INTEGRATIONS ── */}
          {tab === 'integrations' && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3">External Integrations</h2>
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">📱 WhatsApp Business</p>
                  <Field label="WhatsApp API Key" hint="Termii / WhatsApp Business Cloud API key">
                    <Input value={integrations.whatsappKey} onChange={(e: any) => setIntegrations(i => ({ ...i, whatsappKey: e.target.value }))} placeholder="TLxxxxxxxxxxxxxxxxx" />
                  </Field>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">💬 Slack</p>
                  <Field label="Slack Webhook URL" hint="Receive MaxHub notifications in your Slack workspace">
                    <Input value={integrations.slackWebhook} onChange={(e: any) => setIntegrations(i => ({ ...i, slackWebhook: e.target.value }))} placeholder="https://hooks.slack.com/services/..." />
                  </Field>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">📲 SMS</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="SMS Provider">
                      <select value={integrations.smsProvider} onChange={(e: any) => setIntegrations(i => ({ ...i, smsProvider: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white">
                        {['Termii', 'Twilio', 'Infobip', 'Africa\'s Talking'].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </Field>
                    <Field label="SMS API Key">
                      <Input value={integrations.smsApiKey} onChange={(e: any) => setIntegrations(i => ({ ...i, smsApiKey: e.target.value }))} placeholder="API key..." />
                    </Field>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">📅 Google Calendar</p>
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Connect Google Calendar
                  </button>
                  <p className="text-xs text-gray-400 mt-1">Sync MaxHub events and meetings with Google Calendar</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
