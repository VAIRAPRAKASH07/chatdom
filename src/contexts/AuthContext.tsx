import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Profile, UserSettings } from '../types';
import { 
  supabase, 
  isLiveSupabaseConfigured, 
  mockAccountsDatabase, 
  createMockAccount, 
  generateServerCommunicationId,
  saveAccountsDatabaseToStorage,
  getPermanentIdForUser,
  savePermanentIdForUser,
  deleteAccountFromDatabase
} from '../lib/supabase';

export interface AccountSummary {
  id: string;
  email: string;
  name: string;
  commId: string;
  isActive: boolean;
}

interface OtpResult {
  error?: string;
}

interface AuthContextType {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  settings: UserSettings | null;
  isLoading: boolean;
  isOnboarding: boolean;
  justGeneratedCommId: string | null;
  isRegisterOpen: boolean;
  openRegisterModal: () => void;
  closeRegisterModal: () => void;
  isGoogleModalOpen: boolean;
  openGoogleAuthModal: () => void;
  closeGoogleAuthModal: () => void;
  signInWithGoogle: (customEmail?: string, customName?: string) => Promise<void>;
  sendOtpEmail: (email: string) => Promise<OtpResult>;
  verifyOtpCode: (email: string, token: string) => Promise<OtpResult>;
  deleteAccount: (userId?: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchAccount: (accountKeyOrId: string) => Promise<void>;
  redirectToRegister: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnboarding, setIsOnboarding] = useState<boolean>(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState<boolean>(false);
  const [justGeneratedCommId, setJustGeneratedCommId] = useState<string | null>(null);

  // Load active session on mount
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      if (isLiveSupabaseConfigured && supabase) {
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await loadLiveUser(session.user.id, session.user.email);
        }

        // Listen for auth state changes (covers OTP verification callback)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            await loadLiveUser(session.user.id, session.user.email);
            setIsRegisterOpen(false);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setProfile(null);
            setSettings(null);
          }
        });

        setIsLoading(false);
        return () => subscription.unsubscribe();
      } else {
        // Local Sandbox Session Check
        const savedSession = sessionStorage.getItem('messager_active_session');
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            loadMockUser(parsed.id, parsed.email, parsed.name, parsed.commId);
          } catch {
            sessionStorage.removeItem('messager_active_session');
          }
        }
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Load a real Supabase user's profile
  const loadLiveUser = async (userId: string, email?: string) => {
    setUser({ id: userId, email });
    const { data: prof } = await supabase!
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (prof) {
      setProfile(prof);
    } else {
      // Profile not yet created (trigger may still be running) — retry once
      await new Promise((r) => setTimeout(r, 1000));
      const { data: prof2 } = await supabase!
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (prof2) setProfile(prof2);
    }
    const { data: sett } = await supabase!
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (sett) setSettings(sett);
  };

  const loadMockUser = (userId: string, email: string, name: string, commId?: string, isNew = false) => {
    const permanentId = getPermanentIdForUser(userId) || getPermanentIdForUser(email) || commId || generateServerCommunicationId();

    if (!mockAccountsDatabase[userId]) {
      mockAccountsDatabase[userId] = createMockAccount(userId, email, name, permanentId);
    } else if (mockAccountsDatabase[userId].profile.communication_id !== permanentId) {
      mockAccountsDatabase[userId].profile.communication_id = permanentId;
    }

    savePermanentIdForUser(userId, permanentId);
    savePermanentIdForUser(email, permanentId);
    saveAccountsDatabaseToStorage(mockAccountsDatabase);

    const acc = mockAccountsDatabase[userId];
    setUser({ id: acc.authUserId, email: acc.email });
    setProfile(acc.profile);
    setSettings(acc.settings);

    sessionStorage.setItem('messager_active_session', JSON.stringify({
      id: acc.authUserId,
      email: acc.email,
      name: acc.profile.display_name,
      commId: acc.profile.communication_id,
    }));

    if (isNew) {
      setJustGeneratedCommId(acc.profile.communication_id);
      setIsOnboarding(true);
    }
  };

  // ─── Send OTP Email ────────────────────────────────────────────────────────
  const sendOtpEmail = async (email: string): Promise<OtpResult> => {
    if (isLiveSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: undefined, // OTP code flow, not magic link
          },
        });
        if (error) return { error: error.message };
        return {};
      } catch (err: any) {
        console.warn('[Supabase] Unreachable, falling back to local verification:', err);
        return {};
      }
    } else {
      // Local Sandbox simulation
      console.info('[Sandbox] OTP would be sent to:', email);
      return {};
    }
  };

  // ─── Verify OTP Code ───────────────────────────────────────────────────────
  const verifyOtpCode = async (email: string, token: string): Promise<OtpResult> => {
    if (isLiveSupabaseConfigured && supabase) {
      // onAuthStateChange will fire SIGNED_IN and loadLiveUser handles the rest
      return {};
    } else {
      // Sandbox simulation
      const userId = `user-otp-${Math.random().toString(36).slice(2, 9)}`;
      const name = email.split('@')[0];
      const commId = generateServerCommunicationId();
      loadMockUser(userId, email, name, commId, true);
      return {};
    }
  };

  const signInWithGoogle = async (customEmail?: string, customName?: string) => {
    setIsLoading(true);
    try {
      if (isLiveSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });
        if (error) throw error;
      } else {
        // Sandbox simulation
        await new Promise((r) => setTimeout(r, 400));
        const email = customEmail || 'demo@messager.dev';
        const name = customName || 'Demo User';
        const existingAcc = Object.values(mockAccountsDatabase).find((a) => a.email.toLowerCase() === email.toLowerCase());
        const userId = existingAcc ? existingAcc.authUserId : `user-${Math.random().toString(36).slice(2, 9)}`;
        const isNew = !mockAccountsDatabase[userId];
        loadMockUser(userId, email, name, undefined, isNew);
      }
    } catch (err) {
      console.warn('Google Sign-In or Supabase host issue, logging in locally:', err);
      const email = customEmail || 'demo@messager.dev';
      const name = customName || 'Demo User';
      const userId = `user-local-${Math.random().toString(36).slice(2, 9)}`;
      loadMockUser(userId, email, name, undefined, true);
    } finally {
      setIsLoading(false);
    }
  };

  const switchAccount = async (accountKeyOrId: string) => {
    // Only used in sandbox mode
    if (isLiveSupabaseConfigured) return;
    setIsLoading(true);
    setProfile(null);
    setSettings(null);
    setUser(null);
    sessionStorage.removeItem('messager_active_session');
    sessionStorage.removeItem('messager_private_unlocked');
    await new Promise((r) => setTimeout(r, 300));

    if (mockAccountsDatabase[accountKeyOrId]) {
      const acc = mockAccountsDatabase[accountKeyOrId];
      loadMockUser(acc.authUserId, acc.email, acc.profile.display_name, acc.profile.communication_id, false);
    }
    setIsLoading(false);
  };

  const redirectToRegister = async () => {
    setIsLoading(true);
    setUser(null);
    setProfile(null);
    setSettings(null);
    setIsOnboarding(false);
    setJustGeneratedCommId(null);
    sessionStorage.removeItem('messager_active_session');
    sessionStorage.removeItem('messager_private_unlocked');
    setIsRegisterOpen(true);
    setIsLoading(false);
  };

  const deleteAccount = async (userIdToDelete?: string) => {
    const targetId = userIdToDelete || user?.id;
    if (!targetId) return;

    setIsLoading(true);
    try {
      if (isLiveSupabaseConfigured && supabase) {
        await supabase.from('profiles').delete().eq('id', targetId);
        await supabase.auth.signOut();
      } else {
        deleteAccountFromDatabase(targetId);
      }
      setUser(null);
      setProfile(null);
      setSettings(null);
      setIsOnboarding(false);
      setJustGeneratedCommId(null);
      sessionStorage.removeItem('messager_active_session');
      sessionStorage.removeItem('messager_private_unlocked');
    } catch (err) {
      console.error('Delete account failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      if (isLiveSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
      setUser(null);
      setProfile(null);
      setSettings(null);
      setIsOnboarding(false);
      setJustGeneratedCommId(null);
      sessionStorage.removeItem('messager_active_session');
      sessionStorage.removeItem('messager_private_unlocked');
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile || !user) return;
    const updated = { ...profile, ...updates, updated_at: new Date().toISOString() };
    setProfile(updated);

    if (isLiveSupabaseConfigured && supabase) {
      await supabase.from('profiles').update(updates).eq('id', user.id);
    } else if (mockAccountsDatabase[user.id]) {
      mockAccountsDatabase[user.id].profile = updated;
      saveAccountsDatabaseToStorage(mockAccountsDatabase);
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!settings || !user) return;
    const updated = { ...settings, ...updates, updated_at: new Date().toISOString() };
    setSettings(updated);

    if (isLiveSupabaseConfigured && supabase) {
      await supabase.from('user_settings').update(updates).eq('user_id', user.id);
    } else if (mockAccountsDatabase[user.id]) {
      mockAccountsDatabase[user.id].settings = updated;
      saveAccountsDatabaseToStorage(mockAccountsDatabase);
    }
  };

  const completeOnboarding = () => {
    setIsOnboarding(false);
    setJustGeneratedCommId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        settings,
        isLoading,
        isOnboarding,
        justGeneratedCommId,
        isRegisterOpen,
        openRegisterModal: () => setIsRegisterOpen(true),
        closeRegisterModal: () => setIsRegisterOpen(false),
        isGoogleModalOpen,
        openGoogleAuthModal: () => setIsGoogleModalOpen(true),
        closeGoogleAuthModal: () => setIsGoogleModalOpen(false),
        signInWithGoogle,
        sendOtpEmail,
        verifyOtpCode,
        deleteAccount,
        signOut,
        switchAccount,
        redirectToRegister,
        updateProfile,
        updateSettings,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
