import type { Metadata, Viewport } from 'next';
import { getLocale } from '@/i18n/server';
import { I18nProvider } from '@/i18n/I18nProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Organiser',
  description: 'Know where your stuff is — at home, in storage, in the warehouse.',
  appleWebApp: { capable: true, title: 'Organiser', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1418' },
  ],
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
