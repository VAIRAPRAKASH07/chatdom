import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { usePrivateChat } from './PrivateChatContext';
import { 
  mockAccountsDatabase, 
  PUBLIC_DISCOVERABLE_PERSONAS 
} from '../lib/supabase';
import { playChime } from '../lib/utils';
import type { 
  Conversation, 
  Message, 
  MessageType,
  Thought, 
  Contact, 
  ContactRequest, 
  Profile, 
  BlockedUser,
  AudienceType,
  ThoughtStyleOptions
} from '../types';

interface RealtimeContextType {
  conversations: Conversation[];
  privateConversations: Conversation[];
  activeConversation: Conversation | null;
  activeMessages: Message[];
  contacts: Contact[];
  contactRequests: ContactRequest[];
  thoughts: Thought[];
  myThought: Thought | null;
  blockedUsers: BlockedUser[];
  closeFriends: string[];
  typingUsers: Record<string, boolean>; // conversationId -> boolean
  
  // Conversation actions
  setActiveConversationId: (id: string | null) => void;
  sendMessage: (
    content: string,
    type?: MessageType,
    replyToId?: string,
    attachmentUrl?: string,
    attachmentMeta?: Message['attachment_meta']
  ) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
  markConversationAsRead: (conversationId: string) => void;
  togglePinConversation: (conversationId: string) => void;
  toggleMuteConversation: (conversationId: string) => void;
  moveToPrivateVault: (conversationId: string, isPrivate: boolean) => void;
  
  // Thoughts actions
  createThought: (content: string, mediaType?: 'text' | 'image' | 'video', mediaUrl?: string, gradient?: string, audience?: AudienceType, styleOptions?: Partial<ThoughtStyleOptions>) => Promise<void>;
  deleteThought: (thoughtId: string) => Promise<void>;
  recordThoughtView: (thoughtId: string) => void;
  
  // Contact & Search actions
  searchByCommunicationId: (id: string) => Promise<Profile | null>;
  sendContactRequest: (targetUserId: string) => Promise<boolean>;
  respondToContactRequest: (requestId: string, accept: boolean) => Promise<void>;
  toggleCloseFriend: (friendUserId: string) => void;
  blockUser: (targetUserId: string, reason?: string) => Promise<void>;
  unblockUser: (targetUserId: string) => Promise<void>;
  startConversationWithUser: (targetProfile: Profile) => string;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const { isUnlocked } = usePrivateChat();

  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [closeFriends, setCloseFriends] = useState<string[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  // Sync state when active user changes
  useEffect(() => {
    if (!user) {
      setAllConversations([]);
      setActiveConversationId(null);
      setMessagesMap({});
      setContacts([]);
      setContactRequests([]);
      setThoughts([]);
      setCloseFriends([]);
      setBlockedUsers([]);
      setTypingUsers({});
      return;
    }

    const acc = mockAccountsDatabase[user.id];
    if (acc) {
      setAllConversations(acc.conversations || []);
      setMessagesMap(acc.messages || {});
      setContacts(acc.contacts || []);
      setContactRequests(acc.contactRequests || []);
      setThoughts(acc.thoughts || []);
      setCloseFriends(acc.closeFriends || []);
      setBlockedUsers(acc.blockedUsers || []);
    }
  }, [user]);

  // Derived conversations lists
  const conversations = allConversations.filter((c) => !c.is_private_vault);
  const privateConversations = allConversations.filter((c) => c.is_private_vault);

  const activeConversation = allConversations.find((c) => c.id === activeConversationId) || null;
  const activeMessages = activeConversationId ? (messagesMap[activeConversationId] || []) : [];

  const myThought = thoughts.find((t) => t.user_id === user?.id && new Date(t.expires_at) > new Date()) || null;

  // Mark conversation read
  const markConversationAsRead = useCallback((conversationId: string) => {
    setAllConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
    );
  }, []);

  // Send message
  const sendMessage = async (
    content: string,
    type: MessageType = 'text',
    replyToId?: string,
    attachmentUrl?: string,
    attachmentMeta?: Message['attachment_meta']
  ) => {
    if (!user || !profile || !activeConversationId || (!content.trim() && !attachmentUrl && type !== 'location' && type !== 'contact')) return;

    const replyTarget = replyToId
      ? activeMessages.find((m) => m.id === replyToId)
      : undefined;

    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      conversation_id: activeConversationId,
      sender_id: user.id,
      sender_profile: profile,
      content,
      message_type: type,
      attachment_url: attachmentUrl,
      attachment_meta: attachmentMeta,
      reply_to_id: replyToId,
      reply_to_message: replyTarget
        ? {
            id: replyTarget.id,
            sender_name: replyTarget.sender_profile?.display_name || 'User',
            content: replyTarget.content,
          }
        : undefined,
      is_edited: false,
      is_deleted: false,
      is_read: false,
      status: 'sent',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      reactions: [],
    };

    // Update active messages
    setMessagesMap((prev) => ({
      ...prev,
      [activeConversationId]: [...(prev[activeConversationId] || []), newMessage],
    }));

    // Update conversation snippet and order
    setAllConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? { ...c, last_message: newMessage, updated_at: newMessage.created_at }
          : c
      )
    );

    playChime('send');

    // Simulate smart interactive reply in demo mode after 1.5s
    const targetConvo = activeConversation;
    if (targetConvo?.other_member) {
      const partner = targetConvo.other_member;
      
      // Simulate partner typing
      setTimeout(() => {
        setTypingUsers((prev) => ({ ...prev, [activeConversationId]: true }));
      }, 800);

      setTimeout(() => {
        setTypingUsers((prev) => ({ ...prev, [activeConversationId]: false }));

        let replyText = `Received! Messaging through Communication ID #${profile.communication_id} keeps our personal info 100% private.`;
        if (content.toLowerCase().includes('hello') || content.toLowerCase().includes('hi')) {
          replyText = `Hello ${profile.display_name}! Glad to connect securely.`;
        } else if (content.toLowerCase().includes('private')) {
          replyText = `Private Chat keeps sensitive threads shielded behind your secret PIN.`;
        } else if (content.toLowerCase().includes('thought')) {
          replyText = `Thoughts stay active for 24 hours. Your Close Friends list is private to you!`;
        }

        const replyMsg: Message = {
          id: `msg-reply-${Date.now()}`,
          conversation_id: activeConversationId,
          sender_id: partner.id,
          sender_profile: partner,
          content: replyText,
          message_type: 'text',
          is_edited: false,
          is_deleted: false,
          is_read: true,
          status: 'read',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setMessagesMap((prev) => ({
          ...prev,
          [activeConversationId]: [...(prev[activeConversationId] || []), replyMsg],
        }));

        setAllConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId
              ? { ...c, last_message: replyMsg, updated_at: replyMsg.created_at }
              : c
          )
        );

        playChime('receive');
      }, 2400);
    }
  };

  // Edit Message
  const editMessage = async (messageId: string, newContent: string) => {
    if (!activeConversationId) return;
    setMessagesMap((prev) => ({
      ...prev,
      [activeConversationId]: (prev[activeConversationId] || []).map((m) =>
        m.id === messageId
          ? { ...m, content: newContent, is_edited: true, updated_at: new Date().toISOString() }
          : m
      ),
    }));
  };

  // Delete Message
  const deleteMessage = async (messageId: string) => {
    if (!activeConversationId) return;
    setMessagesMap((prev) => ({
      ...prev,
      [activeConversationId]: (prev[activeConversationId] || []).map((m) =>
        m.id === messageId
          ? { ...m, is_deleted: true, content: 'This message was deleted.', updated_at: new Date().toISOString() }
          : m
      ),
    }));
  };

  // React to Message
  const reactToMessage = async (messageId: string, emoji: string) => {
    if (!user || !activeConversationId) return;
    setMessagesMap((prev) => ({
      ...prev,
      [activeConversationId]: (prev[activeConversationId] || []).map((m) => {
        if (m.id !== messageId) return m;
        const existing = m.reactions || [];
        const hasReactedWithEmoji = existing.some((r) => r.user_id === user.id && r.emoji === emoji);
        let updatedReactions: typeof existing;
        if (hasReactedWithEmoji) {
          updatedReactions = existing.filter((r) => !(r.user_id === user.id && r.emoji === emoji));
        } else {
          updatedReactions = [
            ...existing.filter((r) => r.user_id !== user.id),
            { id: `r-${Date.now()}`, message_id: messageId, user_id: user.id, emoji, created_at: new Date().toISOString() },
          ];
        }
        return { ...m, reactions: updatedReactions };
      }),
    }));
  };

  // Toggle Pin
  const togglePinConversation = (conversationId: string) => {
    setAllConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, is_pinned: !c.is_pinned } : c))
    );
  };

  // Toggle Mute
  const toggleMuteConversation = (conversationId: string) => {
    setAllConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, is_muted: !c.is_muted } : c))
    );
  };

  // Move to/from Private Vault
  const moveToPrivateVault = (conversationId: string, isPrivate: boolean) => {
    setAllConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, is_private_vault: isPrivate } : c))
    );
  };

  // Create Thought
  const createThought = async (
    content: string,
    mediaType: 'text' | 'image' | 'video' = 'text',
    mediaUrl?: string,
    gradient: string = 'from-blue-600 to-indigo-800',
    audience: AudienceType = 'contacts',
    styleOptions?: Partial<ThoughtStyleOptions>
  ) => {
    if (!user || !profile) return;
    const newThought: Thought = {
      id: `thought-${Date.now()}`,
      user_id: user.id,
      user_profile: profile,
      content,
      media_type: mediaType,
      media_url: mediaUrl,
      background_style: {
        theme: styleOptions?.theme || 'custom',
        gradient: styleOptions?.gradient || gradient,
        color: styleOptions?.color,
        font: styleOptions?.font || 'sans',
        textSize: styleOptions?.textSize || 'lg',
        textColor: styleOptions?.textColor || '#FFFFFF',
        textStyle: styleOptions?.textStyle || 'clean',
        textAlign: styleOptions?.textAlign || 'center',
        mediaScale: styleOptions?.mediaScale ?? 1.0,
        mediaFit: styleOptions?.mediaFit || 'cover',
        aspectRatio: styleOptions?.aspectRatio || 'original',
        mediaPosition: styleOptions?.mediaPosition || 'center',
      },
      audience,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      created_at: new Date().toISOString(),
      views_count: 0,
      viewers: [],
      has_viewed: true,
    };

    setThoughts((prev) => [newThought, ...prev.filter((t) => t.user_id !== user.id)]);
  };

  // Delete Thought
  const deleteThought = async (thoughtId: string) => {
    setThoughts((prev) => prev.filter((t) => t.id !== thoughtId));
  };

  // Record Thought View
  const recordThoughtView = (thoughtId: string) => {
    if (!user || !profile) return;
    setThoughts((prev) =>
      prev.map((t) => {
        if (t.id !== thoughtId || t.has_viewed) return t;
        return {
          ...t,
          has_viewed: true,
          views_count: (t.views_count || 0) + 1,
          viewers: [
            ...(t.viewers || []),
            { viewer_id: user.id, viewer_profile: profile, viewed_at: new Date().toISOString() },
          ],
        };
      })
    );
  };

  // Search User by Communication ID
  const searchByCommunicationId = async (queryId: string): Promise<Profile | null> => {
    const cleanId = queryId.replace(/\s+/g, '');
    if (cleanId.length < 6) return null;

    if (isLiveSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('communication_id', cleanId)
          .maybeSingle();

        if (data) return data;
      } catch (err) {
        console.error('Failed to search profile by communication_id:', err);
      }
    }

    // Check public personas
    const personaMatch = PUBLIC_DISCOVERABLE_PERSONAS.find((p) => p.communication_id === cleanId);
    if (personaMatch) return personaMatch;

    // Check other mock accounts
    for (const accId in mockAccountsDatabase) {
      if (mockAccountsDatabase[accId].profile.communication_id === cleanId) {
        return mockAccountsDatabase[accId].profile;
      }
    }
    return null;
  };

  // Send Contact Request
  const sendContactRequest = async (targetUserId: string): Promise<boolean> => {
    if (!user || !profile || targetUserId === user.id) return false;

    let target = PUBLIC_DISCOVERABLE_PERSONAS.find((p) => p.id === targetUserId);

    if (!target && isLiveSupabaseConfigured && supabase) {
      const { data } = await supabase.from('profiles').select('*').eq('id', targetUserId).maybeSingle();
      if (data) target = data;
    }

    if (!target) return false;

    if (isLiveSupabaseConfigured && supabase) {
      try {
        await supabase.from('contact_requests').insert({
          sender_id: user.id,
          receiver_id: targetUserId,
          status: 'pending',
        });
      } catch (err) {
        console.error('Failed to send contact request to DB:', err);
      }
    }

    const newReq: ContactRequest = {
      id: `req-${Date.now()}`,
      sender_id: user.id,
      receiver_id: targetUserId,
      sender_profile: profile,
      receiver_profile: target,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    setContactRequests((prev) => [...prev, newReq]);
    return true;
  };

  // Respond to Contact Request
  const respondToContactRequest = async (requestId: string, accept: boolean) => {
    const req = contactRequests.find((r) => r.id === requestId);
    if (!req || !user) return;

    if (accept && req.sender_profile) {
      const newContact: Contact = {
        id: `contact-${Date.now()}`,
        user_id: user.id,
        contact_user_id: req.sender_id,
        contact_profile: req.sender_profile,
        created_at: new Date().toISOString(),
      };
      setContacts((prev) => [...prev, newContact]);
    }

    setContactRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  // Toggle Close Friend
  const toggleCloseFriend = (friendUserId: string) => {
    setCloseFriends((prev) => {
      const exists = prev.includes(friendUserId);
      const updated = exists ? prev.filter((id) => id !== friendUserId) : [...prev, friendUserId];
      setContacts((cList) =>
        cList.map((c) =>
          c.contact_user_id === friendUserId ? { ...c, is_close_friend: !exists } : c
        )
      );
      return updated;
    });
  };

  // Block User
  const blockUser = async (targetUserId: string, reason = 'Unwanted interaction') => {
    if (!user) return;
    const target = PUBLIC_DISCOVERABLE_PERSONAS.find((p) => p.id === targetUserId) ||
                   contacts.find((c) => c.contact_user_id === targetUserId)?.contact_profile;

    const newBlock: BlockedUser = {
      id: `block-${Date.now()}`,
      blocker_id: user.id,
      blocked_id: targetUserId,
      blocked_profile: target,
      reason,
      created_at: new Date().toISOString(),
    };

    setBlockedUsers((prev) => [...prev, newBlock]);
    // Remove from contacts
    setContacts((prev) => prev.filter((c) => c.contact_user_id !== targetUserId));
    // Close active chat if with this user
    if (activeConversation?.other_member?.id === targetUserId) {
      setActiveConversationId(null);
    }
  };

  // Unblock User
  const unblockUser = async (targetUserId: string) => {
    setBlockedUsers((prev) => prev.filter((b) => b.blocked_id !== targetUserId));
  };

  // Start direct conversation with profile
  const startConversationWithUser = (targetProfile: Profile): string => {
    const existing = allConversations.find(
      (c) => c.other_member?.id === targetProfile.id
    );
    if (existing) {
      setActiveConversationId(existing.id);
      return existing.id;
    }

    const newConvoId = `conv-${Date.now()}`;
    const newConvo: Conversation = {
      id: newConvoId,
      type: 'direct',
      is_private_vault: false,
      other_member: targetProfile,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      unread_count: 0,
    };

    setAllConversations((prev) => [newConvo, ...prev]);
    setActiveConversationId(newConvoId);
    return newConvoId;
  };

  return (
    <RealtimeContext.Provider
      value={{
        conversations,
        privateConversations,
        activeConversation,
        activeMessages,
        contacts,
        contactRequests,
        thoughts,
        myThought,
        blockedUsers,
        closeFriends,
        typingUsers,
        setActiveConversationId,
        sendMessage,
        editMessage,
        deleteMessage,
        reactToMessage,
        markConversationAsRead,
        togglePinConversation,
        toggleMuteConversation,
        moveToPrivateVault,
        createThought,
        deleteThought,
        recordThoughtView,
        searchByCommunicationId,
        sendContactRequest,
        respondToContactRequest,
        toggleCloseFriend,
        blockUser,
        unblockUser,
        startConversationWithUser,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
