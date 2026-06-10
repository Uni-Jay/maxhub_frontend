import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppButton } from "../../components/ui/AppButton";
import { AppInput } from "../../components/ui/AppInput";
import { GlassCard } from "../../components/ui/GlassCard";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";

const schema = z.object({
  fullName: z.string().min(2),
  avatar: z.string().optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  emergencyContactsRaw: z.string().optional(),
  position: z.string().optional(),
  salaryGrade: z.string().optional(),
  employmentDate: z.string().optional(),
  documentsRaw: z.string().optional(),
  socialLinksRaw: z.string().optional(),
  skillsRaw: z.string().optional(),
  bio: z.string().optional(),
  performanceScore: z.number().min(0).max(100),
});

type FormValues = z.infer<typeof schema>;

type SessionItem = {
  id: string;
  startedAt: string;
  endedAt?: string;
  active: boolean;
  device: {
    userAgent: string;
    ip: string;
  };
};

type LoginHistoryItem = {
  id: string;
  at: string;
  status: string;
  reason?: string;
  device: {
    userAgent: string;
    ip: string;
  };
};

type ActivityLogItem = {
  id: string;
  action: string;
  createdAt: string;
  meta?: Record<string, unknown>;
};

function splitCsv(input?: string) {
  return (input || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ProfilePage() {
  const { user, reloadProfile } = useAuth();
  const canEditPerformanceScore = user?.role === "HR" || user?.role === "Super Admin";
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<string[]>(user?.documents || []);

  const sessionsQuery = useQuery({
    queryKey: ["auth-sessions"],
    queryFn: async () => {
      const response = await api.get("/auth/sessions");
      return response.data.data as SessionItem[];
    },
  });

  const loginHistoryQuery = useQuery({
    queryKey: ["auth-login-history"],
    queryFn: async () => {
      const response = await api.get("/auth/login-history");
      return response.data.data as LoginHistoryItem[];
    },
  });

  const activityLogsQuery = useQuery({
    queryKey: ["auth-activity-logs"],
    queryFn: async () => {
      const response = await api.get("/auth/activity-logs");
      return response.data.data as ActivityLogItem[];
    },
  });

  const defaultValues = useMemo(
    () => ({
      fullName: user?.fullName || "",
      avatar: user?.avatar || "",
      phoneNumber: user?.phoneNumber || "",
      address: user?.address || "",
      emergencyContactsRaw: (user?.emergencyContacts || []).join(", "),
      position: user?.position || "",
      salaryGrade: user?.salaryGrade || "",
      employmentDate: user?.employmentDate ? user.employmentDate.slice(0, 10) : "",
      documentsRaw: (user?.documents || []).join(", "),
      socialLinksRaw: (user?.socialLinks || []).join(", "),
      skillsRaw: (user?.skills || []).join(", "),
      bio: user?.bio || "",
      performanceScore: user?.performanceScore ?? 0,
    }),
    [user]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
    setDocuments(user?.documents || []);
  }, [defaultValues, reset, user]);

  const onSubmit = async (values: FormValues) => {
    try {
      let avatarValue = values.avatar || "";
      if (avatarFile) {
        avatarValue = await fileToDataUrl(avatarFile);
      }

      const payload = {
        fullName: values.fullName,
        avatar: avatarValue,
        phoneNumber: values.phoneNumber || "",
        address: values.address || "",
        emergencyContacts: splitCsv(values.emergencyContactsRaw),
        position: values.position || "",
        salaryGrade: values.salaryGrade || "",
        employmentDate: values.employmentDate || "",
        documents: [...splitCsv(values.documentsRaw), ...documents],
        socialLinks: splitCsv(values.socialLinksRaw),
        skills: splitCsv(values.skillsRaw),
        bio: values.bio || "",
        ...(canEditPerformanceScore ? { performanceScore: values.performanceScore } : {}),
      };

      await api.patch("/auth/profile", payload);
      await reloadProfile();
      setAvatarFile(null);
    } catch (error: any) {
      setError("root", {
        message: error.response?.data?.message || "Unable to update profile",
      });
    }
  };

  const handleDocumentsUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const uploaded = files.map((file) => file.name);
    setDocuments((prev) => [...prev, ...uploaded]);
  };

  return (
    <GlassCard className="max-w-4xl">
      <h1 className="font-serif text-3xl text-white">Staff Profile</h1>
      <p className="mt-2 text-sm text-slate-300">Review and update your staff details, records, and performance profile.</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <AppInput label="Employee ID" value={user?.employeeId || ""} disabled />
        <AppInput label="Email" value={user?.email || ""} disabled />
        <AppInput label="Department" value={user?.department || ""} disabled />
        <AppInput label="Role" value={user?.role || ""} disabled />
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-3 md:grid-cols-2">
          <AppInput label="Full name" error={errors.fullName?.message} {...register("fullName")} />
          <AppInput label="Position" {...register("position")} />
          <AppInput label="Phone number" {...register("phoneNumber")} />
          <AppInput label="Address" {...register("address")} />
          <AppInput label="Salary grade" {...register("salaryGrade")} />
          <AppInput label="Employment date" type="date" {...register("employmentDate")} />
          <AppInput
            label="Performance score (0-100)"
            type="number"
            min={0}
            max={100}
            disabled={!canEditPerformanceScore}
            {...register("performanceScore", { valueAsNumber: true })}
          />
          <AppInput label="Avatar URL (optional)" {...register("avatar")} />
        </div>

        {!canEditPerformanceScore ? (
          <p className="text-xs text-amber-200">Only HR or Super Admin can update performance score.</p>
        ) : null}

        <label className="flex flex-col gap-2 text-sm text-slate-100/90">
          <span className="font-medium tracking-wide">Upload passport/avatar file</span>
          <input type="file" accept="image/*" onChange={(event) => setAvatarFile(event.target.files?.[0] || null)} />
          <span className="text-xs text-slate-300">Select an image to replace current avatar.</span>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-100/90">
          <span className="font-medium tracking-wide">Emergency contacts (comma-separated)</span>
          <textarea className="min-h-20 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white outline-none placeholder:text-slate-200/60 focus:border-[#65b7ff]" {...register("emergencyContactsRaw")} />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-100/90">
          <span className="font-medium tracking-wide">Social links (comma-separated)</span>
          <textarea className="min-h-20 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white outline-none placeholder:text-slate-200/60 focus:border-[#65b7ff]" {...register("socialLinksRaw")} />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-100/90">
          <span className="font-medium tracking-wide">Skills (comma-separated)</span>
          <textarea className="min-h-20 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white outline-none placeholder:text-slate-200/60 focus:border-[#65b7ff]" {...register("skillsRaw")} />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-100/90">
          <span className="font-medium tracking-wide">Documents upload</span>
          <input type="file" multiple onChange={handleDocumentsUpload} />
          <span className="text-xs text-slate-300">Uploaded files are tracked by filename in your profile.</span>
        </label>

        {documents.length ? (
          <div className="rounded-xl border border-white/20 bg-white/5 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-300">Saved document files</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {documents.map((doc, index) => (
                <span key={`${doc}-${index}`} className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-100">
                  {doc}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <label className="flex flex-col gap-2 text-sm text-slate-100/90">
          <span className="font-medium tracking-wide">Bio</span>
          <textarea className="min-h-28 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white outline-none placeholder:text-slate-200/60 focus:border-[#65b7ff]" {...register("bio")} />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-100/90">
          <span className="font-medium tracking-wide">Documents (comma-separated links or refs)</span>
          <textarea className="min-h-20 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white outline-none placeholder:text-slate-200/60 focus:border-[#65b7ff]" {...register("documentsRaw")} />
        </label>

        {errors.root?.message ? <p className="text-sm text-rose-200">{errors.root.message}</p> : null}

        <AppButton type="submit" loading={isSubmitting} className="max-w-56">
          Save profile
        </AppButton>
      </form>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-white/20 bg-white/5 p-4">
          <h3 className="font-serif text-lg text-white">Session Management</h3>
          <p className="mt-1 text-xs text-slate-300">Current and previous signed-in sessions with tracked device/IP.</p>
          <div className="mt-3 space-y-2">
            {(sessionsQuery.data || []).slice(0, 5).map((session) => (
              <div key={session.id} className="rounded-lg border border-white/15 bg-black/20 p-2 text-xs text-slate-200">
                <p>{session.active ? "Active" : "Ended"} • {new Date(session.startedAt).toLocaleString()}</p>
                <p className="truncate text-slate-300">IP: {session.device?.ip || "unknown"}</p>
              </div>
            ))}
            {sessionsQuery.isLoading ? <p className="text-xs text-slate-400">Loading sessions...</p> : null}
          </div>
        </div>

        <div className="rounded-xl border border-white/20 bg-white/5 p-4">
          <h3 className="font-serif text-lg text-white">Login History</h3>
          <p className="mt-1 text-xs text-slate-300">Recent successful/failed sign-in attempts with device tracking.</p>
          <div className="mt-3 space-y-2">
            {(loginHistoryQuery.data || []).slice(0, 5).map((entry) => (
              <div key={entry.id} className="rounded-lg border border-white/15 bg-black/20 p-2 text-xs text-slate-200">
                <p>{entry.status} • {new Date(entry.at).toLocaleString()}</p>
                <p className="truncate text-slate-300">IP: {entry.device?.ip || "unknown"}</p>
              </div>
            ))}
            {loginHistoryQuery.isLoading ? <p className="text-xs text-slate-400">Loading login history...</p> : null}
          </div>
        </div>

        <div className="rounded-xl border border-white/20 bg-white/5 p-4">
          <h3 className="font-serif text-lg text-white">Activity Logs</h3>
          <p className="mt-1 text-xs text-slate-300">Audited account actions for profile and security events.</p>
          <div className="mt-3 space-y-2">
            {(activityLogsQuery.data || []).slice(0, 5).map((log) => (
              <div key={log.id} className="rounded-lg border border-white/15 bg-black/20 p-2 text-xs text-slate-200">
                <p>{log.action}</p>
                <p className="text-slate-300">{new Date(log.createdAt).toLocaleString()}</p>
              </div>
            ))}
            {activityLogsQuery.isLoading ? <p className="text-xs text-slate-400">Loading activity logs...</p> : null}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}