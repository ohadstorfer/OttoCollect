-- Add role translation columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN role_ar text,
ADD COLUMN role_tr text;