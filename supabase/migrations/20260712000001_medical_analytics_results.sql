-- Phase 2: Medical Analytics Results Storage

CREATE TABLE IF NOT EXISTS public.medical_analytics_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
    engine_name VARCHAR(100) NOT NULL, -- e.g., 'cost_utilization', 'provider_analytics'
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(policy_id, engine_name)
);

CREATE INDEX idx_medical_analytics_results_policy ON public.medical_analytics_results(policy_id);
