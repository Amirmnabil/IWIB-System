-- Auto-seed default role levels for existing roles

INSERT INTO public.role_levels (role_id, name, is_active)
SELECT r.id, level_name, true
FROM public.roles r
CROSS JOIN (
    VALUES ('Senior'), ('Manager'), ('Junior')
) AS levels(level_name)
WHERE r.is_system = false
ON CONFLICT (role_id, name) DO NOTHING;
