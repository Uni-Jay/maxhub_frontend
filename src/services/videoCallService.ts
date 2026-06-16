import { apiClient } from './apiClient';

/* ─── Types ─────────────────────────────────────── */
export type MeetingType = 'OneToOne' | 'Group' | 'Department' | 'Classroom' | 'Interview' | 'Training';
export type CallType = 'Video' | 'Voice';
export type CallStatus = 'Ringing' | 'Active' | 'Ended' | 'Missed' | 'Declined';
export type MeetingStatus = 'Scheduled' | 'Live' | 'Ended' | 'Cancelled';

export interface Meeting {
  id: number; uuid: string; meetingCode: string;
  title: string; description?: string;
  meetingType: MeetingType;
  roomName: string;
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

export interface IncomingCall {
  id: number; uuid: string;
  callerUserId: number; calleeUserId: number;
  callType: CallType;
  roomName: string;
  status: CallStatus;
  conversationId?: number;
  caller?: { firstName: string; lastName: string; avatar?: string };
  createdAt: string;
}

export interface CallHistoryEntry {
  id: number; callType: CallType; status: CallStatus;
  callerUserId: number; calleeUserId: number;
  startedAt?: string; endedAt?: string; durationSeconds?: number;
  caller?: { firstName: string; lastName: string; avatar?: string };
  callee?: { firstName: string; lastName: string; avatar?: string };
  createdAt: string;
}

export interface CallAnalytics {
  totalCalls: number; totalMeetings: number;
  totalCallDurationSeconds: number; totalMeetingDurationSeconds: number;
  byType: Record<string, number>;
  byDepartment: Array<{ department: string; count: number }>;
  topHosts: Array<{ name: string; meetings: number }>;
  attendanceRate: number;
}

/* ─── Permanent Rooms ──────────────────────────── */
export const PERMANENT_ROOMS = [
  { id: 'MaxHub-KuriosSat', name: 'Kurios Sat Room', type: 'Department' as MeetingType, icon: '🎓', color: 'indigo', description: 'Team meetings & live classes' },
  { id: 'MaxHub-VisaMax', name: 'Visa Max Room', type: 'Department' as MeetingType, icon: '✈️', color: 'blue', description: 'Visa Max department meetings' },
  { id: 'MaxHub-BeadMax', name: 'Bead Max Room', type: 'Classroom' as MeetingType, icon: '📿', color: 'violet', description: 'Bead Max vocational school' },
  { id: 'MaxHub-HR', name: 'HR Meeting Room', type: 'Department' as MeetingType, icon: '👥', color: 'green', description: 'HR interviews & team meetings' },
  { id: 'MaxHub-Training', name: 'Training Room', type: 'Training' as MeetingType, icon: '🎯', color: 'amber', description: 'Staff training sessions' },
  { id: 'MaxHub-Classroom1', name: 'Classroom 1', type: 'Classroom' as MeetingType, icon: '🏫', color: 'pink', description: 'Live student classes' },
  { id: 'MaxHub-Classroom2', name: 'Classroom 2', type: 'Classroom' as MeetingType, icon: '📚', color: 'rose', description: 'Live student classes' },
  { id: 'MaxHub-BoardRoom', name: 'Board Room', type: 'Group' as MeetingType, icon: '💼', color: 'slate', description: 'Executive board meetings' },
  { id: 'MaxHub-Reception', name: 'Reception Room', type: 'OneToOne' as MeetingType, icon: '📞', color: 'teal', description: 'Client consultations' },
  { id: 'MaxHub-HRVoice', name: 'HR Voice Room', type: 'Department' as MeetingType, icon: '🎙️', color: 'emerald', description: 'HR voice channel' },
] as const;

export type PermanentRoom = typeof PERMANENT_ROOMS[number];

/* ─── Service ──────────────────────────────────── */
export const videoCallService = {
  // Meetings
  getMeetings: (params: { status?: string; type?: string; page?: number; limit?: number } = {}) =>
    apiClient.getRaw('/meetings', params) as Promise<{ data: Meeting[]; pagination: any }>,

  getMeetingById: (id: number | string) =>
    apiClient.get<Meeting>(`/meetings/${id}`),

  scheduleMeeting: (payload: {
    title: string; meetingType: MeetingType; scheduledAt?: string;
    durationMinutes?: number; description?: string; participantUserIds?: number[]; maxParticipants?: number;
  }) => apiClient.post<Meeting>('/meetings', payload),

  updateMeeting: (id: number | string, payload: Partial<Meeting>) =>
    apiClient.put<Meeting>(`/meetings/${id}`, payload),

  cancelMeeting: (id: number | string) =>
    apiClient.patch<Meeting>(`/meetings/${id}/cancel`, {}),

  joinMeeting: (id: number | string) =>
    apiClient.post<{ roomName: string }>(`/meetings/${id}/join`, {}),

  leaveMeeting: (id: number | string) =>
    apiClient.post<null>(`/meetings/${id}/leave`, {}),

  getMeetingAttendance: (id: number | string) =>
    apiClient.get<MeetingParticipant[]>(`/meetings/${id}/attendance`),

  // Quick calls (1-to-1)
  initiateCall: (payload: { calleeUserId: number; callType: CallType; conversationId?: number }) =>
    apiClient.post<IncomingCall>('/calls', payload),

  getIncomingCalls: () =>
    apiClient.get<IncomingCall[]>('/calls/incoming'),

  answerCall: (id: number | string) =>
    apiClient.patch<IncomingCall>(`/calls/${id}/answer`, {}),

  declineCall: (id: number | string) =>
    apiClient.patch<IncomingCall>(`/calls/${id}/decline`, {}),

  endCall: (id: number | string) =>
    apiClient.patch<IncomingCall>(`/calls/${id}/end`, {}),

  getCallHistory: (params: { page?: number; limit?: number } = {}) =>
    apiClient.getRaw('/calls/history', params) as Promise<{ data: CallHistoryEntry[]; pagination: any }>,

  // Analytics
  getAnalytics: (params: { from?: string; to?: string } = {}) =>
    apiClient.get<CallAnalytics>('/meetings/analytics/summary', params as any),

  // Recording
  saveRecording: (meetingId: number | string, payload: { recordingUrl: string; cloudinaryPublicId: string; durationSeconds: number }) =>
    apiClient.post<{ recordingUrl: string }>(`/meetings/${meetingId}/recording`, payload),
};
