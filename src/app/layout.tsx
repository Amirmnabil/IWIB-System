
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { I18nProvider } from '@/components/i18n-context';

export const metadata: Metadata = {
  title: 'IWIB Hub',
  description: 'Comprehensive Insurance Brokerage Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Tajawal:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        <Providers>
          <FirebaseClientProvider>
            <I18nProvider>
              {children}
            </I18nProvider>
          </FirebaseClientProvider>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
