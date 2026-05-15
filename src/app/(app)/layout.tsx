
'use client';
import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Calendar as CalendarIcon,
  Loader2
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
import { usePermissions } from "@/lib/hooks/use-permissions";
import { motion, AnimatePresence } from "framer-motion";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { lang, setLang, t, isRtl } = useI18n();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState(["CRM & Sales", "Underwriting", "Policy Admin"]);
  const [user, setUser] = useState<{ full_name: string; email: string; role: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { allowedModules, isAdmin, isLoading: isPermissionsLoading } = usePermissions();

  // Initialize sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarOpen');
    if (savedState !== null) {
      setSidebarOpen(savedState === 'true');
    }
  }, []);

  const handleToggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    localStorage.setItem('sidebarOpen', String(newState));
  };

  const handleMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => {
      setIsHovered(false);
    }, 300);
  };

  const isActuallyExpanded = sidebarOpen || isHovered;

  useEffect(() => {
    let isSubscribed = true;

    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isSubscribed) return;

        if (error) {
          console.error('Session error:', error);
          await supabase.auth.signOut();
          if (pathname !== '/') router.replace('/');
          return;
        }

        if (!session) {
          if (pathname !== '/') router.replace('/');
          return;
        }

        const u = session.user;
        setUser({
          full_name: u.user_metadata?.full_name || u.email || 'User',
          email: u.email || '',
          role: u.user_metadata?.role || 'User',
        });
        setMounted(true);
        setIsCheckingAuth(false);
      } catch (err) {
        console.error('Auth check error:', err);
        if (pathname !== '/') router.replace('/');
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (!isSubscribed) return;

      if (!session) {
        setUser(null);
        if (pathname !== '/') router.replace('/');
        return;
      }

      const u = session.user;
      setUser({
        full_name: u.user_metadata?.full_name || u.email || 'User',
        email: u.email || '',
        role: u.user_metadata?.role || 'User',
      });
      setMounted(true);
      setIsCheckingAuth(false);
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  const allMenuItems = useMemo(() => [
    { title: t('dashboard'), icon: LayoutDashboard, href: "/dashboard" },
    {
      title: t('crmSales'),
      icon: Users,
      moduleCode: 'crm',
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
      moduleCode: 'underwriting',
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
      moduleCode: 'policy_admin',
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
      moduleCode: 'claims',
      submenu: [
        { title: t('allClaims'), icon: FileText, href: "/claims" },
        { title: t('appeals'), icon: AlertTriangle, href: "/claim-appeals" },
        { title: t('fraudDetection'), icon: Shield, href: "/fraud-detection" }
      ]
    },
    {
      title: t('masterData'),
      icon: Building,
      moduleCode: 'master_data',
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
      moduleCode: 'finance',
      submenu: [
        { title: t('invoices'), icon: Receipt, href: "/invoices" },
        { title: t('payments'), icon: CreditCard, href: "/payments" },
        { title: t('commissions'), icon: PiggyBank, href: "/commissions" }
      ]
    },
    {
      title: t('compliance'),
      icon: Shield,
      moduleCode: 'complaints',
      submenu: [
        { title: t('kycDocs'), icon: FileCheck, href: "/kyc-documents" },
        { title: t('auditLogs'), icon: ClipboardList, href: "/audit-logs" }
      ]
    },
    { title: t('analytics'), icon: BarChart3, href: "/analytics", moduleCode: 'analytics' },
    { title: t('settings'), icon: Settings, href: "/settings", moduleCode: 'settings' },
    { title: t('userManual'), icon: BookOpen, href: "/user-manual", moduleCode: 'user_manual' }
  ], [t]);

  const menuItems = allMenuItems.filter(item => {
    if (!item.moduleCode) return true; // always show dashboard
    return isAdmin || allowedModules.includes(item.moduleCode as any);
  });

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
        <div key={item.title} className="group/menu">
          <button
            onClick={() => toggleSubmenu(item.title)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300",
              "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 group-hover/menu:translate-x-1",
              isExpanded && "text-indigo-600 bg-indigo-50/30"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                isExpanded ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-slate-100 text-slate-500 group-hover/menu:bg-white group-hover/menu:shadow-md"
              )}>
                <Icon className={cn("w-4 h-4", isExpanded && "animate-pulse")} />
              </div>
              {isActuallyExpanded && <span>{item.title}</span>}
            </div>
            {isActuallyExpanded && (
              <div className={cn("transition-transform duration-300", isExpanded && "rotate-180")}>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </div>
            )}
          </button>
          {isActuallyExpanded && isExpanded && (
            <div className={cn(
              "mt-1 space-y-1 overflow-hidden transition-all duration-500 animate-in slide-in-from-top-2",
              isRtl ? "mr-7 border-r-2 border-slate-100 pr-3 pl-0" : "ml-7 border-l-2 border-slate-100 pl-3"
            )}>
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
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 group/item",
          isActive
            ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100 translate-x-1"
            : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 hover:translate-x-1"
        )}
        onClick={() => setMobileMenuOpen(false)}
      >
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
          isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 group-hover/item:bg-white group-hover/item:shadow-md"
        )}>
          <Icon className="w-4 h-4" />
        </div>
        {isActuallyExpanded && <span>{item.title}</span>}
        {isActive && isActuallyExpanded && (
          <div className={cn("absolute w-1.5 h-1.5 rounded-full bg-white", isRtl ? "left-3" : "right-3")} />
        )}
      </Link>
    );
  };

  useEffect(() => {
    if (isCheckingAuth || isPermissionsLoading || !mounted) return;
    
    // Default allow if admin or just dashboard
    if (isAdmin || pathname === '/dashboard' || pathname === '/') return;

    let isAllowed = true;
    for (const item of allMenuItems) {
      if (!item.moduleCode) continue;
      
      const isMatch = (item.href && pathname.startsWith(item.href)) || 
                      (item.submenu && item.submenu.some(sub => pathname.startsWith(sub.href)));
      
      if (isMatch) {
        if (!allowedModules.includes(item.moduleCode as any)) {
          isAllowed = false;
        }
        break; // Found the matching module, no need to check others
      }
    }

    if (!isAllowed) {
      router.replace('/dashboard');
    }
  }, [pathname, isCheckingAuth, isPermissionsLoading, mounted, isAdmin, allowedModules, router, allMenuItems]);

  if (isCheckingAuth || !mounted || isPermissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Logo className="h-20 w-20 animate-bounce" />
          <div className="flex items-center gap-3 text-slate-500 font-bold tracking-tight">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span>{t('loading')}...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Mobile Menu */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50 flex items-center justify-between px-4">
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <Menu className="w-6 h-6 text-slate-600" />
        </button>
        <div className="flex items-center gap-2">
          <Logo className="h-10 w-10" />
          <span className="font-bold text-slate-800 tracking-wide text-xl">IWIB</span>
        </div>
        <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <Globe className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden lg:flex flex-col fixed top-0 h-full bg-white border-slate-200 z-40 transition-all duration-500 ease-in-out",
          isActuallyExpanded ? "w-72" : "w-24",
          isRtl ? "right-0 border-l" : "left-0 border-r",
          "shadow-[0_0_20px_rgba(0,0,0,0.02)]"
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="h-40 flex flex-col items-center justify-center border-b border-slate-50 relative overflow-hidden">
          <Link href="/dashboard" className="relative group/logo transition-transform duration-500 hover:scale-110 active:scale-95">
            <Logo className={cn("transition-all duration-500", isActuallyExpanded ? "h-32 w-32" : "h-16 w-16")} />
            <div className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2 custom-scrollbar">
          {menuItems.map(item => renderMenuItem(item))}
        </nav>

        <div className="p-4 border-t border-slate-50">
          <button 
            onClick={handleToggleSidebar}
            className={cn(
              "w-full flex items-center justify-center p-3 rounded-xl border-2 border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all duration-300",
              sidebarOpen && "bg-indigo-50 border-indigo-100 text-indigo-600"
            )}
          >
            {sidebarOpen ? <ChevronDown className="w-5 h-5 rotate-90" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "min-h-screen transition-all duration-500 pt-16 lg:pt-0",
        sidebarOpen ? (isRtl ? "lg:mr-72" : "lg:ml-72") : (isRtl ? "lg:mr-24" : "lg:ml-24")
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
        <div className="p-4 lg:p-6 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
