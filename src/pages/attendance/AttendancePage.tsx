import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { GlassCard } from "../../components/ui/GlassCard";
import { AppButton } from "../../components/ui/AppButton";
import { AppInput } from "../../components/ui/AppInput";

type AttendanceRecord = {
  id: string;
  clockIn: string;
  clockOut: string | null;
  workHours: number;
  late: boolean;
  overtime: boolean;
};

type DailyReport = {
  total: number;
  late: number;
  overtime: number;
  gpsAttendance: number;
  qrAttendance: number;
  averageWorkHours: number;
};

type AttendanceAnalytics = {
  totalRecords: number;
  lateCount: number;
  overtimeCount: number;
  qrCount: number;
  gpsCount: number;
  averageWorkHours: number;
  departmentAttendance: Array<{ department: string; totalRecords: number }>;
};

export function AttendancePage() {
  const queryClient = useQueryClient();
  const [qrToken, setQrToken] = useState("");
  const [qrDisplay, setQrDisplay] = useState<{ token: string; qrCodeDataUrl: string; expiresAt: string } | null>(null);

  const reportQuery = useQuery({
    queryKey: ["attendance-my-report"],
    queryFn: async () => {
      const response = await api.get("/attendance/my-report");
      return response.data.data as AttendanceRecord[];
    },
  });

  const dailyQuery = useQuery({
    queryKey: ["attendance-daily-report"],
    queryFn: async () => {
      const response = await api.get("/attendance/daily-report");
      return response.data.data as DailyReport;
    },
  });

  const analyticsQuery = useQuery({
    queryKey: ["attendance-analytics"],
    queryFn: async () => {
      const response = await api.get("/attendance/analytics");
      return response.data.data as AttendanceAnalytics;
    },
  });

  const faceRecognitionQuery = useQuery({
    queryKey: ["attendance-face-recognition"],
    queryFn: async () => {
      const response = await api.get("/attendance/face-recognition-status");
      return response.data.data as { enabled: boolean; status: string; message: string };
    },
  });

  const withLocation = async () => {
    return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const location = await withLocation();
      await api.post("/attendance/clock-in", {
        ...location,
        qrToken,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-my-report"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-daily-report"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-analytics"] });
      setQrToken("");
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      await api.post("/attendance/clock-out");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-my-report"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-daily-report"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-analytics"] });
    },
  });

  const qrMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/attendance/qr-token");
      return response.data.data;
    },
    onSuccess: (data) => {
      setQrDisplay(data);
    },
  });

  return (
    <div className="space-y-4">
      <GlassCard>
        <h1 className="font-serif text-3xl text-white">Attendance & Time Tracking</h1>
        <p className="mt-1 text-sm text-slate-300">Clock in/out, GPS attendance, QR attendance, late/overtime and work-hour analytics.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <AppInput label="QR token (optional)" value={qrToken} onChange={(event) => setQrToken(event.target.value)} />
          <div className="md:pt-7">
            <AppButton type="button" loading={clockInMutation.isPending} onClick={() => clockInMutation.mutate()}>
              Clock In
            </AppButton>
          </div>
          <div className="md:pt-7">
            <AppButton type="button" loading={clockOutMutation.isPending} onClick={() => clockOutMutation.mutate()}>
              Clock Out
            </AppButton>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard>
          <p className="text-xs uppercase tracking-wider text-slate-300">Daily Attendance Reports</p>
          <p className="mt-2 text-sm text-slate-100">Total: {dailyQuery.data?.total || 0}</p>
          <p className="text-sm text-slate-100">Late: {dailyQuery.data?.late || 0}</p>
          <p className="text-sm text-slate-100">Overtime: {dailyQuery.data?.overtime || 0}</p>
          <p className="text-sm text-slate-100">Avg Hours: {dailyQuery.data?.averageWorkHours || 0}</p>
        </GlassCard>

        <GlassCard>
          <p className="text-xs uppercase tracking-wider text-slate-300">Attendance Analytics</p>
          <p className="mt-2 text-sm text-slate-100">Weekly Records: {analyticsQuery.data?.totalRecords || 0}</p>
          <p className="text-sm text-slate-100">GPS: {analyticsQuery.data?.gpsCount || 0}</p>
          <p className="text-sm text-slate-100">QR: {analyticsQuery.data?.qrCount || 0}</p>
          <p className="text-sm text-slate-100">Late: {analyticsQuery.data?.lateCount || 0}</p>
        </GlassCard>

        <GlassCard>
          <p className="text-xs uppercase tracking-wider text-slate-300">Face Recognition</p>
          <p className="mt-2 text-sm text-amber-200">{faceRecognitionQuery.data?.message || "Planned for future release."}</p>
          <p className="text-xs text-slate-300">Status: {faceRecognitionQuery.data?.status || "planned"}</p>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-white">QR attendance token</h2>
            <p className="text-sm text-slate-300">Generate a 15-minute QR for office kiosk check-in.</p>
          </div>
          <div className="w-44">
            <AppButton type="button" loading={qrMutation.isPending} onClick={() => qrMutation.mutate()}>
              Generate QR
            </AppButton>
          </div>
        </div>

        {qrDisplay ? (
          <div className="mt-4 flex flex-wrap items-center gap-5 rounded-xl border border-white/20 bg-white/5 p-4">
            <img src={qrDisplay.qrCodeDataUrl} alt="Attendance QR" className="h-36 w-36 rounded-lg bg-white p-2" />
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-300">Token</p>
              <p className="text-sm text-white">{qrDisplay.token}</p>
              <p className="mt-2 text-xs text-amber-200">Expires: {new Date(qrDisplay.expiresAt).toLocaleString()}</p>
            </div>
          </div>
        ) : null}
      </GlassCard>

      <GlassCard>
        <h2 className="font-serif text-2xl text-white">My recent records</h2>
        <div className="mt-4 grid gap-3">
          {(reportQuery.data || []).map((item) => (
            <div key={item.id} className="rounded-xl border border-white/20 bg-white/5 p-3 text-sm">
              <p className="text-slate-200">In: {new Date(item.clockIn).toLocaleString()}</p>
              <p className="text-slate-200">Out: {item.clockOut ? new Date(item.clockOut).toLocaleString() : "Active"}</p>
              <p className="text-slate-200">Hours: {item.workHours}</p>
              <p className="text-xs text-slate-300">Late: {item.late ? "Yes" : "No"} | Overtime: {item.overtime ? "Yes" : "No"}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
