-- Allow a chat message to reply to another message in the same event.
ALTER TABLE event_messages
    ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES event_messages(id) ON DELETE SET NULL;
