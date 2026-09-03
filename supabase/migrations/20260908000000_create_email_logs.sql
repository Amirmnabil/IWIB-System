-- Create email_logs table for tracking notification delivery
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
    error_message TEXT,
    related_type TEXT CHECK (related_type IN ('member', 'policy')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Allow service_role & authenticated users to insert/read email logs
CREATE POLICY "Allow authenticated read email_logs"
    ON public.email_logs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow service_role insert email_logs"
    ON public.email_logs FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Allow authenticated insert email_logs"
    ON public.email_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow anon insert email_logs"
    ON public.email_logs FOR INSERT
    TO anon
    WITH CHECK (true);


-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_related_type ON public.email_logs(related_type);
