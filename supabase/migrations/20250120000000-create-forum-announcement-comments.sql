-- Create forum_announcement_comments table for comments on announcements
CREATE TABLE public.forum_announcement_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    announcement_id uuid NOT NULL REFERENCES public.forum_announcements(id) ON DELETE CASCADE,
    content text NOT NULL,
    author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_comment_id uuid REFERENCES public.forum_announcement_comments(id) ON DELETE CASCADE,
    is_edited boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.forum_announcement_comments ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_forum_announcement_comments_announcement_id ON public.forum_announcement_comments(announcement_id);
CREATE INDEX idx_forum_announcement_comments_author_id ON public.forum_announcement_comments(author_id);
CREATE INDEX idx_forum_announcement_comments_parent_id ON public.forum_announcement_comments(parent_comment_id);
CREATE INDEX idx_forum_announcement_comments_announcement_parent ON public.forum_announcement_comments(announcement_id, parent_comment_id);

-- RLS Policies
CREATE POLICY "Enable read access for all users" ON public.forum_announcement_comments
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.forum_announcement_comments
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Enable update for comment authors" ON public.forum_announcement_comments
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Enable delete for admins and authors" ON public.forum_announcement_comments
    FOR DELETE USING (auth.uid() = author_id OR (select role from public.profiles where id = auth.uid()) like '%Admin%');

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.forum_announcement_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at(); 