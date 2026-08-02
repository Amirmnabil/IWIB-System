import { supabase } from "@/lib/supabase";
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import { sanitizeStorageFilename } from "@/lib/utils/sanitize-storage-filename";

export type UnderwritingStatus = "pending" | "in_progress" | "done";

export interface InsurerOffer {
  id: string;
  insurer: string;
  premium_egp: number;
  notes: string;
  received_date?: string; // Date offer was received e.g. "2026-08-01"
  file_url?: string;     // PDF / document URL in Supabase Storage
  file_name?: string;    // Display filename
}

export interface UnderwritingVersion {
  id: string;
  version_number: number;
  label: string; // e.g. "Version 1"
  created_at: string;
  offers: InsurerOffer[];
}

export class UnderwritingService {
  /**
   * Fetch all prospects with their prospect_details for the Quotations list.
   */
  static async getQuotations() {
    const { data, error } = await supabase
      .from("prospects")
      .select("*, prospect_details(*)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Fetch a single prospect with full details for the Quotation Details page.
   */
  static async getQuotationById(prospectId: string) {
    const { data, error } = await supabase
      .from("prospects")
      .select("*, prospect_details(*)")
      .eq("id", prospectId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Upload an offer PDF/document to Supabase storage.
   */
  static async uploadOfferPdf(file: File, prospectId: string): Promise<{ file_url: string; file_name: string }> {
    const safeFilename = sanitizeStorageFilename(file.name);
    const fileName = `underwriting_offers/${prospectId}/${Date.now()}_${safeFilename}`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(fileName, file, { cacheControl: "3600", upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("documents")
      .getPublicUrl(fileName);

    return {
      file_url: publicUrl,
      file_name: file.name,
    };
  }

  /**
   * Save underwriting versions and sync offers into proposal_versions.
   * proposal_versions is what the Prospects page reads for Pricing Options.
   */
  static async saveUnderwritingVersions(
    prospectId: string,
    companyId: string | null | undefined,
    versions: UnderwritingVersion[],
    status: UnderwritingStatus
  ) {
    // Flatten all offers from all versions into proposal_versions format
    // so the Prospects module automatically sees them.
    const proposal_versions = versions.flatMap((v) =>
      v.offers.map((offer) => ({
        id: offer.id,
        title: `${v.label} — ${offer.insurer}`,
        insurer: offer.insurer,
        premium: offer.premium_egp,
        notes: offer.notes,
        received_date: offer.received_date || null,
        file_url: offer.file_url || null,
        file_name: offer.file_name || null,
        status: status === "done" ? "Active" : "Draft",
        version_label: v.label,
        version_number: v.version_number,
        created_at: v.created_at,
      }))
    );

    const payload = sanitizeUUIDs({
      prospect_id: prospectId,
      company_id: companyId || null,
      underwriting_versions: versions,
      underwriting_status: status,
      proposal_versions,
      updated_at: new Date().toISOString(),
    });

    const { error } = await supabase
      .from("prospect_details")
      .upsert(payload, { onConflict: "prospect_id" });

    if (error) throw error;

    // Also update the estimated_value on prospects to the highest offer if done
    if (status === "done" && proposal_versions.length > 0) {
      const maxPremium = Math.max(...proposal_versions.map((p) => p.premium || 0));
      if (maxPremium > 0) {
        await supabase
          .from("prospects")
          .update({ estimated_value: maxPremium, updated_at: new Date().toISOString() })
          .eq("id", prospectId);
      }
    }

    return true;
  }

  /**
   * Update only the underwriting status without modifying versions.
   */
  static async updateStatus(
    prospectId: string,
    companyId: string | null | undefined,
    status: UnderwritingStatus
  ) {
    const { error } = await supabase
      .from("prospect_details")
      .upsert(
        sanitizeUUIDs({
          prospect_id: prospectId,
          company_id: companyId || null,
          underwriting_status: status,
          updated_at: new Date().toISOString(),
        }),
        { onConflict: "prospect_id" }
      );

    if (error) throw error;
    return true;
  }

  /**
   * Generate a new underwriting version object.
   * Copies previous version's offers so underwriter can easily update prices/documents from the same insurers!
   */
  static createNewVersion(existingVersions: UnderwritingVersion[]): UnderwritingVersion {
    const nextNumber = existingVersions.length + 1;
    const previousVersion = existingVersions.length > 0 ? existingVersions[existingVersions.length - 1] : null;

    // Clone previous offers with fresh IDs if any exist
    const clonedOffers: InsurerOffer[] = previousVersion
      ? previousVersion.offers.map((offer) => ({
          ...offer,
          id: Math.random().toString(36).substring(2, 11),
          notes: offer.notes ? `Updated from ${previousVersion.label}: ${offer.notes}` : "",
        }))
      : [];

    return {
      id: Math.random().toString(36).substring(2, 11),
      version_number: nextNumber,
      label: `Version ${nextNumber}`,
      created_at: new Date().toISOString(),
      offers: clonedOffers,
    };
  }

  /**
   * Generate a new offer object (not yet persisted).
   */
  static createOffer(
    insurer: string,
    premium: number,
    notes: string,
    received_date?: string,
    file_url?: string,
    file_name?: string
  ): InsurerOffer {
    return {
      id: Math.random().toString(36).substring(2, 11),
      insurer,
      premium_egp: premium,
      notes,
      received_date: received_date || new Date().toISOString().split("T")[0],
      file_url,
      file_name,
    };
  }
}

