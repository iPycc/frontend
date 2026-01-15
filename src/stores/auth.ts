import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api/client';

const AUTH_STORAGE_KEY = 'auth-storage';
const AUTH_BROADCAST_CHANNEL = 'cr-auth';
let authSyncInitialized = false;
const authChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel(AUTH_BROADCAST_CHANNEL)
    : null;

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  default_policy_id: string | null;
  storage_used: number;
  storage_limit: number;
  is_active: boolean;
  avatar_url?: string | null;
  created_at: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  logoutServer: () => Promise<void>;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
}

type AuthBroadcastMessage =
  | { type: 'login'; token: string; user: User }
  | { type: 'logout' };

function readPersistedAuth(): { token: string | null; user: User | null; isAuthenticated: boolean } | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state ?? null;
  } catch {
    return null;
  }
}

function setAuthLocal(token: string, user: User) {
  useAuthStore.getState().setAuth(token, user);
}

function clearAuthLocal() {
  useAuthStore.getState().clearAuth();
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        const { access_token, user } = response.data.data;
        set({ token: access_token, user, isAuthenticated: true });
        authChannel?.postMessage({ type: 'login', token: access_token, user } satisfies AuthBroadcastMessage);
      },

      register: async (email: string, name: string, password: string) => {
        await api.post('/auth/register', { email, name, password });
        // Auto-login after registration
        await get().login(email, password);
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
        authChannel?.postMessage({ type: 'logout' } satisfies AuthBroadcastMessage);
      },

      logoutServer: async () => {
        try {
          await api.post('/auth/logout');
        } catch {
        } finally {
          get().logout();
        }
      },

      setAuth: (token: string, user: User) => {
        set({ token, user, isAuthenticated: true });
      },

      clearAuth: () => {
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export function initAuthSync() {
  if (authSyncInitialized || typeof window === 'undefined') return;
  authSyncInitialized = true;

  authChannel?.addEventListener('message', (event) => {
    const msg = event.data as AuthBroadcastMessage;
    if (!msg?.type) return;
    if (msg.type === 'login') {
      setAuthLocal(msg.token, msg.user);
    } else if (msg.type === 'logout') {
      clearAuthLocal();
    }
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== AUTH_STORAGE_KEY) return;
    const state = readPersistedAuth();
    if (!state || !state.token || !state.user) {
      clearAuthLocal();
      return;
    }
    setAuthLocal(state.token, state.user);
  });

  const state = readPersistedAuth();
  if (!state || !state.token) {
    api.post('/auth/refresh')
      .then((resp) => {
        const { access_token, user } = resp.data.data;
        setAuthLocal(access_token, user);
      })
      .catch(() => {});
  }
}
