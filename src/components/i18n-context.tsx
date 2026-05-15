'use client';
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Language, TranslationSchema, t as coreT, translations } from '@/lib/i18n';

type I18nContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof TranslationSchema, placeholders?: Record<string, string | number>) => string;
  isRtl: boolean;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as Language;
    // Validate savedLang is a valid Language type
    if (savedLang === 'en' || savedLang === 'ar') {
      setLang(savedLang);
    }
    setMounted(true);
  }, []);

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
    // Explicitly update document attributes for immediate effect
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  // Bind the core translation function to the current language state
  const t = (key: keyof TranslationSchema, placeholders?: Record<string, string | number>) => {
    return coreT(key, lang, placeholders);
  };

  const isRtl = lang === 'ar';

  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = lang;
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
      
      // Update body class for specific RTL styling if needed
      if (isRtl) {
        document.body.classList.add('rtl');
        document.body.classList.remove('ltr');
      } else {
        document.body.classList.add('ltr');
        document.body.classList.remove('rtl');
      }
    }
  }, [lang, isRtl, mounted]);

  const contextValue = useMemo(() => ({ 
    lang, 
    setLang: handleSetLang, 
    t, 
    isRtl 
  }), [lang, isRtl]);

  return (
    <I18nContext.Provider value={contextValue}>
      <div 
        dir={isRtl ? 'rtl' : 'ltr'} 
        className={cn(
          "min-h-screen transition-all duration-300",
          isRtl ? "font-arabic" : "font-sans",
          !mounted && "opacity-0" // Use opacity-0 or similar to hide until hydration if needed
        )}
      >
        {children}
      </div>
    </I18nContext.Provider>
  );
}

// Utility to merge class names safely
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
