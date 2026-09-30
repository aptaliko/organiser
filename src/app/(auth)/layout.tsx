import { Logo } from '@/components/Logo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { getT } from '@/i18n/server';

export default async function AuthLayout({ children }: LayoutProps<'/'>) {
  const { t } = await getT();
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex justify-end">
        <LanguageToggle />
      </div>
      <div className="mb-8 mt-6 flex flex-col items-center gap-3 text-center">
        <Logo size={56} />
        <h1 className="text-2xl font-bold">{t('app.name')}</h1>
        <p className="text-muted">{t('app.tagline')}</p>
      </div>
      {children}
    </main>
  );
}
