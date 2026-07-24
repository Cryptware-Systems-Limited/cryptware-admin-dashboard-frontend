import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type AppEnv = "preprod" | "prod";

const STORAGE_KEY = "cw_environment";

export function getStoredEnv(): AppEnv {
  return localStorage.getItem(STORAGE_KEY) === "prod" ? "prod" : "preprod";
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
  const [env, setEnv] = useState<AppEnv>(getStoredEnv);

  const switchEnv = useCallback((next: AppEnv, onSwitch: () => void) => {
    localStorage.setItem(STORAGE_KEY, next);
    setEnv(next);
    // Clear auth so user must re-login against the new environment
    localStorage.removeItem("cw_token");
    localStorage.removeItem("cw_refresh_token");
    localStorage.removeItem("cw_role");
    localStorage.removeItem("cw_expires_at");
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