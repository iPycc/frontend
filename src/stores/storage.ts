import { create } from 'zustand';
import { api } from '../api/client';

export interface StoragePolicy {
  id: string;
  user_id: string;
  name: string;
  policy_type: string;
  config: Record<string, unknown>;
  is_default: boolean;
  created_at: string;
}

interface StorageState {
  policies: StoragePolicy[];
  loading: boolean;
  error: string | null;
  selectedPolicyId: string | null;
  fetchPolicies: () => Promise<void>;
  createPolicy: (data: CreatePolicyData) => Promise<StoragePolicy>;
  updatePolicy: (id: string, data: UpdatePolicyData) => Promise<void>;
  deletePolicy: (id: string) => Promise<void>;
  setDefaultPolicy: (id: string) => Promise<void>;
  configureCors: (id: string) => Promise<void>;
  validatePolicy: (data: CreatePolicyData) => Promise<void>;
  setSelectedPolicyId: (id: string | null) => void;
}

interface CreatePolicyData {
  name: string;
  policy_type: string;
  config: Record<string, unknown>;
}

interface UpdatePolicyData {
  name?: string;
  config?: Record<string, unknown>;
}

export const useStorageStore = create<StorageState>((set, get) => ({
  policies: [],
  loading: false,
  error: null,
  selectedPolicyId: localStorage.getItem('lastSelectedPolicyId'),

  setSelectedPolicyId: (id) => {
    if (id) {
      localStorage.setItem('lastSelectedPolicyId', id);
    } else {
      localStorage.removeItem('lastSelectedPolicyId');
    }
    set({ selectedPolicyId: id });
  },

  fetchPolicies: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/storage/policies');
      set({ policies: response.data.data.policies, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createPolicy: async (data: CreatePolicyData) => {
    const response = await api.post('/storage/policies', data);
    const newPolicy = response.data.data;
    set({ policies: [...get().policies, newPolicy] });
    return newPolicy;
  },

  updatePolicy: async (id: string, data: UpdatePolicyData) => {
    const response = await api.put(`/storage/policies/${id}`, data);
    const updatedPolicy = response.data.data;
    set({
      policies: get().policies.map((p) =>
        p.id === id ? updatedPolicy : p
      ),
    });
  },

  deletePolicy: async (id: string) => {
    await api.delete(`/storage/policies/${id}`);
    set({ policies: get().policies.filter((p) => p.id !== id) });
  },

  setDefaultPolicy: async (id: string) => {
    await api.put(`/storage/policies/${id}/default`);
    set({
      policies: get().policies.map((p) => ({
        ...p,
        is_default: p.id === id,
      })),
    });
  },

  configureCors: async (id: string) => {
    await api.post(`/storage/policies/${id}/cors`);
  },

  validatePolicy: async (data: CreatePolicyData) => {
    await api.post('/storage/policies/validate', data);
  },
}));

