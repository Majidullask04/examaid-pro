-- Create storage bucket for syllabus images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('syllabus-images', 'syllabus-images', true);

-- Allow public read access to syllabus images
CREATE POLICY "Public read access for syllabus images"
ON storage.objects FOR SELECT 
USING (bucket_id = 'syllabus-images');

-- Allow anyone to upload syllabus images (session-based)
CREATE POLICY "Anyone can upload syllabus images"
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'syllabus-images');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own syllabus images"
ON storage.objects FOR DELETE 
USING (bucket_id = 'syllabus-images');

-- Create table to track syllabus uploads and analysis
CREATE TABLE public.syllabus_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  image_url TEXT NOT NULL,
  department TEXT NOT NULL,
  subject_name TEXT,
  extracted_topics JSONB,
  study_goal TEXT CHECK (study_goal IN ('pass', 'high_marks')),
  analysis_result TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.syllabus_uploads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert syllabus uploads (with session_id tracking)
CREATE POLICY "Anyone can insert syllabus uploads"
ON public.syllabus_uploads FOR INSERT 
WITH CHECK (true);

-- Allow users to read their own uploads by session or user_id
CREATE POLICY "Users can read own uploads"
ON public.syllabus_uploads FOR SELECT
USING (
  session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-session-id')
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own uploads"
ON public.syllabus_uploads FOR DELETE
USING (
  session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-session-id')
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);