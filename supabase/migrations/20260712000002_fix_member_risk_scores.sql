-- Phase 4 Fix: Add unique constraint to member_risk_scores

ALTER TABLE public.member_risk_scores ADD CONSTRAINT unique_dim_member_id UNIQUE (dim_member_id);
