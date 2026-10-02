import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { ShieldCheck, KeyRound, Mail, ArrowRight, CheckCircle2, RefreshCw, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'email' | 'otp' | 'success';

export const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose }) => {
  const { sendOtpEmail, verifyOtpCode, openGoogleAuthModal, isLoading } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [sandboxCode, setSandboxCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleClose = () => {
    setStep('email');
    setEmail('');
    setUsername('');
    setOtpCode('');
    setSandboxCode(null);
    setError('');
    onClose();
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!username.trim()) {
      setError('Please enter a username.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setIsSending(true);
    try {
      const result = await sendOtpEmail(email.trim(), username.trim());
      if (result.error) {
        setError(result.error);
      } else {
        if (result.mockOtpCode) {
          setSandboxCode(result.mockOtpCode);
        }
        setStep('otp');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }
    setError('');
    const result = await verifyOtpCode(email.trim(), otpCode.trim());
    if (result.error) {
      setError(result.error);
    } else {
      setStep('success');
      setTimeout(() => handleClose(), 1500);
    }
  };

  const handleResend = async () => {
    setError('');
    setOtpCode('');
    setIsSending(true);
    try {
      const result = await sendOtpEmail(email.trim());
      if (result.error) setError(result.error);
    } finally {
      setIsSending(false);
    }
  };

  const handleGoogleAuth = async () => {
    handleClose();
    openGoogleAuthModal();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create MESSAGER Account"
      subtitle="Verify your email to receive a permanent 8-digit Communication ID"
      maxWidth="md"
    >
      <div className="space-y-6 text-left">
        {/* Value Proposition */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-brand-50 to-privacy-50 dark:from-brand-950/40 dark:to-privacy-950/40 border border-brand-200/80 dark:border-brand-800/60 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
            <KeyRound className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <span className="font-bold text-slate-900 dark:text-white block">
              Privacy-First Registration
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              We verify your email with a one-time code. Your email is never shown to other users — only your 8-digit ID is.
            </span>
          </div>
        </div>

        {/* Step 1: Email Input */}
        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <Input
              label="Your Username"
              type="text"
              placeholder="e.g. Alex Rivera"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError('');
              }}
              autoFocus
              leftIcon={<User className="w-4 h-4" />}
            />
            <Input
              label="Your Email Address"
              type="email"
              placeholder="e.g. you@gmail.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              error={error && !error.includes('already have an account') ? error : undefined}
              leftIcon={<Mail className="w-4 h-4" />}
            />

            {error && error.includes('already have an account') && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 space-y-2">
                <p className="font-semibold">{error}</p>
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition-colors shadow-xs"
                >
                  Sign In with Google Instead →
                </button>
              </div>
            )}

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              A 6-digit verification code will be sent to this address. No password required.
            </p>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSending || isLoading}
              className="w-full rounded-2xl py-3 text-sm shadow-md shadow-brand-500/20"
              leftIcon={<Mail className="w-4 h-4" />}
            >
              Send Verification Code
            </Button>
          </form>
        )}

        {/* Step 2: OTP Code Input */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Check your inbox
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                We sent a 6-digit code to{' '}
                <span className="font-semibold text-brand-600 dark:text-brand-400">{email}</span>
              </p>

              {sandboxCode && (
                <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-200 text-xs text-center font-medium">
                  ⚡ Sandbox Mode: Your verification code is <span className="font-bold font-mono text-sm underline">{sandboxCode}</span>
                </div>
              )}
            </div>

            <Input
              label="6-Digit Verification Code"
              type="text"
              inputMode="numeric"
              placeholder="Enter code (e.g. 123456)"
              value={otpCode}
              onChange={(e) => {
                setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                if (error) setError('');
              }}
              error={error}
              autoFocus
              maxLength={6}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full rounded-2xl py-3 text-sm shadow-md shadow-brand-500/20"
              leftIcon={<ShieldCheck className="w-4 h-4" />}
            >
              Verify & Create Account
            </Button>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <button
                type="button"
                onClick={() => { setStep('email'); setOtpCode(''); setError(''); }}
                className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              >
                ← Change email
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={isSending}
                className="flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSending ? 'animate-spin' : ''}`} />
                Resend code
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Success */}
        {step === 'success' && (
          <div className="text-center py-4 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Email Verified! Setting up your account…
            </p>
          </div>
        )}

        {step !== 'success' && (
          <>
            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-xs uppercase font-semibold text-slate-400">or</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            {/* Google OAuth Option */}
            <Button
              type="button"
              onClick={handleGoogleAuth}
              variant="secondary"
              size="md"
              className="w-full rounded-2xl py-3 text-xs font-semibold"
              leftIcon={
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              }
            >
              Continue with Google instead
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
};
