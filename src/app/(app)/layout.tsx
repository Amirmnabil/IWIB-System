
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
  Loader2,
  FileSignature
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
import { NotificationBell } from "@/components/shared/NotificationBell";

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
  const { allowedModules, allowedPages, isAdmin, isLoading: isPermissionsLoading } = usePermissions();
  const [isAccessDenied, setIsAccessDenied] = useState(false);

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
        { title: 'Quotations', icon: FileSignature, href: "/underwriting/quotations" },
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

  const menuItems = allMenuItems.map(item => {
    if (!item.moduleCode) return item; // always show dashboard
    
    // Check module level access
    if (!isAdmin && !allowedModules.includes(item.moduleCode as any)) return null;

    if (item.submenu) {
      const filteredSubmenu = item.submenu.filter(sub => {
        if (isAdmin || allowedPages.includes('*')) return true;
        // The page code in system_pages is expected to be the href path (e.g. /companies)
        return allowedPages.includes(sub.href);
      });
      if (filteredSubmenu.length === 0) return null; // hide module if all pages are denied
      return { ...item, submenu: filteredSubmenu };
    }

    if (item.href) {
      if (!isAdmin && !allowedPages.includes('*') && !allowedPages.includes(item.href)) return null;
    }

    return item;
  }).filter(Boolean);

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
              "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[13px] font-semibold transition-all duration-200",
              "text-slate-500 hover:text-primary hover:bg-slate-50/80",
              isExpanded && "text-primary bg-primary/5",
              !isActuallyExpanded && "justify-center px-0"
            )}
          >
            <div className="flex items-center min-w-0 w-full">
              <div className={cn(
                "w-6 h-6 flex items-center justify-center shrink-0 transition-all duration-200",
                isExpanded ? "text-primary" : "text-slate-400 group-hover/menu:text-primary",
                !isActuallyExpanded && "mx-auto"
              )}>
                <Icon className={cn("w-4 h-4", isExpanded && "animate-pulse")} />
              </div>
              <span className={cn(
                "transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden text-left",
                isActuallyExpanded ? "opacity-100 w-auto ml-2 pr-2" : "opacity-0 w-0 pointer-events-none"
              )}>
                {item.title}
              </span>
            </div>
            <div className={cn(
              "transition-all duration-300 ease-in-out shrink-0",
              isExpanded && "rotate-180",
              isActuallyExpanded ? "opacity-50 w-3.5" : "opacity-0 w-0 pointer-events-none"
            )}>
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </button>
          {isActuallyExpanded && isExpanded && (
            <div className={cn(
              "mt-0.5 space-y-0.5 overflow-hidden transition-all duration-300 animate-in slide-in-from-top-1",
              isRtl ? "mr-4 border-r border-slate-100 pr-2 pl-0" : "ml-4 border-l border-slate-100 pl-2"
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
          "flex items-center px-2 py-1.5 rounded-md text-[13px] font-semibold transition-all duration-200 group/item relative",
          isActive
            ? "bg-primary/5 text-primary border border-primary/10"
            : "text-slate-500 hover:text-primary hover:bg-slate-50/80",
          !isActuallyExpanded && "justify-center px-0"
        )}
        onClick={() => setMobileMenuOpen(false)}
      >
        <div className={cn(
          "w-6 h-6 flex items-center justify-center shrink-0 transition-all duration-200",
          isActive ? "text-primary" : "text-slate-400 group-hover/item:text-primary",
          !isActuallyExpanded && "mx-auto"
        )}>
          <Icon className="w-4 h-4" />
        </div>
        <span className={cn(
          "transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden text-left",
          isActuallyExpanded ? "opacity-100 w-auto ml-2 pr-2" : "opacity-0 w-0 pointer-events-none"
        )}>
          {item.title}
        </span>
        <div className={cn(
          "absolute w-1 h-1 rounded-full bg-primary transition-all duration-300",
          isRtl ? "left-2.5" : "right-2.5",
          isActive && isActuallyExpanded ? "opacity-100 scale-100" : "opacity-0 scale-0 pointer-events-none"
        )} />
      </Link>
    );
  };

  useEffect(() => {
    if (isCheckingAuth || isPermissionsLoading || !mounted) return;
    
    // Default allow if admin or just dashboard
    if (isAdmin || pathname === '/dashboard' || pathname === '/') {
      setIsAccessDenied(false);
      return;
    }

    let isAllowed = false;
    for (const item of allMenuItems) {
      if (!item.moduleCode) continue;
      
      const matchedSubItem = item.submenu?.find(sub => pathname.startsWith(sub.href));
      const matchedMainItem = (item.href && pathname.startsWith(item.href)) ? item : null;
      
      if (matchedSubItem || matchedMainItem) {
        // Module level access
        if (allowedModules.includes(item.moduleCode as any)) {
          // Page level access
          const pageHref = matchedSubItem ? matchedSubItem.href : matchedMainItem!.href;
          if (allowedPages.includes('*') || allowedPages.includes(pageHref)) {
            isAllowed = true;
          }
        }
        break; 
      }
    }

    // If the path isn't in any module definition (e.g. settings/profile not explicitly mapped), 
    // we default to allowing it if the module itself is allowed, but for strict RBAC we block it if it's explicitly tracked.
    // We will trust the loop above to set isAllowed correctly for tracked paths.
    setIsAccessDenied(!isAllowed);
  }, [pathname, isCheckingAuth, isPermissionsLoading, mounted, isAdmin, allowedModules, allowedPages, allMenuItems]);

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
        <div className="flex items-center justify-center">
          <Logo className="h-10 w-auto max-w-[140px]" />
        </div>
        <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <Globe className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden lg:flex flex-col fixed top-0 h-full bg-white border-slate-200 z-40 transition-all duration-300 ease-in-out",
          isActuallyExpanded ? "w-64" : "w-16",
          isRtl ? "right-0 border-l" : "left-0 border-r",
          "shadow-[0_0_20px_rgba(0,0,0,0.02)]"
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="h-16 flex items-center justify-center px-4 relative overflow-hidden shrink-0 border-b border-slate-50 w-full">
          <Link href="/dashboard" className="flex items-center justify-center w-full group/logo transition-transform duration-300 hover:scale-102 active:scale-98">
            <Logo className={cn("transition-all duration-300", isActuallyExpanded ? "h-10 w-auto max-w-[140px]" : "h-7 w-7")} />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
          {menuItems.map(item => renderMenuItem(item))}
        </nav>

        {/* Fixed Bottom Controls */}
        <div className="border-t border-slate-100 p-3 bg-white space-y-2.5 shrink-0">
          {/* Search Box */}
          <div className="relative flex items-center h-8 bg-slate-50 border border-slate-200/80 rounded-md overflow-hidden transition-all duration-300">
            <div className="w-8 h-8 flex items-center justify-center shrink-0 text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input 
              placeholder={t('searchPlaceholder') || "Search..."} 
              className={cn(
                "h-full bg-transparent text-xs outline-none border-none transition-all duration-300 w-full font-medium text-slate-700",
                isActuallyExpanded ? "opacity-100 px-1" : "w-0 opacity-0 pointer-events-none"
              )} 
            />
          </div>

          {/* Language Switcher Toggle */}
          <div 
            onClick={() => !isActuallyExpanded && setLang(lang === 'en' ? 'ar' : 'en')}
            className={cn(
              "flex items-center text-xs text-slate-500 bg-slate-50 rounded-md border border-slate-200/40 font-bold overflow-hidden transition-all duration-300 cursor-pointer select-none",
              isActuallyExpanded ? "p-0.5 h-8" : "w-8 h-8 justify-center mx-auto hover:bg-slate-100"
            )}
            title={!isActuallyExpanded ? (lang === 'en' ? "العربية" : "English") : undefined}
          >
            {isActuallyExpanded ? (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); setLang('en'); }}
                  className={cn(
                    "flex-1 py-1 rounded text-[10px] transition-all duration-200",
                    lang === 'en' ? "bg-white text-primary shadow-sm" : "hover:text-slate-800"
                  )}
                >
                  EN
                </button>
                <span className="text-slate-200 text-[10px] mx-1 shrink-0">|</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); setLang('ar'); }}
                  className={cn(
                    "flex-1 py-1 rounded text-[10px] transition-all duration-200",
                    lang === 'ar' ? "bg-white text-primary shadow-sm" : "hover:text-slate-800"
                  )}
                >
                  AR
                </button>
              </>
            ) : (
              <span className="text-[10px] text-slate-600 font-bold shrink-0">
                {lang === 'en' ? 'AR' : 'EN'}
              </span>
            )}
          </div>

          {/* User Account & Collapse Toggle Side-by-Side */}
          <div className={cn("flex items-center justify-between w-full", !isActuallyExpanded && "flex-col gap-2")}>
            <div className="flex items-center gap-2 min-w-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative focus-visible:ring-1 focus-visible:ring-primary rounded-full outline-none shrink-0">
                    <div className="w-8 h-8 rounded-full bg-[#8E44AD] text-white text-xs font-bold flex items-center justify-center shadow-md shadow-purple-100 hover:scale-105 active:scale-95 transition-all">
                      {user?.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="right" className="w-56 z-50 ml-2">
                  <div className="p-2.5 border-b">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Account</p>
                    <p className="text-xs font-bold text-slate-800 mt-1">{user?.full_name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer text-xs">{t('settings')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 cursor-pointer text-xs"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      router.replace('/');
                    }}
                  >
                    <LogOut className="w-3.5 h-3.5 mr-2" /> {t('signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {isActuallyExpanded && (
                <div className="flex flex-col min-w-0 text-left animate-in fade-in duration-300">
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{user?.full_name}</span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{user?.role}</span>
                </div>
              )}
            </div>

            {/* Collapse Trigger (Minimal) */}
            <button 
              onClick={handleToggleSidebar}
              className="w-8 h-8 rounded-md border border-slate-200/80 text-slate-400 hover:text-primary hover:border-blue-100 hover:bg-blue-50/20 flex items-center justify-center transition-all shrink-0"
              title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              {sidebarOpen ? (
                <ChevronRight className="w-4 h-4 rotate-180" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Floating Notifications Action Button */}
      <div className={cn("fixed z-[60] transition-all duration-300", isRtl ? "left-4 top-4" : "right-4 top-4")}>
        <NotificationBell />
      </div>

      {/* Main Content */}
      <main className={cn(
        "min-h-screen transition-all duration-300 pt-16 lg:pt-0",
        sidebarOpen ? (isRtl ? "lg:mr-64" : "lg:ml-64") : (isRtl ? "lg:mr-16" : "lg:ml-16")
      )}>

        <div className="p-4 lg:p-6 relative overflow-hidden">
          {isAccessDenied ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                <Shield className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">{t('accessDenied') || 'Access Denied'}</h2>
              <p className="text-slate-500 max-w-md mb-8">
                {t('accessDeniedDesc') || 'You do not have permission to view this page. Please contact your system administrator if you believe this is an error.'}
              </p>
              <Button onClick={() => router.replace('/dashboard')} className="bg-indigo-600 hover:bg-indigo-700">
                {t('returnToDashboard') || 'Return to Dashboard'}
              </Button>
            </div>
          ) : (
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
          )}
        </div>
      </main>
    </div>
  );
}
