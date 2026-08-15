-- Add missing client_type_id column to policies table referencing master_client_types
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS client_type_id UUID REFERENCES public.master_client_types(id) ON DELETE SET NULL;
