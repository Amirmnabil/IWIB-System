
'use client';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  ClipboardList,
  DollarSign,
  Shield,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  LogOut,
  Bell,
  Search,
  UserCircle,
  Building,
  Target,
  Phone,
  Briefcase,
  Heart,
  Hospital,
  FileCheck,
  Receipt,
  CreditCard,
  PiggyBank,
  Scale,
  Activity,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  Globe,
  Calculator,
  Car,
  ListTree,
  Calendar as CalendarIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { useI18n } from "@/components/i18n-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { lang, setLang, t, isRtl } = useI18n();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState(["CRM & Sales", "Underwriting", "Policy Admin"]);
  const [user, setUser] = useState<{ full_name: string; email: string; role: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Auth guard — redirect to login if no session
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (!session) {
        router.replace('/');
        return;
      }
      const u = session.user;
      setUser({
        full_name: u.user_metadata?.full_name || u.email || 'User',
        email: u.email || '',
        role: u.user_metadata?.role || 'User',
      });
      setMounted(true);
    });

    // Keep user in sync with auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (!session) {
        router.replace('/');
        return;
      }
      const u = session.user;
      setUser({
        full_name: u.user_metadata?.full_name || u.email || 'User',
        email: u.email || '',
        role: u.user_metadata?.role || 'User',
      });
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const menuItems = [
    { title: t('dashboard'), icon: LayoutDashboard, href: "/dashboard" },
    {
      title: t('crmSales'),
      icon: Users,
      submenu: [
        { title: t('companies'), icon: Building2, href: "/companies" },
        { title: t('contacts'), icon: UserCircle, href: "/contacts" },
        { title: t('leads'), icon: Target, href: "/leads" },
        { title: t('prospects'), icon: Briefcase, href: "/prospects" },
        { title: t('activities'), icon: Phone, href: "/activities" },
        { title: t('calendar'), icon: CalendarIcon, href: "/calendar" },
        { title: t('salesPipeline'), icon: TrendingUp, href: "/sales-pipeline" }
      ]
    },
    {
      title: t('underwriting'),
      icon: Scale,
      submenu: [
        { title: t('smeMedicalPricing'), icon: Calculator, href: "/underwriting/medical-pricing" },
        { title: t('motorInsurancePricing'), icon: Car, href: "/underwriting/motor-pricing" },
        { title: t('census'), icon: Users, href: "/census" },
        { title: t('benefitSchedules'), icon: FileText, href: "/benefit-schedules" },
        { title: t('riskScoring'), icon: Activity, href: "/risk-scoring" }
      ]
    },
    {
      title: t('policyAdmin'),
      icon: FileText,
      submenu: [
        { title: t('policies'), icon: FileCheck, href: "/policies" },
        { title: t('medicalAnalytics'), icon: BarChart3, href: "/policy-admin/medical-utilization" },
        { title: t('endorsements'), icon: FileText, href: "/endorsements" },
        { title: t('renewals'), icon: ClipboardList, href: "/renewals" }
      ]
    },
    {
      title: t('claims'),
      icon: ClipboardList,
      submenu: [
        { title: t('allClaims'), icon: FileText, href: "/claims" },
        { title: t('appeals'), icon: AlertTriangle, href: "/claim-appeals" },
        { title: t('fraudDetection'), icon: Shield, href: "/fraud-detection" }
      ]
    },
    {
      title: t('masterData'),
      icon: Building,
      submenu: [
        { title: t('insuranceCompanies'), icon: Building2, href: "/insurance-companies" },
        { title: t('tpas'), icon: Heart, href: "/tpas" },
        { title: t('providerNetwork'), icon: Hospital, href: "/providers" },
        { title: t('referenceLists'), icon: ListTree, href: "/master-data/reference-lists" }
      ]
    },
    {
      title: t('finance'),
      icon: DollarSign,
      submenu: [
        { title: t('invoices'), icon: Receipt, href: "/invoices" },
        { title: t('payments'), icon: CreditCard, href: "/payments" },
        { title: t('commissions'), icon: PiggyBank, href: "/commissions" }
      ]
    },
    {
      title: t('compliance'),
      icon: Shield,
      submenu: [
        { title: t('kycDocs'), icon: FileCheck, href: "/kyc-documents" },
        { title: t('auditLogs'), icon: ClipboardList, href: "/audit-logs" }
      ]
    },
    { title: t('analytics'), icon: BarChart3, href: "/analytics" },
    { title: t('settings'), icon: Settings, href: "/settings" },
    { title: t('userManual'), icon: BookOpen, href: "/user-manual" }
  ];

  const toggleSubmenu = (title: string) => {
    setExpandedMenus(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const renderMenuItem = (item: any) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedMenus.includes(item.title);
    const isActive = pathname === item.href;
    const Icon = item.icon;

    if (hasSubmenu) {
      return (
        <div key={item.title}>
          <button
            onClick={() => toggleSubmenu(item.title)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5" />
              {sidebarOpen && <span>{item.title}</span>}
            </div>
            {sidebarOpen && (
              isExpanded ? <ChevronDown className="w-4 h-4" /> : (isRtl ? <ChevronRight className="w-4 h-4 rotate-180" /> : <ChevronRight className="w-4 h-4" />)
            )}
          </button>
          {sidebarOpen && isExpanded && (
            <div className={cn("mt-1 space-y-1 pl-3", isRtl ? "mr-4 border-r border-slate-200 pr-3 pl-0" : "ml-4 border-l border-slate-200")}>
              {item.submenu.map((subItem: any) => renderMenuItem(subItem))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-indigo-50 text-indigo-700 border-indigo-600" + (isRtl ? " border-r-2" : " border-l-2")
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        )}
        onClick={() => setMobileMenuOpen(false)}
      >
        <Icon className="w-5 h-5" />
        {sidebarOpen && <span>{item.title}</span>}
      </Link>
    );
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Menu */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4">
        <button onClick={() => setMobileMenuOpen(true)}>
          <Menu className="w-6 h-6 text-slate-600" />
        </button>
        <div className="flex items-center gap-2">
          <Logo className="h-10 w-10" />
          <span className="font-bold text-slate-900">IWIB Hub</span>
        </div>
        <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
          <Globe className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col fixed top-0 h-full bg-white border-slate-200 z-40 transition-all duration-300",
        sidebarOpen ? "w-64" : "w-20",
        isRtl ? "right-0 border-l" : "left-0 border-r"
      )}>
        <div className="h-20 flex items-center justify-between px-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Logo className="h-12 w-12" />
            {sidebarOpen && <div><span className="font-bold text-slate-900 text-lg">IWIB Hub</span></div>}
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 lg:block hidden"
          >
            {sidebarOpen ? <ChevronDown className="w-4 h-4 rotate-90" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map(item => renderMenuItem(item))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "min-h-screen transition-all duration-300 pt-16 lg:pt-0",
        sidebarOpen ? (isRtl ? "lg:mr-64" : "lg:ml-64") : (isRtl ? "lg:mr-20" : "lg:ml-20")
      )}>
        <header className="hidden lg:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-6">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400", isRtl ? "right-3" : "left-3")} />
              <Input placeholder={t('searchPlaceholder')} className={cn(isRtl ? "pr-10" : "pl-10")} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
              <Globe className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">3</Badge>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition-all">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                    {user?.full_name?.charAt(0)}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-2 border-b">
                  <p className="text-sm font-bold">{user?.full_name}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">{t('settings')}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 cursor-pointer"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.replace('/');
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" /> {t('signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
