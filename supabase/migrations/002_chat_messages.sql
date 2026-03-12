ALTER TABLE public.decks
  ADD COLUMN IF NOT EXISTS chat_messages jsonb NOT NULL DEFAULT '[]'::jsonb;
