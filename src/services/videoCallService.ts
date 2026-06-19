import { apiClient } from './apiClient';

/* ─── Types ─────────────────────────────────────── */
export type MeetingType = 'Group' | 'Department' | 'Classroom' | 'Interview' | 'Training';
export type MeetingStatus = 'Scheduled' | 'Live' | 'Ended' | 'Cancelled';

export interface Meeting {
  id: number; uuid: string; meetingCode: string;
  title: string; description?: string;
  meetingType: MeetingType;
  meetingLink: string;
  hostUserId: number;
  scheduledAt?: string; durationMinutes?: number;
  status: MeetingStatus;
  maxParticipants?: number;
  isRecurring?: boolean;
  recordingUrl?: string;
  participants?: MeetingParticipant[];
  host?: { firstName: string; lastName: string; avatar?: string };
  createdAt: string;
}

export interface MeetingParticipant {
  id: number; meetingId: number; userId: number;
  joinedAt?: string; leftAt?: string; durationSeconds?: number;
  status: 'Invited' | 'Joined' | 'Declined' | 'NoShow';
  user?: { firstName: string; lastName: string; avatar?: string; email?: string };
}

export interface CallAnalytics {
  totalMeetings: number;
  totalMeetingDurationSeconds: number;
  byType: Record<string, number>;
  byDepartment: Array<{ department: string; count: number }>;
  topHosts: Array<{ name: string; meetings: number }>;
  attendanceRate: number;
}

/* ─── Service ──────────────────────────────────── */
export const videoCallService = {
  // Meetings
  getMeetings: (params: { status?: string; type?: string; page?: number; limit?: number } = {}) =>
    apiClient.getRaw('/meetings', params) as Promise<{ data: Meeting[]; pagination: any }>,

  getMeetingById: (id: number | string) =>
    apiClient.get<Meeting>(`/meetings/${id}`),

  scheduleMeeting: (payload: {
    title: string; meetingType: MeetingType; meetingLink: string; scheduledAt?: string;
    durationMinutes?: number; description?: string; participantUserIds?: number[]; maxParticipants?: number;
  }) => apiClient.post<Meeting>('/meetings', payload),

  updateMeeting: (id: number | string, payload: Partial<Meeting>) =>
    apiClient.put<Meeting>(`/meetings/${id}`, payload),

  cancelMeeting: (id: number | string) =>
    apiClient.patch<Meeting>(`/meetings/${id}/cancel`, {}),

  joinMeeting: (id: number | string) =>
    apiClient.post<{ meetingLink: string }>(`/meetings/${id}/join`, {}),

  leaveMeeting: (id: number | string) =>
    apiClient.post<null>(`/meetings/${id}/leave`, {}),

  getMeetingAttendance: (id: number | string) =>
    apiClient.get<MeetingParticipant[]>(`/meetings/${id}/attendance`),

  // Analytics
  getAnalytics: (params: { from?: string; to?: string } = {}) =>
    apiClient.get<CallAnalytics>('/meetings/analytics/summary', params as any),

  // Recording
  saveRecording: (meetingId: number | string, payload: { recordingUrl: string; cloudinaryPublicId: string; durationSeconds: number }) =>
    apiClient.post<{ recordingUrl: string }>(`/meetings/${meetingId}/recording`, payload),
};
