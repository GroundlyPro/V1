CREATE TABLE chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('team', 'client')),
  title text NOT NULL,
  description text,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  last_message_sender_name text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX chat_client_conversation_unique
  ON chat_conversations (business_id, client_id)
  WHERE client_id IS NOT NULL AND archived_at IS NULL;

CREATE INDEX chat_conversations_business_last_message_idx
  ON chat_conversations (business_id, last_message_at DESC);

CREATE TABLE chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_participants_actor_check
    CHECK (((user_id IS NOT NULL)::int + (client_id IS NOT NULL)::int) = 1),
  CONSTRAINT chat_participants_user_unique UNIQUE (conversation_id, user_id),
  CONSTRAINT chat_participants_client_unique UNIQUE (conversation_id, client_id)
);

CREATE INDEX chat_participants_business_conversation_idx
  ON chat_participants (business_id, conversation_id);

CREATE TABLE chat_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at timestamptz,
  unread_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_reads_unique UNIQUE (conversation_id, user_id)
);

CREATE INDEX chat_reads_user_idx
  ON chat_reads (user_id, conversation_id);

CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  sender_client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  sender_kind text NOT NULL DEFAULT 'user' CHECK (sender_kind IN ('user', 'client', 'system')),
  sender_name text NOT NULL,
  sender_role text,
  body text NOT NULL,
  delivery_type text NOT NULL DEFAULT 'internal' CHECK (delivery_type IN ('internal', 'email', 'note', 'system')),
  delivery_status text NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chat_messages_business_conversation_idx
  ON chat_messages (business_id, conversation_id, created_at DESC);

CREATE OR REPLACE FUNCTION sync_chat_conversation_after_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = left(regexp_replace(NEW.body, '\s+', ' ', 'g'), 140),
    last_message_sender_name = NEW.sender_name,
    updated_at = now()
  WHERE id = NEW.conversation_id;

  UPDATE chat_reads
  SET
    unread_count = unread_count + 1,
    updated_at = now()
  WHERE conversation_id = NEW.conversation_id
    AND (NEW.sender_user_id IS NULL OR user_id <> NEW.sender_user_id);

  IF NEW.sender_user_id IS NOT NULL THEN
    UPDATE chat_reads
    SET
      last_read_at = NEW.created_at,
      unread_count = 0,
      updated_at = now()
    WHERE conversation_id = NEW.conversation_id
      AND user_id = NEW.sender_user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_chat_conversation_after_message_trigger
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION sync_chat_conversation_after_message();

ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
