const fs = require('fs');
const tables = [
    'master_industries', 'master_departments', 'master_locations', 'master_months',
    'master_company_statuses', 'master_priorities', 'master_product_types',
    'master_activity_types', 'master_activity_statuses', 'master_claim_types',
    'master_claim_statuses', 'master_endorsement_types', 'master_invoice_types',
    'master_kyc_document_types', 'master_payment_methods', 'master_pipeline_stages',
    'master_provider_types', 'master_benefit_classes', 'master_network_types',
    'master_related_types', 'master_company_sizes', 'master_sources'
];

let sql = `-- Create a generic function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

`;

for (const t of tables) {
    sql += `
-- ==========================================
-- Table: ${t}
-- ==========================================
CREATE TABLE IF NOT EXISTS public.${t} (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    name_en TEXT,
    name_ar TEXT,
    subcategory_en TEXT,
    subcategory_ar TEXT,
    category TEXT,
    category_en TEXT,
    code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_${t}_modtime ON public.${t};
CREATE TRIGGER update_${t}_modtime
BEFORE UPDATE ON public.${t}
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.${t};
CREATE POLICY "Enable read access for all users" ON public.${t} FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.${t};
CREATE POLICY "Enable insert for authenticated users" ON public.${t} FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.${t};
CREATE POLICY "Enable update for authenticated users" ON public.${t} FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.${t};
CREATE POLICY "Enable delete for authenticated users" ON public.${t} FOR DELETE USING (true);
`;
}

fs.writeFileSync('C:\\Users\\Amir\\.gemini\\antigravity\\brain\\7025d2d6-cb75-4b23-b8e5-0e97d553c86a\\create_master_tables_flat.sql.md', sql);
