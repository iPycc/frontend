import { create } from 'zustand';
import { api } from '../api/client';

export interface Share {
  id: string;
  file_id: string;
  file_name?: string;
  is_dir?: boolean;
  user_id?: string;
  token: string;
  views: number;
  max_views: number | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ShareStore {
  shares: Share[];
  loading: boolean;
  fetchShares: () => Promise<void>;
  createShare: (fileId: string, password?: string, maxViews?: number, expiresAt?: string) => Promise<Share>;
  deleteShare: (id: string) => Promise<void>;
}

export const useShareStore = create<ShareStore>((set) => ({
  shares: [],
  loading: false,

  fetchShares: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/shares/my');
      set({ shares: response.data.data });
    } catch (error) {
      console.error('Failed to fetch shares:', error);
    } finally {
      set({ loading: false });
    }
  },

  createShare: async (fileId, password, maxViews, expiresAt) => {
    const response = await api.post('/shares', {
      file_id: fileId,
      password: password || null,
      max_views: maxViews || null,
      expires_at: expiresAt || null,
    });
    const newShare = response.data.data;
    set((state) => ({ shares: [newShare, ...state.shares] }));
    return newShare;
  },

  deleteShare: async (id) => {
    await api.delete(`/shares/${id}`);
    set((state) => ({ shares: state.shares.filter((s) => s.id !== id) }));
  },
}));
