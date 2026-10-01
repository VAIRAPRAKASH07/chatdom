// ==============================================================================
// MESSAGER TYPE DEFINITIONS
// ==============================================================================

export type AudienceType = 'everyone' | 'contacts' | 'close_friends' | 'nobody';
export type PrivacyOption = 'everyone' | 'contacts' | 'nobody';
export type MessageType = 'text' | 'image' | 'video' | 'file' | 'audio' | 'sticker' | 'location' | 'contact' | 'system';
export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'canceled';

export interface Profile {
  id: string; // Auth UUID
  display_name: string;
  avatar_url?: string;
  bio?: string;
  communication_id: string; // 8-digit permanent unique code (e.g., '58392147')
  is_online?: boolean;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CommunicationIdRecord {
  id: number;
  code: string;
  user_id: string;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  contact_user_id: string;
  contact_profile: Profile;
  alias?: string;
  is_close_friend?: boolean;
  created_at: string;
}

export interface ContactRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_profile?: Profile;
  receiver_profile?: Profile;
  status: RequestStatus;
  created_at: string;
}

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  blocked_profile?: Profile;
  reason?: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  is_private_vault: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  other_member?: Profile;
  last_message?: Message;
  unread_count?: number;
  is_pinned?: boolean;
  is_muted?: boolean;
  is_archived?: boolean;
  last_read_at?: string;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  is_pinned: boolean;
  is_muted: boolean;
  is_archived: boolean;
  last_read_at: string;
  joined_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_profile?: Profile;
  content: string;
  message_type: MessageType;
  attachment_url?: string;
  attachment_meta?: {
    file_name?: string;
    file_size?: number;
    mime_type?: string;
    duration?: number;
    width?: number;
    height?: number;
    latitude?: number;
    longitude?: number;
    address?: string;
    contact_name?: string;
    contact_communication_id?: string;
    contact_avatar?: string;
    sticker_pack?: string;
    sticker_alt?: string;
  };
  reply_to_id?: string;
  reply_to_message?: {
    id: string;
    sender_name: string;
    content: string;
  };
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  reactions?: MessageReaction[];
  is_read?: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface ThoughtStyleOptions {
  theme: string;
  gradient?: string;
  color?: string;
  font?: string; // 'sans' | 'serif' | 'mono' | 'headline' | 'script'
  textSize?: string; // 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  textColor?: string;
  textStyle?: 'clean' | 'bubble' | 'glow' | 'banner';
  textAlign?: 'left' | 'center' | 'right';
  mediaScale?: number; // 0.6 to 1.5
  mediaFit?: 'cover' | 'contain';
  aspectRatio?: '9:16' | '4:5' | '1:1' | '16:9' | 'original';
  mediaPosition?: 'center' | 'top' | 'bottom';
}

export interface Thought {
  id: string;
  user_id: string;
  user_profile?: Profile;
  content?: string;
  media_url?: string;
  media_type: 'text' | 'image' | 'video';
  background_style: ThoughtStyleOptions;
  audience: AudienceType;
  expires_at: string;
  created_at: string;
  views_count?: number;
  viewers?: Array<{
    viewer_id: string;
    viewer_profile: Profile;
    viewed_at: string;
  }>;
  has_viewed?: boolean;
}

export interface PrivateChatVault {
  user_id: string;
  pin_salt: string;
  pin_hash: string;
  auto_lock_interval: number; // Always 0 (time options removed, single-password policy)
  failed_attempts: number;
  locked_until?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  privacy_messaging: PrivacyOption;
  privacy_thoughts: AudienceType;
  privacy_profile_photo: PrivacyOption;
  privacy_online: PrivacyOption;
  privacy_last_seen: PrivacyOption;
  read_receipts_enabled: boolean;
  notification_preview: boolean;
  sound_enabled: boolean;
  created_at: string;
  updated_at: string;
}
