import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api/client';

const AUTH_STORAGE_KEY = 'auth-storage';
const AUTH_BROADCAST_CHANNEL = 'cr-auth';
let authSyncInitialized = false;
let sessionMonitorInitialized = false;
const authChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel(AUTH_BROADCAST_CHANNEL)
    : null;

// 内存中存储 access token（不持久化到 localStorage，防止 XSS 攻击窃取）
let memoryToken: string | null = null;

export interface User {
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
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean; // 标记是否已完成初始化（包括 token 刷新）
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  logoutServer: () => Promise<void>;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  getToken: () => string | null;
  refreshToken: (opts?: { broadcast?: boolean }) => Promise<boolean>;
  setInitialized: (initialized: boolean) => void;
}

type AuthBroadcastMessage =
  | { type: 'login'; user: User }
  | { type: 'logout' }
  | { type: 'token_refreshed' };

function readPersistedAuth(): { user: User | null; isAuthenticated: boolean } | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state ?? null;
  } catch {
    return null;
  }
}

function clearAuthLocal() {
  useAuthStore.getState().clearAuth();
}

let refreshPromise: Promise<boolean> | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isInitialized: false,

      login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        const { access_token, user } = response.data.data;
        // token 存储在内存中
        memoryToken = access_token;
        set({ user, isAuthenticated: true, isInitialized: true });
        // 广播时不传递 token
        authChannel?.postMessage({ type: 'login', user } satisfies AuthBroadcastMessage);
      },

      register: async (email: string, name: string, password: string) => {
        await api.post('/auth/register', { email, name, password });
        // Auto-login after registration
        await get().login(email, password);
      },

      logout: () => {
        memoryToken = null;
        set({ user: null, isAuthenticated: false });
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
        memoryToken = token;
        set({ user, isAuthenticated: true, isInitialized: true });
      },

      clearAuth: () => {
        memoryToken = null;
        set({ user: null, isAuthenticated: false });
      },

      getToken: () => memoryToken,

      refreshToken: async (opts) => {
        if (refreshPromise) return refreshPromise;

        const broadcast = opts?.broadcast ?? true;

        refreshPromise = (async () => {
          try {
            const response = await api.post('/auth/refresh');
            const { access_token, user } = response.data.data;
            memoryToken = access_token;
            set({ user, isAuthenticated: true, isInitialized: true });
            if (broadcast) {
              authChannel?.postMessage({ type: 'token_refreshed' } satisfies AuthBroadcastMessage);
            }
            return true;
          } catch {
            get().clearAuth();
            return false;
          } finally {
            refreshPromise = null;
          }
        })();

        return refreshPromise;
      },

      setInitialized: (initialized: boolean) => {
        set({ isInitialized: initialized });
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      // 只持久化 user 信息，不持久化 token
      partialize: (state) => ({
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
      // 其他标签页登录了，需要刷新 token 获取自己的 access token
      if (!memoryToken) useAuthStore.getState().refreshToken({ broadcast: false });
    } else if (msg.type === 'logout') {
      clearAuthLocal();
    } else if (msg.type === 'token_refreshed') {
      // 其他标签页刷新了 token，本标签页也需要刷新
      if (!memoryToken) useAuthStore.getState().refreshToken({ broadcast: false });
    }
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== AUTH_STORAGE_KEY) return;
    const state = readPersistedAuth();
    if (!state || !state.user) {
      clearAuthLocal();
      return;
    }
    // 用户信息变化，需要刷新 token
    if (state.isAuthenticated && !memoryToken) {
      useAuthStore.getState().refreshToken({ broadcast: false });
    }
  });

  // 初始化时：如果有持久化的用户信息，尝试刷新 token
  const state = readPersistedAuth();
  if (state?.isAuthenticated && state?.user) {
    // 有用户信息但没有 token，需要刷新
    useAuthStore.getState().refreshToken({ broadcast: false }).then((success) => {
      if (!success) {
        // 刷新失败，清除认证状态
        clearAuthLocal();
      }
      useAuthStore.getState().setInitialized(true);
    });
  } else {
    // 没有用户信息，尝试用 refresh token cookie 刷新
    useAuthStore.getState().refreshToken({ broadcast: false }).finally(() => {
      useAuthStore.getState().setInitialized(true);
    });

  if (!sessionMonitorInitialized) {
    sessionMonitorInitialized = true;
    window.setInterval(async () => {
      const state = useAuthStore.getState();
      if (!state.isAuthenticated) return;
      if (window.location.pathname === '/login') return;
      try {
        await api.get('/user/sessions', { headers: { 'Cache-Control': 'no-cache' } });
      } catch {
      }
    }, 15000);
  }
  }
}
