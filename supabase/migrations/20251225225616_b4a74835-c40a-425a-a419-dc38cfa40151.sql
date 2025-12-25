-- Create starred_items table for saving AI answers and resources
CREATE TABLE public.starred_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('ai_answer', 'resource')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  topic TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.starred_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own starred items"
ON public.starred_items
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own starred items"
ON public.starred_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own starred items"
ON public.starred_items
FOR DELETE
USING (auth.uid() = user_id);