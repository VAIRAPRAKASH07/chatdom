import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Lock, ShieldCheck, Mail, AlertTriangle, ArrowLeft } from 'lucide-react';
import { usePrivateChat } from '../../contexts/PrivateChatContext';
import { PrivateChatRecoveryModal } from './PrivateChatRecoveryModal';

interface PrivateChatSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivateChatSetupModal: React.FC<PrivateChatSetupModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { setupPin, isConfigured } = usePrivateChat();

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.length < 4 || pin.length > 8) {
      setError('PIN must be between 4 and 8 digits');
      return;
    }

    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setIsSubmitting(true);
    const success = await setupPin(pin);
    setIsSubmitting(false);

    if (success) {
      setPin('');
      setConfirmPin('');
      onClose();
    } else {
      setError('Failed to setup PIN. Please try again.');
    }
  };

  // If already configured, enforce strict single-password rule with Google verification required
  if (isConfigured) {
    return (
      <>
        <Modal
          isOpen={isOpen && !isRecoveryOpen}
          onClose={onClose}
          title="Private Chat Password Security"
          subtitle="Single-password policy with Google Account identity verification"
          maxWidth="md"
        >
          <div className="space-y-5 text-left py-2">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-xs space-y-1">
                <span className="font-bold text-amber-900 dark:text-amber-200 block text-sm">
                  Single Password Protection Policy
                </span>
                <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                  Your private chat vault is configured with your primary security PIN. To prevent unauthorized resets, changing or recovering this password requires verification through your Google account.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Vault Status: Configured & Encrypted</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click below to start Google Account verification and receive a 6-digit OTP code to update your PIN.
              </p>
              <Button
                variant="primary"
                size="md"
                className="w-full rounded-xl"
                onClick={() => setIsRecoveryOpen(true)}
                leftIcon={<Mail className="w-4 h-4" />}
              >
                Verify with Google OTP to Reset PIN
              </Button>
            </div>

            <div className="pt-2 flex items-center justify-between">
              {/* Back / Recursion button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Return to Previous Page
              </Button>
            </div>
          </div>
        </Modal>

        <PrivateChatRecoveryModal
          isOpen={isRecoveryOpen}
          onClose={() => setIsRecoveryOpen(false)}
          onSuccess={() => {
            setIsRecoveryOpen(false);
            onClose();
          }}
        />
      </>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set Private Chat Entry PIN"
      subtitle="Set your secret PIN once to protect private conversations (mobile-style PIN unlock)"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div>
          <Input
            label="Create Vault Mobile PIN (4-8 Digits)"
            type="password"
            maxLength={8}
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            leftIcon={<Lock className="w-4 h-4 text-privacy-500" />}
            autoFocus
          />
        </div>

        <div>
          <Input
            label="Confirm Mobile PIN"
            type="password"
            maxLength={8}
            placeholder="••••"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            leftIcon={<Lock className="w-4 h-4 text-privacy-500" />}
          />
        </div>

        {error && (
          <p className="text-xs font-semibold text-rose-500">{error}</p>
        )}

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
          <span>
            Single-Password policy: Set your PIN once like a normal mobile screen unlock. If forgotten, verify ownership via Google Account OTP.
          </span>
        </div>

        <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
          {/* Back / Recursion button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Return to Previous Page
          </Button>

          <Button
            type="submit"
            variant="privacy"
            isLoading={isSubmitting}
            disabled={pin.length < 4 || confirmPin.length < 4}
          >
            Save PIN & Enable Vault
          </Button>
        </div>
      </form>
    </Modal>
  );
};
