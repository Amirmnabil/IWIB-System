import { z } from "zod";

export const CompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  industry: z.string().nullable().optional().or(z.literal("")),
  commercial_reg: z.string().nullable().optional().or(z.literal("")),
  tax_id: z.string().nullable().optional().or(z.literal("")),
  email: z.string().email("Invalid email").nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional().or(z.literal("")),
  website: z.string().nullable().optional().or(z.literal("")),
  address: z.string().nullable().optional().or(z.literal("")),
  notes: z.string().nullable().optional().or(z.literal("")),
  status: z.string().default("active").optional(),
});

export type CompanyFormData = z.infer<typeof CompanySchema>;
