'use client';

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { format, differenceInDays, differenceInMonths, isValid } from "date-fns";
import * as XLSX from "xlsx";
import { 
  X, UploadCloud, FileSpreadsheet, CheckCircle2, 
  AlertCircle, ChevronRight, Calculator, Calendar, Search, Users, FileEdit, ArrowRight, Loader2, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/lib/hooks/use-toast";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { validateMemberAddition, calculateAge, validateNationalID } from "@/lib/endorsement-validation";
import {
  validateInsurerEndorsementConfig,
  calculateProrationFactor,
  calculateAdditionPremium,
  calculateEndorsementTax,
  lookupMedicalBracketPremium
} from "@/lib/endorsement-rules";

interface CreateEndorsementWizardProps {
  policy?: any;
  insurer?: any;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function CreateEndorsementWizard({ policy: initialPolicy, insurer: initialInsurer, onClose, onSuccess }: CreateEndorsementWizardProps) {
  const { toast } = useToast();
  const router = useRouter();
  
  const [step, setStep] = useState<1 | 2 | 3>(initialPolicy ? 2 : 1);
  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState<string>("");
  const [selectedEndorsementTypeId, setSelectedEndorsementTypeId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [category, setCategory] = useState<string>("Corporate");

  // Policy Search (for standalone page mode)
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<any>(initialPolicy || null);
  const [policies, setPolicies] = useState<any[]>([]);

  // Fetch Endorsement Types
  const { data: rawEndorsementTypes } = useSupabaseCollection<any>('endorsement_types');
  const endorsementTypes = rawEndorsementTypes || [];

  // Excel parsing & items lists
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [excelRows, setExcelRows] = useState<any[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual items input state
  const [manualItems, setManualItems] = useState<any[]>([]);
  const [manualAction, setManualAction] = useState<"add" | "delete" | "modify">("add");

  // Single field for full name (must contain 4 parts)
  const [fullName, setFullName] = useState("");

  // Deletion search state
  const [deleteSearchQuery, setDeleteSearchQuery] = useState("");
  const [deleteSearchOpen, setDeleteSearchOpen] = useState(false);
  const [selectedDeleteMemberId, setSelectedDeleteMemberId] = useState("");

  const [manualNationalId, setManualNationalId] = useState("");
  const [manualDOB, setManualDOB] = useState("");
  const [manualGender, setManualGender] = useState("Male");
  const [manualRelation, setManualRelation] = useState("Employee");
  const [manualMobile, setManualMobile] = useState("");
  const [manualPlan, setManualPlan] = useState("");
  const [manualStaffCode, setManualStaffCode] = useState("");
  const [manualNationality, setManualNationality] = useState("Egyptian");
  const [manualLocation, setManualLocation] = useState("");
  const [manualDepartment, setManualDepartment] = useState("");
  const [manualJobTitle, setManualJobTitle] = useState("");

  // Parent staff code for Spouse/Child
  const [parentStaffCode, setParentStaffCode] = useState("");
  const [linkedMainMemberId, setLinkedMainMemberId] = useState<string>("");
  const [parentSearchResult, setParentSearchResult] = useState<any>(null);
  const [parentSearchError, setParentSearchError] = useState("");

  const [activeMembers, setActiveMembers] = useState<any[]>([]);
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [dbRelations, setDbRelations] = useState<any[]>([]);
  const [dependentRules, setDependentRules] = useState<any>(null);
  const [insurerRules, setInsurerRules] = useState<any>(null);
  const [isRulesLoading, setIsRulesLoading] = useState<boolean>(false);
  const [policyClaims, setPolicyClaims] = useState<any[]>([]);

  // Compute full member name from single field
  const composedMemberName = fullName.trim();

  // Filtered active members for deletion search
  const filteredDeleteMembers = useMemo(() => {
    if (!deleteSearchQuery.trim()) return activeMembers;
    const q = deleteSearchQuery.toLowerCase();
    return activeMembers.filter((m: any) =>
      (m.member_name || "").toLowerCase().includes(q) ||
      (m.staff_code || "").toLowerCase().includes(q) ||
      (m.national_id || "").toLowerCase().includes(q)
    );
  }, [activeMembers, deleteSearchQuery]);

  // Fetch relations on mount
  useEffect(() => {
    supabase.from('relations').select('*').then(({ data }: any) => {
      if (data) setDbRelations(data);
    });
  }, []);

  // Fetch policy-dependent configs when selectedPolicy changes
  useEffect(() => {
    if (selectedPolicy?.id) {
      supabase.from('policy_members').select('*').eq('policy_id', selectedPolicy.id)
        .then(({ data }: any) => { if (data) setActiveMembers(data); });

      supabase.from('sme_plans').select('*').eq('insurer_id', selectedPolicy.insurer_id)
        .then(({ data }: any) => { if (data) setDbPlans(data); });

      supabase.from('dependent_rules').select('*').eq('policy_id', selectedPolicy.id).maybeSingle()
        .then(({ data }: any) => { if (data) setDependentRules(data); });

      supabase.from('claims').select('id, national_id, member_name').eq('policy_id', selectedPolicy.id)
        .then(({ data }: any) => { if (data) setPolicyClaims(data); });

      setIsRulesLoading(true);
      supabase.from('insurer_endorsement_rules').select('*').eq('insurer_id', selectedPolicy.insurer_id).maybeSingle()
        .then(({ data, error }: any) => {
          setIsRulesLoading(false);
          if (!error && data) setInsurerRules(data);
          else setInsurerRules(null);
        });
    } else {
      setInsurerRules(null);
      setPolicyClaims([]);
    }
  }, [selectedPolicy]);

  const activeEmployees = useMemo(() => {
    return activeMembers.filter((m: any) => 
      m.relation?.toLowerCase() === 'employee' || m.relation?.toLowerCase() === 'principal'
    ).map((m: any) => ({ id: m.id, member_name: m.member_name, staff_code: m.staff_code }));
  }, [activeMembers]);

  const isModalMode = !!onClose;

  useEffect(() => {
    if (!initialPolicy) {
      supabase.from('policies')
        .select('id, policy_number, client_company_name, client_company_id, end_date, start_date, policy_type, line_of_business_id, insurer_id, insurer_name')
        .eq('policy_status', 'Active')
        .then(({ data, error }: any) => { if (!error && data) setPolicies(data); });
    }
  }, [initialPolicy]);

  const filteredPolicies = useMemo(() => {
    return policies.filter(p => 
      p.client_company_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.policy_number?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [policies, searchQuery]);

  const filteredEndorsementTypes = useMemo(() => {
    if (!selectedPolicy) return [];
    const cat = selectedPolicy.client_company_id ? "Corporate" : "Individual";
    const policyLob = selectedPolicy.policy_type || selectedPolicy.line_of_business || "";
    return (endorsementTypes || []).filter((st: any) => 
      st.line_of_business?.toLowerCase() === policyLob.toLowerCase() &&
      st.category?.toLowerCase() === cat.toLowerCase()
    );
  }, [endorsementTypes, selectedPolicy]);

  const selectedEndorsementType = useMemo(() => {
    return (filteredEndorsementTypes || []).find((t: any) => t.id === selectedEndorsementTypeId);
  }, [filteredEndorsementTypes, selectedEndorsementTypeId]);

  useEffect(() => {
    if (selectedPolicy) {
      setCategory(selectedPolicy.client_company_id ? "Corporate" : "Individual");
    }
  }, [selectedPolicy]);

  useEffect(() => {
    if (selectedEndorsementTypeId && filteredEndorsementTypes.length > 0) {
      const isValidType = filteredEndorsementTypes.some((t: any) => t.id === selectedEndorsementTypeId);
      if (!isValidType) setSelectedEndorsementTypeId("");
    }
  }, [filteredEndorsementTypes, selectedEndorsementTypeId]);

  const remainingDays = useMemo(() => {
    if (!selectedPolicy?.end_date || !effectiveDate) return 0;
    const end = new Date(selectedPolicy.end_date);
    const eff = new Date(effectiveDate);
    if (!isValid(end) || !isValid(eff)) return 0;
    return Math.max(0, differenceInDays(end, eff));
  }, [selectedPolicy, effectiveDate]);

  const selectedTypeObj = useMemo(() => {
    return (rawEndorsementTypes || []).find((t: any) => t.id === selectedEndorsementTypeId);
  }, [rawEndorsementTypes, selectedEndorsementTypeId]);

  const configValidation = useMemo(() => {
    if (!selectedPolicy || !selectedTypeObj) return { isValid: true, missingFields: [] };
    const typeName = (selectedTypeObj.name || "").toLowerCase();
    const actions: ('add' | 'delete')[] = [];
    if (typeName.includes('add') || typeName.includes('addition') || typeName.includes('new')) actions.push('add');
    if (typeName.includes('delete') || typeName.includes('deletion') || typeName.includes('cancel') || typeName.includes('terminate')) actions.push('delete');
    if (actions.length === 0) actions.push('add', 'delete');
    return validateInsurerEndorsementConfig(insurerRules, actions);
  }, [selectedPolicy, selectedTypeObj, insurerRules]);

  const prorationFactor = useMemo(() => {
    if (!selectedPolicy || !effectiveDate || !insurerRules?.proration_method) return 0;
    return calculateProrationFactor(selectedPolicy.start_date, selectedPolicy.end_date, effectiveDate, insurerRules.proration_method);
  }, [selectedPolicy, effectiveDate, insurerRules]);

  const handleParentStaffCodeSearch = (code: string) => {
    setParentStaffCode(code);
    setParentSearchError("");
    setParentSearchResult(null);
    setLinkedMainMemberId("");
    if (!code.trim()) return;
    const found = activeMembers.find((m: any) => (m.staff_code || "").toLowerCase() === code.trim().toLowerCase());
    if (found) {
      setParentSearchResult(found);
      setLinkedMainMemberId(found.id);
    } else {
      setParentSearchError("No active member found with this staff code.");
    }
  };

  const handleDownloadTemplate = () => {
    let ws: XLSX.WorkSheet;
    if ((selectedPolicy?.line_of_business || selectedPolicy?.policy_type)?.toLowerCase() === 'medical') {
      const data = activeMembers.length > 0
        ? activeMembers.map((m: any) => ({ 'Action': 'add', 'Member Name': m.member_name || '', 'Staff Code': m.staff_code || '', 'Date Of Birth': m.date_of_birth || '', 'Gender': m.gender || '', 'Relation': m.relation || '', 'Nationality': m.nationality || '', 'National ID': m.national_id || '', 'Plan Category': m.plan_category || '', 'Location': m.location || '', 'Department': m.department || '', 'Job Title': m.job_title || '', 'Mobile Number': m.mobile_number || '', 'Premium': 0, 'Sum Insured': 0 }))
        : [{ 'Action': 'add', 'Member Name': '', 'Staff Code': '', 'Date Of Birth': '', 'Gender': '', 'Relation': '', 'Nationality': '', 'National ID': '', 'Plan Category': '', 'Location': '', 'Department': '', 'Job Title': '', 'Mobile Number': '', 'Premium': 0, 'Sum Insured': 0 }];
      ws = XLSX.utils.json_to_sheet(data);
    } else {
      const data = activeMembers.length > 0
        ? activeMembers.map(m => ({ action_type: 'add', member_name: m.member_name || '', national_id: m.national_id || '', premium: 0, sum_insured: 0 }))
        : [{ action_type: 'add', member_name: '', national_id: '', premium: 0, sum_insured: 0 }];
      ws = XLSX.utils.json_to_sheet(data);
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CensusTemplate");
    XLSX.writeFile(wb, `${selectedPolicy?.policy_number || 'Policy'}_Census_Template.xlsx`);
  };

  const handleFileUpload = (file: File) => {
    if (!effectiveDate) { toast({ variant: 'destructive', title: "Please select an effective date first." }); return; }
    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as any[];
        if (jsonData.length === 0) { toast({ variant: 'destructive', title: "Excel file is empty" }); setIsParsing(false); return; }

        if ((selectedPolicy?.line_of_business || selectedPolicy?.policy_type)?.toLowerCase() === 'medical') {
          const existingNationalIds = activeMembers.map((m: any) => m.national_id);
          const safeDate = (val: any) => { if (!val) return ""; if (val instanceof Date) return val.toISOString().split('T')[0]; const d = new Date(val); return isNaN(d.getTime()) ? "" : d.toISOString().split('T')[0]; };
          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (String(row.action_type || row.Action || 'add').toLowerCase() === 'add') {
              const memberObj = { member_name: row.member_name || row["Member Name"] || "", national_id: String(row.national_id || row["National ID"] || "").trim(), date_of_birth: safeDate(row.date_of_birth || row["Date Of Birth"]), gender: row.gender || row.Gender || "Male", relation: row.relation || row.Relation || "Employee", mobile_number: String(row.mobile_number || row["Mobile Number"] || "").trim(), plan_category: row.plan_category || row["Plan Category"] || "", linked_main_member_id: undefined };
              const selectedPlanObj = dbPlans.find((p: any) => p.name === memberObj.plan_category || p.id === memberObj.plan_category);
              const valResult = validateMemberAddition(memberObj, { plan: selectedPlanObj ? { min_age: selectedPlanObj.min_age, max_age: selectedPlanObj.max_age } : undefined, policy: selectedPolicy ? { max_allowed_age: selectedPolicy.max_allowed_age } : undefined, dependentRules: dependentRules ? { child_max_age: dependentRules.child_max_age } : undefined, existingNationalIds, activeEmployees });
              if (!valResult.isValid) throw new Error(`Row ${i + 2} (${memberObj.member_name || 'Unnamed'}): ${Object.entries(valResult.errors).map(([f, m]) => `${f}: ${m}`).join("; ")}`);
            }
          }
        }
        setExcelRows(jsonData);
        toast({ title: `Successfully parsed ${jsonData.length} rows.` });
        setStep(3);
      } catch (err: any) {
        toast({ variant: 'destructive', title: "Error parsing file", description: err.message });
      } finally { setIsParsing(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === "dragenter" || e.type === "dragover"); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]); };

  const resetAddForm = () => {
    setFullName("");
    setManualNationalId(""); setManualDOB(""); setManualMobile(""); setManualStaffCode("");
    setManualNationality("Egyptian"); setManualLocation(""); setManualDepartment(""); setManualJobTitle("");
    setParentStaffCode(""); setLinkedMainMemberId(""); setParentSearchResult(null); setParentSearchError("");
    setDeleteSearchQuery(""); setDeleteSearchOpen(false); setSelectedDeleteMemberId("");
  };

  const addManualItem = () => {
    const isMedical = (selectedPolicy?.line_of_business || selectedPolicy?.policy_type)?.toLowerCase() === 'medical';

    if (manualAction === 'add') {
      const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
      if (nameParts.length < 4) {
        toast({ variant: "destructive", title: "All four name parts are required", description: "Please enter first, second, third, and last name separated by spaces." }); return;
      }
      const isDependent = manualRelation !== "Employee" && manualRelation !== "Principal";
      if (isDependent && !linkedMainMemberId) {
        toast({ variant: "destructive", title: "Parent employee required", description: "Enter the parent's staff code to link this dependent." }); return;
      }
      if (isMedical) {
        const memberObj = { member_name: composedMemberName, national_id: manualNationalId, date_of_birth: manualDOB, gender: manualGender, relation: manualRelation, mobile_number: manualMobile, plan_category: manualPlan, staff_code: manualStaffCode, nationality: manualNationality, location: manualLocation, department: manualDepartment, job_title: manualJobTitle, linked_main_member_id: linkedMainMemberId || undefined };
        const selectedPlanObj = dbPlans.find((p: any) => p.name === manualPlan || p.id === manualPlan);
        const valResult = validateMemberAddition(memberObj, { plan: selectedPlanObj ? { min_age: selectedPlanObj.min_age, max_age: selectedPlanObj.max_age } : undefined, policy: selectedPolicy ? { max_allowed_age: selectedPolicy.max_allowed_age } : undefined, dependentRules: dependentRules ? { child_max_age: dependentRules.child_max_age } : undefined, existingNationalIds: activeMembers.map((m: any) => m.national_id), activeEmployees });
        if (!valResult.isValid) { toast({ variant: "destructive", title: "Validation Error", description: Object.values(valResult.errors).join("\n") }); return; }
      }
      let premVal = 0;
      if (isMedical) {
        const age = manualDOB ? calculateAge(manualDOB) : 0;
        const bracket = (selectedPolicy?.medical_brackets || []).find((b: any) => b.plan === manualPlan && b.relation.toLowerCase() === manualRelation.toLowerCase() && age >= Number(b.age_from || 0) && age <= Number(b.age_to || 999));
        if (bracket) premVal = Number(bracket.net_premium || 0);
      }
      setManualItems([...manualItems, { id: `manual-${Date.now()}`, name: composedMemberName, national_id: manualNationalId, action_type: 'add', premium: premVal, prorated_premium: Number((premVal * prorationFactor).toFixed(2)), sum_insured: 0, date_of_birth: manualDOB || null, gender: manualGender, relation: manualRelation, mobile_number: manualMobile, plan_category: manualPlan, staff_code: manualStaffCode, nationality: manualNationality, location: manualLocation, department: manualDepartment, job_title: manualJobTitle, linked_main_member_id: linkedMainMemberId || null }]);
    } else {
      if (!selectedDeleteMemberId) { toast({ variant: "destructive", title: "Please select a member" }); return; }
      const member = activeMembers.find((m: any) => m.id === selectedDeleteMemberId);
      if (!member) return;
      let premVal = Number(member.premium || 0);
      const isMed = (selectedPolicy?.line_of_business || selectedPolicy?.policy_type)?.toLowerCase() === 'medical';
      if (isMed && premVal === 0) premVal = lookupMedicalBracketPremium(selectedPolicy, member.plan_category || '', member.relation || '', member.date_of_birth || null);
      setManualItems([...manualItems, { id: `manual-${Date.now()}`, name: member.member_name || '', national_id: member.national_id || '', action_type: manualAction, premium: premVal, prorated_premium: Number((premVal * prorationFactor).toFixed(2)), sum_insured: 0, date_of_birth: member.date_of_birth || null, gender: member.gender, relation: member.relation, plan_category: member.plan_category, staff_code: member.staff_code || null }]);
    }
    resetAddForm();
  };

  const removeManualItem = (id: string) => setManualItems(manualItems.filter(item => item.id !== id));

  const calculations = useMemo(() => {
    let totalPremium = 0; let totalSumInsured = 0;
    const isMedicalAction = (selectedPolicy?.line_of_business || selectedPolicy?.policy_type)?.toLowerCase() === 'medical';
    const prorationMethod = insurerRules?.proration_method;
    const refundProrationMethod = insurerRules?.refund_proration_method || prorationMethod;
    const lateAdditionThresholdMonth = insurerRules?.late_addition_threshold_month != null ? Number(insurerRules.late_addition_threshold_month) : 10;
    const minPremiumPercent = insurerRules?.minimum_premium_percentage_after_threshold != null ? Number(insurerRules.minimum_premium_percentage_after_threshold) : 0.25;
    const refundAllowedIfUtilized = !!insurerRules?.refund_allowed_if_utilized;
    let additionFactor = 0;
    if (selectedPolicy?.start_date && selectedPolicy?.end_date && effectiveDate && prorationMethod && prorationMethod !== 'unconfigured') additionFactor = calculateProrationFactor(selectedPolicy.start_date, selectedPolicy.end_date, effectiveDate, prorationMethod);
    let deletionFactor = 0;
    if (selectedPolicy?.start_date && selectedPolicy?.end_date && effectiveDate && refundProrationMethod && refundProrationMethod !== 'unconfigured') deletionFactor = calculateProrationFactor(selectedPolicy.start_date, selectedPolicy.end_date, effectiveDate, refundProrationMethod);
    const itemsList = excelRows.length > 0 ? excelRows : manualItems;
    itemsList.forEach(item => {
      const action = String(item.action_type || item.Action || 'add').toLowerCase();
      const direction = action === 'delete' ? -1 : 1;
      let prem = Number(item.premium || item.Premium || 0);
      const si = Number(item.sum_insured || item.SumInsured || 0);
      if (isMedicalAction) {
        if (action === 'add' && prem === 0) prem = lookupMedicalBracketPremium(selectedPolicy, item.plan_category || item.Plan || item["Plan Category"] || "", item.relation || item.Relation || "Employee", item.date_of_birth || item["Date Of Birth"] || null);
        else if (action === 'delete') {
          const natId = String(item.national_id || item["National ID"] || "").trim();
          const nameVal = String(item.member_name || item["Member Name"] || "").trim().toLowerCase();
          const member = activeMembers.find((m: any) => (natId && String(m.national_id).trim() === natId) || (nameVal && String(m.member_name || "").trim().toLowerCase() === nameVal));
          if (member) { prem = Number(member.premium || 0); if (prem === 0) prem = lookupMedicalBracketPremium(selectedPolicy, member.plan_category || '', member.relation || '', member.date_of_birth || null); }
        }
      }
      let proratedPrem = 0;
      if (action === 'add') { proratedPrem = calculateAdditionPremium(prem, selectedPolicy.start_date, effectiveDate, additionFactor, lateAdditionThresholdMonth, minPremiumPercent); totalPremium += proratedPrem; }
      else if (action === 'delete') {
        proratedPrem = prem * deletionFactor;
        const natId = String(item.national_id || item["National ID"] || "").trim();
        const nameVal = String(item.member_name || item["Member Name"] || "").trim().toLowerCase();
        const hasUtilization = policyClaims.some((c: any) => (natId && String(c.national_id).trim() === natId) || (nameVal && String(c.member_name || "").trim().toLowerCase() === nameVal));
        if (hasUtilization && !refundAllowedIfUtilized) proratedPrem = 0;
        totalPremium -= proratedPrem;
      } else { proratedPrem = prem * additionFactor; totalPremium += proratedPrem * direction; }
      totalSumInsured += si * direction;
    });
    const taxes = calculateEndorsementTax(totalPremium, selectedPolicy || {});
    return { netPremium: totalPremium, taxes, finalImpact: totalPremium + taxes, sumInsured: totalSumInsured };
  }, [excelRows, manualItems, selectedPolicy, effectiveDate, insurerRules, policyClaims]);

  const handleSave = async () => {
    if (!selectedPolicy || !selectedEndorsementTypeId) { toast({ variant: 'destructive', title: "Policy and Endorsement Type are required." }); return; }
    setIsSubmitting(true);
    try {
      const isMedical = (selectedPolicy?.line_of_business || selectedPolicy?.policy_type)?.toLowerCase() === 'medical';
      const itemsPayload = excelRows.length > 0 
        ? excelRows.map(row => {
            const action = String(row.action_type || row.Action || 'add').toLowerCase();
            let prem = Number(row.premium || row.Premium || 0);
            if (isMedical) {
              if (action === 'add' && prem === 0) prem = lookupMedicalBracketPremium(selectedPolicy, row.plan_category || row["Plan Category"] || "", row.relation || row.Relation || "Employee", row.date_of_birth || row["Date Of Birth"] || null);
              else if (action === 'delete') {
                const natId = String(row.national_id || row["National ID"] || "").trim();
                const nameVal = String(row.member_name || row["Member Name"] || "").trim().toLowerCase();
                const member = activeMembers.find((m: any) => (natId && String(m.national_id).trim() === natId) || (nameVal && String(m.member_name || "").trim().toLowerCase() === nameVal));
                if (member) { prem = Number(member.premium || 0); if (prem === 0) prem = lookupMedicalBracketPremium(selectedPolicy, member.plan_category || '', member.relation || '', member.date_of_birth || null); }
              }
            }
            return { name: row.member_name || row["Member Name"] || '', national_id: String(row.national_id || row["National ID"] || '').trim(), action_type: action, premium: prem, sum_insured: Number(row.sum_insured || row.SumInsured || 0), date_of_birth: row.date_of_birth || row["Date Of Birth"] || null, gender: row.gender || row.Gender || null, relation: row.relation || row.Relation || null, plan_category: row.plan_category || row["Plan Category"] || null, mobile_number: row.mobile_number || row["Mobile Number"] || null };
          })
        : manualItems.map(item => ({ name: item.name, national_id: item.national_id, action_type: item.action_type, premium: item.premium, sum_insured: item.sum_insured, date_of_birth: item.date_of_birth, gender: item.gender, relation: item.relation, mobile_number: item.mobile_number, linked_main_member_id: item.linked_main_member_id }));

      const response = await fetch('/api/endorsements/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy_id: selectedPolicy.id, endorsement_type_id: selectedEndorsementTypeId, rows: itemsPayload, effective_date: effectiveDate, category, notes: notes || `Created via wizard. Reference: ${reference}` })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create endorsement');
      toast({ title: "Endorsement created successfully as Draft!" });
      if (isModalMode) { if (onSuccess) onSuccess(); if (onClose) onClose(); }
      else router.push(`/endorsements/${result.endorsement_id}`);
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: "Error submitting endorsement", description: err.message });
    } finally { setIsSubmitting(false); }
  };

  const isMedicalPolicy = (selectedPolicy?.line_of_business || selectedPolicy?.policy_type)?.toLowerCase() === 'medical';
  const isDependent = manualRelation !== "Employee" && manualRelation !== "Principal";
  const step1CanProceed = !!selectedPolicy && !isRulesLoading;
  const step2CanProceed = !!selectedEndorsementTypeId && (manualItems.length > 0 || excelRows.length > 0);

  return (
    <div className="max-w-4xl mx-auto py-8">
      {!isModalMode && (
        <Button variant="ghost" onClick={() => router.push('/endorsements')} className="mb-6 -ml-4 text-slate-500 hover:text-slate-900">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Button>
      )}
      {isModalMode && (
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900">Create Endorsement</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>
      )}

      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900">New Endorsement Request</h1>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`w-3.5 h-3.5 rounded-full transition-all ${step >= s ? "bg-[#2A75F3]" : "bg-slate-200"}`} />
          ))}
        </div>
      </div>

      <Card className="rounded-3xl border-border shadow-lg overflow-hidden bg-white">
        <CardContent className="p-8 min-h-[400px]">

          {/* STEP 1: Select Policy */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 mb-1">Step 1 — Select Policy</h2>
                <p className="text-sm text-slate-500">Search and select the active policy to create an endorsement for.</p>
              </div>

              {!initialPolicy && (
                <div className="space-y-2">
                  <Label className="text-base font-bold text-slate-800">Active Policy</Label>
                  {!selectedPolicy ? (
                    <div className="relative">
                      <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                      <Input value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }} onFocus={() => setIsDropdownOpen(true)} onBlur={() => setTimeout(() => setIsDropdownOpen(false), 250)} placeholder="Search active policies by client name or policy number..." className="h-12 pl-12 rounded-xl bg-slate-50 border-slate-200" />
                      {isDropdownOpen && filteredPolicies.length > 0 && (
                        <div className="absolute top-14 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                          {filteredPolicies.map((p: any) => (
                            <div key={p.id} className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0" onMouseDown={(e) => { e.preventDefault(); setSelectedPolicy(p); setIsDropdownOpen(false); setSearchQuery(""); }}>
                              <p className="font-bold text-slate-900">{p.client_company_name}</p>
                              <p className="text-xs font-mono text-slate-500">{p.policy_number} • LoB: {p.line_of_business || p.policy_type}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-4 border-2 border-blue-500 bg-blue-50/50 rounded-xl flex justify-between items-center animate-in fade-in">
                        <div>
                          <p className="font-bold text-blue-900">{selectedPolicy.client_company_name}</p>
                          <p className="text-sm font-mono text-blue-700">{selectedPolicy.policy_number} • LoB: {selectedPolicy.line_of_business || selectedPolicy.policy_type}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedPolicy(null); setInsurerRules(null); }} className="text-blue-600 hover:bg-blue-100">Change</Button>
                      </div>
                      {isRulesLoading && <div className="p-3 bg-slate-100 text-slate-600 rounded-xl flex items-center gap-2 text-xs"><Loader2 className="w-4 h-4 animate-spin" /> Checking insurer rules...</div>}
                      {!isRulesLoading && insurerRules && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Insurer rules loaded: {insurerRules.proration_method} proration.</div>}
                      {!isRulesLoading && !insurerRules && <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-medium flex items-center gap-2"><AlertCircle className="w-4 h-4" /> No insurer rules configured. Defaults will be used.</div>}
                    </div>
                  )}
                </div>
              )}

              {initialPolicy && (
                <div className="p-4 border-2 border-blue-500 bg-blue-50/50 rounded-xl">
                  <p className="font-bold text-blue-900">{initialPolicy.client_company_name}</p>
                  <p className="text-sm font-mono text-blue-700">{initialPolicy.policy_number} • LoB: {initialPolicy.line_of_business || initialPolicy.policy_type}</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Endorsement Type + Member Entry */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 mb-1">Step 2 — Configure Endorsement</h2>
                <p className="text-sm text-slate-500">Select the endorsement type, set the effective date, and add members.</p>
              </div>

              {/* Endorsement Type */}
              <div className="space-y-2">
                <Label className="text-base font-bold text-slate-800">Endorsement Type *</Label>
                <Select value={selectedEndorsementTypeId} onValueChange={setSelectedEndorsementTypeId}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200"><SelectValue placeholder="Select type of modification..." /></SelectTrigger>
                  <SelectContent>
                    {filteredEndorsementTypes.length > 0 ? filteredEndorsementTypes.map((st: any) => (
                      <SelectItem key={st.id} value={st.id}>{st.name} ({st.line_of_business})</SelectItem>
                    )) : <div className="p-3 text-sm text-slate-500">No endorsement types found for this policy.</div>}
                  </SelectContent>
                </Select>
              </div>

              {/* Effective Date + Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Effective Date *</Label>
                  <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label>Reference Number (Optional)</Label>
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. REF-2026-X" className="h-12 rounded-xl" />
                </div>
              </div>

              {/* Pro-rata info & rules warnings hidden per request */}

              {/* Bulk Excel Upload */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-base font-bold text-slate-800">Bulk Import via Excel</Label>
                  <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={handleDownloadTemplate}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />Download Template
                  </Button>
                </div>
                <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                  className={cn("border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors", dragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:bg-slate-50")}
                  onClick={() => fileInputRef.current?.click()}>
                  <UploadCloud className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-800">Drag & Drop Excel here or click to browse</p>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} />
                </div>
                {excelRows.length > 0 && (
                  <div className="mt-2 p-2 bg-emerald-50 rounded-xl text-xs font-bold text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {excelRows.length} rows loaded
                    <Button variant="ghost" size="sm" className="ml-auto h-6 text-red-500 text-xs" onClick={() => setExcelRows([])}>Clear</Button>
                  </div>
                )}
              </div>

              {/* Manual Entry */}
              <div className="space-y-4 p-6 border border-slate-200 rounded-2xl bg-white shadow-sm">
                <h3 className="font-bold text-slate-900">Or Add Items Manually</h3>

                {/* Action Type Dropdown */}
                <div className="space-y-1 max-w-xs">
                  <Label className="text-xs font-bold text-slate-700 uppercase">Select Action Type *</Label>
                  <Select value={manualAction} onValueChange={(v: "add" | "delete" | "modify") => { setManualAction(v); resetAddForm(); }}>
                    <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200">
                      <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Add Member</SelectItem>
                      <SelectItem value="delete">Delete Member</SelectItem>
                      <SelectItem value="modify">Modify Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* ADD: Four-part name */}
                {manualAction === 'add' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 uppercase">Full Name (Four Parts) *</Label>
                      <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter first, second, third, and last name..." className="h-10 rounded-xl border-slate-200" />
                      <p className="text-[10px] text-slate-500">The full name must consist of at least four parts (words).</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">National ID</Label>
                        <Input value={manualNationalId} onChange={e => setManualNationalId(e.target.value)} placeholder="National ID" className="h-10 rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Staff Code</Label>
                        <Input value={manualStaffCode} onChange={e => setManualStaffCode(e.target.value)} placeholder="e.g. A-1" className="h-10 rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Relation *</Label>
                        <Select value={manualRelation} onValueChange={v => { setManualRelation(v); setParentStaffCode(""); setLinkedMainMemberId(""); setParentSearchResult(null); setParentSearchError(""); }}>
                          <SelectTrigger className="h-10 rounded-xl bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {dbRelations.length > 0 ? dbRelations.map((r: any) => <SelectItem key={r.id} value={r.relation_type}>{r.relation_type}</SelectItem>) : <><SelectItem value="Employee">Employee</SelectItem><SelectItem value="Spouse">Spouse</SelectItem><SelectItem value="Child">Child</SelectItem></>}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Parent staff code for dependents */}
                    {isDependent && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2 animate-in fade-in">
                        <Label className="text-xs font-bold text-blue-800 uppercase">Parent Employee Staff Code *</Label>
                        <Input value={parentStaffCode} onChange={e => handleParentStaffCodeSearch(e.target.value)} placeholder="Enter parent's staff code, e.g. A-1234" className="h-10 rounded-xl" />
                        {parentSearchResult && <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-semibold"><CheckCircle2 className="w-4 h-4" /> Linked to: {parentSearchResult.member_name} (Staff: {parentSearchResult.staff_code})</div>}
                        {parentSearchError && <p className="text-xs text-red-600 font-semibold flex items-center gap-1"><AlertCircle className="w-3 h-3" />{parentSearchError}</p>}
                      </div>
                    )}

                    {isMedicalPolicy && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                        <div className="space-y-1"><Label className="text-xs">Date of Birth *</Label><Input type="date" value={manualDOB} onChange={e => setManualDOB(e.target.value)} className="h-10 rounded-xl" /></div>
                        <div className="space-y-1"><Label className="text-xs">Gender *</Label><Select value={manualGender} onValueChange={setManualGender}><SelectTrigger className="h-10 rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select></div>
                        <div className="space-y-1"><Label className="text-xs">Nationality *</Label><Input value={manualNationality} onChange={e => setManualNationality(e.target.value)} placeholder="Egyptian" className="h-10 rounded-xl" /></div>
                        <div className="space-y-1"><Label className="text-xs">Mobile Number *</Label><Input value={manualMobile} onChange={e => setManualMobile(e.target.value)} placeholder="01012345678" className="h-10 rounded-xl" /></div>
                        <div className="space-y-1"><Label className="text-xs">Location</Label><Input value={manualLocation} onChange={e => setManualLocation(e.target.value)} placeholder="Cairo" className="h-10 rounded-xl" /></div>
                        <div className="space-y-1"><Label className="text-xs">Department</Label><Input value={manualDepartment} onChange={e => setManualDepartment(e.target.value)} placeholder="Engineering" className="h-10 rounded-xl" /></div>
                        <div className="space-y-1"><Label className="text-xs">Job Title</Label><Input value={manualJobTitle} onChange={e => setManualJobTitle(e.target.value)} placeholder="Developer" className="h-10 rounded-xl" /></div>
                        <div className="space-y-1"><Label className="text-xs">Plan Category *</Label>
                          <Select value={manualPlan} onValueChange={setManualPlan}>
                            <SelectTrigger className="h-10 rounded-xl bg-white"><SelectValue placeholder="Plan" /></SelectTrigger>
                            <SelectContent>
                              {Array.from(new Set((selectedPolicy?.medical_brackets || []).map((b: any) => b.plan))).filter(Boolean).map((planName: any) => <SelectItem key={planName} value={planName}>{planName}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* DELETE/MODIFY: Search by name, staff code, national ID */}
                {(manualAction === 'delete' || manualAction === 'modify') && (
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Search Member to {manualAction === 'delete' ? 'Cancel' : 'Modify'}</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input value={deleteSearchQuery} onChange={e => { setDeleteSearchQuery(e.target.value); setDeleteSearchOpen(true); }} onFocus={() => setDeleteSearchOpen(true)} onBlur={() => setTimeout(() => setDeleteSearchOpen(false), 200)} placeholder="Search by name, staff code, or national ID..." className="h-10 pl-9 rounded-xl" />
                      {deleteSearchOpen && filteredDeleteMembers.length > 0 && (
                        <div className="absolute top-12 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                          {filteredDeleteMembers.map((m: any) => (
                            <div key={m.id} className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0" onMouseDown={e => { e.preventDefault(); setSelectedDeleteMemberId(m.id); setDeleteSearchQuery(m.member_name || ""); setDeleteSearchOpen(false); }}>
                              <p className="font-bold text-slate-900 text-sm">{m.member_name}</p>
                              <p className="text-xs text-slate-500">{m.staff_code && `Staff: ${m.staff_code}`} {m.national_id && `NID: ${m.national_id}`} {m.relation && `(${m.relation})`}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {deleteSearchOpen && deleteSearchQuery && filteredDeleteMembers.length === 0 && <div className="absolute top-12 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-4 text-center text-sm text-slate-500">No members match "{deleteSearchQuery}"</div>}
                    </div>
                    {selectedDeleteMemberId && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2"><Users className="w-4 h-4" />Selected: {activeMembers.find((m: any) => m.id === selectedDeleteMemberId)?.member_name}</div>}
                    {activeMembers.length === 0 && <p className="text-xs text-amber-600 font-medium p-2 bg-amber-50 rounded-lg">No active members in this policy census.</p>}
                  </div>
                )}

                <Button type="button" onClick={addManualItem} className="h-10 bg-slate-900 hover:bg-slate-800 rounded-xl text-xs font-bold px-6">Add to List</Button>

                {manualItems.length > 0 && (
                  <ScrollArea className="h-40 border border-slate-100 rounded-xl p-3 bg-slate-50">
                    <div className="space-y-2">
                      {manualItems.map(item => (
                        <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded-lg border text-xs shadow-sm">
                          <div>
                            <span className="font-bold">{item.name}</span>
                            <span className={cn("text-[10px] ml-2 font-bold px-1.5 py-0.5 rounded", item.action_type === 'add' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>{item.action_type}</span>
                            {item.relation && <span className="text-[10px] text-slate-500 ml-2">{item.relation}</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-600">{Math.round(item.premium || 0).toLocaleString()} EGP</span>
                            <Button variant="ghost" size="sm" onClick={() => removeManualItem(item.id)} className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"><X className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              <div className="space-y-1">
                <Label>Notes & Description</Label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Additions for new employees..." className="w-full min-h-[80px] p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
            </div>
          )}

          {/* STEP 3: Financial Preview */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 opacity-10"><Calculator className="w-64 h-64" /></div>
                <div className="relative z-10">
                  <p className="text-blue-300 font-bold tracking-wider uppercase text-xs mb-2">Calculated Financial Impact (Pro-Rata)</p>
                  <h2 className="text-4xl font-black text-white mb-6">{calculations.finalImpact >= 0 ? '+' : ''}{Math.round(calculations.finalImpact).toLocaleString()} EGP</h2>
                  <div className="space-y-3 pt-6 border-t border-slate-700 text-sm">
                    <div className="flex justify-between text-slate-300"><span>LoB:</span><span className="font-bold text-white">{selectedPolicy?.line_of_business}</span></div>
                    <div className="flex justify-between text-slate-300"><span>Endorsement Type:</span><span className="font-bold text-white">{selectedEndorsementType?.name || 'Manual'}</span></div>
                    <div className="flex justify-between text-slate-300"><span>Net Premium:</span><span className="font-mono text-white">{Math.round(calculations.netPremium).toLocaleString()} EGP</span></div>
                    <div className="flex justify-between text-slate-300"><span>Taxes & Fees (13.2%):</span><span className="font-mono text-white">{Math.round(calculations.taxes).toLocaleString()} EGP</span></div>
                    {calculations.sumInsured !== 0 && <div className="flex justify-between text-slate-300"><span>Sum Insured Adj:</span><span className="font-mono text-white">{Math.round(calculations.sumInsured).toLocaleString()} EGP</span></div>}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 text-center">Pro-rata estimate from remaining policy duration ({remainingDays} days).</p>
            </div>
          )}

        </CardContent>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-border p-6 flex justify-between">
          <Button variant="outline" onClick={() => setStep(Math.max(initialPolicy ? 2 : 1, step - 1) as any)} disabled={step === (initialPolicy ? 2 : 1)} className="h-12 px-6 rounded-xl font-bold">Back</Button>
          {step < 3 ? (
            <Button onClick={() => setStep((step + 1) as any)} disabled={(step === 1 && !step1CanProceed) || (step === 2 && !step2CanProceed)} className="bg-[#2A75F3] hover:bg-blue-700 h-12 px-8 rounded-xl font-bold text-white shadow-lg shadow-blue-200">
              Next Step <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-8 rounded-xl font-bold shadow-lg shadow-emerald-200 flex items-center gap-2">
              {isSubmitting ? <><Loader2 className="animate-spin w-4 h-4" /><span>Submitting...</span></> : <><span>Save Draft & View Details</span><ArrowRight className="w-4 h-4" /></>}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
