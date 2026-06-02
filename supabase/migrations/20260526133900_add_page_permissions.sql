CREATE TABLE IF NOT EXISTS public.system_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES public.system_modules(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  path text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.role_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
  page_id uuid REFERENCES public.system_pages(id) ON DELETE CASCADE,
  UNIQUE(role_id, page_id)
);

ALTER TABLE public.system_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view system_pages" ON public.system_pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to view role_pages" ON public.role_pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert role_pages" ON public.role_pages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete role_pages" ON public.role_pages FOR DELETE TO authenticated USING (true);
