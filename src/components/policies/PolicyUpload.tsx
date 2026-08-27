import React, { useRef, useState } from "react";
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, FileSpreadsheet, Users } from "lucide-react";
import type { PolicyMember } from "@/lib/types";

interface PolicyUploadProps {
  onFileSelect: (file: File | null) => void;
  onParsedMembers: (members: Omit<PolicyMember, 'id' | 'policy_id'>[]) => void;
  isSubmitting?: boolean;
}

export function PolicyUpload({ onFileSelect, onParsedMembers, isSubmitting }: PolicyUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [memberFile, setMemberFile] = useState<File | null>(null);

  const excelDateToISO = (value: any) => {
    if (!value) return "";
    if (typeof value === 'string' && value.includes('-')) return value;
    const serial = Number(value);
    if (!isNaN(serial) && serial > 10000) {
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    return value;
  };

  const handleExcelParse = async (file: File) => {
    return new Promise<Omit<PolicyMember, 'id' | 'policy_id'>[]>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          
          const members = jsonData.map((row: any) => ({
            member_name: row['Beneficiary Name'] || row['Member Name'] || "",
            member_id_insurance: row['Insurer ID'] || row['Member Ins Code'] || "",
            staff_code: row['Staff ID'] || row['Staff Code'] || "",
            member_id_tpa: row['Individual ID'] || row['Member TPA Code'] || "",
            date_of_birth: excelDateToISO(row['Date Of Birth']) || null,
            gender: row['Gender'] || "Male",
            relation: row['Relation'] || "Principal",
            nationality: row['Nationality'] || "",
            national_id: row['National ID'] || "",
            plan_category: row['Plan Category'] || "",
            location: row['Location'] || "",
            department: row['Department'] || "",
            job_title: row['Job Title'] || "",
            premium: Number(row['Premium']) || 0,
            addition_date: excelDateToISO(row['Addition Date']) || null,
            deletion_date: excelDateToISO(row['Deletion Date']) || null,
            mobile_number: row['Mobile Number'] || "",
            notes: row['Notes'] || "",
            created_at: new Date().toISOString()
          }));
          resolve(members);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMemberFile(file);
      onFileSelect(file);
      try {
        const members = await handleExcelParse(file);
        onParsedMembers(members);
      } catch (err) {
        console.error("Failed to parse Excel:", err);
      }
    }
  };

  const downloadTemplate = () => {
    const templateData = [{
      'Beneficiary Name': 'John Doe',
      'Insurer ID': 'M001',
      'Staff ID': 'S001',
      'Individual ID': 'T001',
      'Date Of Birth': '1990-01-01',
      'Gender': 'Male',
      'Relation': 'Principal',
      'Nationality': 'Egypt',
      'National ID': '29001011234567',
      'Plan Category': 'A',
      'Location': 'Cairo',
      'Department': 'IT',
      'Job Title': 'Engineer',
      'Premium': 1500,
      'Addition Date': '2023-01-01',
      'Deletion Date': '',
      'Mobile Number': '01001234567',
      'Notes': 'Standard cover'
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Members");
    XLSX.writeFile(wb, "Policy_Members_Template.xlsx");
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
        <Users className="w-4 h-4" /> Census / Members List
      </h3>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label className="text-xs font-bold text-muted-foreground uppercase">Upload Excel</Label>
          <div className="flex gap-2 mt-1.5">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={isSubmitting}
            />
            <Button 
              type="button" 
              variant="outline" 
              className="w-full flex justify-start items-center gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
            >
              <Upload className="w-4 h-4 text-muted-foreground" />
              {memberFile ? memberFile.name : "Select Census Excel File"}
            </Button>
            <Button 
              type="button" 
              variant="secondary"
              onClick={downloadTemplate}
              disabled={isSubmitting}
            >
              <Download className="w-4 h-4 mr-2" /> Template
            </Button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
            <FileSpreadsheet className="w-3 h-3" /> Auto-extracts members if template is matched.
          </p>
        </div>
      </div>
    </div>
  );
}
