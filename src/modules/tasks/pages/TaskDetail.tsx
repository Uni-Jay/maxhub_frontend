import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useApiQuery } from '@hooks/useApiQuery';
import { useApiMutation } from '@hooks/useApiMutation';
import { useStatusBadge } from '@hooks/useStatusBadge';
import { taskService } from '@services/taskService';
import { Send } from 'lucide-react';

const TASK_STATUSES = ['Todo', 'InProgress', 'InReview', 'Blocked', 'Done', 'Cancelled'];

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getBadgeClass, formatLabel } = useStatusBadge();
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const { data: task, isLoading, isError } = useApiQuery(
    ['tasks', id],
    () => taskService.getById(id!),
    { enabled: !!id }
  );

  const { mutate: updateStatus } = useApiMutation(
    (status: string) => taskService.updateStatus(id!, status),
    { invalidateKeys: [['tasks', id], ['tasks']] }
  );

  const { mutate: remove, isPending: removing } = useApiMutation(
    () => taskService.remove(id!),
    {
      invalidateKeys: [['tasks']],
      onSuccess: () => navigate('/tasks'),
    }
  );

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (isError || !task) return <div className="p-6 text-red-600">Task not found.</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{task.title}</h1>
          <p className="text-gray-500 text-sm">{task.taskCode}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/tasks')}>Back</Button>
          <Link to={`/tasks/${id}/edit`}>
            <Button>Edit</Button>
          </Link>
          <Button
            variant="destructive"
            disabled={removing}
            onClick={() => { if (confirm('Delete this task?')) remove(undefined); }}
          >
            {removing ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="p-4 border rounded-lg space-y-3">
          <h3 className="font-semibold text-lg">Task Details</h3>
          {task.description && <Field label="Description" value={task.description} />}
          <Field label="Project" value={task.project?.name} />
          <div className="flex gap-3 items-center">
            <div>
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(v => !v)}
                  className={`px-2 py-1 rounded text-xs font-medium ${getBadgeClass(task.status)} cursor-pointer`}
                >
                  {formatLabel(task.status)} ▾
                </button>
                {showStatusMenu && (
                  <div className="absolute z-10 mt-1 bg-white border rounded shadow-lg">
                    {TASK_STATUSES.map(s => (
                      <button
                        key={s}
                        className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                        onClick={() => { updateStatus(s); setShowStatusMenu(false); }}
                      >
                        {formatLabel(s)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Priority</p>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getBadgeClass(task.priority)}`}>
                {task.priority}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 border rounded-lg space-y-3">
          <h3 className="font-semibold text-lg">Assignment</h3>
          <Field
            label="Assigned To"
            value={task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned'}
          />
          {task.startDate && <Field label="Start Date" value={new Date(task.startDate).toLocaleDateString()} />}
          {task.dueDate && <Field label="Due Date" value={new Date(task.dueDate).toLocaleDateString()} />}
          {task.estimatedHours != null && <Field label="Estimated Hours" value={`${task.estimatedHours}h`} />}
          {task.actualHours != null && <Field label="Actual Hours" value={`${task.actualHours}h`} />}
          {task.createdAt && <Field label="Created" value={new Date(task.createdAt).toLocaleDateString()} />}
        </div>
      </div>

      <TaskReports taskId={id!} />
    </div>
  );
}

function TaskReports({ taskId }: { taskId: string }) {
  const [content, setContent] = useState('');

  const { data: comments, isLoading } = useApiQuery(
    ['tasks', taskId, 'comments'],
    () => taskService.getComments(taskId),
    { enabled: !!taskId }
  );

  const { mutate: submitReport, isPending: submitting } = useApiMutation(
    (text: string) => taskService.addComment(taskId, text),
    {
      invalidateKeys: [['tasks', taskId, 'comments']],
      onSuccess: () => setContent(''),
    }
  );

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <h3 className="font-semibold text-lg">Reports / Updates</h3>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
        {!isLoading && (!comments || comments.length === 0) && (
          <p className="text-sm text-gray-500">No reports submitted yet.</p>
        )}
        {comments?.map(c => (
          <div key={c.id} className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between items-baseline">
              <p className="text-sm font-medium">
                {c.author ? `${c.author.firstName} ${c.author.lastName}` : 'Staff'}
              </p>
              <p className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString()}</p>
            </div>
            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{c.content}</p>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (content.trim()) submitReport(content.trim());
        }}
        className="flex gap-2"
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Submit a report or update on this task..."
          rows={2}
          className="flex-1 border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button type="submit" disabled={submitting || !content.trim()} className="self-end">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
