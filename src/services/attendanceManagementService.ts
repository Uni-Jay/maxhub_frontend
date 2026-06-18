import { apiClient } from './apiClient';

export interface ClockInData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  deviceId?: string;
  ipAddress: string;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  clockInTime: string;
  clockOutTime?: string;
  status: string;
}

export interface GPSTrack {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export const attendanceManagementService = {
  /**
   * Clock in
   */
  clockIn: async (data: ClockInData): Promise<AttendanceRecord> => {
    const response = await apiClient.post<AttendanceRecord>('/attendance/clock-in', data);
    return response;
  },

  /**
   * Clock out
   */
  clockOut: async (data: ClockInData): Promise<AttendanceRecord> => {
    const response = await apiClient.post<AttendanceRecord>('/attendance/clock-out', data);
    return response;
  },

  /**
   * Get GPS tracking
   */
  getGPSTracking: async (): Promise<GPSTrack[]> => {
    const response = await apiClient.get<GPSTrack[]>('/attendance/gps/track');
    return response;
  },

  /**
   * Generate QR code
   */
  generateQRCode: async (): Promise<{ qrCode: string; qrToken: string }> => {
    const response = await apiClient.post<{ qrCode: string; qrToken: string }>('/attendance/qr/generate');
    return response;
  },

  /**
   * Scan QR code
   */
  scanQRCode: async (qrToken: string, location: ClockInData): Promise<AttendanceRecord> => {
    const response = await apiClient.post<AttendanceRecord>('/attendance/qr/scan', { qrToken, location });
    return response;
  },

  /**
   * Request overtime
   */
  requestOvertime: async (overtimeData: any): Promise<any> => {
    const response = await apiClient.post<any>('/attendance/overtime/request', overtimeData);
    return response;
  },

  /**
   * Approve overtime
   */
  approveOvertime: async (overtimeId: string): Promise<any> => {
    const response = await apiClient.put<any>(`/attendance/overtime/${overtimeId}/approve`);
    return response;
  },

  /**
   * Manually mark (or correct) attendance for any staff member on any date
   */
  manualMark: async (data: {
    staffId: number; attendanceDate: string; status: string;
    checkInTime?: string; checkOutTime?: string; remarks?: string;
  }): Promise<AttendanceRecord> => {
    const response = await apiClient.post<AttendanceRecord>('/attendance/manual-mark', data);
    return response;
  },

  /**
   * Generate attendance report
   */
  generateAttendanceReport: async (staffId: string, startDate: Date, endDate: Date): Promise<any> => {
    const response = await apiClient.post<any>('/attendance/reports/generate', {
      staffId,
      startDate,
      endDate,
    });
    return response;
  },
};
