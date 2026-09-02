-- Migration to correct timezone-shifted addition dates (2026-08-31 -> 2026-09-01) for Mima Foods policy census members

UPDATE public.policy_members
SET addition_date = '2026-09-01'
WHERE addition_date = '2026-08-31'
  AND (
    member_name ILIKE '%SALEH KHAFAJA%' 
    OR member_name ILIKE '%HANAN HAMDI%'
    OR member_id_insurance LIKE '5110503547%'
  );

UPDATE public.census_members
SET addition_date = '2026-09-01'
WHERE addition_date = '2026-08-31'
  AND (
    member_full_name ILIKE '%SALEH KHAFAJA%' 
    OR member_full_name ILIKE '%HANAN HAMDI%'
    OR member_id_insurance LIKE '5110503547%'
  );
