import { apiClient } from './apiClient';

export interface Brand {
  id: number; code: string; departmentId: number; displayName: string; tagline?: string; description?: string;
  website?: string; email?: string; phone?: string; whatsapp?: string; address?: string; logoUrl?: string;
  primaryColor?: string; secondaryColor?: string; receiptPrefix: string; bankDetails?: string; footerNote?: string;
  department?: any; divisions?: any[];
}

export interface ListResult<T = any> { items: T[]; total: number; page: number; limit: number; stages: string[]; stageCounts: Record<string, number> }
export interface Activity { id: number; kind: string; channel?: string; content: string; createdByName?: string; createdAt: string; meta?: any }
export interface Payment {
  id: number; receiptNo: string; customerName: string; customerEmail?: string; customerPhone?: string; description: string;
  amount: string | number; currency: string; method: string; reference?: string; paidAt: string; status: string; voidReason?: string;
  relatedType?: string; relatedId?: number; relatedCode?: string; departmentId?: number; receivedByName?: string; items?: any[];
}

/** Base paths of the brand record collections on the backend. */
export const ERP_PATHS = {
  travelCases: '/erp/travel/cases',
  bookings: '/erp/travel/bookings',
  techProjects: '/erp/kurios/projects',
  subscriptions: '/erp/kurios/subscriptions',
  tickets: '/erp/support/tickets',
  customOrders: '/erp/beadmax/custom-orders',
  foodProducts: '/erp/maxfood/products',
  exportOrders: '/erp/maxfood/orders',
} as const;

export const erpService = {
  brands: () => apiClient.get<{ brands: Brand[]; departments: any[]; headOffice: any }>('/erp/brands'),
  updateBrand: (code: string, data: Partial<Brand>) => apiClient.put<Brand>(`/erp/brands/${code}`, data),

  list: <T = any>(base: string, params?: Record<string, any>) => apiClient.get<ListResult<T>>(base, params),
  get: <T = any>(base: string, id: number | string) => apiClient.get<T & { activities: Activity[]; payments: Payment[]; amountPaid: number }>(`${base}/${id}`),
  create: <T = any>(base: string, data: any) => apiClient.post<T>(base, data),
  update: <T = any>(base: string, id: number | string, data: any) => apiClient.put<T>(`${base}/${id}`, data),
  remove: (base: string, id: number | string) => apiClient.delete(`${base}/${id}`),
  setStage: (base: string, id: number | string, stage: string, note?: string) => apiClient.patch(`${base}/${id}/stage`, { stage, note }),
  addNote: (base: string, id: number | string, content: string, kind: 'Note' | 'Call' = 'Note') => apiClient.post(`${base}/${id}/activities`, { content, kind }),
  message: (base: string, id: number | string, data: { channel: 'Email' | 'WhatsApp' | 'Both'; subject?: string; message: string }) =>
    apiClient.post<{ email?: { ok: boolean; error?: string }; whatsapp?: { ok: boolean; mode: 'api' | 'link'; link: string; error?: string } }>(`${base}/${id}/message`, data),

  // VisaMax extras
  saveChecklist: (id: number, checklist: any[]) => apiClient.patch(`/erp/travel/cases/${id}/checklist`, { checklist }),
  regenerateChecklist: (id: number) => apiClient.post(`/erp/travel/cases/${id}/regenerate-checklist`),
  onboard: (id: number) => apiClient.post(`/erp/travel/cases/${id}/onboard`),

  // Payments
  payments: (params?: Record<string, any>) => apiClient.get<{ items: Payment[]; total: number; totals: { currency: string; total: string }[] }>('/erp/payments', params),
  recordPayment: (data: any) => apiClient.post<Payment>('/erp/payments', data),
  voidPayment: (id: number, reason: string) => apiClient.patch(`/erp/payments/${id}/void`, { reason }),
  receipt: (id: number) => apiClient.get<{ payment: Payment; brand: Brand; balance: { totalDue: number; paidToDate: number; outstanding: number } | null }>(`/erp/payments/${id}/receipt`),

  // Documents
  templates: (params?: Record<string, any>) => apiClient.get<any[]>('/erp/documents/templates', params),
  createTemplate: (data: any) => apiClient.post('/erp/documents/templates', data),
  updateTemplate: (id: number, data: any) => apiClient.put(`/erp/documents/templates/${id}`, data),
  archiveTemplate: (id: number) => apiClient.delete(`/erp/documents/templates/${id}`),
  requests: (params?: Record<string, any>) => apiClient.get<any[]>('/erp/documents/requests', params),
  request: (id: number) => apiClient.get<any>(`/erp/documents/requests/${id}`),
  sendDocument: (data: any) => apiClient.post<{ id: number; code: string; link: string; email?: any; whatsapp?: any }>('/erp/documents/requests', data),
  resendDocument: (id: number) => apiClient.post<{ link: string; email?: any; whatsapp?: any }>(`/erp/documents/requests/${id}/resend`),
  cancelDocument: (id: number) => apiClient.patch(`/erp/documents/requests/${id}/cancel`),

  weeklySummary: (weekStart?: string) => apiClient.get<any>('/erp/reports/weekly-summary', weekStart ? { weekStart } : undefined),
  syncChannels: () => apiClient.post('/erp/channels/sync'),
  iceServers: () => apiClient.get<{ iceServers: RTCIceServer[] }>('/erp/calls/ice'),
  jobPostings: () => apiClient.get<any>('/job-postings', { limit: 100 }),
};

export const API_ORIGIN = (
  import.meta.env.VITE_API_URL || import.meta.env.VITE_REACT_APP_API_URL || import.meta.env.VITE_APP_API_URL || 'http://localhost:3000/api'
).replace(/\/api\/?$/, '');

/** Unauthenticated calls for the customer-facing pages (signing, tracking). */
export async function publicApi<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_ORIGIN}/api/public${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) throw new Error(body.message || `Request failed (${res.status})`);
  return body.data as T;
}

export function money(amount: any, currency = 'NGN'): string {
  const n = Number(amount || 0);
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}
