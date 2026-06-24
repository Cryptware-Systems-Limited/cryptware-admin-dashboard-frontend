import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { EyeIcon, EyeSlashIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email.trim(), password);
      navigate('/overview', { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500 shadow-lg shadow-orange-500/30 mb-4">
            <span className="text-white font-black text-lg">CW</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Cryptware</h1>
          <p className="text-slate-400 text-sm mt-1">Admin Console</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
              <LockClosedIcon className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Sign in</h2>
              <p className="text-xs text-slate-500">Admin access only</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cryptwaresystems.com"
                className={cn(
                  "w-full px-3.5 py-2.5 rounded-xl text-sm",
                  "bg-slate-800 border border-slate-700 text-white placeholder-slate-500",
                  "focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60",
                  "transition-colors"
                )}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={cn(
                    "w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm",
                    "bg-slate-800 border border-slate-700 text-white placeholder-slate-500",
                    "focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60",
                    "transition-colors"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword
                    ? <EyeSlashIcon className="w-4 h-4" />
                    : <EyeIcon className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full py-2.5 rounded-xl text-sm font-semibold transition-all mt-2",
                "bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/20",
                "focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 focus:ring-offset-slate-900",
                loading && "opacity-60 cursor-not-allowed"
              )}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Role badges */}
        <div className="mt-5 flex items-center justify-center gap-2">
          {(['SYSTEM_ADMIN', 'SYSTEM_DEVELOPER', 'SYSTEM_VIEWER'] as const).map((r) => (
            <span
              key={r}
              className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-500 border border-slate-700"
            >
              {r.replace('SYSTEM_', '')}
            </span>
          ))}
        </div>
        <p className="text-center text-xs text-slate-600 mt-2">
          Client org accounts cannot access this console.
        </p>
      </div>
    </div>
  );
}
