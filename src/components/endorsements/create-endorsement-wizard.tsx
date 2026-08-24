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
import { useAuth } from "@/lib/auth-provider";
import { useSupabaseCollection } from "@/lib/hooks/use-supabase-collection";
import { sanitizeUUIDs } from "@/lib/utils/sanitize-uuids";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { validateMemberAddition, calculateAge, validateNationalID, validateMemberDeletion } from "@/lib/endorsement-validation";
import { downloadCensusTemplateFile, parseExcelRowToPayload } from "@/lib/census-excel-helper";
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
  const { session } = useAuth();
  
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
  const [manualFullNameArabic, setManualFullNameArabic] = useState("");
  const [manualMaritalStatus, setManualMaritalStatus] = useState("Single");
  const [manualBankName, setManualBankName] = useState("");
  const [manualBankAccount, setManualBankAccount] = useState("");
  const [manualIban, setManualIban] = useState("");
  const [manualMemberIdInsurance, setManualMemberIdInsurance] = useState("");
  const [manualMemberIdTpa, setManualMemberIdTpa] = useState("");
  const [manualPrincipleId, setManualPrincipleId] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [bulkErrors, setBulkErrors] = useState<any[]>([]);
  const [isCheckingUtil, setIsCheckingUtil] = useState(false);
  const [deleteMemberHasClaims, setDeleteMemberHasClaims] = useState<any>(null);
  const [showBankDetails, setShowBankDetails] = useState(false);

  const handleNationalIdChange = (val: string) => {
    setManualNationalId(val);
    const cleanVal = val.trim();
    if (/^\d{14}$/.test(cleanVal)) {
      const centuryDigit = parseInt(cleanVal.charAt(0));
      let century = "";
      if (centuryDigit === 2) century = "19";
      else if (centuryDigit === 3) century = "20";
      else if (centuryDigit === 4) century = "21";
      
      if (century) {
        const yy = cleanVal.substring(1, 3);
        const mm = cleanVal.substring(3, 5);
        const dd = cleanVal.substring(5, 7);
        const dob = `${century}${yy}-${mm}-${dd}`;
        const dateObj = new Date(dob);
        if (!isNaN(dateObj.getTime())) {
          setManualDOB(dob);
        }
      }
      
      const genderDigit = parseInt(cleanVal.charAt(12));
      const gender = (genderDigit % 2 === 0) ? "Female" : "Male";
      setManualGender(gender);
    }
  };

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

  // Effect to check utilization for deleted member in deletion cases
  useEffect(() => {
    if (selectedDeleteMemberId && selectedPolicy) {
      const member = activeMembers.find((m: any) => m.id === selectedDeleteMemberId);
      if (member) {
        setIsCheckingUtil(true);
        setDeleteMemberHasClaims(null);
        
        const params = new URLSearchParams({
          name: member.member_name || '',
          national_id: member.national_id || '',
          staff_code: member.staff_code || '',
          member_id_tpa: member.member_id_tpa || ''
        });
        
        fetch(`/api/policies/${selectedPolicy.id}/check-member-utilization?${params.toString()}`)
          .then(r => r.json())
          .then(data => {
            setDeleteMemberHasClaims(data.hasClaims ? { source: data.source, amount: data.amount, fileName: data.fileName } : 'no');
          })
          .catch(e => {
            console.error('Error checking utilization:', e);
            setDeleteMemberHasClaims('no');
          })
          .finally(() => setIsCheckingUtil(false));
      }
    } else {
      setDeleteMemberHasClaims(null);
    }
  }, [selectedDeleteMemberId, selectedPolicy, activeMembers]);

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

  useEffect(() => {
    if (selectedEndorsementType) {
      const typeName = (selectedEndorsementType.name || "").toLowerCase();
      if (typeName.includes("add")) {
        setManualAction("add");
      } else if (typeName.includes("delete") || typeName.includes("cancel") || typeName.includes("termination")) {
        setManualAction("delete");
      } else {
        setManualAction("modify");
      }
    }
  }, [selectedEndorsementType]);

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
    if (!selectedPolicy || !effectiveDate) return 0;
    const method = insurerRules?.proration_method && insurerRules.proration_method !== 'unconfigured' 
      ? insurerRules.proration_method 
      : 'daily';
    return calculateProrationFactor(selectedPolicy.start_date, selectedPolicy.end_date, effectiveDate, method as any);
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
    downloadCensusTemplateFile(`${selectedPolicy?.policy_number || 'Policy'}_Census_Template.xlsx`, selectedPolicy);
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
          const collectedErrors: any[] = [];
          
          const uploadedEmployeeCodes = jsonData
            .filter((row: any) => String(row.action_type || row.Action || 'add').toLowerCase() === 'add')
            .map((row: any) => String(row["Staff ID"] || row["Staff Code"] || "").trim())
            .filter(Boolean);

          const excelDeletions = jsonData.filter((row: any) => {
            const act = String(row.action_type || row.Action || '').toLowerCase();
            return act === 'delete' || act === 'cancel' || act === 'terminate';
          });
          
          const excelDeleteIds = excelDeletions.map((row: any) => {
            const natId = String(row.national_id || row["National ID"] || "").trim();
            const nameVal = String(row.member_name || row["Member Name"] || "").trim().toLowerCase();
            const member = activeMembers.find((m: any) => 
              (natId && String(m.national_id).trim() === natId) || 
              (nameVal && String(m.member_name || "").trim().toLowerCase() === nameVal)
            );
            return member?.id;
          }).filter(Boolean) as string[];

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            const action = String(row.action_type || row.Action || 'add').toLowerCase();
            if (action === 'add') {
              const memberObj = parseExcelRowToPayload(row);
              const selectedPlanObj = dbPlans.find((p: any) => p.name === memberObj.plan_category || p.id === memberObj.plan_category);
              
              const valResult = validateMemberAddition(memberObj, {
                plan: selectedPlanObj ? { min_age: selectedPlanObj.min_age, max_age: selectedPlanObj.max_age } : undefined,
                policy: selectedPolicy ? { max_allowed_age: selectedPolicy.max_allowed_age } : undefined,
                dependentRules: dependentRules ? { child_max_age: dependentRules.child_max_age } : undefined,
                existingNationalIds,
                activeEmployees,
                uploadedEmployees: uploadedEmployeeCodes,
                medicalBrackets: selectedPolicy?.medical_brackets || []
              });
              
              if (!valResult.isValid) {
                collectedErrors.push({
                  row: i + 2,
                  name: memberObj.member_name || 'Unnamed',
                  errors: Object.values(valResult.errors)
                });
              }
            } else if (action === 'delete' || action === 'cancel' || action === 'terminate') {
              const natId = String(row.national_id || row["National ID"] || "").trim();
              const nameVal = String(row.member_name || row["Member Name"] || "").trim().toLowerCase();
              const member = activeMembers.find((m: any) => 
                (natId && String(m.national_id).trim() === natId) || 
                (nameVal && String(m.member_name || "").trim().toLowerCase() === nameVal)
              );
              if (member) {
                const check = validateMemberDeletion(member, activeMembers, excelDeleteIds);
                if (!check.isValid) {
                  collectedErrors.push({
                    row: i + 2,
                    name: member.member_name || 'Unnamed',
                    errors: [check.error || 'You must delete the principal member first.']
                  });
                }
              }
            }
          }
          if (collectedErrors.length > 0) {
            setBulkErrors(collectedErrors);
            toast({ variant: 'destructive', title: "Excel file validation failed", description: `Found ${collectedErrors.length} errors. Please fix them below.` });
            setIsParsing(false);
            return;
          }
        }
        setExcelRows(jsonData);
        setBulkErrors([]);
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
    setManualFullNameArabic(""); setManualMaritalStatus("Single"); setManualBankName(""); setManualBankAccount(""); setManualIban("");
    setManualMemberIdInsurance(""); setManualMemberIdTpa(""); setManualPrincipleId(""); setManualNotes("");
    setParentStaffCode(""); setLinkedMainMemberId(""); setParentSearchResult(null); setParentSearchError("");
    setDeleteSearchQuery(""); setDeleteSearchOpen(false); setSelectedDeleteMemberId("");
    setDeleteMemberHasClaims(null);
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
        const memberObj = {
          member_name: composedMemberName,
          national_id: manualNationalId,
          date_of_birth: manualDOB,
          gender: manualGender,
          relation: manualRelation,
          mobile_number: manualMobile,
          plan_category: manualPlan,
          staff_code: manualStaffCode,
          nationality: manualNationality,
          location: manualLocation,
          department: manualDepartment,
          job_title: manualJobTitle,
          full_name_arabic: manualFullNameArabic,
          marital_status: manualMaritalStatus,
          bank_name: manualBankName,
          bank_account: manualBankAccount,
          iban: manualIban,
          principle_id: manualPrincipleId || parentStaffCode || undefined,
          member_id_insurance: manualMemberIdInsurance || undefined,
          member_id_tpa: manualMemberIdTpa || undefined,
          notes: manualNotes || undefined,
          addition_date: effectiveDate,
          linked_main_member_id: linkedMainMemberId || undefined
        };
        const selectedPlanObj = dbPlans.find((p: any) => p.name === manualPlan || p.id === manualPlan);
        const valResult = validateMemberAddition(memberObj, {
          plan: selectedPlanObj ? { min_age: selectedPlanObj.min_age, max_age: selectedPlanObj.max_age } : undefined,
          policy: selectedPolicy ? { max_allowed_age: selectedPolicy.max_allowed_age } : undefined,
          dependentRules: dependentRules ? { child_max_age: dependentRules.child_max_age } : undefined,
          existingNationalIds: activeMembers.map((m: any) => m.national_id),
          activeEmployees,
          medicalBrackets: selectedPolicy?.medical_brackets || []
        });
        if (!valResult.isValid) { toast({ variant: "destructive", title: "Validation Error", description: Object.values(valResult.errors).join("\n") }); return; }
      }
      if (manualAction === 'add') {
        const alreadySelected = manualItems.some(item => 
          item.action_type === 'add' && 
          ((manualNationalId && item.national_id === manualNationalId) || 
           (composedMemberName && item.name?.toLowerCase() === composedMemberName.toLowerCase()))
        );
        if (alreadySelected) {
          toast({ variant: "destructive", title: "Duplicate Entry", description: "This member has already been added to this endorsement." });
          return;
        }
      }
      let premVal = 0;
      if (isMedical) {
        const age = manualDOB ? calculateAge(manualDOB) : 0;
        const bracket = (selectedPolicy?.medical_brackets || []).find((b: any) => b.plan === manualPlan && b.relation.toLowerCase() === manualRelation.toLowerCase() && age >= Number(b.age_from || 0) && age <= Number(b.age_to || 999));
        if (bracket) premVal = Number(bracket.net_premium || 0);
      }
      setManualItems([...manualItems, {
        id: `manual-${Date.now()}`,
        name: composedMemberName,
        national_id: manualNationalId,
        action_type: 'add',
        premium: premVal,
        prorated_premium: Number((premVal * prorationFactor).toFixed(2)),
        sum_insured: 0,
        date_of_birth: manualDOB || null,
        gender: manualGender,
        relation: manualRelation,
        mobile_number: manualMobile,
        plan_category: manualPlan,
        staff_code: manualStaffCode,
        nationality: manualNationality,
        location: manualLocation,
        department: manualDepartment,
        job_title: manualJobTitle,
        full_name_arabic: manualFullNameArabic,
        marital_status: manualMaritalStatus,
        bank_name: manualBankName,
        bank_account: manualBankAccount,
        iban: manualIban,
        principle_id: manualPrincipleId || parentStaffCode || null,
        linked_main_member_id: linkedMainMemberId || null,
        member_id_insurance: manualMemberIdInsurance || null,
        member_id_tpa: manualMemberIdTpa || null,
        notes: manualNotes || null
      }]);
    } else {
      if (!selectedDeleteMemberId) { toast({ variant: "destructive", title: "Please select a member" }); return; }
      const member = activeMembers.find((m: any) => m.id === selectedDeleteMemberId);
      if (!member) return;

      const alreadySelectedDelete = manualItems.some(item => 
        item.action_type === manualAction && 
        ((member.national_id && item.national_id === member.national_id) || 
         (member.member_name && item.name?.toLowerCase() === member.member_name.toLowerCase()))
      );
      if (alreadySelectedDelete) {
        toast({ variant: "destructive", title: "Duplicate Entry", description: "This member has already been selected for deletion in this endorsement." });
        return;
      }

      const batchDeleteIds = manualItems.filter(item => item.action_type === 'delete' || item.action_type === 'cancel').map(item => {
        const activeM = activeMembers.find((m: any) => m.national_id === item.national_id || m.member_name === item.name);
        return activeM?.id;
      }).filter(Boolean) as string[];

      const check = validateMemberDeletion(member, activeMembers, batchDeleteIds);
      if (!check.isValid) {
        toast({
          variant: "destructive",
          title: "Deletion Restrained",
          description: check.error
        });
        return;
      }

      let premVal = Number(member.premium || 0);
      const isMed = (selectedPolicy?.line_of_business || selectedPolicy?.policy_type)?.toLowerCase() === 'medical';
      if (isMed && premVal === 0) premVal = lookupMedicalBracketPremium(selectedPolicy, member.plan_category || '', member.relation || '', member.date_of_birth || null);
      setManualItems([...manualItems, { id: `manual-${Date.now()}`, name: member.member_name || '', national_id: member.national_id || '', action_type: manualAction, premium: premVal, prorated_premium: Number((premVal * prorationFactor).toFixed(2)), sum_insured: 0, date_of_birth: member.date_of_birth || null, gender: member.gender, relation: member.relation, plan_category: member.plan_category, staff_code: member.staff_code || null, principle_id: member.principle_id || null }]);
    }
    resetAddForm();
  };

  const removeManualItem = (id: string) => setManualItems(manualItems.filter(item => item.id !== id));

  const calculations = useMemo(() => {
    let totalPremium = 0; let totalSumInsured = 0;
    const isMedicalAction = (selectedPolicy?.line_of_business || selectedPolicy?.policy_type)?.toLowerCase() === 'medical';
    const prorationMethod = insurerRules?.proration_method && insurerRules.proration_method !== 'unconfigured' 
      ? insurerRules.proration_method 
      : 'daily';
    const refundProrationMethod = insurerRules?.refund_proration_method && insurerRules.refund_proration_method !== 'unconfigured' 
      ? insurerRules.refund_proration_method 
      : prorationMethod;
    const lateAdditionThresholdMonth = insurerRules?.late_addition_threshold_month != null ? Number(insurerRules.late_addition_threshold_month) : 10;
    const minPremiumPercent = insurerRules?.minimum_premium_percentage_after_threshold != null ? Number(insurerRules.minimum_premium_percentage_after_threshold) : 0.25;
    const refundAllowedIfUtilized = !!insurerRules?.refund_allowed_if_utilized;
    let additionFactor = 0;
    if (selectedPolicy?.start_date && selectedPolicy?.end_date && effectiveDate) additionFactor = calculateProrationFactor(selectedPolicy.start_date, selectedPolicy.end_date, effectiveDate, prorationMethod as any);
    let deletionFactor = 0;
    if (selectedPolicy?.start_date && selectedPolicy?.end_date && effectiveDate) deletionFactor = calculateProrationFactor(selectedPolicy.start_date, selectedPolicy.end_date, effectiveDate, refundProrationMethod as any);
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
            return {
              ...row,
              name: row.member_name || row["Member Name"] || row["Full Name English"] || '',
              national_id: String(row.national_id || row["National ID"] || '').trim(),
              action_type: action,
              premium: prem,
              sum_insured: Number(row.sum_insured || row.SumInsured || 0),
              date_of_birth: row.date_of_birth || row["Date Of Birth"] || row["DOB"] || null,
              gender: row.gender || row.Gender || null,
              relation: row.relation || row.Relation || null,
              plan_category: row.plan_category || row["Plan Category"] || row["PLAN"] || null,
              mobile_number: row.mobile_number || row["Mobile Number"] || row["Mobile NO."] || null
            };
          })
        : manualItems.map(item => ({
            name: item.name,
            national_id: item.national_id,
            action_type: item.action_type,
            premium: item.premium,
            sum_insured: item.sum_insured,
            details: {
              date_of_birth: item.date_of_birth,
              gender: item.gender,
              relation: item.relation,
              nationality: item.nationality,
              plan_category: item.plan_category,
              location: item.location,
              department: item.department,
              job_title: item.job_title,
              mobile_number: item.mobile_number,
              full_name_arabic: item.full_name_arabic,
              marital_status: item.marital_status,
              bank_name: item.bank_name,
              bank_account: item.bank_account,
              iban: item.iban,
              principle_id: item.principle_id,
              linked_main_member_id: item.linked_main_member_id,
              member_id_insurance: item.member_id_insurance,
              member_id_tpa: item.member_id_tpa,
              notes: item.notes
            }
          }));

      const response = await fetch('/api/endorsements/bulk-upload', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
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

  // Collapsible section states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ identity: true, employment: false, bank: false });
  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const stepLabels = initialPolicy
    ? ['Configure', 'Review']
    : ['Select Policy', 'Configure', 'Review'];

  return (
    <div className={cn("w-full", isModalMode ? "flex flex-col flex-1 min-h-0 overflow-hidden" : "max-w-4xl mx-auto py-8")}>
      {/* ─── HEADER ─── */}
      {isModalMode ? (
        <div className="flex justify-between items-center border-b border-slate-200/80 px-6 py-4 bg-gradient-to-r from-slate-50 to-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-[#2A75F3] flex items-center justify-center shadow-md shadow-blue-200">
              <FileEdit className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">New Endorsement</h2>
              {selectedPolicy && <p className="text-[11px] text-slate-500 font-medium leading-tight">{selectedPolicy.policy_number} · {selectedPolicy.client_company_name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-5">
            {/* Step Indicator */}
            <div className="hidden sm:flex items-center gap-1">
              {stepLabels.map((label, i) => {
                const s = initialPolicy ? (i + 2) : (i + 1);
                const isActive = step === s;
                const isDone = step > s;
                return (
                  <React.Fragment key={s}>
                    {i > 0 && <div className={cn("w-6 h-0.5 rounded-full transition-colors", isDone ? "bg-[#2A75F3]" : "bg-slate-200")} />}
                    <div className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all",
                      isActive ? "bg-blue-50 text-[#2A75F3] ring-1 ring-blue-200" : isDone ? "text-[#2A75F3]" : "text-slate-400"
                    )}>
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all",
                        isActive ? "bg-[#2A75F3] text-white shadow-sm" : isDone ? "bg-[#2A75F3] text-white" : "bg-slate-200 text-slate-500"
                      )}>
                        {isDone ? <CheckCircle2 className="w-3 h-3" /> : (i + 1)}
                      </div>
                      <span className="hidden lg:inline">{label}</span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>
      ) : (
        <>
          <Button variant="ghost" onClick={() => router.push('/endorsements')} className="mb-6 -ml-4 text-slate-500 hover:text-slate-900">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Button>
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-black text-slate-900">New Endorsement Request</h1>
            <div className="flex items-center gap-2">
              {(initialPolicy ? [2, 3] : [1, 2, 3]).map((s) => (
                <div key={s} className={`w-3.5 h-3.5 rounded-full transition-all ${step >= s ? "bg-[#2A75F3]" : "bg-slate-200"}`} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* ─── CONTENT ─── */}
      <div className={cn("bg-white custom-scrollbar", isModalMode ? "flex-1 min-h-0 overflow-y-auto" : "rounded-3xl border border-border shadow-lg")}>
        <div className={cn(isModalMode ? "p-5" : "p-8")}>

          {/* ═══ STEP 1: Select Policy ═══ */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <p className="text-sm text-slate-500 mb-2">Search and select the active policy to create an endorsement for.</p>

              {!initialPolicy && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Active Policy</Label>
                  {!selectedPolicy ? (
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <Input value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }} onFocus={() => setIsDropdownOpen(true)} onBlur={() => setTimeout(() => setIsDropdownOpen(false), 250)} placeholder="Search by client name or policy number..." className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200" />
                      {isDropdownOpen && filteredPolicies.length > 0 && (
                        <div className="absolute top-13 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">
                          {filteredPolicies.map((p: any) => (
                            <div key={p.id} className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors" onMouseDown={(e) => { e.preventDefault(); setSelectedPolicy(p); setIsDropdownOpen(false); setSearchQuery(""); }}>
                              <p className="font-semibold text-slate-900 text-sm">{p.client_company_name}</p>
                              <p className="text-[11px] font-mono text-slate-500">{p.policy_number} · {p.line_of_business || p.policy_type}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3.5 border-2 border-blue-500 bg-blue-50/40 rounded-xl flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-blue-900 text-sm">{selectedPolicy.client_company_name}</p>
                          <p className="text-xs font-mono text-blue-700">{selectedPolicy.policy_number} · {selectedPolicy.line_of_business || selectedPolicy.policy_type}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedPolicy(null); setInsurerRules(null); }} className="text-blue-600 hover:bg-blue-100 h-8 text-xs">Change</Button>
                      </div>
                      {isRulesLoading && <div className="p-2.5 bg-slate-50 text-slate-600 rounded-lg flex items-center gap-2 text-xs"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking insurer rules...</div>}
                      {!isRulesLoading && insurerRules && <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" /> Rules loaded: {insurerRules.proration_method} proration</div>}
                      {!isRulesLoading && !insurerRules && <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-medium flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" /> No insurer rules configured. Defaults will be used.</div>}
                    </div>
                  )}
                </div>
              )}

              {initialPolicy && (
                <div className="p-3.5 border-2 border-blue-500 bg-blue-50/40 rounded-xl">
                  <p className="font-semibold text-blue-900 text-sm">{initialPolicy.client_company_name}</p>
                  <p className="text-xs font-mono text-blue-700">{initialPolicy.policy_number} · {initialPolicy.line_of_business || initialPolicy.policy_type}</p>
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 2: Configure Endorsement ═══ */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Type + Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Endorsement Type *</Label>
                  <Select value={selectedEndorsementTypeId} onValueChange={setSelectedEndorsementTypeId}>
                    <SelectTrigger className="h-10 rounded-lg bg-slate-50 border-slate-200 text-sm"><SelectValue placeholder="Select type..." /></SelectTrigger>
                    <SelectContent>
                      {filteredEndorsementTypes.length > 0 ? filteredEndorsementTypes.map((st: any) => (
                        <SelectItem key={st.id} value={st.id}>{st.name} ({st.line_of_business})</SelectItem>
                      )) : <div className="p-3 text-sm text-slate-500">No types found for this policy.</div>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Effective Date *</Label>
                  <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="h-10 rounded-lg text-sm" />
                </div>
              </div>

              {/* Bulk Excel Upload — Compact */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex justify-between items-center px-4 py-2.5 bg-slate-50/80">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" /> Bulk Import (Excel)</span>
                  <Button variant="ghost" size="sm" className="text-blue-600 h-7 text-[11px] font-semibold hover:bg-blue-50" onClick={handleDownloadTemplate}>
                    Download Template
                  </Button>
                </div>
                <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                  className={cn("px-4 py-4 text-center cursor-pointer transition-colors border-t", dragActive ? "bg-blue-50" : "hover:bg-slate-50")}
                  onClick={() => fileInputRef.current?.click()}>
                  <UploadCloud className="w-7 h-7 text-blue-400 mx-auto mb-1" />
                  <p className="text-xs font-medium text-slate-600">Drag & drop Excel here or <span className="text-blue-600 underline">browse</span></p>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} />
                </div>
                {excelRows.length > 0 && (
                  <div className="px-4 py-2 bg-emerald-50 border-t text-xs font-semibold text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {excelRows.length} rows loaded
                    <Button variant="ghost" size="sm" className="ml-auto h-6 text-red-500 text-[10px]" onClick={() => setExcelRows([])}>Clear</Button>
                  </div>
                )}
              </div>
              
              {/* Bulk Error Handling UI */}
              {bulkErrors.length > 0 && (
                <div className="p-3 border border-red-200 bg-red-50 rounded-xl space-y-2 animate-in fade-in">
                  <h3 className="font-bold text-red-800 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Validation Failures
                  </h3>
                  <ScrollArea className="h-32">
                    <div className="space-y-1 text-[11px] text-red-700">
                      {bulkErrors.map((err, idx) => (
                        <div key={idx} className="border-b border-red-100 pb-1 last:border-0">
                          <span className="font-bold">Row {err.row} ({err.name}):</span> {err.errors.join(", ")}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100 h-7 text-[11px]" onClick={() => setBulkErrors([])}>Dismiss</Button>
                </div>
              )}

              {/* Manual Entry — Collapsible Sections */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50/80 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-500" /> Manual Entry</span>
                </div>

                {/* ADD: Form Fields */}
                {manualAction === 'add' && (
                  <div className="border-t divide-y divide-slate-100">
                    {/* Section 1: Identity & Plan */}
                    <div>
                      <button type="button" onClick={() => toggleSection('identity')} className="w-full flex justify-between items-center px-4 py-2.5 text-left hover:bg-slate-50 transition-colors">
                        <span className="text-[11px] font-bold text-[#0369A1] uppercase tracking-wider">1. Identity & Plan Details</span>
                        <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", openSections.identity && "rotate-90")} />
                      </button>
                      {openSections.identity && (
                        <div className="px-4 pb-4 pt-1 animate-in fade-in duration-150">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-slate-600">Full Name (EN) *</Label>
                              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="First, Second, Third, Last" className="h-9 rounded-lg text-sm" />
                              <p className="text-[10px] text-slate-400">Must be at least 4 words</p>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-slate-600">Full Name (AR)</Label>
                              <Input value={manualFullNameArabic} onChange={e => setManualFullNameArabic(e.target.value)} placeholder="الاسم الكامل" className="h-9 rounded-lg text-sm" dir="rtl" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-slate-600">National ID *</Label>
                              <Input value={manualNationalId} onChange={e => handleNationalIdChange(e.target.value)} placeholder="14-digit ID" maxLength={14} className="h-9 rounded-lg font-mono text-sm" />
                              <p className="text-[10px] text-slate-400">Auto-fills DOB & Gender</p>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-slate-600">
                                DOB * {manualDOB && <Badge variant="secondary" className="ml-1 bg-blue-50 text-blue-700 text-[9px] py-0">Age: {calculateAge(manualDOB)}</Badge>}
                              </Label>
                              <Input type="date" value={manualDOB} onChange={e => setManualDOB(e.target.value)} className="h-9 rounded-lg text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-slate-600">Gender *</Label>
                              <Select value={manualGender} onValueChange={setManualGender}>
                                <SelectTrigger className="h-9 rounded-lg bg-white text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Male">Male</SelectItem>
                                  <SelectItem value="Female">Female</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-slate-600">Relation *</Label>
                              <Select value={manualRelation} onValueChange={v => { setManualRelation(v); setParentStaffCode(""); setLinkedMainMemberId(""); setParentSearchResult(null); setParentSearchError(""); }}>
                                <SelectTrigger className="h-9 rounded-lg bg-white text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {dbRelations.length > 0 ? dbRelations.map((r: any) => <SelectItem key={r.id} value={r.relation_type}>{r.relation_type}</SelectItem>) : <><SelectItem value="Employee">Employee</SelectItem><SelectItem value="Spouse">Spouse</SelectItem><SelectItem value="Child">Child</SelectItem></>}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-slate-600">Plan Category *</Label>
                              <Select value={manualPlan} onValueChange={setManualPlan}>
                                <SelectTrigger className="h-9 rounded-lg bg-white text-sm"><SelectValue placeholder="Select Plan" /></SelectTrigger>
                                <SelectContent>
                                  {Array.from(new Set((selectedPolicy?.medical_brackets || []).map((b: any) => b.plan))).filter(Boolean).map((planName: any) => <SelectItem key={planName} value={planName}>{planName}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 2: Employment & Contact */}
                    <div>
                      <button type="button" onClick={() => toggleSection('employment')} className="w-full flex justify-between items-center px-4 py-2.5 text-left hover:bg-slate-50 transition-colors">
                        <span className="text-[11px] font-bold text-[#0369A1] uppercase tracking-wider">2. Employment & Contact</span>
                        <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", openSections.employment && "rotate-90")} />
                      </button>
                      {openSections.employment && (
                        <div className="px-4 pb-4 pt-1 animate-in fade-in duration-150">
                          {/* Parent employee staff code block for dependents */}
                          {isDependent && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2 mb-3">
                              <Label className="text-[11px] font-bold text-blue-800">Parent Employee Staff Code *</Label>
                              <Input value={parentStaffCode} onChange={e => handleParentStaffCodeSearch(e.target.value)} placeholder="e.g. A-1234" className="h-9 rounded-lg text-sm" />
                              {parentSearchResult && <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-700 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Linked to: {parentSearchResult.member_name} (Staff: {parentSearchResult.staff_code})</div>}
                              {parentSearchError && <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1"><AlertCircle className="w-3 h-3" />{parentSearchError}</p>}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-slate-600">Staff ID *</Label>
                              <Input value={manualStaffCode} onChange={e => setManualStaffCode(e.target.value)} placeholder="EMP-01" className="h-9 rounded-lg text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-slate-600">Mobile *</Label>
                              <Input value={manualMobile} onChange={e => setManualMobile(e.target.value)} placeholder="01012345678" className="h-9 rounded-lg text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-slate-600">Marital Status</Label>
                              <Select value={manualMaritalStatus} onValueChange={setManualMaritalStatus}>
                                <SelectTrigger className="h-9 rounded-lg bg-white text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Single">Single</SelectItem>
                                  <SelectItem value="Married">Married</SelectItem>
                                  <SelectItem value="Divorced">Divorced</SelectItem>
                                  <SelectItem value="Widowed">Widowed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-slate-600">Nationality *</Label>
                              <Input value={manualNationality} onChange={e => setManualNationality(e.target.value)} placeholder="Egyptian" className="h-9 rounded-lg text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-slate-600">Location</Label>
                              <Input value={manualLocation} onChange={e => setManualLocation(e.target.value)} placeholder="Cairo" className="h-9 rounded-lg text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-slate-600">Department</Label>
                              <Input value={manualDepartment} onChange={e => setManualDepartment(e.target.value)} placeholder="Engineering" className="h-9 rounded-lg text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-slate-600">Job Title</Label>
                              <Input value={manualJobTitle} onChange={e => setManualJobTitle(e.target.value)} placeholder="Developer" className="h-9 rounded-lg text-sm" />
                            </div>
                            <div className="space-y-1 sm:col-span-3">
                              <Label className="text-[11px] font-semibold text-slate-600">Notes</Label>
                              <Input value={manualNotes} onChange={e => setManualNotes(e.target.value)} placeholder="Additional Notes" className="h-9 rounded-lg text-sm" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 3: Bank Details */}
                    <div>
                      <button type="button" onClick={() => toggleSection('bank')} className="w-full flex justify-between items-center px-4 py-2.5 text-left hover:bg-slate-50 transition-colors">
                        <span className="text-[11px] font-bold text-[#0369A1] uppercase tracking-wider">3. Bank & Payroll <span className="text-slate-400 font-normal">(Optional)</span></span>
                        <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", openSections.bank && "rotate-90")} />
                      </button>
                      {openSections.bank && (
                        <div className="px-4 pb-4 pt-1 animate-in fade-in duration-150">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-slate-600">Bank Name</Label>
                              <Input value={manualBankName} onChange={e => setManualBankName(e.target.value)} placeholder="CIB" className="h-9 rounded-lg text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-slate-600">Bank Account</Label>
                              <Input value={manualBankAccount} onChange={e => setManualBankAccount(e.target.value)} placeholder="Account Number" className="h-9 rounded-lg text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-slate-600">IBAN</Label>
                              <Input value={manualIban} onChange={e => setManualIban(e.target.value)} placeholder="EG..." className="h-9 rounded-lg text-sm" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* DELETE/MODIFY: Search by name, staff code, national ID */}
                {(manualAction === 'delete' || manualAction === 'modify') && (
                  <div className="p-4 border-t space-y-3">
                    <Label className="text-[11px] font-semibold text-slate-600">Search Member to {manualAction === 'delete' ? 'Cancel' : 'Modify'}</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input value={deleteSearchQuery} onChange={e => { setDeleteSearchQuery(e.target.value); setDeleteSearchOpen(true); }} onFocus={() => setDeleteSearchOpen(true)} onBlur={() => setTimeout(() => setDeleteSearchOpen(false), 200)} placeholder="Search by name, staff code, or national ID..." className="h-9 pl-9 rounded-lg text-sm" />
                      {deleteSearchOpen && filteredDeleteMembers.length > 0 && (
                        <div className="absolute top-11 left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                          {filteredDeleteMembers.map((m: any) => (
                            <div key={m.id} className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors" onMouseDown={e => { e.preventDefault(); setSelectedDeleteMemberId(m.id); setDeleteSearchQuery(m.member_name || ""); setDeleteSearchOpen(false); }}>
                              <p className="font-semibold text-slate-900 text-xs">{m.member_name}</p>
                              <p className="text-[10px] text-slate-500">{m.staff_code && `Staff: ${m.staff_code}`} {m.national_id && `NID: ${m.national_id}`} {m.relation && `(${m.relation})`}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {deleteSearchOpen && deleteSearchQuery && filteredDeleteMembers.length === 0 && <div className="absolute top-11 left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-3 text-center text-xs text-slate-500">No members match &quot;{deleteSearchQuery}&quot;</div>}
                    </div>
                    {selectedDeleteMemberId && (
                      <div className="space-y-2">
                        <div className="p-2.5 bg-slate-50 border rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          Selected: {activeMembers.find((m: any) => m.id === selectedDeleteMemberId)?.member_name}
                        </div>
                        
                        {/* Utilization Impact Indicator */}
                        <div className={cn(
                          "p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2",
                          isCheckingUtil ? "bg-slate-50 border-slate-200 text-slate-500" :
                          deleteMemberHasClaims && deleteMemberHasClaims !== 'no' ? "bg-rose-50 border-rose-200 text-rose-700" :
                          "bg-emerald-50 border-emerald-200 text-emerald-700"
                        )}>
                          {isCheckingUtil ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking utilization...</>
                          ) : deleteMemberHasClaims && deleteMemberHasClaims !== 'no' ? (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                              <span>Has Claims: <strong className="underline">Yes</strong> ({deleteMemberHasClaims.source === 'file' ? `report: ${deleteMemberHasClaims.fileName}` : 'database'}) — No refund.</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Has Claims: <strong>No</strong> — Eligible for pro-rata refund.</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    {activeMembers.length === 0 && <p className="text-[11px] text-amber-600 font-medium p-2 bg-amber-50 rounded-lg">No active members in this policy census.</p>}
                  </div>
                )}

                {/* Add to List button + pending items */}
                <div className="px-4 py-3 border-t bg-slate-50/50">
                  <Button type="button" onClick={addManualItem} className="h-9 bg-slate-900 hover:bg-slate-800 rounded-lg text-xs font-semibold px-5">Add to List</Button>
                </div>

                {manualItems.length > 0 && (
                  <div className="border-t">
                    <div className="px-4 py-2 bg-slate-50/80 text-[11px] font-semibold text-slate-500">{manualItems.length} item{manualItems.length > 1 ? 's' : ''} added</div>
                    <ScrollArea className="max-h-32">
                      <div className="divide-y divide-slate-100">
                        {manualItems.map(item => (
                          <div key={item.id} className="flex justify-between items-center px-4 py-2 text-xs hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800">{item.name}</span>
                              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", item.action_type === 'add' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>{item.action_type}</span>
                              {item.relation && <span className="text-[10px] text-slate-400">{item.relation}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-slate-600">{Math.round(item.premium || 0).toLocaleString()} EGP</span>
                              <Button variant="ghost" size="sm" onClick={() => removeManualItem(item.id)} className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"><X className="w-3 h-3" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Notes</Label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Additions for new employees..." className="w-full min-h-[60px] p-3 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none" />
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Financial Preview ═══ */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Proration Timeline */}
              {selectedPolicy && (
                <div className="p-4 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="text-[11px] font-bold text-[#0369A1] uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" /> Policy Proration Timeline
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                      <span>Start: {new Date(selectedPolicy.start_date).toLocaleDateString()}</span>
                      <span className="text-blue-600 font-semibold">Effective: {new Date(effectiveDate).toLocaleDateString()}</span>
                      <span>End: {new Date(selectedPolicy.end_date).toLocaleDateString()}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden relative">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-400 h-full rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${Math.min(100, Math.max(0, 100 - (remainingDays / Math.max(1, differenceInDays(new Date(selectedPolicy.end_date), new Date(selectedPolicy.start_date)))) * 100))}%` 
                        }} 
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 text-center">
                      <strong className="text-blue-600">{remainingDays}</strong> days remaining of {differenceInDays(new Date(selectedPolicy.end_date), new Date(selectedPolicy.start_date))} total
                    </p>
                  </div>
                </div>
              )}

              {/* Premium Math Card */}
              <div className={cn("bg-slate-900 text-white rounded-2xl relative overflow-hidden shadow-lg", isModalMode ? "p-5" : "p-8")}>
                <div className="absolute -right-8 -top-8 opacity-[0.06]"><Calculator className="w-48 h-48" /></div>
                <div className="relative z-10">
                  <p className="text-blue-300 font-semibold tracking-wider uppercase text-[10px] mb-1">Financial Impact (Pro-Rata)</p>
                  <h2 className={cn("font-black text-white mb-4", isModalMode ? "text-3xl" : "text-4xl")}>{calculations.finalImpact >= 0 ? '+' : ''}{Math.round(calculations.finalImpact).toLocaleString()} EGP</h2>
                  <div className="space-y-2 pt-4 border-t border-slate-700 text-sm">
                    <div className="flex justify-between text-slate-400"><span>LoB:</span><span className="font-semibold text-white">{selectedPolicy?.line_of_business}</span></div>
                    <div className="flex justify-between text-slate-400"><span>Type:</span><span className="font-semibold text-white">{selectedEndorsementType?.name || 'Manual'}</span></div>
                    <div className="flex justify-between text-slate-400"><span>Net Premium:</span><span className="font-mono text-white">{Math.round(calculations.netPremium).toLocaleString()} EGP</span></div>
                    <div className="flex justify-between text-slate-400"><span>Taxes & Fees (13.2%):</span><span className="font-mono text-white">{Math.round(calculations.taxes).toLocaleString()} EGP</span></div>
                    {calculations.sumInsured !== 0 && <div className="flex justify-between text-slate-400"><span>Sum Insured Adj:</span><span className="font-mono text-white">{Math.round(calculations.sumInsured).toLocaleString()} EGP</span></div>}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <div className={cn("bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0", isModalMode ? "px-6 py-3" : "p-6")}>
        <Button variant="outline" onClick={() => setStep(Math.max(initialPolicy ? 2 : 1, step - 1) as any)} disabled={step === (initialPolicy ? 2 : 1)} className="h-10 px-5 rounded-lg font-semibold text-sm">Back</Button>
        {step < 3 ? (
          <Button onClick={() => setStep((step + 1) as any)} disabled={(step === 1 && !step1CanProceed) || (step === 2 && !step2CanProceed)} className="bg-[#2A75F3] hover:bg-blue-700 h-10 px-6 rounded-lg font-semibold text-white shadow-md shadow-blue-200/50 text-sm">
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-6 rounded-lg font-semibold shadow-md shadow-emerald-200/50 flex items-center gap-2 text-sm">
            {isSubmitting ? <><Loader2 className="animate-spin w-4 h-4" /><span>Submitting...</span></> : <><span>Save Draft & View</span><ArrowRight className="w-4 h-4" /></>}
          </Button>
        )}
      </div>
    </div>
  );
}

