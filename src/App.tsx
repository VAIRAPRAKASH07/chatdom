import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PrivateChatProvider } from './contexts/PrivateChatContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { LandingNavbar } from './components/landing/LandingNavbar';
import { HeroSection } from './components/landing/HeroSection';
import { HowItWorksModal } from './components/landing/HowItWorksModal';
import { OnboardingModal } from './components/auth/OnboardingModal';
import { RegisterModal } from './components/auth/RegisterModal';
import { GoogleAuthModal } from './components/auth/GoogleAuthModal';
import { MainLayout } from './components/layout/MainLayout';
import { ShieldCheck } from 'lucide-react';

const AppContent: React.FC<{ isDark: boolean; onToggleTheme: () => void }> = ({
  isDark,
  onToggleTheme,
}) => {
  const { 
    user, 
    profile, 
    isLoading, 
    isOnboarding, 
    justGeneratedCommId, 
    isRegisterOpen,
    openRegisterModal,
    closeRegisterModal,
    isGoogleModalOpen,
    openGoogleAuthModal,
    closeGoogleAuthModal,
    signInWithGoogle, 
    switchAccount, 
    completeOnboarding 
  } = useAuth();
  
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-lg shadow-brand-500/30 animate-pulse">
            <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase animate-pulse">
            Loading MESSAGER...
          </span>
        </div>
      </div>
    );
  }

  // Unauthenticated State: Calm, Trustworthy Landing Page
  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
        <LandingNavbar
          onSignIn={openGoogleAuthModal}
          onRegister={openRegisterModal}
          onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
          isDark={isDark}
          onToggleTheme={onToggleTheme}
        />

        <main className="flex-1">
          <HeroSection
            onSignIn={openGoogleAuthModal}
            onRegister={openRegisterModal}
            onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
            onSelectPresetAccount={(accKey) => switchAccount(accKey)}
          />
        </main>

        <footer className="py-8 border-t border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                MESSAGER
              </span>
              <span>— Privacy-Focused Communication ID Messaging Platform</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Communication IDs are server-generated after Google authentication.
            </div>
          </div>
        </footer>

        <HowItWorksModal
          isOpen={isHowItWorksOpen}
          onClose={() => setIsHowItWorksOpen(false)}
          onSignIn={openGoogleAuthModal}
        />

        {/* Base Registration Modal */}
        <RegisterModal
          isOpen={isRegisterOpen}
          onClose={closeRegisterModal}
        />

        {/* Dedicated Google Sign In / Sign Up Modal */}
        <GoogleAuthModal
          isOpen={isGoogleModalOpen}
          onClose={closeGoogleAuthModal}
        />
      </div>
    );
  }

  // Authenticated State: Main Messenger App
  return (
    <PrivateChatProvider>
      <RealtimeProvider>
        <MainLayout />

        {/* First-time Google OAuth / Registration Onboarding ID Celebration */}
        {isOnboarding && justGeneratedCommId && (
          <OnboardingModal
            isOpen={isOnboarding}
            communicationId={justGeneratedCommId}
            onComplete={completeOnboarding}
          />
        )}
      </RealtimeProvider>
    </PrivateChatProvider>
  );
};

export const App: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('messager_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('messager_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('messager_theme', 'light');
    }
  }, [isDark]);

  return (
    <AuthProvider>
      <AppContent
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
      />
    </AuthProvider>
  );
};
