-- Decks table
CREATE TABLE IF NOT EXISTS public.decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled Deck',
  description text,
  thumbnail_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_decks_user_id ON public.decks(user_id);
CREATE INDEX idx_decks_updated_at ON public.decks(updated_at DESC);

ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own decks"
  ON public.decks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own decks"
  ON public.decks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own decks"
  ON public.decks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own decks"
  ON public.decks FOR DELETE
  USING (auth.uid() = user_id);

-- Slides table
CREATE TABLE IF NOT EXISTS public.slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  layout_key text NOT NULL DEFAULT 'Slide Content',
  content jsonb NOT NULL DEFAULT '{"elements": []}',
  notes text,
  thumbnail_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_slides_deck_id ON public.slides(deck_id);
CREATE INDEX idx_slides_order ON public.slides(deck_id, order_index);

ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view slides of own decks"
  ON public.slides FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.decks
      WHERE decks.id = slides.deck_id
      AND decks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create slides in own decks"
  ON public.slides FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.decks
      WHERE decks.id = slides.deck_id
      AND decks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update slides in own decks"
  ON public.slides FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.decks
      WHERE decks.id = slides.deck_id
      AND decks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete slides in own decks"
  ON public.slides FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.decks
      WHERE decks.id = slides.deck_id
      AND decks.user_id = auth.uid()
    )
  );

-- Company images library
CREATE TABLE IF NOT EXISTS public.company_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  filename text,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_images_tags ON public.company_images USING gin(tags);

ALTER TABLE public.company_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view company images"
  ON public.company_images FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload company images"
  ON public.company_images FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

-- Auto-update updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_decks_updated_at
  BEFORE UPDATE ON public.decks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_slides_updated_at
  BEFORE UPDATE ON public.slides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage buckets (run via Supabase dashboard or CLI)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('slide-images', 'slide-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('generated-pptx', 'generated-pptx', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('company-images', 'company-images', true);
