
import type { Metadata } from 'next';
import { Inter, Tajawal } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster as SonnerToaster } from 'sonner';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { I18nProvider } from '@/components/i18n-context';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-tajawal',
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
    <html lang="en" className={`${inter.variable} ${tajawal.variable}`} suppressHydrationWarning>
      <body className="font-body antialiased" suppressHydrationWarning>
        <Providers>
          <FirebaseClientProvider>
            <I18nProvider>
              {children}
            </I18nProvider>
          </FirebaseClientProvider>
          <Toaster />
          <SonnerToaster richColors closeButton position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
