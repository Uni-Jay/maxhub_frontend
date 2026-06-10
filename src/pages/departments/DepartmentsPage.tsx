import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { GlassCard } from "../../components/ui/GlassCard";
import { AppInput } from "../../components/ui/AppInput";
import { AppButton } from "../../components/ui/AppButton";
import { useAuth } from "../../context/AuthContext";

type StaffMember = {
  id: string;
  fullName: string;
  employeeId: string;
  role: string;
  position: string;
  email: string;
  isActive: boolean;
};

type DepartmentAnnouncement = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
};

type DepartmentCalendarEvent = {
  id: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
};

type DepartmentProject = {
  id: string;
  title: string;
  description?: string;
  status: "Planned" | "In Progress" | "Completed";
  dueDate: string;
};

type DepartmentRecord = {
  id: string;
  name: string;
  slug: string;
  kpi: number;
  revenue: number;
  staffCount: number;
  chatRoom: string;
  staffList: StaffMember[];
  announcements: DepartmentAnnouncement[];
  calendarEvents: DepartmentCalendarEvent[];
  teamProjects: DepartmentProject[];
  dashboard: {
    openProjects: number;
    announcementsCount: number;
    upcomingCalendarItems: DepartmentCalendarEvent[];
  };
};

const managerRoles = new Set(["Super Admin", "HR", "Head of Admin", "HOD"]);

export function DepartmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSlug, setSelectedSlug] = useState<string>("kurios-sat");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [calendarTitle, setCalendarTitle] = useState("");
  const [calendarDescription, setCalendarDescription] = useState("");
  const [calendarStart, setCalendarStart] = useState("");
  const [calendarEnd, setCalendarEnd] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectDueDate, setProjectDueDate] = useState("");
  const [kpiValue, setKpiValue] = useState("");
  const [revenueValue, setRevenueValue] = useState("");

  const isManager = managerRoles.has(user?.role || "");

  const departmentsQuery = useQuery({
    queryKey: ["departments-list"],
    queryFn: async () => {
      const response = await api.get("/departments");
      return response.data.data as DepartmentRecord[];
    },
  });

  const selectedDepartment = useMemo(
    () => (departmentsQuery.data || []).find((department) => department.slug === selectedSlug),
    [departmentsQuery.data, selectedSlug]
  );

  const refreshDepartments = () => {
    queryClient.invalidateQueries({ queryKey: ["departments-list"] });
  };

  const announcementMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/departments/${selectedSlug}/announcements`, {
        title: announcementTitle,
        message: announcementMessage,
      });
    },
    onSuccess: () => {
      setAnnouncementTitle("");
      setAnnouncementMessage("");
      refreshDepartments();
    },
  });

  const calendarMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/departments/${selectedSlug}/calendar`, {
        title: calendarTitle,
        description: calendarDescription,
        startAt: new Date(calendarStart).toISOString(),
        endAt: new Date(calendarEnd).toISOString(),
      });
    },
    onSuccess: () => {
      setCalendarTitle("");
      setCalendarDescription("");
      setCalendarStart("");
      setCalendarEnd("");
      refreshDepartments();
    },
  });

  const projectMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/departments/${selectedSlug}/projects`, {
        title: projectTitle,
        description: projectDescription,
        dueDate: new Date(projectDueDate).toISOString(),
      });
    },
    onSuccess: () => {
      setProjectTitle("");
      setProjectDescription("");
      setProjectDueDate("");
      refreshDepartments();
    },
  });

  const updateKpiMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/departments/${selectedSlug}/kpi`, {
        kpi: Number(kpiValue),
      });
    },
    onSuccess: () => {
      setKpiValue("");
      refreshDepartments();
    },
  });

  const updateRevenueMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/departments/${selectedSlug}/revenue`, {
        revenue: Number(revenueValue),
      });
    },
    onSuccess: () => {
      setRevenueValue("");
      refreshDepartments();
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <GlassCard className="h-fit p-4">
        <h2 className="font-serif text-xl text-white">Departments</h2>
        <div className="mt-3 space-y-2">
          {(departmentsQuery.data || []).map((department) => (
            <button
              key={department.id}
              type="button"
              onClick={() => setSelectedSlug(department.slug)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                department.slug === selectedSlug ? "bg-[#1f73bf] text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {department.name}
            </button>
          ))}
        </div>
      </GlassCard>

      <div className="space-y-4">
        <GlassCard className="p-4">
          <h1 className="font-serif text-2xl text-white">Department Dashboard</h1>
          <p className="mt-1 text-sm text-slate-300">KPI, revenue, projects, announcements, calendar, staff, and team room access.</p>

          {selectedDepartment ? (
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-white/20 bg-white/5 p-3">
                <p className="text-xs uppercase text-slate-300">KPI</p>
                <p className="mt-1 text-xl font-semibold text-white">{selectedDepartment.kpi}%</p>
              </div>
              <div className="rounded-lg border border-white/20 bg-white/5 p-3">
                <p className="text-xs uppercase text-slate-300">Revenue</p>
                <p className="mt-1 text-xl font-semibold text-white">N{selectedDepartment.revenue.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-white/20 bg-white/5 p-3">
                <p className="text-xs uppercase text-slate-300">Staff</p>
                <p className="mt-1 text-xl font-semibold text-white">{selectedDepartment.staffCount}</p>
              </div>
              <div className="rounded-lg border border-white/20 bg-white/5 p-3">
                <p className="text-xs uppercase text-slate-300">Team Chat Room</p>
                <p className="mt-1 truncate text-sm font-semibold text-white">{selectedDepartment.chatRoom}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-300">Loading department...</p>
          )}

          {isManager ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <AppInput label="Update KPI (0-100)" type="number" min={0} max={100} value={kpiValue} onChange={(event) => setKpiValue(event.target.value)} />
              <AppInput label="Update Revenue" type="number" min={0} value={revenueValue} onChange={(event) => setRevenueValue(event.target.value)} />
              <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
                <AppButton type="button" loading={updateKpiMutation.isPending} onClick={() => updateKpiMutation.mutate()}>
                  Save KPI
                </AppButton>
                <AppButton type="button" loading={updateRevenueMutation.isPending} onClick={() => updateRevenueMutation.mutate()}>
                  Save Revenue
                </AppButton>
              </div>
            </div>
          ) : null}
        </GlassCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <GlassCard className="p-4">
            <h3 className="font-serif text-xl text-white">Staff List</h3>
            <div className="mt-3 space-y-2">
              {(selectedDepartment?.staffList || []).map((staff) => (
                <div key={staff.id} className="rounded-lg border border-white/20 bg-white/5 p-3">
                  <p className="font-semibold text-white">{staff.fullName}</p>
                  <p className="text-xs text-slate-300">{staff.employeeId} • {staff.role} • {staff.position}</p>
                  <p className="text-xs text-slate-400">{staff.email}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <h3 className="font-serif text-xl text-white">Department Announcements</h3>
            {isManager ? (
              <div className="mt-3 space-y-2">
                <AppInput label="Announcement title" value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} />
                <AppInput label="Announcement message" value={announcementMessage} onChange={(event) => setAnnouncementMessage(event.target.value)} />
                <AppButton type="button" loading={announcementMutation.isPending} onClick={() => announcementMutation.mutate()}>
                  Post Announcement
                </AppButton>
              </div>
            ) : null}
            <div className="mt-3 space-y-2">
              {(selectedDepartment?.announcements || []).slice(0, 6).map((announcement) => (
                <div key={announcement.id} className="rounded-lg border border-white/20 bg-white/5 p-3">
                  <p className="font-semibold text-white">{announcement.title}</p>
                  <p className="text-sm text-slate-300">{announcement.message}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <GlassCard className="p-4">
            <h3 className="font-serif text-xl text-white">Department Calendar</h3>
            {isManager ? (
              <div className="mt-3 space-y-2">
                <AppInput label="Event title" value={calendarTitle} onChange={(event) => setCalendarTitle(event.target.value)} />
                <AppInput label="Description" value={calendarDescription} onChange={(event) => setCalendarDescription(event.target.value)} />
                <div className="grid gap-2 md:grid-cols-2">
                  <AppInput label="Start" type="datetime-local" value={calendarStart} onChange={(event) => setCalendarStart(event.target.value)} />
                  <AppInput label="End" type="datetime-local" value={calendarEnd} onChange={(event) => setCalendarEnd(event.target.value)} />
                </div>
                <AppButton type="button" loading={calendarMutation.isPending} onClick={() => calendarMutation.mutate()}>
                  Add Calendar Event
                </AppButton>
              </div>
            ) : null}
            <div className="mt-3 space-y-2">
              {(selectedDepartment?.calendarEvents || []).slice(0, 6).map((event) => (
                <div key={event.id} className="rounded-lg border border-white/20 bg-white/5 p-3">
                  <p className="font-semibold text-white">{event.title}</p>
                  <p className="text-xs text-slate-300">
                    {new Date(event.startAt).toLocaleString()} - {new Date(event.endAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <h3 className="font-serif text-xl text-white">Team Projects</h3>
            {isManager ? (
              <div className="mt-3 space-y-2">
                <AppInput label="Project title" value={projectTitle} onChange={(event) => setProjectTitle(event.target.value)} />
                <AppInput label="Description" value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} />
                <AppInput label="Due date" type="date" value={projectDueDate} onChange={(event) => setProjectDueDate(event.target.value)} />
                <AppButton type="button" loading={projectMutation.isPending} onClick={() => projectMutation.mutate()}>
                  Create Team Project
                </AppButton>
              </div>
            ) : null}
            <div className="mt-3 space-y-2">
              {(selectedDepartment?.teamProjects || []).slice(0, 8).map((project) => (
                <div key={project.id} className="rounded-lg border border-white/20 bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-white">{project.title}</p>
                    <span className="text-xs text-slate-300">{project.status}</span>
                  </div>
                  <p className="text-xs text-slate-400">Due: {new Date(project.dueDate).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
