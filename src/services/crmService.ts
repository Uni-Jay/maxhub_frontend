import { apiClient } from './apiClient';

export interface Contact {
  id: number; uuid: string; contactCode: string;
  firstName: string; lastName: string; email: string; phone: string;
  alternatePhone?: string; company?: string; position?: string;
  department?: string; source: string; leadScore?: number;
  status: 'Active' | 'Inactive' | 'Lead' | 'Prospect' | 'Converted' | 'Lost';
  address?: string; city?: string; state?: string; country?: string;
  industry?: string; notes?: string;
  lastContactedDate?: string; nextFollowUpDate?: string;
  createdAt: string; updatedAt: string;
}

export interface Opportunity {
  id: number; uuid: string; opportunityCode: string; title: string;
  contactId: number; value: number; currency: string;
  stage: 'Lead' | 'Qualified' | 'Proposal' | 'Negotiation' | 'ClosedWon' | 'ClosedLost';
  probability: number; expectedCloseDate: string; description?: string;
  lostReason?: string; wonDate?: string; lostDate?: string;
  ownerId?: number; contact?: Contact;
  createdAt: string; updatedAt: string;
}

export interface CrmStats {
  total: number; active: number; leads: number; prospects: number; converted: number;
}

export interface PipelineStats {
  byStage: Record<string, { count: number; totalValue: number }>;
  totalValue: number; totalForecast: number; wonCount: number; lostCount: number;
}

export interface ContactListParams {
  page?: number; limit?: number; search?: string; status?: string; source?: string;
}

export interface OpportunityListParams {
  page?: number; limit?: number; stage?: string; contactId?: number; ownerId?: number;
}

export const crmService = {
  getContacts: (params: ContactListParams = {}) =>
    apiClient.getRaw('/contacts', params) as Promise<{
      data: Contact[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>,

  getContactStats: () => apiClient.get<CrmStats>('/contacts/stats'),

  getContactById: (id: number | string) => apiClient.get<Contact>(`/contacts/${id}`),

  createContact: (payload: Partial<Contact> & { firstName: string; lastName: string; email: string; phone: string }) =>
    apiClient.post<Contact>('/contacts', payload),

  updateContact: (id: number | string, payload: Partial<Contact>) =>
    apiClient.put<Contact>(`/contacts/${id}`, payload),

  updateContactStatus: (id: number | string, status: string) =>
    apiClient.patch<Contact>(`/contacts/${id}/status`, { status }),

  deleteContact: (id: number | string) => apiClient.delete<null>(`/contacts/${id}`),

  getOpportunities: (params: OpportunityListParams & { limit?: number } = {}) =>
    apiClient.getRaw('/opportunities', params) as Promise<{
      data: Opportunity[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>,

  getOpportunityStats: () => apiClient.get<PipelineStats>('/opportunities/stats'),

  getOpportunityById: (id: number | string) => apiClient.get<Opportunity>(`/opportunities/${id}`),

  createOpportunity: (payload: Partial<Opportunity> & { title: string; contactId: number; value: number; stage: string; expectedCloseDate: string }) =>
    apiClient.post<Opportunity>('/opportunities', payload),

  updateOpportunity: (id: number | string, payload: Partial<Opportunity>) =>
    apiClient.put<Opportunity>(`/opportunities/${id}`, payload),

  moveStage: (id: number | string, stage: string, lostReason?: string) =>
    apiClient.patch<Opportunity>(`/opportunities/${id}/stage`, { stage, lostReason }),

  deleteOpportunity: (id: number | string) => apiClient.delete<null>(`/opportunities/${id}`),
};
