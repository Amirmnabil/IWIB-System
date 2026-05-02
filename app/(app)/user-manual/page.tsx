
'use client';
import React, { useState, useEffect } from "react";
import { BookOpen, CheckCircle2, HelpCircle, Info, Download, FileText, FileSpreadsheet, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import * as XLSX from 'xlsx';

export default function UserManual() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleDownloadCensusTemplate = () => {
    const headers = [
      "company_name", "policy_number", "member_number", "first_name", "last_name", 
      "national_id", "date_of_birth", "gender", "marital_status", "relationship",
      "job_title", "department", "salary", "benefit_class", "employment_start_date",
      "status", "email", "phone", "pre_existing_conditions"
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Census Template");
    XLSX.writeFile(wb, "census_template.xlsx");
  };

  const handleDownloadManual = () => {
    const content = `
دليل مستخدم نظام IWIB Hub لإدارة وساطة التأمين
==========================================

١. مقدمة عن النظام:
IWIB Hub هو نظام متكامل مصمم لوسطاء التأمين لإدارة كافة العمليات من إدارة العملاء حتى العمولات والمطالبات.

٢. الأقسام الرئيسية:

أ. إدارة علاقات العملاء (CRM & Sales):
- الشركات: إضافة وتعديل بيانات العملاء والشركات المستهدفة.
- العملاء المحتملون (Leads): تتبع الفرص البيعية الجديدة.
- خط أنابيب المبيعات: إدارة مراحل البيع وتوقعات الإيرادات باستخدام الذكاء الاصطناعي.

ب. الاكتتاب (Underwriting):
- قاعدة بيانات التعداد (Census): إدارة بيانات الموظفين المؤمن عليهم وتابعيهم.
- جداول المنافع: تعريف حدود التغطية لكل بوليصة.
- تقييم المخاطر: تحليل درجة خطورة العملاء بناءً على البيانات التاريخية.

ج. إدارة السياسات (Policy Admin):
- السياسات: متابعة الوثائق النشطة وتواريخ انتهائها.
- الملاحق (Endorsements): إدارة عمليات الإضافة والحذف والتعديل.
- التجديدات: تنبيهات آلية لإدارة عمليات تجديد البوليصات.

د. المطالبات (Claims):
- تتبع المطالبات من وقت التقديم حتى السداد.
- كشف الاحتيال الذكي للمطالبات المشبوهة.

هـ. الشؤون المالية (Finance):
- إدارة الفواتير والمدفوعات والعمولات المستحقة من شركات التأمين.

٣. فهم تدفق البيانات (Companies vs Leads vs Prospects):
- الشركات (Companies): هي السجل الشامل لكل المؤسسات.
- العملاء المحتملون (Leads): شركات في مرحلة التعارف الأولي (قبل التأهيل).
- العملاء المرتقبون (Prospects): شركات تم تأهيلها ودخلت خط أنابيب المبيعات لتتبع قيمة الصفقة واحتمالية الإغلاق.

جميع الحقوق محفوظة © ${new Date().getFullYear()} IWIB Hub.
    `;
    
    const blob = new Blob(['\ufeff' + content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "IWIB_Hub_User_Manual_AR.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isMounted) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <PageHeader
        title="دليل المستخدم - IWIB Hub"
        description="دليلك الشامل لفهم واستخدام نظام إدارة وساطة التأمين."
      />

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-indigo-600 mb-2">
          <Info className="w-5 h-5" />
          <h2 className="text-xl font-bold text-slate-900">١. مقدمة عن النظام</h2>
        </div>
        <Card>
          <CardContent className="p-6 text-slate-600 leading-relaxed text-right" dir="rtl">
            أهلاً بك في <strong>IWIB Hub</strong>، المنصة المتكاملة المصممة خصيصاً لوسطاء التأمين لتسهيل إدارة العمليات اليومية. يهدف النظام إلى أتمتة المهام المعقدة مثل إدارة التعداد (Census)، تتبع المطالبات، وحساب العمولات، مع دعم ذكي من تقنيات الذكاء الاصطناعي.
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-indigo-600 mb-2">
          <Layers className="w-5 h-5" />
          <h2 className="text-xl font-bold text-slate-900">٢. فهم تدفق العمل (CRM Workflow)</h2>
        </div>
        <Card>
          <CardContent className="p-6 text-slate-600 leading-relaxed text-right space-y-4" dir="rtl">
            <p>لضمان أفضل استخدام للنظام، يجب فهم الفرق بين أنواع السجلات في قسم المبيعات:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h4 className="font-bold text-blue-900 mb-1">الشركات (Companies)</h4>
                <p className="text-sm text-blue-800">السجل الرئيسي لكل المؤسسات. تحتوي على البيانات العامة والعناوين وجهات الاتصال.</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                <h4 className="font-bold text-indigo-900 mb-1">المحتملون (Leads)</h4>
                <p className="text-sm text-indigo-800">شركات في مرحلة "البحث". يتم تتبعها كفرص أولية لم يتم تقييم جدواها المالية بعد.</p>
              </div>
              <div className="p-4 bg-violet-50 rounded-lg border border-violet-100">
                <h4 className="font-bold text-violet-900 mb-1">المرتقبون (Prospects)</h4>
                <p className="text-sm text-violet-800">فرص حقيقية دخلت "خط أنابيب المبيعات". نحدد لها قيمة مالية، احتمال نجاح، وتاريخ إغلاق.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-indigo-600 mb-2">
          <BookOpen className="w-5 h-5" />
          <h2 className="text-xl font-bold text-slate-900">٣. الوحدات الرئيسية وكيفية استخدامها</h2>
        </div>
        
        <Accordion type="single" collapsible className="w-full space-y-4" dir="rtl">
          <AccordionItem value="crm" className="border rounded-lg bg-white px-4">
            <AccordionTrigger className="hover:no-underline font-bold text-slate-900">
              إدارة علاقات العملاء والمبيعات (CRM & Sales)
            </AccordionTrigger>
            <AccordionContent className="text-slate-600 space-y-2 pb-4 text-right">
              <ul className="list-disc pr-6 space-y-2">
                <li><strong>الشركات:</strong> يمكنك إضافة بيانات الشركات وتتبع حالتها.</li>
                <li><strong>العملاء المحتملون (Leads):</strong> تتبع الفرص الجديدة. استخدم زر <strong>"Convert"</strong> لتحويل العميل المهتم إلى "Prospect".</li>
                <li><strong>خط أنابيب المبيعات:</strong> لوحة مرئية (Kanban) تتيح لك سحب وإفلات الصفقات. استخدم زر <strong>"AI Forecast"</strong> للتنبؤ بالإيرادات.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="underwriting" className="border rounded-lg bg-white px-4">
            <AccordionTrigger className="hover:no-underline font-bold text-slate-900">
              الاكتتاب وقاعدة بيانات التعداد (Underwriting)
            </AccordionTrigger>
            <AccordionContent className="text-slate-600 space-y-2 pb-4 text-right">
              <ul className="list-disc pr-6 space-y-2">
                <li><strong>قاعدة بيانات التعداد (Census):</strong> يمكنك إضافة الموظفين يدوياً أو <strong>رفع ملف Excel</strong> لتسريع العملية.</li>
                <li><strong>تقييم المخاطر:</strong> يقوم النظام بحساب درجة المخاطر بناءً على تاريخ المطالبات وصناعة الشركة.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="downloads" className="border rounded-lg bg-white px-4">
            <AccordionTrigger className="hover:no-underline font-bold text-indigo-600">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                التحميلات والملفات المساعدة
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-slate-600 space-y-4 pb-4 text-right">
              <p className="text-sm">يمكنك تحميل الملفات التالية لمساعدتك في استخدام النظام:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <FileText className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">دليل المستخدم</p>
                      <p className="text-xs text-slate-500">نسخة نصية كاملة (UTF-8)</p>
                    </div>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-indigo-600"
                    onClick={handleDownloadManual}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">نموذج التعداد (Excel)</p>
                      <p className="text-xs text-slate-500">لرفع بيانات المؤمن عليهم</p>
                    </div>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-indigo-600"
                    onClick={handleDownloadCensusTemplate}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <footer className="pt-8 border-t text-center text-slate-400 text-sm">
        جميع الحقوق محفوظة &copy; {new Date().getFullYear()} IWIB Hub - نظام إدارة وساطة التأمين.
      </footer>
    </div>
  );
}
