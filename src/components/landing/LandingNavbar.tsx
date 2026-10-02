import React from 'react';
import { ShieldCheck, Moon, Sun, Sparkles } from 'lucide-react';
import { Button } from '../common/Button';

interface LandingNavbarProps {
  onSignIn: () => void;
  onRegister: () => void;
  onOpenHowItWorks: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({
  onSignIn,
  onRegister,
  onOpenHowItWorks,
  isDark,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                MESSAGER
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 font-mono text-[10px] font-semibold">
                ID PRIVACY
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Privacy-Focused Communication Platform
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenHowItWorks}
            className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            How it works
          </button>

          <button
            onClick={onToggleTheme}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
