import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@hooks/useApiMutation';
import { communicationService } from '@services/communicationService';
import type { MessageTemplate } from '@/types';
type TemplateType = MessageTemplate['type'];
import { Plus, Edit2, Trash2, X, CheckCircle2, XCircle } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  type: z.enum(['Weekly', 'Birthday', 'Custom', 'Welcome', 'Reminder'] as [TemplateType, ...TemplateType[]]),
  subject: z.string().min(2, 'Subject is required'),
  emailContent: z.string().optional(),
  smsContent: z.string().optional(),
  whatsappContent: z.string().optional(),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof schema>;

const inputClass = 'w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500';

const TYPE_BADGE: Record<TemplateType, string> = {
  Weekly: 'bg-purple-100 text-purple-800',
  Birthday: 'bg-pink-100 text-pink-800',
  Custom: 'bg-blue-100 text-blue-800',
  Welcome: 'bg-green-100 text-green-800',
  Reminder: 'bg-yellow-100 text-yellow-800',
};

export default function MessageTemplates() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: templates, refetch } = useQuery({
    queryKey: ['msg-templates'],
    queryFn: () => communicationService.getTemplates(),
    staleTime: 30_000,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'Custom', isActive: true },
  });

  const createMutation = useApiMutation(
    (data: FormData) => editingId
      ? communicationService.updateTemplate(editingId, data)
      : communicationService.createTemplate(data),
    {
      invalidateKeys: [['msg-templates']],
      onSuccess: () => { setShowForm(false); setEditingId(null); reset(); refetch(); },
    }
  );

  const deleteMutation = useApiMutation(
    (id: number) => communicationService.deleteTemplate(id),
    { invalidateKeys: [['msg-templates']], onSuccess: () => refetch() }
  );

  const startEdit = (t: FormData & { id: number }) => {
    setEditingId(t.id);
    reset(t);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Message Templates</h1>
          <p className="text-gray-500 text-sm mt-1">Manage reusable message templates for clients</p>
        </div>
        <button
          onClick={() => { setEditingId(null); reset({ type: 'Custom', isActive: true }); setShowForm(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {editingId ? 'Edit Template' : 'Create Template'}
            </h2>
            <button onClick={() => { setShowForm(false); setEditingId(null); reset(); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template Name *</label>
                <input {...register('name')} className={inputClass} placeholder="e.g. Weekly Update" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
                <select {...register('type')} className={inputClass}>
                  {['Weekly', 'Birthday', 'Custom', 'Welcome', 'Reminder'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject *</label>
              <input {...register('subject')} className={inputClass} placeholder="Email / notification subject" />
              {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Content</label>
              <textarea {...register('emailContent')} rows={4} className={inputClass} placeholder="HTML or plain text email body. Use {{name}}, {{company}} placeholders." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SMS Content</label>
                <textarea {...register('smsContent')} rows={3} className={inputClass} placeholder="Short SMS text (160 chars)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">WhatsApp Content</label>
                <textarea {...register('whatsappContent')} rows={3} className={inputClass} placeholder="WhatsApp message text" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" {...register('isActive')} className="rounded" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Active (available for sending)</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowForm(false); reset(); }} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
              <button type="submit" disabled={createMutation.isPending} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition">
                {createMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!templates?.length ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p>No templates yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{t.name}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_BADGE[t.type]}`}>{t.type}</span>
                    {t.isActive ? (
                      <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3 w-3" />Active</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-400"><XCircle className="h-3 w-3" />Inactive</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{t.subject}</p>
                  {t.emailContent && (
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2">{t.emailContent}</p>
                  )}
                  <div className="flex gap-2 mt-2 text-xs text-gray-400">
                    {t.emailContent && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Email</span>}
                    {t.smsContent && <span className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded">SMS</span>}
                    {t.whatsappContent && <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">WhatsApp</span>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(t as any)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => { if (confirm('Delete this template?')) deleteMutation.mutate(t.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
