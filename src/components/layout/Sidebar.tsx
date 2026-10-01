import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  MessageSquare, 
  Lock, 
  Unlock, 
  Users, 
  Settings, 
  LogOut, 
  Copy, 
  Check,
  Plus,
  ArrowLeft
} from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { ThoughtsBar } from '../thoughts/ThoughtsBar';
import { ConversationList } from '../chat/ConversationList';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtime } from '../../contexts/RealtimeContext';
import { usePrivateChat } from '../../contexts/PrivateChatContext';
import { formatCommunicationId, copyToClipboard } from '../../lib/utils';
import type { Thought } from '../../types';

interface SidebarProps {
  activeTab: 'chats' | 'private' | 'contacts';
  onTabChange: (tab: 'chats' | 'private' | 'contacts') => void;
  onOpenSearch: () => void;
  onOpenCreateThought: () => void;
  onSelectThought: (thought: Thought) => void;
  onOpenSettings: () => void;
  onOpenContacts: () => void;
  onOpenPrivateChatUnlock: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenSearch,
  onOpenCreateThought,
  onSelectThought,
  onOpenSettings,
  onOpenContacts,
  onOpenPrivateChatUnlock,
}) => {
  const { profile, signOut } = useAuth();
  const { 
    conversations, 
    privateConversations, 
    activeConversation, 
    setActiveConversationId,
    typingUsers,
    closeFriends,
    contactRequests 
  } = useRealtime();
  const { isConfigured, isUnlocked, lockVault } = usePrivateChat();

  const [searchFilter, setSearchFilter] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = async () => {
    if (profile?.communication_id) {
      const ok = await copyToClipboard(profile.communication_id);
      if (ok) {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      }
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (!searchFilter.trim()) return true;
    const name = c.other_member?.display_name?.toLowerCase() || '';
    const id = c.other_member?.communication_id || '';
    const q = searchFilter.toLowerCase();
    return name.includes(q) || id.includes(q);
  });

  const filteredPrivateConversations = privateConversations.filter((c) => {
    if (!searchFilter.trim()) return true;
    const name = c.other_member?.display_name?.toLowerCase() || '';
    const id = c.other_member?.communication_id || '';
    const q = searchFilter.toLowerCase();
    return name.includes(q) || id.includes(q);
  });

  return (
    <aside className="w-full md:w-80 lg:w-96 flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 select-none">
      {/* 1. Header: Logo, ID Badge, Search/Add button */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
              MESSAGER
            </span>
          </div>

          {/* User's Own Communication ID Capsule Button */}
          <button
            onClick={handleCopyId}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/70 dark:hover:bg-brand-900/80 border border-brand-200/80 dark:border-brand-800/60 text-brand-700 dark:text-brand-300 transition-colors"
            title="Click to copy your Communication ID"
          >
            <span className="text-[10px] uppercase font-bold text-brand-500">ID</span>
            <span className="font-mono text-xs font-bold tracking-wider">
              {formatCommunicationId(profile?.communication_id)}
            </span>
            {copiedId ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3 opacity-60" />
            )}
          </button>
        </div>

        {/* Search Bar / Filter */}
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search chats or filter by ID..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-950"
          />
          <button
            onClick={onOpenSearch}
            className="absolute right-1.5 p-1 text-slate-400 hover:text-brand-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Find new user by Communication ID"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Ephemeral Thoughts Strip */}
      <ThoughtsBar
        onOpenCreateThought={onOpenCreateThought}
        onSelectThought={onSelectThought}
      />

      {/* 3. Navigation Tabs: Normal Chats vs Private Chat Vault vs Contacts */}
      <div className="flex items-center px-3 pt-2.5 pb-1 border-b border-slate-100 dark:border-slate-800/80 gap-1.5 text-xs font-semibold">
        <button
          onClick={() => onTabChange('chats')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl transition-all ${
            activeTab === 'chats'
              ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-2xs font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chats</span>
        </button>

        <button
          onClick={() => {
            onTabChange('private');
            if (!isUnlocked) {
              onOpenPrivateChatUnlock();
            }
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl transition-all ${
            activeTab === 'private'
              ? 'bg-privacy-50 dark:bg-privacy-950/80 text-privacy-700 dark:text-privacy-300 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'
          }`}
        >
          {isUnlocked ? (
            <Unlock className="w-3.5 h-3.5 text-privacy-500" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span>Private</span>
          {isUnlocked && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          )}
        </button>

        <button
          onClick={() => onTabChange('contacts')}
          className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl transition-all ${
            activeTab === 'contacts'
              ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-2xs font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Contacts</span>
          {contactRequests.length > 0 && (
            <span className="min-w-3.5 h-3.5 px-1 rounded-full bg-brand-500 text-white text-[9px] font-bold flex items-center justify-center">
              {contactRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* 4. Tab Body */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'chats' && (
          <ConversationList
            conversations={filteredConversations}
            activeConversationId={activeConversation?.id || null}
            typingUsers={typingUsers}
            closeFriends={closeFriends}
            onSelectConversation={setActiveConversationId}
            onOpenSearch={onOpenSearch}
          />
        )}

        {activeTab === 'private' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {!isUnlocked ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-14 h-14 rounded-3xl bg-privacy-50 dark:bg-privacy-950/80 text-privacy-600 dark:text-privacy-400 flex items-center justify-center mb-3 shadow-sm">
                  <Lock className="w-7 h-7" />
                </div>
                <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  Private Chat Protected
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[220px]">
                  Unlock with your secret PIN to access and store protected conversations.
                </p>
                <Button
                  size="sm"
                  variant="privacy"
                  onClick={onOpenPrivateChatUnlock}
                  className="mt-4 rounded-xl"
                  leftIcon={<Unlock className="w-3.5 h-3.5" />}
                >
                  {isConfigured ? 'Unlock Vault' : 'Setup PIN Vault'}
                </Button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Vault Banner */}
                <div className="px-3.5 py-2.5 bg-privacy-50 dark:bg-privacy-950/60 border-b border-privacy-100 dark:border-privacy-900/60 flex items-center justify-between text-xs">
                  <span className="font-semibold text-privacy-700 dark:text-privacy-300 flex items-center gap-1.5">
                    <Unlock className="w-3.5 h-3.5 text-privacy-500" /> Private Vault Unlocked
                  </span>
                  <button
                    onClick={lockVault}
                    className="text-[11px] font-semibold text-privacy-600 dark:text-privacy-400 hover:underline px-2 py-0.5 rounded-lg hover:bg-privacy-100 dark:hover:bg-privacy-900/60"
                  >
                    Lock Vault
                  </button>
                </div>

                {/* Quick Action: Add User to Private Vault */}
                <div className="p-2 border-b border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={onOpenSearch}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-privacy-600 hover:bg-privacy-700 active:scale-98 text-white text-xs font-semibold shadow-xs transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Store New User in Private Vault</span>
                  </button>
                </div>

                <ConversationList
                  conversations={filteredPrivateConversations}
                  activeConversationId={activeConversation?.id || null}
                  typingUsers={typingUsers}
                  closeFriends={closeFriends}
                  onSelectConversation={setActiveConversationId}
                  onOpenSearch={onOpenSearch}
                  emptyTitle="No Private Conversations"
                  emptySubtitle="Click 'Store New User in Private Vault' or use 'Make Private' in any chat header to place conversations here."
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-3 text-left">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Connected Contacts
              </h4>
              <button
                onClick={onOpenContacts}
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Manage Contacts
              </button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={onOpenSearch}
              className="w-full rounded-xl justify-start gap-2 text-xs"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add by Communication ID
            </Button>

            <button
              onClick={onOpenContacts}
              className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between hover:border-brand-500 transition-colors"
            >
              <span>Manage Close Friends & Requests</span>
              <span className="text-brand-500 font-bold">→</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Footer: User Profile & Quick Settings */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-950/30">
        <div
          onClick={onOpenSettings}
          className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 group hover:opacity-90"
        >
          <Avatar
            name={profile?.display_name || 'User'}
            avatarUrl={profile?.avatar_url}
            size="sm"
          />
          <div className="min-w-0">
            <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">
              {profile?.display_name || 'User'}
            </div>
            <div className="text-[10px] font-mono text-slate-400 truncate">
              ID: {formatCommunicationId(profile?.communication_id)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onOpenSettings}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Settings & Privacy"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={signOut}
            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

    </aside>
  );
};
