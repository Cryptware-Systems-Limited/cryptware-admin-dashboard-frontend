import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type AppEnv = "preprod" | "prod";

const STORAGE_KEY = "cw_environment";

export function getStoredEnv(): AppEnv {
  return localStorage.getItem(STORAGE_KEY) === "prod" ? "prod" : "preprod";
}

function clearStoredAuth() {
  localStorage.removeItem("cw_token");
  localStorage.removeItem("cw_refresh_token");
  localStorage.removeItem("cw_role");
  localStorage.removeItem("cw_expires_at");
  localStorage.removeItem("cw_must_change_password");
}

function getInitialEnv(): AppEnv {
  const storedEnv = getStoredEnv();
  if (window.location.pathname !== "/login") return storedEnv;

  // Invitation links choose the matching API before auth state is loaded.
  const requestedEnv = new URLSearchParams(window.location.search).get("env");
  if (requestedEnv !== "prod" && requestedEnv !== "preprod") return storedEnv;

  if (requestedEnv !== storedEnv) {
    localStorage.setItem(STORAGE_KEY, requestedEnv);
    clearStoredAuth();
  }
  return requestedEnv;
}

export function getApiBaseUrl(): string {
  const env = getStoredEnv();
  if (env === "prod") {
    return import.meta.env.VITE_PROD_API_URL ?? import.meta.env.VITE_API_URL ?? "";
  }
  return import.meta.env.VITE_PREPROD_API_URL ?? import.meta.env.VITE_API_URL ?? "";
}

interface EnvContextValue {
  env: AppEnv;
  isProd: boolean;
  switchEnv: (next: AppEnv, onSwitch: () => void) => void;
}

const EnvContext = createContext<EnvContextValue | null>(null);

export function EnvProvider({ children }: { children: ReactNode }) {
  const [env, setEnv] = useState<AppEnv>(getInitialEnv);

  const switchEnv = useCallback((next: AppEnv, onSwitch: () => void) => {
    localStorage.setItem(STORAGE_KEY, next);
    setEnv(next);
    // Clear auth so user must re-login against the new environment
    clearStoredAuth();
    onSwitch();
  }, []);

  return (
    <EnvContext.Provider value={{ env, isProd: env === "prod", switchEnv }}>
      {children}
    </EnvContext.Provider>
  );
}

export function useEnv(): EnvContextValue {
  const ctx = useContext(EnvContext);
  if (!ctx) throw new Error("useEnv must be used within EnvProvider");
  return ctx;
}
