import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ApiError, parseApiError } from '@/lib/api/errors';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyOtpPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string })?.email ?? '';

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      navigate('/sign-up', { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = useCallback(
    async (code: string) => {
      if (!email) { toast.error('No email found — please sign up again.'); return; }
      setLoading(true);
      setError('');
      try {
        await api.post(endpoints.auth.verifyOtp, { email, code });
        toast.success('Email verified! You can now sign in.');
        navigate('/login');
      } catch (err) {
        const apiErr = err instanceof ApiError ? err : parseApiError(err);
        setError(apiErr.message);
      } finally {
        setLoading(false);
      }
    },
    [email, navigate],
  );

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);

    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const code = next.join('');
    if (code.length === CODE_LENGTH) submit(code);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(CODE_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
    if (pasted.length === CODE_LENGTH) submit(pasted);
  };

  const resendCode = async () => {
    if (!email || resendLoading) return;
    setResendLoading(true);
    try {
      await api.post(endpoints.auth.resendOtp, { email });
      toast.success('New code sent to your email.');
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : parseApiError(err);
      toast.error(apiErr.message);
    } finally {
      setResendLoading(false);
    }
  };

  if (!email) return null;

  return (
    <div className="text-center">
      <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Verification</p>
      <h1 className="ef-heading-gradient mt-2 text-2xl font-semibold md:text-3xl">Verify your email</h1>
      <p className="mt-2 text-sm text-fg-muted">Enter the 6-digit code sent to <span className="text-fg">{email || 'your inbox'}</span></p>

      <div className="mx-auto mt-6 flex justify-center gap-2" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            aria-label={`OTP digit ${i + 1}`}
            disabled={loading}
            className="h-12 w-11 rounded-xl border border-border-input bg-surface-input text-center text-lg font-semibold text-fg transition-colors focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring"
          />
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-6 space-y-3">
        <Button variant="ghost" onClick={resendCode} disabled={cooldown > 0 || resendLoading}>
          {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm text-fg-muted">
        <Link to="/sign-up" className="underline underline-offset-4 hover:text-fg">Change email</Link>
        <Link to="/login" className="underline underline-offset-4 hover:text-fg">Back to login</Link>
      </div>
    </div>
  );
}
