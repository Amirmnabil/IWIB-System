'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { Logo } from '@/components/logo';
import { useI18n } from '@/components/i18n-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Login Validation Schema - Strictly Email focused
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid business email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Compact Modern Floating Label Input
 */
const ModernInput = ({
  label,
  type,
  name,
  register,
  error,
  icon: Icon,
  showPasswordToggle,
  onTogglePassword,
  isPasswordVisible,
  isRtl
}: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  return (
    <div className="space-y-1.5 relative w-full group">
      <div className={cn(
        "relative flex items-center transition-all duration-500 rounded-[14px] border bg-card group",
        isFocused
          ? "border-blue-500 ring-4 ring-blue-500/5 shadow-[0_8px_20px_rgba(59,130,246,0.06)] scale-[1.01]"
          : "border-border shadow-sm hover:border-slate-300"
      )}>
        {/* Icon Section */}
        <div className={cn(
          "ps-4 flex items-center justify-center transition-colors duration-500",
          isFocused ? "text-primary" : "text-slate-400"
        )}>
          <Icon className="w-[18px] h-[18px]" strokeWidth={2.5} />
        </div>

        {/* Input & Floating Label Section */}
        <div className="relative flex-1">
          <input
            {...register(name)}
            type={type}
            autoComplete="new-password"
            onFocus={() => setIsFocused(true)}
            onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
              setIsFocused(false);
              setHasValue(!!e.target.value);
            }}
            onChange={(e) => {
              register(name).onChange(e);
              setHasValue(!!e.target.value);
            }}
            className={cn(
              "w-full px-3 py-4 pt-7 pb-2 bg-transparent outline-none text-foreground font-semibold placeholder-transparent transition-all text-sm",
              isRtl ? "text-right" : "text-left"
            )}
            placeholder={label}
          />
          <label className={cn(
            "absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-all duration-500 font-medium",
            isRtl ? "right-3" : "left-3",
            (isFocused || hasValue) ? [
              "top-3.5 text-[10px] font-bold text-primary uppercase tracking-[0.1em]",
              isRtl ? "right-3" : "left-3"
            ] : "text-sm"
          )}>
            {label}
          </label>
        </div>

        {showPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="pe-4 text-slate-400 hover:text-muted-foreground transition-colors"
          >
            {isPasswordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Error Message with AnimatePresence */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className={cn(
              "text-[10px] text-destructive font-bold uppercase tracking-wider ps-4",
              isRtl ? "text-right pe-4" : "text-left"
            )}
          >
            {error.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function LoginPage() {
  const router = useRouter();
  const { t, isRtl } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  // Redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        router.replace('/dashboard');
      }
    };
    checkSession();
  }, [router]);

  const onLogin = async (data: LoginFormValues) => {
    setIsLoggingIn(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      if (authError) {
        setError(authError.message);
        setIsLoggingIn(false);
        return;
      }

      if (authData.session) {
        // Force a small delay to ensure session is persisted
        await new Promise(resolve => setTimeout(resolve, 500));
        router.refresh(); // Sync server state
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className={cn(
      "min-h-screen w-full flex items-center justify-center bg-card p-6 lg:p-12 selection:bg-blue-100",
      isRtl ? "font-arabic" : "font-sans"
    )}>
      {/* Import Premium Font */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        .font-premium { font-family: 'Outfit', sans-serif; }
      `}</style>

      <div className={cn(
        "w-full max-w-6xl flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-24 relative z-10",
        isRtl ? "lg:flex-row-reverse" : "lg:flex-row"
      )}>

        {/* 1. Login Section - Compact & Minimal */}
        <div className="w-full lg:w-[420px] space-y-10">
          {/* Header removed as requested */}

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "flex items-center gap-3 p-4 bg-destructive/10/50 border border-red-100 rounded-[14px] text-xs text-destructive font-bold shadow-sm",
                isRtl ? "flex-row-reverse text-right" : "flex-row text-left"
              )}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onLogin)} className="space-y-6">
            <div className="space-y-4">
              <ModernInput
                label={t('email') || "Email Address"}
                type="email"
                name="email"
                icon={Mail}
                register={register}
                error={errors.email}
                isRtl={isRtl}
              />

              <div className="space-y-4">
                <ModernInput
                  label={t('password') || "Password"}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  icon={Lock}
                  register={register}
                  error={errors.password}
                  showPasswordToggle
                  onTogglePassword={() => setShowPassword(!showPassword)}
                  isPasswordVisible={showPassword}
                  isRtl={isRtl}
                />

                <div className={cn("flex px-1", isRtl ? "justify-start" : "justify-end")}>
                  <Link
                    href="#"
                    className="text-[13px] font-bold text-slate-400 hover:text-primary transition-all duration-300 hover:translate-y-[-1px]"
                  >
                    {t('forgotPassword') || "Forgot your password?"}
                  </Link>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoggingIn}
              className="w-full h-[64px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-[14px] text-lg font-bold shadow-lg shadow-blue-500/20 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-3 group"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-premium uppercase tracking-widest text-xs">
                    {t('loggingIn') || "Authenticating..."}
                  </span>
                </>
              ) : (
                <div className={cn("flex items-center gap-2", isRtl ? "flex-row-reverse" : "flex-row")}>
                  <span className="font-premium tracking-tight">{t('login') || "Enter Dashboard"}</span>
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 transition-transform duration-300",
                      isRtl ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"
                    )}
                    strokeWidth={3}
                  />
                </div>
              )}
            </Button>
          </form>

          <div className={cn(
            "pt-10 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-6",
            isRtl ? "sm:flex-row-reverse" : "sm:flex-row"
          )}>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] font-premium">
              © {new Date().getFullYear()} IWIB Enterprise
            </p>
            <div className={cn("flex gap-6", isRtl ? "flex-row-reverse" : "flex-row")}>
              <Link href="#" className="text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-foreground transition-colors">Privacy</Link>
              <Link href="#" className="text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-foreground transition-colors">Compliance</Link>
            </div>
          </div>
        </div>

        {/* 2. Brand Section - Symmetric Balance */}
        <div className="w-full lg:w-1/2 flex items-center justify-center lg:justify-end">
          <motion.div
            animate={{
              scale: [1, 1.02, 1],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative flex justify-center items-center p-8 lg:p-0"
          >
            <Logo className="w-full max-w-[440px] lg:max-w-[540px] h-auto" />
          </motion.div>
        </div>

      </div>
    </div>
  );
}