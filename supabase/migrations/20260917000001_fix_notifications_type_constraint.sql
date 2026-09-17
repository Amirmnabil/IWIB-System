-- Migration to fix null value in column "type" of relation "notifications" constraint during endorsement approval
-- Updates handle_endorsement_status_notification trigger function to supply 'type' and wrap in exception handling.

CREATE OR REPLACE FUNCTION public.handle_endorsement_status_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if status changed and created_by is valid
    IF (OLD IS NULL OR NEW.status IS DISTINCT FROM OLD.status) AND NEW.created_by IS NOT NULL THEN
        BEGIN
            IF NEW.status = 'Issued' OR NEW.status = 'Approved' THEN
                INSERT INTO public.notifications (user_id, type, title, message, priority, entity_type, entity_id)
                VALUES (
                    NEW.created_by,
                    'endorsement',
                    'Endorsement Approved',
                    'Your endorsement request ' || COALESCE(NEW.endorsement_number, '') || ' has been approved and issued.',
                    'high',
                    'endorsements',
                    NEW.id
                );
            ELSIF NEW.status = 'Rejected' THEN
                INSERT INTO public.notifications (user_id, type, title, message, priority, entity_type, entity_id)
                VALUES (
                    NEW.created_by,
                    'endorsement',
                    'Endorsement Rejected',
                    'Your endorsement request ' || COALESCE(NEW.endorsement_number, '') || ' has been rejected.',
                    'high',
                    'endorsements',
                    NEW.id
                );
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Ensure notification failure never blocks primary endorsement processing or invoicing
            RAISE WARNING 'Failed to create endorsement notification: %', SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
