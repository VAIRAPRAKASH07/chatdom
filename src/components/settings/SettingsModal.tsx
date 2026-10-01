import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Avatar } from '../common/Avatar';
import { 
  User, 
  Shield, 
  Lock, 
  Bell, 
  UserX, 
  LogOut, 
  Copy, 
  Check, 
  KeyRound, 
  Sparkles, 
  Eye, 
  EyeOff,
  Radio,
  Trash2,
  Layers,
  UserPlus,
  AlertTriangle,
  Camera,
  Upload,
  Image as ImageIcon,
  Mail,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtime } from '../../contexts/RealtimeContext';
import { usePrivateChat } from '../../contexts/PrivateChatContext';
import { formatCommunicationId, copyToClipboard } from '../../lib/utils';
import { DeleteAccountModal } from './DeleteAccountModal';
import { PrivateChatRecoveryModal } from '../privateChat/PrivateChatRecoveryModal';
import type { PrivacyOption, AudienceType } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPrivateChatSetup: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenPrivateChatSetup,
}) => {
  const { 
    profile, 
    settings, 
    updateProfile, 
    updateSettings, 
    signOut, 
    switchAccount, 
    redirectToRegister 
  } = useAuth();
  
  const { blockedUsers, unblockUser } = useRealtime();
  const { isConfigured, isUnlocked, lockVault } = usePrivateChat();

  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'private_chat' | 'blocked' | 'accounts'>('profile');
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [copiedId, setCopiedId] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCopyId = async () => {
    if (profile?.communication_id) {
      const ok = await copyToClipboard(profile.communication_id);
      if (ok) {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updateProfile({ display_name: displayName.trim(), bio: bio.trim() });
    setIsSaving(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (PNG, JPEG, WebP, etc.)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('Image size must be under 10MB');
      return;
    }

    setPhotoError('');
    setIsUploadingPhoto(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Url = event.target?.result as string;
        if (base64Url) {
          await updateProfile({ avatar_url: base64Url });
        }
        setIsUploadingPhoto(false);
      };
      reader.onerror = () => {
        setPhotoError('Failed to read image file. Try another image.');
        setIsUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setPhotoError('Failed to upload image.');
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setIsUploadingPhoto(true);
    await updateProfile({ avatar_url: undefined });
    setIsUploadingPhoto(false);
  };

  const handleAddAccount = async () => {
    onClose();
    await redirectToRegister();
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !isRecoveryModalOpen}
        onClose={onClose}
        title="Settings & Privacy"
        subtitle="Configure your identity, visibility, accounts, and security boundaries"
        maxWidth="lg"
      >
        <div className="flex flex-col sm:flex-row gap-5 min-h-[400px]">
          {/* Left Vertical Nav */}
          <div className="sm:w-48 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 sm:border-r border-slate-100 dark:border-slate-800 pr-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors text-left ${
                activeTab === 'profile'
                  ? 'bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </button>

            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors text-left ${
                activeTab === 'privacy'
                  ? 'bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Privacy</span>
            </button>

            <button
              onClick={() => setActiveTab('private_chat')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors text-left ${
                activeTab === 'private_chat'
                  ? 'bg-privacy-50 dark:bg-privacy-950 text-privacy-600 dark:text-privacy-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Private Vault</span>
            </button>

            <button
              onClick={() => setActiveTab('blocked')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors text-left ${
                activeTab === 'blocked'
                  ? 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <UserX className="w-4 h-4" />
              <span>Blocked ({blockedUsers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors text-left ${
                activeTab === 'accounts'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Accounts</span>
            </button>

            <div className="hidden sm:block my-auto" />

            {/* Delete Account Button placed BEFORE Logout */}
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left mt-4 group"
              title="Permanently delete your account"
            >
              <Trash2 className="w-4 h-4 text-rose-500 group-hover:animate-bounce" />
              <span>Delete Account</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={() => {
                onClose();
                signOut();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left mt-1"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          </div>

          {/* Right Tab Content */}
          <div className="flex-1 overflow-y-auto max-h-[400px] pr-1">
            {/* 1. Profile Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4 text-left">
                {/* Communication ID Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-50 to-privacy-50 dark:from-brand-950/40 dark:to-privacy-950/40 border border-brand-200/80 dark:border-brand-800/60">
                  <span className="text-[10px] uppercase font-bold text-brand-600 dark:text-brand-400 tracking-wider">
                    Permanent Communication ID
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xl sm:text-2xl font-mono font-extrabold tracking-wider text-slate-900 dark:text-white">
                      {formatCommunicationId(profile?.communication_id)}
                    </span>
                    <Button
                      size="sm"
                      type="button"
                      variant="secondary"
                      onClick={handleCopyId}
                      leftIcon={copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    >
                      {copiedId ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    This 8-digit code is your permanent public identity. It never changes even if you come back after a long time.
                  </p>
                </div>

                {/* Profile Image Upload & Custom Avatar Section */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide block">
                    Profile Picture
                  </label>
                  
                  <div className="flex items-center gap-4">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <Avatar
                        name={profile?.display_name || 'User'}
                        avatarUrl={profile?.avatar_url}
                        size="lg"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          isLoading={isUploadingPhoto}
                          onClick={() => fileInputRef.current?.click()}
                          leftIcon={<Upload className="w-3.5 h-3.5" />}
                        >
                          Upload from Device
                        </Button>

                        {profile?.avatar_url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemovePhoto}
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Upload custom photo from your device (PNG, JPG, WebP max 10MB).
                      </p>
                      {photoError && (
                        <p className="text-xs text-rose-500 font-medium">{photoError}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Display Name */}
                <Input
                  label="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={30}
                />

                {/* Bio */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Bio / Status
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={100}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button type="submit" variant="primary" size="sm" isLoading={isSaving}>
                    Save Profile
                  </Button>
                </div>
              </form>
            )}

            {/* 2. Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-4 text-left">
                {/* Messaging Request Privacy */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide block mb-1.5">
                    Who can send me message requests?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['everyone', 'contacts', 'nobody'] as PrivacyOption[]).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => updateSettings({ privacy_messaging: opt })}
                        className={`p-2.5 rounded-xl border text-xs capitalize transition-all ${
                          settings?.privacy_messaging === opt
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Thoughts Visibility */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide block mb-1.5">
                    Default Thoughts Audience
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['contacts', 'close_friends', 'everyone'] as AudienceType[]).map((aud) => (
                      <button
                        key={aud}
                        onClick={() => updateSettings({ privacy_thoughts: aud })}
                        className={`p-2.5 rounded-xl border text-xs capitalize transition-all ${
                          settings?.privacy_thoughts === aud
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {aud.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Online / Last Seen Visibility */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide block mb-1.5">
                    Online & Last Seen Visibility
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['everyone', 'contacts', 'nobody'] as PrivacyOption[]).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => updateSettings({ privacy_online: opt, privacy_last_seen: opt })}
                        className={`p-2.5 rounded-xl border text-xs capitalize transition-all ${
                          settings?.privacy_online === opt
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Read Receipts */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                      Read Receipts
                    </span>
                    <span className="text-[11px] text-slate-400">
                      If disabled, you won't see when others read your messages.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSettings({ read_receipts_enabled: !settings?.read_receipts_enabled })}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      settings?.read_receipts_enabled ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                        settings?.read_receipts_enabled ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* 3. Private Vault Tab */}
            {activeTab === 'private_chat' && (
              <div className="space-y-4 text-left">
                <div className="p-3.5 rounded-2xl bg-privacy-50/60 dark:bg-privacy-950/40 border border-privacy-200/80 dark:border-privacy-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-privacy-800 dark:text-privacy-200 block">
                      Vault Status: {isConfigured ? (isUnlocked ? 'Unlocked' : 'Locked') : 'Not Configured'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isConfigured ? 'Secured with client-side PBKDF2 hash (Single-password policy)' : 'Setup a PIN to protect private threads'}
                    </span>
                  </div>
                  {isUnlocked && (
                    <Button size="sm" variant="outline" onClick={lockVault}>
                      Lock Now
                    </Button>
                  )}
                </div>

                {/* Single Password Policy Action Box */}
                {isConfigured ? (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Primary Password Set & Protected
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Only 1 master password is permitted. To prevent unauthorized resets, password changes require Gmail authentication.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsRecoveryModalOpen(true)}
                      leftIcon={<Mail className="w-4 h-4" />}
                    >
                      Recover / Reset Password with Gmail
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="privacy"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onOpenPrivateChatSetup();
                    }}
                  >
                    Configure Single Vault PIN
                  </Button>
                )}
              </div>
            )}

            {/* 4. Blocked Users Tab */}
            {activeTab === 'blocked' && (
              <div className="space-y-3 text-left">
                <span className="text-xs text-slate-500">
                  Blocked users cannot message, call, or search your Communication ID.
                </span>

                {blockedUsers.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400">
                    No blocked users.
                  </div>
                ) : (
                  blockedUsers.map((block) => (
                    <div
                      key={block.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800"
                    >
                      <div className="text-xs">
                        <span className="font-semibold block text-slate-900 dark:text-slate-100">
                          {block.blocked_profile?.display_name || 'Blocked User'}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          ID #{formatCommunicationId(block.blocked_profile?.communication_id)}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unblockUser(block.blocked_id)}
                      >
                        Unblock
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 5. Account Management & Multi-Account Tab */}
            {activeTab === 'accounts' && (
              <div className="space-y-4 text-left">
                {/* Add New Account Action Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-50 to-blue-50 dark:from-brand-950/50 dark:to-blue-950/40 border border-brand-200/80 dark:border-brand-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      Add New Account
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Redirect to registration to create another isolated account with a permanent ID
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleAddAccount}
                    leftIcon={<UserPlus className="w-4 h-4" />}
                  >
                    Add Account
                  </Button>
                </div>

                {/* Current Account Card */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide block">
                    Current Account
                  </span>
                  <div className="p-3.5 rounded-2xl border border-brand-500 bg-brand-50/40 dark:bg-brand-950/30 ring-1 ring-brand-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={profile?.display_name || 'User'} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {profile?.display_name || 'User'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold">
                            Active
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-brand-600 dark:text-brand-400 block truncate">
                          ID: {formatCommunicationId(profile?.communication_id)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Danger Zone: Delete Current Account */}
                <div className="pt-4 mt-4 border-t border-rose-100 dark:border-rose-950/60">
                  <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-rose-900 dark:text-rose-200 block">
                        Danger Zone: Delete Account
                      </span>
                      <span className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                        Permanently destroy this account, messages, and ID
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setIsDeleteModalOpen(true)}
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Mandatory Retype Confirmation Modal */}
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />

      {/* Gmail Identity Verification Recovery Modal */}
      <PrivateChatRecoveryModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        onSuccess={() => setIsRecoveryModalOpen(false)}
      />
    </>
  );
};
