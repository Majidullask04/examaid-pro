-- Create table for storing JNTUH analysis history
CREATE TABLE public.jntuh_analysis_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  department TEXT NOT NULL,
  subject TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jntuh_analysis_history ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (supports anonymous users via session_id)
CREATE POLICY "Anyone can insert analysis history"
ON public.jntuh_analysis_history
FOR INSERT
WITH CHECK (true);

-- Users can view their own history (by session_id or user_id)
CREATE POLICY "Users can view their own analysis history"
ON public.jntuh_analysis_history
FOR SELECT
USING (
  session_id = current_setting('request.headers', true)::json->>'x-session-id'
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

-- Users can delete their own history
CREATE POLICY "Users can delete their own analysis history"
ON public.jntuh_analysis_history
FOR DELETE
USING (
  session_id = current_setting('request.headers', true)::json->>'x-session-id'
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

-- Create index for faster queries
CREATE INDEX idx_jntuh_history_session ON public.jntuh_analysis_history(session_id);
CREATE INDEX idx_jntuh_history_user ON public.jntuh_analysis_history(user_id);
CREATE INDEX idx_jntuh_history_created ON public.jntuh_analysis_history(created_at DESC);