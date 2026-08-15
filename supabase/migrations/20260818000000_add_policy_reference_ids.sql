-- Add missing line_of_business_id, product_subtype_id, currency_id, and payment_frequency_id columns to policies table referencing master tables
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS line_of_business_id UUID REFERENCES public.master_product_types(id) ON DELETE SET NULL;
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS product_subtype_id UUID REFERENCES public.master_product_subtypes(id) ON DELETE SET NULL;
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS currency_id UUID REFERENCES public.master_currencies(id) ON DELETE SET NULL;
ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS payment_frequency_id UUID REFERENCES public.master_payment_frequencies(id) ON DELETE SET NULL;
