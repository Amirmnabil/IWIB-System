-- Create policy_utilization_reports table
CREATE TABLE IF NOT EXISTS public.policy_utilization_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
    period VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.policy_utilization_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Allow read access to authenticated users" 
ON public.policy_utilization_reports 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow insert access to authenticated users" 
ON public.policy_utilization_reports 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow delete access to authenticated users" 
ON public.policy_utilization_reports 
FOR DELETE 
TO authenticated 
USING (true);

-- Grant permissions to roles
GRANT ALL ON public.policy_utilization_reports TO authenticated;
GRANT ALL ON public.policy_utilization_reports TO service_role;
