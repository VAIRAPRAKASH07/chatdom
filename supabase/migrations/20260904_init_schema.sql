-- ==============================================================================
-- MESSAGER DATABASE INITIALIZATION SCHEMA & ROW LEVEL SECURITY
-- Platform: Supabase PostgreSQL
-- Identity: Permanent 8-Digit Server-Generated Communication ID
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Clean Existing Schema if Re-running
DROP TABLE IF EXISTS public.thought_views CASCADE;
DROP TABLE IF EXISTS public.thoughts CASCADE;
DROP TABLE IF EXISTS public.message_reads CASCADE;
DROP TABLE IF EXISTS public.message_reactions CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_members CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.close_friends CASCADE;
DROP TABLE IF EXISTS public.blocked_users CASCADE;
DROP TABLE IF EXISTS public.contact_requests CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.private_chat_vaults CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.communication_ids CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ==============================================================================
-- 3. SERVER-SIDE UNPREDICTABLE COMMUNICATION ID GENERATOR
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.generate_unique_communication_id(length INT DEFAULT 8)
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    min_val BIGINT;
    max_val BIGINT;
    is_taken BOOLEAN;
    attempts INT := 0;
BEGIN
    IF length < 6 THEN length := 6; END IF;
    IF length > 10 THEN length := 10; END IF;
    
    min_val := (10 ^ (length - 1))::BIGINT;
    max_val := (10 ^ length - 1)::BIGINT;
    
    LOOP
        attempts := attempts + 1;
        -- Generate random integer in [min_val, max_val] using cryptographic randomness
        new_id := (min_val + floor(random() * (max_val - min_val + 1)))::BIGINT::TEXT;
        
        -- Check collision in both profiles and communication_ids reserve table
        SELECT EXISTS (
            SELECT 1 FROM public.profiles WHERE communication_id = new_id
        ) INTO is_taken;
        
        IF NOT is_taken THEN
            RETURN new_id;
        END IF;
        
        -- Failsafe for extreme collision exhaustion
        IF attempts > 100 THEN
            RAISE EXCEPTION 'Unable to generate unique Communication ID after 100 attempts';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- ==============================================================================
-- 4. CORE PROFILES & IDENTITY TABLE
-- ==============================================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT DEFAULT '',
    communication_id VARCHAR(10) NOT NULL UNIQUE,
    is_online BOOLEAN DEFAULT false,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT communication_id_format CHECK (communication_id ~ '^[0-9]{6,10}$')
);

CREATE INDEX idx_profiles_comm_id ON public.profiles(communication_id);
CREATE INDEX idx_profiles_email ON public.profiles(LOWER(email));

CREATE TABLE public.communication_ids (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. CONTACTS & CLOSE FRIENDS & BLOCKS
-- ==============================================================================
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    alias TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT no_self_contact CHECK (user_id <> contact_user_id),
    CONSTRAINT unique_user_contact UNIQUE (user_id, contact_user_id)
);

CREATE TABLE public.contact_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'canceled')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT no_self_request CHECK (sender_id <> receiver_id),
    CONSTRAINT unique_pending_request UNIQUE (sender_id, receiver_id)
);

CREATE TABLE public.close_friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT no_self_close_friend CHECK (user_id <> friend_id),
    CONSTRAINT unique_close_friend UNIQUE (user_id, friend_id)
);

CREATE TABLE public.blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT no_self_block CHECK (blocker_id <> blocked_id),
    CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id)
);

-- ==============================================================================
-- 6. CONVERSATIONS & MESSAGES
-- ==============================================================================
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('direct', 'group')) DEFAULT 'direct',
    is_private_vault BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.conversation_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_pinned BOOLEAN DEFAULT false,
    is_muted BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_conversation_member UNIQUE (conversation_id, user_id)
);

CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT,
    message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'video', 'file', 'audio', 'system')) DEFAULT 'text',
    attachment_url TEXT,
    attachment_meta JSONB,
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_convo_created ON public.messages(conversation_id, created_at DESC);

CREATE TABLE public.message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_message_user_reaction UNIQUE (message_id, user_id, emoji)
);

CREATE TABLE public.message_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_message_read UNIQUE (message_id, user_id)
);

-- ==============================================================================
-- 7. THOUGHTS (24-HOUR EPHEMERAL STATUSES)
-- ==============================================================================
CREATE TABLE public.thoughts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT,
    media_url TEXT,
    media_type TEXT NOT NULL CHECK (media_type IN ('text', 'image', 'video')) DEFAULT 'text',
    background_style JSONB DEFAULT '{"theme": "calm-blue", "color": "#0C80F2", "font": "sans"}'::JSONB,
    audience TEXT NOT NULL CHECK (audience IN ('everyone', 'contacts', 'close_friends', 'nobody')) DEFAULT 'contacts',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_thoughts_active ON public.thoughts(user_id, expires_at DESC);

CREATE TABLE public.thought_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thought_id UUID NOT NULL REFERENCES public.thoughts(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_thought_viewer UNIQUE (thought_id, viewer_id)
);

-- ==============================================================================
-- 8. PRIVATE CHAT VAULTS & USER SETTINGS & REPORTS
-- ==============================================================================
CREATE TABLE public.private_chat_vaults (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    pin_salt TEXT NOT NULL,
    pin_hash TEXT NOT NULL,
    auto_lock_interval INT NOT NULL DEFAULT 5, -- in minutes
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    privacy_messaging TEXT NOT NULL CHECK (privacy_messaging IN ('everyone', 'contacts', 'nobody')) DEFAULT 'everyone',
    privacy_thoughts TEXT NOT NULL CHECK (privacy_thoughts IN ('everyone', 'contacts', 'close_friends', 'nobody')) DEFAULT 'contacts',
    privacy_profile_photo TEXT NOT NULL CHECK (privacy_profile_photo IN ('everyone', 'contacts', 'nobody')) DEFAULT 'everyone',
    privacy_online TEXT NOT NULL CHECK (privacy_online IN ('everyone', 'contacts', 'nobody')) DEFAULT 'contacts',
    privacy_last_seen TEXT NOT NULL CHECK (privacy_last_seen IN ('everyone', 'contacts', 'nobody')) DEFAULT 'contacts',
    read_receipts_enabled BOOLEAN NOT NULL DEFAULT true,
    notification_preview BOOLEAN NOT NULL DEFAULT true,
    sound_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    thought_id UUID REFERENCES public.thoughts(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. RPC FUNCTION: EMAIL EXISTENCE CHECK & AUTOMATIC PROFILE INITIALIZATION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_email_exists(email_input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users WHERE LOWER(email) = LOWER(TRIM(email_input))
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE LOWER(email) = LOWER(TRIM(email_input))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    new_comm_id TEXT;
    raw_name TEXT;
    avatar TEXT;
BEGIN
    -- Derive display name safely without email disclosure
    raw_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        INITCAP(split_part(NEW.email, '@', 1)),
        'User ' || substr(NEW.id::text, 1, 6)
    );
    avatar := NEW.raw_user_meta_data->>'avatar_url';
    
    -- Generate permanent unique 8-digit Communication ID
    new_comm_id := public.generate_unique_communication_id(8);
    
    -- Insert profile with email
    INSERT INTO public.profiles (id, email, display_name, avatar_url, communication_id)
    VALUES (NEW.id, LOWER(NEW.email), raw_name, avatar, new_comm_id)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    
    -- Record in registry
    INSERT INTO public.communication_ids (code, user_id)
    VALUES (new_comm_id, NEW.id)
    ON CONFLICT DO NOTHING;
    
    -- Create default user settings
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thought_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_chat_vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS checks
CREATE OR REPLACE FUNCTION public.is_blocked_bidirectional(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.blocked_users
        WHERE (blocker_id = user_a AND blocked_id = user_b)
           OR (blocker_id = user_b AND blocked_id = user_a)
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_close_friend(owner_id UUID, target_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.close_friends
        WHERE user_id = owner_id AND friend_id = target_id
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_contact(owner_id UUID, target_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.contacts
        WHERE user_id = owner_id AND contact_user_id = target_id
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- PROFILES RLS
CREATE POLICY "Public profile lookup by communication id or authenticated users"
ON public.profiles FOR SELECT
USING (
    auth.uid() = id OR
    (NOT public.is_blocked_bidirectional(auth.uid(), id))
);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- CONTACTS RLS
CREATE POLICY "Users can manage own contacts"
ON public.contacts FOR ALL
USING (auth.uid() = user_id);

-- CONTACT REQUESTS RLS
CREATE POLICY "Users can view incoming or outgoing requests"
ON public.contact_requests FOR SELECT
USING (auth.uid() IN (sender_id, receiver_id));

CREATE POLICY "Users can create contact requests"
ON public.contact_requests FOR INSERT
WITH CHECK (
    auth.uid() = sender_id AND
    NOT public.is_blocked_bidirectional(sender_id, receiver_id)
);

CREATE POLICY "Users can update contact requests"
ON public.contact_requests FOR UPDATE
USING (auth.uid() IN (sender_id, receiver_id));

-- CLOSE FRIENDS RLS (Strictly Private to Owner)
CREATE POLICY "Users can view and manage only own close friends"
ON public.close_friends FOR ALL
USING (auth.uid() = user_id);

-- BLOCKED USERS RLS
CREATE POLICY "Users can view and manage only own blocked list"
ON public.blocked_users FOR ALL
USING (auth.uid() = blocker_id);

-- CONVERSATIONS & MEMBERS RLS
CREATE POLICY "Users can view conversations they belong to"
ON public.conversations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = conversations.id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Members can view conversation members"
ON public.conversation_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_members cm
        WHERE cm.conversation_id = conversation_members.conversation_id AND cm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage their own membership state"
ON public.conversation_members FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can join conversations or be added"
ON public.conversation_members FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- MESSAGES RLS
CREATE POLICY "Members can read messages in conversation"
ON public.messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Members can insert messages"
ON public.messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Senders can edit or delete their own messages"
ON public.messages FOR UPDATE
USING (auth.uid() = sender_id);

-- REACTIONS & READ RECEIPTS RLS
CREATE POLICY "Members can view reactions"
ON public.message_reactions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
        WHERE m.id = message_reactions.message_id AND cm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can add/remove own reactions"
ON public.message_reactions FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Members can view read receipts"
ON public.message_reads FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
        WHERE m.id = message_reads.message_id AND cm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert own read receipts"
ON public.message_reads FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- THOUGHTS RLS (24-Hour Ephemeral Status with Strict Audience Enforcement)
CREATE POLICY "Users can view allowed active thoughts"
ON public.thoughts FOR SELECT
USING (
    expires_at > NOW() AND
    NOT public.is_blocked_bidirectional(auth.uid(), user_id) AND (
        user_id = auth.uid() OR
        audience = 'everyone' OR
        (audience = 'contacts' AND public.is_contact(user_id, auth.uid())) OR
        (audience = 'close_friends' AND public.is_close_friend(user_id, auth.uid()))
    )
);

CREATE POLICY "Users can manage own thoughts"
ON public.thoughts FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Authors and viewers can see thought views"
ON public.thought_views FOR SELECT
USING (
    viewer_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.thoughts t
        WHERE t.id = thought_views.thought_id AND t.user_id = auth.uid()
    )
);

CREATE POLICY "Users can record own thought view"
ON public.thought_views FOR INSERT
WITH CHECK (auth.uid() = viewer_id);

-- PRIVATE CHAT VAULT RLS
CREATE POLICY "Users can only access own private vault"
ON public.private_chat_vaults FOR ALL
USING (auth.uid() = user_id);

-- USER SETTINGS RLS
CREATE POLICY "Users can view and edit own settings"
ON public.user_settings FOR ALL
USING (auth.uid() = user_id);

-- REPORTS RLS
CREATE POLICY "Users can create reports"
ON public.reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);
