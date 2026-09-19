
import type { Metadata } from 'next';
import { Cairo, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster as SonnerToaster } from 'sonner';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/lib/auth-provider';
import { I18nProvider } from '@/components/i18n-context';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

const cairo = Cairo({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-cairo',
});

export const metadata: Metadata = {
  title: 'IWIB Hub',
  description: 'Comprehensive Insurance Brokerage Management System',
  icons: {
    icon: 'https://i.ibb.co/gM38Ny0z/IWib-logo-V03.png',
    shortcut: 'https://i.ibb.co/gM38Ny0z/IWib-logo-V03.png',
    apple: 'https://i.ibb.co/gM38Ny0z/IWib-logo-V03.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${cairo.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="font-body antialiased" suppressHydrationWarning>
        <Providers>
          <AuthProvider>
            <I18nProvider>
              {children}
            </I18nProvider>
          </AuthProvider>
          <Toaster />
          <SonnerToaster richColors closeButton position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
