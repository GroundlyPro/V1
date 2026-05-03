ALTER TABLE chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_delivery_type_check;

ALTER TABLE chat_messages
  ADD CONSTRAINT chat_messages_delivery_type_check
  CHECK (delivery_type IN ('internal', 'email', 'note', 'sms', 'system'));
