import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon, EyeIcon, EyeSlashIcon, LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

type LoginStep = 'credentials' | 'setup' | 'verify' | 'backup-codes';

export default function Login() {
  const { login, verifyMfa, startMfaSetup, activateMfa, resendMfaCode } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<LoginStep>('credentials');
  const [challengeToken, setChallengeToken] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function resetLogin() {
    setStep('credentials');
    setChallengeToken('');
    setCode('');
    setBackupCodes([]);
  }

  async function handleCredentials(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.status === 'authenticated') {
        navigate('/overview', { replace: true });
      } else {
        setChallengeToken(result.challengeToken);
        setCode('');
        if (result.status === 'mfa-setup-required') {
          await startMfaSetup(result.challengeToken);
          setStep('setup');
          toast.success('A setup code was sent to your email.');
        } else {
          setStep('verify');
        }
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (step === 'setup') {
        const codes = await activateMfa(challengeToken, code);
        setBackupCodes(codes);
        setStep('backup-codes');
        toast.success('Two-factor authentication is now active.');
      } else {
        await verifyMfa(challengeToken, code);
        navigate('/overview', { replace: true });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setLoading(true);
    try {
      await resendMfaCode(challengeToken);
      toast.success('A new verification code was sent to your email.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not resend the code.');
    } finally {
      setLoading(false);
    }
  }

  const isCodeStep = step === 'setup' || step === 'verify';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      <div className={cn('relative w-full', step === 'backup-codes' ? 'max-w-lg' : 'max-w-sm')}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500 shadow-lg shadow-orange-500/30 mb-4">
            <span className="text-white font-black text-lg">CW</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Cryptware</h1>
          <p className="text-slate-400 text-sm mt-1">Admin Console</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
              {step === 'credentials' ? <LockClosedIcon className="w-4 h-4 text-orange-400" /> : <ShieldCheckIcon className="w-4 h-4 text-orange-400" />}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {step === 'credentials' && 'Sign in'}
                {step === 'setup' && 'Set up two-factor authentication'}
                {step === 'verify' && 'Verify your identity'}
                {step === 'backup-codes' && 'Save your backup codes'}
              </h2>
              <p className="text-xs text-slate-500">
                {step === 'credentials' && 'Admin access only'}
                {step === 'setup' && 'Enter the 6-digit code sent to your email'}
                {step === 'verify' && 'Use your email code or a backup code'}
                {step === 'backup-codes' && 'Each code can be used once if email access is unavailable'}
              </p>
            </div>
          </div>

          {step === 'credentials' && (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email address</label>
                <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@cryptwaresystems.com" className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300" tabIndex={-1}>
                    {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className={cn('w-full py-2.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/20', loading && 'opacity-60 cursor-not-allowed')}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}

          {isCodeStep && (
            <form onSubmit={handleCode} className="space-y-4">
              <input type="text" required autoFocus autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={step === 'verify' ? '123456 or XXXX-XXXX' : '123456'} maxLength={step === 'verify' ? 9 : 6} className="w-full px-3.5 py-3 rounded-xl text-center tracking-[0.3em] text-lg font-semibold bg-slate-800 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60" />
              <button type="submit" disabled={loading} className={cn('w-full py-2.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white', loading && 'opacity-60 cursor-not-allowed')}>
                {loading ? 'Verifying…' : step === 'setup' ? 'Enable & continue' : 'Verify & sign in'}
              </button>
              <div className="flex items-center justify-between text-xs">
                <button type="button" onClick={resetLogin} className="flex items-center gap-1 text-slate-400 hover:text-white"><ArrowLeftIcon className="w-3.5 h-3.5" /> Back</button>
                {step === 'verify' && <button type="button" disabled={loading} onClick={handleResend} className="text-orange-400 hover:text-orange-300 disabled:opacity-50">Resend code</button>}
              </div>
            </form>
          )}

          {step === 'backup-codes' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">Store these somewhere secure. They will not be shown again.</div>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((backupCode) => <code key={backupCode} className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-center text-slate-200">{backupCode}</code>)}
              </div>
              <button type="button" onClick={() => navigate('/overview', { replace: true })} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white">I have saved these codes</button>
            </div>
          )}
        </div>

        {step === 'credentials' && <>
          <div className="mt-5 flex items-center justify-center gap-2">
            {(['SYSTEM_ADMIN', 'SYSTEM_DEVELOPER', 'SYSTEM_VIEWER'] as const).map((role) => <span key={role} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-500 border border-slate-700">{role.replace('SYSTEM_', '')}</span>)}
          </div>
          <p className="text-center text-xs text-slate-600 mt-2">Client org accounts cannot access this console.</p>
        </>}
      </div>
    </div>
  );
}
