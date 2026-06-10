import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { moduleSections } from "../../data/modules";
import { api } from "../../lib/api";
import { GlassCard } from "../../components/ui/GlassCard";
import { AppButton } from "../../components/ui/AppButton";
import { AppInput } from "../../components/ui/AppInput";
import { useAuth } from "../../context/AuthContext";
import { StaffControlPanel } from "./StaffControlPanel";

type ModuleRecord = {
  id: string;
  title: string;
  description: string;
  status: string;
  type?: "task" | "project";
  assigneeId?: string;
  boardColumn?: string;
  progress?: number;
  attachments?: Array<{ id?: string; name: string; url?: string }>;
  comments?: Array<{ id: string; comment: string; userId: string; createdAt: string }>;
  collaborators?: string[];
  meta?: {
    priority?: string;
    dueDate?: string;
    recurring?: string;
  };
  createdAt: string;
};

type StaffMember = {
  id: string;
  fullName: string;
  role: string;
};

const taskColumns = ["backlog", "todo", "in-progress", "review", "done"];

export function ModulesPage() {
  const { user } = useAuth();
  const [selectedModule, setSelectedModule] = useState("task-project-management");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"task" | "project">("task");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");
  const [recurring, setRecurring] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const moduleList = useMemo(() => moduleSections.flatMap((section) => section.items), []);
  const isTaskModule = selectedModule === "task-project-management";

  const { data: records, isLoading } = useQuery({
    queryKey: ["module-records", selectedModule],
    queryFn: async () => {
      const response = await api.get(`/modules/${selectedModule}`);
      return response.data.data as ModuleRecord[];
    },
  });

  const { data: analytics } = useQuery({
    queryKey: ["module-analytics", selectedModule],
    enabled: isTaskModule,
    queryFn: async () => {
      const response = await api.get(`/modules/${selectedModule}/analytics`);
      return response.data.data as {
        total: number;
        byStatus: Record<string, number>;
        byPriority: Record<string, number>;
        overdue: number;
        recurring: number;
      };
    },
  });

  const { data: staff } = useQuery({
    queryKey: ["staff-list-assign"],
    enabled: isTaskModule,
    queryFn: async () => {
      const response = await api.get("/users/staff");
      return response.data.data as StaffMember[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const body = isTaskModule
        ? {
            title,
            description,
            status: "backlog",
            type,
            assigneeId: assigneeId || "",
            priority,
            dueDate: dueDate ? new Date(dueDate).toISOString() : "",
            recurring,
            attachments: attachmentName
              ? [
                  {
                    name: attachmentName,
                    url: attachmentUrl,
                  },
                ]
              : [],
            collaborators: assigneeId ? [assigneeId] : [],
          }
        : { title, description };

      await api.post(`/modules/${selectedModule}`, body);
    },
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setAssigneeId("");
      setDueDate("");
      setRecurring("");
      setAttachmentName("");
      setAttachmentUrl("");
      queryClient.invalidateQueries({ queryKey: ["module-records", selectedModule] });
      queryClient.invalidateQueries({ queryKey: ["module-analytics", selectedModule] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (input: { recordId: string; status: string }) => {
      await api.patch(`/modules/${selectedModule}/${input.recordId}/status`, {
        status: input.status,
        progress: input.status === "done" ? 100 : input.status === "in-progress" ? 60 : 20,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module-records", selectedModule] });
      queryClient.invalidateQueries({ queryKey: ["module-analytics", selectedModule] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (input: { recordId: string; comment: string }) => {
      await api.post(`/modules/${selectedModule}/${input.recordId}/comments`, {
        comment: input.comment,
      });
    },
    onSuccess: (_, variables) => {
      setCommentMap((previous) => ({ ...previous, [variables.recordId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["module-records", selectedModule] });
    },
  });

  const addAttachmentMutation = useMutation({
    mutationFn: async (input: { recordId: string; name: string; url: string }) => {
      await api.post(`/modules/${selectedModule}/${input.recordId}/attachments`, {
        name: input.name,
        url: input.url,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module-records", selectedModule] });
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <GlassCard className="h-fit p-4">
        <h2 className="font-serif text-xl text-white">Feature Modules</h2>
        <div className="mt-3 space-y-2">
          {moduleList.map((moduleName) => (
            <button
              key={moduleName}
              type="button"
              onClick={() => setSelectedModule(moduleName)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                selectedModule === moduleName ? "bg-[#1f73bf] text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {moduleName}
            </button>
          ))}
        </div>
      </GlassCard>

      <div className="space-y-4">
        {user?.role === "Super Admin" ? <StaffControlPanel /> : null}

        <GlassCard>
          <h2 className="font-serif text-2xl text-white">{selectedModule}</h2>
          <p className="mt-1 text-sm text-slate-200/70">
            {isTaskModule
              ? "Create projects, assign tasks, manage kanban boards, deadlines, priority, recurring tasks, attachments, comments, and analytics."
              : "Create and track data entries for this module."}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <AppInput label="Record title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <AppInput label="Record description" value={description} onChange={(event) => setDescription(event.target.value)} />

            {isTaskModule ? (
              <>
                <label className="flex flex-col gap-2 text-sm text-slate-100/90">
                  <span className="font-medium tracking-wide">Type</span>
                  <select value={type} onChange={(event) => setType(event.target.value as "task" | "project")} className="h-11 rounded-xl border border-white/20 bg-white/10 px-3 text-white">
                    <option value="task">Task</option>
                    <option value="project">Project</option>
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm text-slate-100/90">
                  <span className="font-medium tracking-wide">Assignee</span>
                  <select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} className="h-11 rounded-xl border border-white/20 bg-white/10 px-3 text-white">
                    <option value="">Unassigned</option>
                    {(staff || []).map((person) => (
                      <option key={person.id} value={person.id}>{person.fullName} ({person.role})</option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm text-slate-100/90">
                  <span className="font-medium tracking-wide">Priority</span>
                  <select value={priority} onChange={(event) => setPriority(event.target.value)} className="h-11 rounded-xl border border-white/20 bg-white/10 px-3 text-white">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </label>

                <AppInput label="Deadline" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                <AppInput label="Recurring pattern (optional)" placeholder="e.g. weekly, monthly" value={recurring} onChange={(event) => setRecurring(event.target.value)} />
                <AppInput label="Attachment name" value={attachmentName} onChange={(event) => setAttachmentName(event.target.value)} />
                <AppInput label="Attachment URL" value={attachmentUrl} onChange={(event) => setAttachmentUrl(event.target.value)} />
              </>
            ) : null}
          </div>

          <div className="mt-3 max-w-56">
            <AppButton type="button" loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
              Add record
            </AppButton>
          </div>
        </GlassCard>

        {isTaskModule ? (
          <GlassCard>
            <h3 className="font-serif text-xl text-white">Project Analytics</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-5 text-sm">
              <div className="rounded-lg border border-white/20 bg-white/5 p-3 text-slate-100">Total: {analytics?.total || 0}</div>
              <div className="rounded-lg border border-white/20 bg-white/5 p-3 text-slate-100">Overdue: {analytics?.overdue || 0}</div>
              <div className="rounded-lg border border-white/20 bg-white/5 p-3 text-slate-100">Recurring: {analytics?.recurring || 0}</div>
              <div className="rounded-lg border border-white/20 bg-white/5 p-3 text-slate-100">Done: {analytics?.byStatus?.done || 0}</div>
              <div className="rounded-lg border border-white/20 bg-white/5 p-3 text-slate-100">In Progress: {analytics?.byStatus?.["in-progress"] || 0}</div>
            </div>
          </GlassCard>
        ) : null}

        <GlassCard>
          <h3 className="font-serif text-xl text-white">Recent records</h3>

          {isLoading ? (
            <p className="mt-3 text-slate-300">Loading...</p>
          ) : isTaskModule ? (
            <div className="mt-4 grid gap-3 xl:grid-cols-5">
              {taskColumns.map((column) => (
                <div key={column} className="rounded-xl border border-white/20 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-wider text-slate-300">{column}</p>
                  <div className="mt-3 space-y-3">
                    {(records || [])
                      .filter((record) => (record.boardColumn || "backlog") === column)
                      .map((record) => (
                        <div key={record.id} className="rounded-lg border border-white/20 bg-black/20 p-3">
                          <p className="font-semibold text-white">{record.title}</p>
                          <p className="mt-1 text-xs text-slate-300">{record.description}</p>
                          <p className="mt-1 text-xs text-slate-400">Priority: {record.meta?.priority || "normal"}</p>
                          <p className="text-xs text-slate-400">Deadline: {record.meta?.dueDate ? new Date(record.meta.dueDate).toLocaleDateString() : "N/A"}</p>
                          <p className="text-xs text-slate-400">Progress: {record.progress || 0}%</p>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {taskColumns.map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => statusMutation.mutate({ recordId: record.id, status })}
                                className="rounded-md border border-white/20 px-2 py-1 text-[10px] text-slate-200"
                              >
                                {status}
                              </button>
                            ))}
                          </div>

                          <div className="mt-2 space-y-1">
                            {(record.comments || []).slice(-2).map((comment) => (
                              <p key={comment.id} className="rounded bg-white/10 px-2 py-1 text-[10px] text-slate-200">{comment.comment}</p>
                            ))}
                          </div>

                          <div className="mt-2 flex gap-2">
                            <input
                              value={commentMap[record.id] || ""}
                              onChange={(event) => setCommentMap((previous) => ({ ...previous, [record.id]: event.target.value }))}
                              placeholder="Comment"
                              className="h-8 w-full rounded border border-white/20 bg-white/10 px-2 text-xs text-white"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const comment = commentMap[record.id] || "";
                                if (!comment.trim()) return;
                                commentMutation.mutate({ recordId: record.id, comment });
                              }}
                              className="rounded border border-white/20 px-2 text-xs text-slate-100"
                            >
                              Add
                            </button>
                          </div>

                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => addAttachmentMutation.mutate({ recordId: record.id, name: "Reference", url: "" })}
                              className="rounded border border-white/20 px-2 py-1 text-[10px] text-slate-100"
                            >
                              Attach
                            </button>
                            <p className="text-[10px] text-slate-300">Files: {(record.attachments || []).length}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          ) : records?.length ? (
            <div className="mt-4 grid gap-3">
              {records.map((record) => (
                <div key={record.id} className="rounded-xl border border-white/20 bg-white/5 p-4">
                  <p className="font-semibold text-white">{record.title}</p>
                  <p className="mt-1 text-sm text-slate-300">{record.description}</p>
                  <p className="mt-2 text-xs uppercase tracking-wider text-slate-400">{record.status}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-slate-300">No records yet.</p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
