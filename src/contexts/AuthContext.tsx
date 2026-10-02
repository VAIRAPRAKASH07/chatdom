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
  mockOtpCode?: string;
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
  sendOtpEmail: (email: string, username?: string) => Promise<OtpResult>;
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

        // Listen for auth state changes (covers OTP verification callback and OAuth redirect)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
            await loadLiveUser(session.user.id, session.user.email);
            setIsRegisterOpen(false);
            setIsGoogleModalOpen(false);
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
    let prof: Profile | null = null;
    
    // Fetch profile
    const { data: prof1 } = await supabase!
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (prof1) {
      prof = prof1;
    } else {
      // Retry after 1s (trigger handling)
      await new Promise((r) => setTimeout(r, 1000));
      const { data: prof2 } = await supabase!
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (prof2) prof = prof2;
    }

    // Fallback: If DB trigger is not created yet, client-side auto-provision profile
    if (!prof) {
      const generatedCommId = generateServerCommunicationId();
      const { data: { user: currentUser } } = await supabase!.auth.getUser();
      const metaName = currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name;

      const newProf: Profile = {
        id: userId,
        display_name: metaName || (email ? email.split('@')[0] : `User ${userId.slice(0, 6)}`),
        communication_id: generatedCommId,
        is_online: true,
        last_seen_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await supabase!.from('profiles').upsert(newProf);
      prof = newProf;
    }

    setProfile(prof);

    // Check if newly created user to trigger onboarding
    const isRecentlyCreated = new Date(prof.created_at).getTime() > Date.now() - 30000;
    if (isRecentlyCreated) {
      setJustGeneratedCommId(prof.communication_id);
      setIsOnboarding(true);
    }

    const { data: sett } = await supabase!
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (sett) {
      setSettings(sett);
    } else {
      const defaultSettings: UserSettings = {
        user_id: userId,
        privacy_messaging: 'everyone',
        privacy_thoughts: 'contacts',
        privacy_profile_photo: 'everyone',
        privacy_online: 'contacts',
        privacy_last_seen: 'contacts',
        read_receipts_enabled: true,
        notification_preview: true,
        sound_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await supabase!.from('user_settings').upsert(defaultSettings);
      setSettings(defaultSettings);
    }
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
  const sendOtpEmail = async (email: string, username?: string): Promise<OtpResult> => {
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Check if email already exists in Database / Profiles
    if (isLiveSupabaseConfigured && supabase) {
      try {
        const { data: existingProf } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', trimmedEmail)
          .maybeSingle();

        if (existingProf) {
          return { 
            error: 'You already have an account with this email. Please sign in instead.' 
          };
        }
      } catch (err) {
        console.warn('Pre-signup email check warning:', err);
      }
    } else {
      // Local Sandbox check
      const existsInMock = Object.values(mockAccountsDatabase).some(
        (acc) => acc.email.toLowerCase() === trimmedEmail
      );
      if (existsInMock) {
        return { 
          error: 'You already have an account with this email. Please sign in instead.' 
        };
      }
    }

    // 2. Send OTP Email for NEW users
    if (isLiveSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: trimmedEmail,
          options: {
            data: username ? { full_name: username } : undefined,
            shouldCreateUser: true,
          },
        });

        if (error) {
          return { error: error.message };
        }
        return {};
      } catch (err: any) {
        return { error: err.message || 'Failed to send verification email.' };
      }
    } else {
      // Sandbox mode OTP code generation
      const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
      sessionStorage.setItem(`sandbox_otp_${trimmedEmail}`, mockCode);
      if (username) {
        sessionStorage.setItem(`sandbox_username_${trimmedEmail}`, username);
      }
      return { mockOtpCode: mockCode };
    }
  };

  // ─── Verify OTP Code ───────────────────────────────────────────────────────
  const verifyOtpCode = async (email: string, token: string): Promise<OtpResult> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedToken = token.trim();

    if (isLiveSupabaseConfigured && supabase) {
      try {
        // First try email type verification
        const { data, error } = await supabase.auth.verifyOtp({
          email: trimmedEmail,
          token: trimmedToken,
          type: 'email',
        });

        if (error || !data.user) {
          // Retry with 'signup' type verification
          const { data: signupData, error: signupError } = await supabase.auth.verifyOtp({
            email: trimmedEmail,
            token: trimmedToken,
            type: 'signup',
          });

          if (signupError || !signupData.user) {
            return { 
              error: signupError?.message || error?.message || 'Invalid or expired 6-digit verification code.' 
            };
          }

          await loadLiveUser(signupData.user.id, signupData.user.email);
          return {};
        }

        await loadLiveUser(data.user.id, data.user.email);
        return {};
      } catch (err: any) {
        return { error: err.message || 'Verification failed. Please enter the correct OTP code.' };
      }
    } else {
      // Sandbox OTP validation
      const savedCode = sessionStorage.getItem(`sandbox_otp_${trimmedEmail}`) || '123456';
      if (trimmedToken !== savedCode && trimmedToken !== '123456') {
        return { error: `Invalid code. Sandbox verification code is ${savedCode}` };
      }

      const savedName = sessionStorage.getItem(`sandbox_username_${trimmedEmail}`) || trimmedEmail.split('@')[0];
      const userId = `user-${Math.random().toString(36).slice(2, 9)}`;
      const commId = generateServerCommunicationId();
      loadMockUser(userId, trimmedEmail, savedName, commId, true);
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
        if (error) {
          throw new Error(error.message || 'Google OAuth failed. Please ensure Google Provider is enabled in Supabase Dashboard.');
        }
      } else {
        // Local Sandbox mode fallback
        await new Promise((r) => setTimeout(r, 400));
        const email = customEmail || 'user@example.com';
        const name = customName || email.split('@')[0];
        const existingAcc = Object.values(mockAccountsDatabase).find((a) => a.email.toLowerCase() === email.toLowerCase());
        const userId = existingAcc ? existingAcc.authUserId : `user-google-${Math.random().toString(36).slice(2, 9)}`;
        const isNew = !mockAccountsDatabase[userId];
        loadMockUser(userId, email, name, undefined, isNew);
      }
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      throw new Error(err.message || 'Google authentication failed.');
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
