-- Create sultan_order table for managing sultan display order
CREATE TABLE public.sultan_order (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(country_id, name)
);

-- Enable Row Level Security
ALTER TABLE public.sultan_order ENABLE ROW LEVEL SECURITY;

-- Create policies for sultan_order
CREATE POLICY "Anyone can view sultan order" 
ON public.sultan_order 
FOR SELECT 
USING (true);

CREATE POLICY "Allow super/country admin all actions" 
ON public.sultan_order 
FOR ALL 
USING (is_super_or_country_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sultan_order_updated_at
BEFORE UPDATE ON public.sultan_order
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient querying
CREATE INDEX idx_sultan_order_country_display ON public.sultan_order(country_id, display_order);
CREATE INDEX idx_sultan_order_country_name ON public.sultan_order(country_id, name);