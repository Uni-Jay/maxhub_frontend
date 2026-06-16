import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { attendanceManagementService } from '@services/attendanceManagementService';
import { useApiQuery } from '@hooks/useApiQuery';
import { apiClient } from '@services/apiClient';
import type { AttendanceRecord } from '@/types';
import {
  Clock, MapPin, LogIn, LogOut, CheckCircle2, AlertCircle, User,
  Camera, VideoOff, RotateCcw, ShieldCheck, ShieldX, Loader2,
  Navigation,
} from 'lucide-react';

// ─── Office geofence config ────────────────────────────────
// Update LAT/LNG to your actual office coordinates
const OFFICE_LAT = 6.5244;   // Lagos, Nigeria (update to real office)
const OFFICE_LNG = 3.3792;
const GEOFENCE_RADIUS_M = 500; // 500 metres radius

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000; // Earth radius metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLam = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type GeofenceStatus = 'checking' | 'inside' | 'outside' | 'unavailable';

function useCurrentTime() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

async function getPublicIP(): Promise<string> {
  try {
    const r = await fetch('https://api.ipify.org?format=json');
    const j = await r.json();
    return (j.ip as string) ?? '0.0.0.0';
  } catch {
    return '0.0.0.0';
  }
}

function minutesNow(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

const CHECK_IN_OPEN  = 7 * 60 + 30;  // 7:30 AM
const CHECK_IN_LATE  = 8 * 60;       // 8:00 AM
const CHECK_IN_CLOSE = 9 * 60;       // 9:00 AM
const CHECK_OUT_OPEN = 16 * 60 + 30; // 4:30 PM
const CHECK_OUT_CLOSE = 18 * 60;     // 6:00 PM

export default function CheckIn() {
  const { user } = useAuthStore();
  const now = useCurrentTime();

  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geofenceStatus, setGeofenceStatus] = useState<GeofenceStatus>('checking');
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geofenceOverride, setGeofenceOverride] = useState(false); // for approved leave/remote work

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);

  const { data: todayRecord, refetch } = useApiQuery<AttendanceRecord | null>(
    ['attendance', 'today'],
    () => apiClient.get<AttendanceRecord>('/attendance/today').catch(() => null)
  );

  // ── Geolocation + geofencing ──
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeofenceStatus('unavailable');
      setCoords({ latitude: 0, longitude: 0 });
      return;
    }
    setGeofenceStatus('checking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ latitude, longitude });
        const dist = haversineDistance(latitude, longitude, OFFICE_LAT, OFFICE_LNG);
        setDistanceM(Math.round(dist));
        setGeofenceStatus(dist <= GEOFENCE_RADIUS_M ? 'inside' : 'outside');
      },
      () => {
        setGeofenceStatus('unavailable');
        setCoords({ latitude: 0, longitude: 0 });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  // Stop camera on unmount
  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  // ── Camera ──
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (e: any) {
      const msg =
        e.name === 'NotAllowedError' ? 'Camera permission denied. Please allow camera access in your browser settings.' :
        e.name === 'NotFoundError' ? 'No camera detected on this device.' :
        e.name === 'NotReadableError' ? 'Camera is in use by another application.' :
        'Camera unavailable. Please try again.';
      setCameraError(msg);
    } finally {
      setCameraLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.8));
    stopCamera();
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    startCamera();
  }, [startCamera]);

  // ── Time windows ──
  const checkedIn = !!todayRecord?.checkInTime;
  const checkedOut = !!todayRecord?.checkOutTime;
  const allDone = checkedIn && checkedOut;

  const mins = minutesNow(now);
  const isCheckInWindow = mins >= CHECK_IN_OPEN && mins <= CHECK_IN_CLOSE;
  const isLateCheckIn = mins > CHECK_IN_LATE && mins <= CHECK_IN_CLOSE;
  const isCheckOutWindow = mins >= CHECK_OUT_OPEN && mins <= CHECK_OUT_CLOSE;

  let timeError: string | null = null;
  if (!allDone && !checkedIn) {
    if (mins < CHECK_IN_OPEN) timeError = `Check-in opens at 7:30 AM.`;
    if (mins > CHECK_IN_CLOSE) timeError = `Check-in window closed at 9:00 AM.`;
  } else if (checkedIn && !checkedOut) {
    if (mins < CHECK_OUT_OPEN) timeError = `Check-out opens at 4:30 PM.`;
    if (mins > CHECK_OUT_CLOSE) timeError = `Check-out window closed at 6:00 PM.`;
  }

  const timeAllowed = !allDone && (
    (!checkedIn && isCheckInWindow) ||
    (checkedIn && !checkedOut && isCheckOutWindow)
  );

  // Geofence gate: must be inside OR have override
  const geofenceAllowed = geofenceStatus === 'inside' || geofenceStatus === 'unavailable' || geofenceOverride;

  const actionAllowed = timeAllowed && geofenceAllowed;

  // ── Check in / out ──
  const handleCheckIn = async () => {
    try {
      setLoading(true); setError(null);
      const ipAddress = await getPublicIP();
      await attendanceManagementService.clockIn({
        latitude: coords?.latitude ?? 0,
        longitude: coords?.longitude ?? 0,
        ipAddress,
        facePhoto: capturedPhoto ?? undefined,
      } as any);
      await refetch();
    } catch (e) {
      setError((e as Error).message ?? 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setLoading(true); setError(null);
      const ipAddress = await getPublicIP();
      await attendanceManagementService.clockOut({
        latitude: coords?.latitude ?? 0,
        longitude: coords?.longitude ?? 0,
        ipAddress,
        facePhoto: capturedPhoto ?? undefined,
      } as any);
      await refetch();
    } catch (e) {
      setError((e as Error).message ?? 'Check-out failed');
    } finally {
      setLoading(false);
    }
  };

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Check In / Out</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Record your attendance for today</p>
      </div>

      {/* User card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <User className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {user ? `${user.firstName} ${user.lastName}` : 'Staff Member'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Clock */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-2xl p-7 text-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/5 rounded-full" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full" />
        </div>
        <div className="relative z-10">
          <p className="text-indigo-200 text-sm mb-1">{dateStr}</p>
          <p className="text-5xl font-bold text-white tracking-tight tabular-nums">{timeStr}</p>
        </div>
      </div>

      {/* Late badge */}
      {!checkedIn && isLateCheckIn && (
        <div className="flex items-center gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3">
          <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">Late arrival — checking in after 8:00 AM</p>
        </div>
      )}

      {/* Time restriction */}
      {timeError && !allDone && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{timeError}</p>
        </div>
      )}

      {/* Today's record */}
      {(checkedIn || checkedOut) && (
        <div className="grid grid-cols-2 gap-4">
          {checkedIn && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-green-600 dark:text-green-400 mb-1">
                <LogIn className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">Checked In</p>
              </div>
              <p className="text-xl font-bold text-green-700 dark:text-green-300 tabular-nums">{todayRecord!.checkInTime}</p>
            </div>
          )}
          {checkedOut && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-orange-600 dark:text-orange-400 mb-1">
                <LogOut className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">Checked Out</p>
              </div>
              <p className="text-xl font-bold text-orange-700 dark:text-orange-300 tabular-nums">{todayRecord!.checkOutTime}</p>
            </div>
          )}
        </div>
      )}

      {/* Geofencing status */}
      {!allDone && (
        <div className={`flex items-start gap-3 rounded-2xl px-4 py-3 border ${
          geofenceStatus === 'checking'
            ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            : geofenceStatus === 'inside'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : geofenceStatus === 'outside'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
        }`}>
          {geofenceStatus === 'checking' ? (
            <Loader2 className="h-4 w-4 text-gray-500 animate-spin flex-shrink-0 mt-0.5" />
          ) : geofenceStatus === 'inside' ? (
            <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          ) : geofenceStatus === 'outside' ? (
            <ShieldX className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          ) : (
            <Navigation className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            {geofenceStatus === 'checking' && (
              <p className="text-sm text-gray-600 dark:text-gray-400">Detecting your location…</p>
            )}
            {geofenceStatus === 'inside' && (
              <>
                <p className="text-sm font-semibold text-green-700 dark:text-green-300">Within office premises</p>
                {distanceM !== null && <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">{distanceM}m from office · GPS verified</p>}
              </>
            )}
            {geofenceStatus === 'outside' && (
              <>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">Outside office premises</p>
                {distanceM !== null && <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{distanceM}m from office (max {GEOFENCE_RADIUS_M}m allowed)</p>}
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                  You must be at the office to clock in/out. If you have an approved remote assignment, use the override below.
                </p>
                {/* Override for approved remote/leave */}
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={geofenceOverride} onChange={e => setGeofenceOverride(e.target.checked)}
                    className="w-4 h-4 accent-red-600" />
                  <span className="text-xs text-red-700 dark:text-red-400 font-medium">
                    I have approved remote assignment / official travel
                  </span>
                </label>
              </>
            )}
            {geofenceStatus === 'unavailable' && (
              <>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Location unavailable</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">GPS could not be determined. Clock-in allowed but location will not be verified.</p>
              </>
            )}
          </div>
          {coords && coords.latitude !== 0 && (
            <div className="flex-shrink-0 text-right">
              <MapPin className="h-3 w-3 text-gray-400 ml-auto mb-0.5" />
              <p className="text-[10px] font-mono text-gray-400">
                {coords.latitude.toFixed(4)}<br />{coords.longitude.toFixed(4)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Face Capture Section — shown when time window is open */}
      {!allDone && timeAllowed && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Camera className="h-4 w-4" /> Face Capture
            <span className="text-xs font-normal text-gray-400">(required for attendance)</span>
          </p>

          {cameraError && (
            <div className="flex items-start gap-2 text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2.5 border border-red-200 dark:border-red-800">
              <VideoOff className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{cameraError}</p>
                <button onClick={startCamera} className="mt-1.5 underline font-medium">
                  Try again
                </button>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {capturedPhoto ? (
            <div className="flex items-center gap-4">
              <img src={capturedPhoto} alt="Captured face" className="w-20 h-20 rounded-xl object-cover border-2 border-green-400 dark:border-green-600" />
              <div>
                <p className="text-xs text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Photo captured
                </p>
                <button onClick={retakePhoto} className="flex items-center gap-1.5 mt-1.5 text-xs text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 rounded-lg px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
                  <RotateCcw className="h-3.5 w-3.5" /> Retake
                </button>
              </div>
            </div>
          ) : cameraActive ? (
            <div className="space-y-3">
              <div className="relative">
                <video ref={videoRef} className="w-full max-w-[240px] rounded-xl border border-gray-200 dark:border-gray-600"
                  autoPlay muted playsInline />
                {/* Overlay face guide */}
                <div className="absolute inset-0 max-w-[240px] flex items-center justify-center pointer-events-none">
                  <div className="w-28 h-32 border-2 border-dashed border-white/60 rounded-full" />
                </div>
              </div>
              <button onClick={capturePhoto}
                className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white rounded-xl px-4 py-2.5 hover:bg-indigo-700 transition font-medium">
                <Camera className="h-4 w-4" /> Capture Photo
              </button>
            </div>
          ) : (
            <button onClick={startCamera} disabled={cameraLoading}
              className="flex items-center gap-1.5 text-sm border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              {cameraLoading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting camera…</>
                : <><Camera className="h-4 w-4" /> Open Camera</>}
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Action button */}
      {allDone ? (
        <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl px-5 py-4">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-700 dark:text-green-300 text-sm">Attendance complete!</p>
            <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-0.5">Your attendance has been recorded for today.</p>
          </div>
        </div>
      ) : !checkedIn ? (
        <button onClick={handleCheckIn}
          disabled={loading || !actionAllowed || !capturedPhoto}
          className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-4 px-6 rounded-2xl transition text-base shadow-sm shadow-indigo-200 dark:shadow-none">
          {loading
            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <LogIn className="h-5 w-5" />}
          {loading
            ? 'Recording check-in…'
            : !capturedPhoto
              ? 'Capture photo to check in'
              : !geofenceAllowed
                ? 'Outside office — cannot check in'
                : 'Check In Now'}
        </button>
      ) : (
        <button onClick={handleCheckOut}
          disabled={loading || !actionAllowed || !capturedPhoto}
          className="w-full flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-4 px-6 rounded-2xl transition text-base shadow-sm shadow-orange-200 dark:shadow-none">
          {loading
            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <LogOut className="h-5 w-5" />}
          {loading
            ? 'Recording check-out…'
            : !capturedPhoto
              ? 'Capture photo to check out'
              : !geofenceAllowed
                ? 'Outside office — cannot check out'
                : 'Check Out Now'}
        </button>
      )}

      {/* Geofence legend */}
      <div className="text-center text-xs text-gray-400 dark:text-gray-500 space-y-0.5">
        <p>Attendance is only allowed within {GEOFENCE_RADIUS_M}m of the office.</p>
        <p>GPS coordinates and device info are recorded for audit purposes.</p>
      </div>
    </div>
  );
}
