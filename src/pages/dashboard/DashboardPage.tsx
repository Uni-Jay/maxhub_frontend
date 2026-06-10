import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { roleDashboardMap } from "../../data/modules";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { GlassCard } from "../../components/ui/GlassCard";

type DashboardData = {
  companyOverview: {
    company: string;
    staffCount: number;
    departments: number;
    revenue: number;
  };
  attendanceSummary: {
    present: number;
    absent: number;
    leave: number;
  };
  tasksOverview: {
    open: number;
    inProgress: number;
    done: number;
  };
  projectsOverview: {
    active: number;
    pending: number;
    archived: number;
  };
  crmStatistics: {
    leads: number;
    converted: number;
    followUps: number;
  };
  attendanceAnalytics: {
    recordsToday: number;
    lateToday: number;
    overtimeToday: number;
  };
  collaboration: {
    messagesToday: number;
    activeRooms: number;
    announcements: number;
  };
  roleWidgets: string[];
  role: string;
};

export function DashboardPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const response = await api.get("/dashboard/summary");
      return response.data.data as DashboardData;
    },
  });

  const metrics = data
    ? [
        { label: "Staff count", value: data.companyOverview.staffCount },
        { label: "Total revenue", value: `N${data.companyOverview.revenue.toLocaleString()}` },
        { label: "Present today", value: data.attendanceSummary.present },
        { label: "Open tasks", value: data.tasksOverview.open },
        { label: "CRM leads", value: data.crmStatistics.leads },
        { label: "Active projects", value: data.projectsOverview.active },
      ]
    : [];

  const chartData = data
    ? [
        { name: "Attendance", value: data.attendanceAnalytics.recordsToday },
        { name: "Messages", value: data.collaboration.messagesToday },
        { name: "Leads", value: data.crmStatistics.leads },
        { name: "Tasks", value: data.tasksOverview.open + data.tasksOverview.inProgress },
      ]
    : [];

  return (
    <div className="space-y-6">
      <GlassCard>
        <h1 className="font-serif text-3xl text-white">{user?.role} Dashboard</h1>
        <p className="mt-2 text-sm text-slate-200/80">{roleDashboardMap[user?.role || "Staff"]}</p>
      </GlassCard>

      {isLoading ? (
        <GlassCard>
          <p className="text-slate-200">Loading dashboard...</p>
        </GlassCard>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <GlassCard key={metric.label} className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">{metric.label}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{metric.value}</p>
              </GlassCard>
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <GlassCard className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Operational Snapshot</p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#b2d1ff" />
                    <YAxis stroke="#b2d1ff" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2c88d9" radius={6} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Role Widgets</p>
              <div className="mt-3 space-y-2">
                {(data?.roleWidgets || []).map((widget) => (
                  <div key={widget} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100">
                    {widget}
                  </div>
                ))}
              </div>
            </GlassCard>
          </section>
        </>
      )}
    </div>
  );
}
