import { z } from "zod";

export const ContactSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional().or(z.literal("")),
  mobile: z.string().nullable().optional().or(z.literal("")),
  company_id: z.string().uuid("Invalid Company ID").nullable().optional().or(z.literal("")),
  role_id: z.string().uuid("Invalid Role ID").nullable().optional().or(z.literal("")),
  client_type_id: z.string().uuid("Invalid Client Type ID").nullable().optional().or(z.literal("")),
  is_primary: z.boolean().default(false).optional(),
  notes: z.string().nullable().optional().or(z.literal("")),
});

export type ContactFormData = z.infer<typeof ContactSchema>;
