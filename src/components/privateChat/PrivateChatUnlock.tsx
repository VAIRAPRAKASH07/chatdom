import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Lock, Unlock, KeyRound, Delete, AlertCircle, Mail, ArrowLeft } from 'lucide-react';
import { usePrivateChat } from '../../contexts/PrivateChatContext';
import { PrivateChatRecoveryModal } from './PrivateChatRecoveryModal';

interface PrivateChatUnlockProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSetup: () => void;
}

export const PrivateChatUnlock: React.FC<PrivateChatUnlockProps> = ({
  isOpen,
  onClose,
  onOpenSetup,
}) => {
  const { 
    isConfigured, 
    unlockWithPin, 
    isLockedOut, 
    lockoutRemainingSeconds 
  } = usePrivateChat();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);

  const handleDigit = async (digit: string) => {
    if (isLockedOut || isVerifying || pin.length >= 8) return;
    setError('');
    const nextPin = pin + digit;
    setPin(nextPin);
  };

  const handleBackspace = () => {
    if (isVerifying || isLockedOut) return;
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleUnlock = async () => {
    if (pin.length < 4) {
      setError('Please enter at least 4 digits');
      return;
    }
    setIsVerifying(true);
    setError('');

    const res = await unlockWithPin(pin);
    setIsVerifying(false);

    if (res.success) {
      setPin('');
      onClose();
    } else {
      setError(res.error || 'Incorrect PIN');
      setPin('');
    }
  };

  if (!isConfigured) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Setup Private Chat Vault"
        subtitle="Protect sensitive conversations behind a secret PIN"
        maxWidth="sm"
      >
        <div className="text-center space-y-4 py-3 select-none">
          <div className="w-14 h-14 rounded-3xl bg-privacy-50 dark:bg-privacy-950/80 text-privacy-600 dark:text-privacy-400 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-7 h-7" />
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Private Chat is an isolated area on your device. Set a single secret PIN to prevent unauthorized viewing of protected conversations.
          </p>

          <Button
            variant="privacy"
            size="md"
            onClick={() => {
              onClose();
              onOpenSetup();
            }}
            className="w-full rounded-xl"
            leftIcon={<KeyRound className="w-4 h-4" />}
          >
            Create Vault PIN
          </Button>

          <div className="pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-full"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Return to Previous Page
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        isOpen={isOpen && !isRecoveryOpen}
        onClose={onClose}
        title="Unlock Private Chat"
        subtitle="Mobile PIN unlocking security"
        maxWidth="sm"
      >
        <div className="space-y-5 text-center select-none">
          {/* Soft Lock Icon */}
          <div className="w-12 h-12 rounded-2xl bg-privacy-50 dark:bg-privacy-950/80 text-privacy-600 dark:text-privacy-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          {/* PIN Dots Indicator */}
          <div className="flex items-center justify-center gap-3">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  pin.length > idx
                    ? 'bg-privacy-600 dark:bg-privacy-400 scale-110'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-xs font-semibold text-rose-500 animate-shake">
              {error}
            </p>
          )}

          {isLockedOut && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Too many attempts. Locked for {lockoutRemainingSeconds}s.</span>
            </div>
          )}

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                disabled={isLockedOut || isVerifying}
                onClick={() => handleDigit(digit)}
                className="w-16 h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700 font-bold text-lg text-slate-800 dark:text-slate-100 transition-all active:scale-95 disabled:opacity-40"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin('')}
              disabled={isLockedOut || isVerifying || pin.length === 0}
              className="w-16 h-12 rounded-2xl text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-30"
            >
              Clear
            </button>
            <button
              key="0"
              type="button"
              disabled={isLockedOut || isVerifying}
              onClick={() => handleDigit('0')}
              className="w-16 h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700 font-bold text-lg text-slate-800 dark:text-slate-100 transition-all active:scale-95 disabled:opacity-40"
            >
              0
            </button>
            <button
              type="button"
              disabled={isLockedOut || isVerifying || pin.length === 0}
              onClick={handleBackspace}
              className="w-16 h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-all active:scale-95 disabled:opacity-40"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Unlock Submit Button */}
          <Button
            variant="privacy"
            size="md"
            onClick={handleUnlock}
            isLoading={isVerifying}
            disabled={pin.length < 4 || isLockedOut}
            className="w-full rounded-2xl py-3"
            leftIcon={<Unlock className="w-4 h-4" />}
          >
            Unlock Vault
          </Button>

          {/* Forgot Password Button & Back Button Container */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setIsRecoveryOpen(true)}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Mail className="w-4 h-4 text-brand-500" />
              <span>Forgot Password? Verify with Google OTP</span>
            </button>

            {/* Recursion / Back button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-full rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Return to Previous Page
            </Button>
          </div>
        </div>
      </Modal>

      {/* Google Identity OTP Verification Recovery Modal */}
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
};
