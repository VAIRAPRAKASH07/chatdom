import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Mail, ShieldCheck, KeyRound, Lock, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePrivateChat } from '../../contexts/PrivateChatContext';
import { useAuth } from '../../contexts/AuthContext';

interface PrivateChatRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PrivateChatRecoveryModal: React.FC<PrivateChatRecoveryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, profile } = useAuth();
  const { sendGmailVerificationCode, verifyAndResetPinWithGmail } = usePrivateChat();

  const [step, setStep] = useState<'send_code' | 'enter_code'>('send_code');
  const [codeSentTo, setCodeSentTo] = useState<string>('');
  const [activeCodeBanner, setActiveCodeBanner] = useState<string | null>(null);
  
  const [otpCode, setOtpCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    setIsSending(true);
    setError('');
    const res = await sendGmailVerificationCode();
    setIsSending(false);

    if (res.success) {
      setCodeSentTo(res.email);
      setActiveCodeBanner(res.code);
      setStep('enter_code');
    } else {
      setError('Failed to send verification code. Please check your connection.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    if (newPin.length < 4 || newPin.length > 8) {
      setError('New PIN must be between 4 and 8 digits.');
      return;
    }

    if (newPin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }

    setIsVerifying(true);
    const res = await verifyAndResetPinWithGmail(otpCode, newPin);
    setIsVerifying(false);

    if (res.success) {
      setActiveCodeBanner(null);
      setOtpCode('');
      setNewPin('');
      setConfirmPin('');
      setStep('send_code');
      onSuccess();
      onClose();
    } else {
      setError(res.error || 'Verification failed. Please check the code.');
    }
  };

  const handleClose = () => {
    setActiveCodeBanner(null);
    setError('');
    setOtpCode('');
    setNewPin('');
    setConfirmPin('');
    setStep('send_code');
    onClose();
  };

  const userEmail = user?.email || (profile?.display_name ? `${profile.display_name.toLowerCase().replace(/\s+/g, '.')}@gmail.com` : 'user@gmail.com');

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Google Account OTP Verification"
      subtitle="Verify identity to reset your Private Chat Mobile PIN"
      maxWidth="md"
    >
      <div className="space-y-5 text-left">
        {/* Google Authentication Identity Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-800/60 flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 flex items-center justify-center flex-shrink-0 shadow-xs">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          </div>

          <div className="text-xs min-w-0 flex-1">
            <span className="font-bold text-slate-900 dark:text-white block">
              Google Account Identity Verification
            </span>
            <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold truncate block mt-0.5">
              {userEmail}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
              Private chat passwords are protected. Only the verified owner of this Google Account can reset the vault PIN.
            </span>
          </div>
        </div>

        {/* Live Simulated Google Email Delivery Notification */}
        {activeCodeBanner && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 text-xs flex items-start gap-2.5 animate-slide-up-slow shadow-sm">
            <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">
                📬 Google Security OTP Code Sent to {codeSentTo}:
              </span>
              <div className="mt-1 flex items-center gap-2">
                <span>Your 6-digit OTP verification code is:</span>
                <span className="font-mono font-extrabold text-sm px-2 py-0.5 bg-emerald-200/60 dark:bg-emerald-900/80 rounded-lg text-emerald-900 dark:text-emerald-100 tracking-wider">
                  {activeCodeBanner}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Send Code */}
        {step === 'send_code' && (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Click below to send a 6-digit OTP security code to your Google email address to verify identity and reset your PIN.
            </p>

            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleSendCode}
              isLoading={isSending}
              className="w-full rounded-2xl py-3 text-sm shadow-md shadow-brand-500/20"
              leftIcon={<Mail className="w-4 h-4" />}
            >
              Send 6-Digit OTP Code to Google Email
            </Button>

            <div className="pt-2 flex items-center justify-start border-t border-slate-100 dark:border-slate-800">
              {/* Back / Recursion button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Return to Previous Page
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Enter Code & New Password */}
        {step === 'enter_code' && (
          <form onSubmit={handleResetPassword} className="space-y-4 pt-1">
            {/* 6-Digit OTP */}
            <Input
              label="6-Digit Verification Code (OTP)"
              placeholder="e.g. 123456"
              maxLength={6}
              value={otpCode}
              onChange={(e) => {
                setOtpCode(e.target.value.replace(/\D/g, ''));
                if (error) setError('');
              }}
              leftIcon={<KeyRound className="w-4 h-4 text-brand-500" />}
              autoFocus
            />

            {/* New PIN */}
            <Input
              label="New Mobile PIN (4-8 digits)"
              type="password"
              placeholder="••••"
              maxLength={8}
              value={newPin}
              onChange={(e) => {
                setNewPin(e.target.value.replace(/\D/g, ''));
                if (error) setError('');
              }}
              leftIcon={<Lock className="w-4 h-4 text-privacy-500" />}
            />

            {/* Confirm New PIN */}
            <Input
              label="Confirm New Mobile PIN"
              type="password"
              placeholder="••••"
              maxLength={8}
              value={confirmPin}
              onChange={(e) => {
                setConfirmPin(e.target.value.replace(/\D/g, ''));
                if (error) setError('');
              }}
              leftIcon={<Lock className="w-4 h-4 text-privacy-500" />}
            />

            {error && (
              <p className="text-xs font-semibold text-rose-500 flex items-center gap-1.5 animate-shake">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </p>
            )}

            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
              {/* Back / Recursion button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Return to Previous Page
              </Button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendCode}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium pr-1"
                >
                  Resend code
                </button>
                <Button
                  type="submit"
                  variant="privacy"
                  size="sm"
                  isLoading={isVerifying}
                  disabled={otpCode.length !== 6 || newPin.length < 4 || confirmPin.length < 4}
                  leftIcon={<ShieldCheck className="w-4 h-4" />}
                >
                  Verify & Reset PIN
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
