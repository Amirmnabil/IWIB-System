-- Migration: Add missing columns to public.contacts table
-- Ensures contacts table supports company_name, role_type, linked_policy_id, entity_type, and entity_id

ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS role_type text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS linked_policy_id uuid;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS entity_id uuid;
