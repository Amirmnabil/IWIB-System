'use client';
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { translations, Language } from '@/lib/translations';

type I18nContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof typeof translations['en']) => string;
  isRtl: boolean;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as Language;
    if (savedLang) setLang(savedLang);
    setMounted(true);
  }, []);

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  const t = (key: keyof typeof translations['en']) => {
    return translations[lang][key] || key;
  };

  const isRtl = lang === 'ar';

  // Memoize value to prevent global re-renders
  const contextValue = useMemo(() => ({ 
    lang, 
    setLang: handleSetLang, 
    t, 
    isRtl 
  }), [lang, isRtl]);

  if (!mounted) {
    // Return a minimal version or the children with standard 'en' lang to match server
    return (
      <I18nContext.Provider value={contextValue}>
        <div dir="ltr">
          {children}
        </div>
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={contextValue}>
      <div dir={isRtl ? 'rtl' : 'ltr'} className={isRtl ? 'font-arabic' : ''}>
        {children}
      </div>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
