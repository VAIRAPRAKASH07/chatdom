import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Mail, User, ShieldCheck, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithGoogle, openRegisterModal, isLoading } = useAuth();
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setGoogleEmail('');
    setGoogleName('');
    setError('');
    onClose();
  };

  const handleCustomGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) {
      setError('Please enter your Google / Gmail address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(googleEmail.trim())) {
      setError('Please enter a valid Google email address.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const derivedName = googleName.trim() || googleEmail.split('@')[0].replace(/[._]/g, ' ');
      await signInWithGoogle(googleEmail.trim(), derivedName);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstantGoogleAuth = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Google OAuth failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Google Sign In & Sign Up"
      subtitle="Authenticate with Google to receive your server-generated Communication ID"
      maxWidth="md"
    >
      <div className="space-y-5 text-left select-none">
        {/* Google Branding Header Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/50 dark:via-indigo-950/40 dark:to-purple-950/40 border border-blue-200/80 dark:border-blue-800/60 flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center flex-shrink-0 shadow-sm">
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

          <div className="text-xs">
            <span className="font-bold text-slate-900 dark:text-white block">
              Google Account Identity Protection
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              Sign in or Sign up with your Google Account. Your email remains private; only your permanent 8-digit Communication ID is visible to contacts.
            </span>
          </div>
        </div>

        {/* 1-Click Instant Google OAuth Button */}
        <Button
          type="button"
          onClick={handleInstantGoogleAuth}
          variant="primary"
          size="lg"
          isLoading={isSubmitting || isLoading}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold shadow-md shadow-brand-500/20"
          leftIcon={
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
          1-Click Google Sign In / Sign Up
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-2">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          <span className="text-xs uppercase font-semibold text-slate-400">or enter Google email</span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>

        {/* Manual Google Account Input Form */}
        <form onSubmit={handleCustomGoogleSubmit} className="space-y-4">
          <Input
            label="Google Email Address"
            type="email"
            placeholder="e.g. yourname@gmail.com"
            value={googleEmail}
            onChange={(e) => {
              setGoogleEmail(e.target.value);
              if (error) setError('');
            }}
            leftIcon={<Mail className="w-4 h-4 text-brand-500" />}
          />

          <Input
            label="Display Name (Optional)"
            type="text"
            placeholder="e.g. Alex Rivera"
            value={googleName}
            onChange={(e) => setGoogleName(e.target.value)}
            leftIcon={<User className="w-4 h-4 text-brand-500" />}
          />

          {error && (
            <p className="text-xs font-semibold text-rose-500">{error}</p>
          )}

          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">First time here?</span>
            <button
              type="button"
              onClick={() => {
                handleClose();
                openRegisterModal();
              }}
              className="font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              Sign Up with Email OTP →
            </button>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Return to Previous Page
            </Button>

            <Button
              type="submit"
              variant="teal"
              size="sm"
              isLoading={isSubmitting || isLoading}
              disabled={!googleEmail.trim()}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue with Google
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
