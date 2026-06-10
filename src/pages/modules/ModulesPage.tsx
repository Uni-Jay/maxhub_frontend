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
  createdAt: string;
};

export function ModulesPage() {
  const { user } = useAuth();
  const [selectedModule, setSelectedModule] = useState("task-project-management");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const { data: records, isLoading } = useQuery({
    queryKey: ["module-records", selectedModule],
    queryFn: async () => {
      const response = await api.get(`/modules/${selectedModule}`);
      return response.data.data as ModuleRecord[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/modules/${selectedModule}`, {
        title,
        description,
      });
    },
    onSuccess: () => {
      setTitle("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["module-records", selectedModule] });
    },
  });

  const moduleList = useMemo(
    () => moduleSections.flatMap((section) => section.items),
    []
  );

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
            Create and track data entries for this module. This powers attendance, HR, payroll, CRM, LMS, inventory, AI tasks, and more.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <AppInput label="Record title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <AppInput label="Record description" value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>

          <div className="mt-3 max-w-56">
            <AppButton type="button" loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
              Add record
            </AppButton>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="font-serif text-xl text-white">Recent records</h3>
          {isLoading ? (
            <p className="mt-3 text-slate-300">Loading...</p>
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
