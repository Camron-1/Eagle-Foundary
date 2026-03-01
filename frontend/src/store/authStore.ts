import { create } from 'zustand';
import { api, setAccessToken, unwrapApiData } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
  LoginPayload,
  LoginResponse,
  LoginNextStep,
  MfaSetupCompletePayload,
  MfaSetupCompleteResponse,
  MfaVerifyPayload,
  MfaVerifyResponse,
  User,
  UserRole,
} from '@/lib/api/types';

interface PendingMfaChallenge {
  nextStep: LoginNextStep;
  challengeToken: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingMfaChallenge: PendingMfaChallenge | null;

  login: (payload: LoginPayload) => Promise<LoginResponse>;
  completeMfaSetup: (payload: MfaSetupCompletePayload) => Promise<MfaSetupCompleteResponse>;
  verifyMfa: (payload: MfaVerifyPayload) => Promise<MfaVerifyResponse>;
  clearPendingMfaChallenge: () => void;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  silentRefresh: () => Promise<void>;
  setUser: (user: User | null) => void;
  reset: () => void;
}

function isMfaLoginResponse(value: LoginResponse): value is Required<Pick<LoginResponse, 'nextStep' | 'challengeToken'>> {
  return typeof value.nextStep === 'string' && typeof value.challengeToken === 'string';
}

function isTokenLoginResponse(value: LoginResponse): value is Required<Pick<LoginResponse, 'accessToken'>> {
  return typeof value.accessToken === 'string' && value.accessToken.length > 0;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  pendingMfaChallenge: null,

  login: async (payload) => {
    const { data } = await api.post(endpoints.auth.login, payload);
    const result = unwrapApiData<LoginResponse>(data);

    if (isMfaLoginResponse(result)) {
      set({
        pendingMfaChallenge: {
          nextStep: result.nextStep,
          challengeToken: result.challengeToken,
        },
      });
      return result;
    }

    if (isTokenLoginResponse(result)) {
      setAccessToken(result.accessToken);
      set({ pendingMfaChallenge: null });
      await get().fetchMe();
      return result;
    }

    throw new Error('Unexpected login response');
  },

  completeMfaSetup: async (payload) => {
    const { data } = await api.post(endpoints.auth.mfaSetupComplete, payload);
    const result = unwrapApiData<MfaSetupCompleteResponse>(data);

    setAccessToken(result.accessToken);
    set({ pendingMfaChallenge: null });
    await get().fetchMe();
    return result;
  },

  verifyMfa: async (payload) => {
    const { data } = await api.post(endpoints.auth.mfaVerify, payload);
    const result = unwrapApiData<MfaVerifyResponse>(data);

    setAccessToken(result.accessToken);
    set({ pendingMfaChallenge: null });
    await get().fetchMe();
    return result;
  },

  clearPendingMfaChallenge: () => set({ pendingMfaChallenge: null }),

  logout: async () => {
    try {
      await api.post(endpoints.auth.logout, {});
    } catch {
      /* swallow - we clear state regardless */
    }
    setAccessToken(null);
    set({ user: null, isAuthenticated: false, isLoading: false, pendingMfaChallenge: null });
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get(endpoints.auth.me);
      const user = unwrapApiData<User>(data);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      get().reset();
    }
  },

  silentRefresh: async () => {
    try {
      const { data } = await api.post(endpoints.auth.refresh, {});
      const auth = unwrapApiData<{ accessToken: string }>(data);
      setAccessToken(auth.accessToken);
      await get().fetchMe();
    } catch {
      get().reset();
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

  reset: () => {
    setAccessToken(null);
    set({ user: null, isAuthenticated: false, isLoading: false, pendingMfaChallenge: null });
  },
}));

// Derived selectors
export function useAuth() {
  const store = useAuthStore();
  return {
    ...store,
    role: store.user?.role ?? null,
    isStudent: store.user?.role === 'STUDENT',
    isCompanyAdmin: store.user?.role === 'COMPANY_ADMIN',
    isCompanyMember: store.user?.role === 'COMPANY_ADMIN' || store.user?.role === 'COMPANY_MEMBER',
    isUniversityAdmin: store.user?.role === 'UNIVERSITY_ADMIN',
    hasRole: (...roles: UserRole[]) => !!store.user && roles.includes(store.user.role),
  };
}
