-- Phase 1: Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rule_id UUID, -- We will add FK after rule table is created
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'medium',
    entity_type VARCHAR(100),
    entity_id UUID,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Phase 2: Notification Rules Table
CREATE TABLE IF NOT EXISTS notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_event VARCHAR(100), -- 'on_update', 'on_create', 'cron_daily'
    entity_type VARCHAR(100), -- 'company', 'policy', 'task'
    conditions JSONB, 
    target_audiences JSONB, 
    priority VARCHAR(50) DEFAULT 'medium', 
    template_title VARCHAR(255), 
    template_body TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS rule_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_rule'
  ) THEN
    ALTER TABLE notifications ADD CONSTRAINT fk_rule FOREIGN KEY (rule_id) REFERENCES notification_rules(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications (read status)" ON notifications;
CREATE POLICY "Users can update their own notifications (read status)" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System and users can insert notifications" ON notifications;
CREATE POLICY "System and users can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Admins can view and manage rules
DROP POLICY IF EXISTS "Admins manage notification rules" ON notification_rules;
CREATE POLICY "Admins manage notification rules" ON notification_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true
        )
    );

-- Phase 1: Realtime Subscriptions Setup
-- Add to publication if it exists, otherwise create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
END $$;

-- Phase 2: Webhooks (Database Trigger to call Edge Function)
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION notify_evaluate_rules()
RETURNS TRIGGER AS $$
BEGIN
  -- We assume Kong is at the standard Supabase Edge function internal URL
  -- In production, the Anon key would be securely retrieved from vault or secret
  PERFORM net.http_post(
    url := coalesce(current_setting('app.settings.edge_function_url', true), 'http://kong:8000/functions/v1/evaluate_notifications'),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := json_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', row_to_json(NEW),
      'old_record', row_to_json(OLD)
    )::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for companies (as an example)
DROP TRIGGER IF EXISTS company_evaluate_rules_trigger ON companies;
CREATE TRIGGER company_evaluate_rules_trigger
AFTER INSERT OR UPDATE ON companies
FOR EACH ROW EXECUTE FUNCTION notify_evaluate_rules();

-- Phase 3: pg_cron setup for Time-based Triggers
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cron to hit the Edge function
SELECT cron.schedule(
    'evaluate_daily_rules',
    '0 0 * * *', -- Midnight daily
    $$
    SELECT net.http_post(
        url := coalesce(current_setting('app.settings.edge_function_url', true), 'http://kong:8000/functions/v1/evaluate_notifications'),
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{"type": "cron_daily"}'::jsonb
    );
    $$
);
