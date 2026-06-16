import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApiMutation } from '@hooks/useApiMutation';
import { communicationService } from '@services/communicationService';
import { ArrowLeft, Send } from 'lucide-react';
import type { CommChannel } from '@/types';

const schema = z.object({
  channel: z.enum(['Email', 'SMS', 'WhatsApp'] as [CommChannel, ...CommChannel[]]),
  recipientType: z.enum(['All', 'Department', 'Selected', 'Country', 'Status']),
  recipientFilter: z.string().optional(),
  subject: z.string().min(3, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  templateId: z.coerce.number().optional(),
  scheduledAt: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const inputClass = 'w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500';

const RECIPIENT_TYPE_HINTS: Record<string, string> = {
  All: 'Message will be sent to all active clients',
  Department: 'Enter department ID to filter recipients',
  Selected: 'Enter comma-separated client IDs',
  Country: 'Enter country name to filter (e.g. Nigeria)',
  Status: 'Enter client status (Active, Pending, etc.)',
};

export default function SendMessage() {
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const [result, setResult] = useState<{ successCount: number; failureCount: number } | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { channel: 'Email', recipientType: 'All' },
  });

  const recipientType = watch('recipientType');

  const sendMutation = useApiMutation(
    (data: FormData) => communicationService.send({
      ...data,
      recipientFilter: data.recipientFilter ? { value: data.recipientFilter } : undefined,
    }),
    {
      invalidateKeys: [['comm-logs']],
      onSuccess: (res) => {
        setResult(res);
        setSent(true);
      },
    }
  );

  if (sent && result) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6 py-16">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
          <Send className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Message Sent!</h2>
          <p className="text-gray-500 mt-2">
            Successfully sent to <strong>{result.successCount}</strong> recipients.
            {result.failureCount > 0 && ` Failed: ${result.failureCount}.`}
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setSent(false); setResult(null); }} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
            Send Another
          </button>
          <button onClick={() => navigate('/communication/history')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition">
            View Logs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Send Message</h1>
          <p className="text-sm text-gray-500">Compose and send a message to your clients</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => sendMutation.mutate(d))} className="space-y-5">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Channel *</label>
              <select {...register('channel')} className={inputClass}>
                <option value="Email">Email</option>
                <option value="SMS">SMS</option>
                <option value="WhatsApp">WhatsApp</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recipients *</label>
              <select {...register('recipientType')} className={inputClass}>
                <option value="All">All Active Clients</option>
                <option value="Department">By Department</option>
                <option value="Country">By Country</option>
                <option value="Status">By Status</option>
                <option value="Selected">Selected IDs</option>
              </select>
            </div>
          </div>

          {recipientType !== 'All' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter Value
              </label>
              <input
                {...register('recipientFilter')}
                className={inputClass}
                placeholder={RECIPIENT_TYPE_HINTS[recipientType]}
              />
              <p className="text-xs text-gray-400 mt-1">{RECIPIENT_TYPE_HINTS[recipientType]}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject *</label>
            <input {...register('subject')} className={inputClass} placeholder="Message subject" />
            {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message *</label>
            <textarea
              {...register('message')}
              rows={6}
              className={inputClass}
              placeholder="Write your message here..."
            />
            {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Schedule (optional)
            </label>
            <input type="datetime-local" {...register('scheduledAt')} className={inputClass} />
            <p className="text-xs text-gray-400 mt-1">Leave blank to send immediately</p>
          </div>
        </div>

        {sendMutation.error && (
          <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
            {(sendMutation.error as Error).message || 'Failed to send message'}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            Cancel
          </button>
          <button
            type="submit"
            disabled={sendMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition"
          >
            <Send className="h-4 w-4" />
            {sendMutation.isPending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </form>
    </div>
  );
}
