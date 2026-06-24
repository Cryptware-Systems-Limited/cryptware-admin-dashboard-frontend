import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { api } from '@/lib/api';

export type AdminRole = 'SYSTEM_ADMIN' | 'SYSTEM_DEVELOPER' | 'SYSTEM_VIEWER';

interface AuthUser {
  token: string;
  refreshToken: string;
  role: AdminRole;
  expiresAt: string;
}

interface LoginResponse {
  status: string;
  data: {
    token: string;
    refreshToken: string;
    role: string;
    expiresAt: string;
    mustChangePassword: boolean;
    business_name: string;
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  role: AdminRole | null;
  isAuthenticated: boolean;
  // Permissions derived from role
  canWrite: boolean;    // SYSTEM_ADMIN + SYSTEM_DEVELOPER
  canSuspend: boolean;  // SYSTEM_ADMIN only
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ADMIN_ROLES: AdminRole[] = ['SYSTEM_ADMIN', 'SYSTEM_DEVELOPER', 'SYSTEM_VIEWER'];

function loadStoredAuth(): AuthUser | null {
  try {
    const token = localStorage.getItem('cw_token');
    const refreshToken = localStorage.getItem('cw_refresh_token');
    const role = localStorage.getItem('cw_role') as AdminRole | null;
    const expiresAt = localStorage.getItem('cw_expires_at');

    if (!token || !role || !ADMIN_ROLES.includes(role)) return null;

    // If token is expired, clear and return null
    if (expiresAt && new Date(expiresAt) < new Date()) {
      localStorage.removeItem('cw_token');
      localStorage.removeItem('cw_refresh_token');
      localStorage.removeItem('cw_role');
      localStorage.removeItem('cw_expires_at');
      return null;
    }

    return { token, refreshToken: refreshToken ?? '', role, expiresAt: expiresAt ?? '' };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredAuth);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<LoginResponse>('/auth/login', { email, password });
    const { token, refreshToken, role, expiresAt } = res.data;

    if (!ADMIN_ROLES.includes(role as AdminRole)) {
      throw new Error('Access denied. This dashboard is for admin users only.');
    }

    const authUser: AuthUser = {
      token,
      refreshToken,
      role: role as AdminRole,
      expiresAt,
    };

    localStorage.setItem('cw_token', token);
    localStorage.setItem('cw_refresh_token', refreshToken);
    localStorage.setItem('cw_role', role);
    localStorage.setItem('cw_expires_at', expiresAt);

    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('cw_token');
    localStorage.removeItem('cw_refresh_token');
    localStorage.removeItem('cw_role');
    localStorage.removeItem('cw_expires_at');
    setUser(null);
  }, []);

  const role = user?.role ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user,
        canWrite: role === 'SYSTEM_ADMIN' || role === 'SYSTEM_DEVELOPER',
        canSuspend: role === 'SYSTEM_ADMIN',
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
