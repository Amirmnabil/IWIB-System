-- Migration to add trigger for automatic approval/rejection notifications and enable realtime replication
-- for key client portal tables.

-- 1. Trigger function for endorsement status notification
CREATE OR REPLACE FUNCTION public.handle_endorsement_status_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if status changed and created_by is valid
    IF (OLD IS NULL OR NEW.status IS DISTINCT FROM OLD.status) AND NEW.created_by IS NOT NULL THEN
        IF NEW.status = 'Issued' OR NEW.status = 'Approved' THEN
            INSERT INTO public.notifications (user_id, title, message, priority, entity_type, entity_id)
            VALUES (
                NEW.created_by,
                'Endorsement Approved',
                'Your endorsement request ' || COALESCE(NEW.endorsement_number, '') || ' has been approved and issued.',
                'high',
                'endorsements',
                NEW.id
            );
        ELSIF NEW.status = 'Rejected' THEN
            INSERT INTO public.notifications (user_id, title, message, priority, entity_type, entity_id)
            VALUES (
                NEW.created_by,
                'Endorsement Rejected',
                'Your endorsement request ' || COALESCE(NEW.endorsement_number, '') || ' has been rejected.',
                'high',
                'endorsements',
                NEW.id
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind status change notification trigger to endorsements table
DROP TRIGGER IF EXISTS trg_endorsement_status_notification ON public.endorsements;
CREATE TRIGGER trg_endorsement_status_notification
AFTER UPDATE OF status ON public.endorsements
FOR EACH ROW
EXECUTE FUNCTION public.handle_endorsement_status_notification();

-- 2. Setup publications for realtime event replication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'policy_members'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE policy_members;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'endorsements'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE endorsements;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'endorsement_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE endorsement_items;
    END IF;
END $$;
