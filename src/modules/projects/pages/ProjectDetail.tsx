import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useApiQuery } from '@hooks/useApiQuery';
import { useApiMutation } from '@hooks/useApiMutation';
import { useStatusBadge } from '@hooks/useStatusBadge';
import { projectService } from '@services/projectService';
import type { TaskItem } from '@/types';
import { Send } from 'lucide-react';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getBadgeClass, formatLabel } = useStatusBadge();

  const { data: project, isLoading, isError } = useApiQuery(
    ['projects', id],
    () => projectService.getById(id!),
    { enabled: !!id }
  );

  const { data: tasks } = useApiQuery(
    ['projects', id, 'tasks'],
    () => projectService.getTasks(id!) as Promise<TaskItem[]>,
    { enabled: !!id }
  );

  const { mutate: remove, isPending: removing } = useApiMutation(
    () => fetch(`/api/projects/${id}`, { method: 'DELETE' }),
    {
      invalidateKeys: [['projects']],
      onSuccess: () => navigate('/projects'),
    }
  );

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (isError || !project) return <div className="p-6 text-red-600">Project not found.</div>;

  const budgetPct = project.budget && project.actualCost
    ? Math.min(100, Math.round((project.actualCost / project.budget) * 100))
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-gray-500 text-sm">{project.projectCode}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/projects')}>Back</Button>
          <Link to={`/projects/${id}/edit`}>
            <Button>Edit</Button>
          </Link>
          <Button
            variant="destructive"
            disabled={removing}
            onClick={() => { if (confirm('Delete this project?')) remove(undefined); }}
          >
            {removing ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="p-4 border rounded-lg space-y-3">
          <h3 className="font-semibold text-lg">Project Details</h3>
          {project.description && <Field label="Description" value={project.description} />}
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getBadgeClass(project.status)}`}>
              {formatLabel(project.status)}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-600">Priority</p>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getBadgeClass(project.priority)}`}>
              {project.priority}
            </span>
          </div>
          <Field label="Department" value={project.department?.name} />
          <Field
            label="Project Manager"
            value={project.projectManager ? `${project.projectManager.firstName} ${project.projectManager.lastName}` : undefined}
          />
          <Field
            label="Duration"
            value={`${new Date(project.startDate).toLocaleDateString()} → ${project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Ongoing'}`}
          />
        </div>

        <div className="p-4 border rounded-lg space-y-3">
          <h3 className="font-semibold text-lg">Progress & Budget</h3>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Progress</span>
              <span className="font-semibold">{project.progress ?? 0}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${project.progress ?? 0}%` }} />
            </div>
          </div>
          {project.budget != null && (
            <>
              <Field label="Total Budget" value={`$${project.budget.toLocaleString()}`} />
              {project.actualCost != null && (
                <>
                  <Field label="Spent" value={`$${project.actualCost.toLocaleString()}`} />
                  <Field label="Remaining" value={`$${(project.budget - project.actualCost).toLocaleString()}`} />
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div className="h-2 bg-orange-500 rounded-full" style={{ width: `${budgetPct}%` }} />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {tasks && tasks.length > 0 && (
        <div className="p-4 border rounded-lg space-y-3">
          <h3 className="font-semibold text-lg">Tasks ({tasks.length})</h3>
          <div className="space-y-2">
            {tasks.map(t => (
              <Link key={t.id} to={`/tasks/${t.id}`} className="block">
                <div className="flex justify-between items-center p-2 rounded hover:bg-gray-50">
                  <span className="font-medium text-sm">{t.title}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getBadgeClass(t.status)}`}>
                    {formatLabel(t.status)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <ProjectReports projectId={id!} />
    </div>
  );
}

function ProjectReports({ projectId }: { projectId: string }) {
  const [content, setContent] = useState('');

  const { data: comments, isLoading } = useApiQuery(
    ['projects', projectId, 'comments'],
    () => projectService.getComments(projectId),
    { enabled: !!projectId }
  );

  const { mutate: submitReport, isPending: submitting } = useApiMutation(
    (text: string) => projectService.addComment(projectId, text),
    {
      invalidateKeys: [['projects', projectId, 'comments']],
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
          placeholder="Submit a report or update on this project..."
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
