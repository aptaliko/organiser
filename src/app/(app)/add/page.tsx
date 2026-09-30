import { getT } from '@/i18n/server';

// Placeholder — built in milestone M2.
export default async function Page() {
  const { t } = await getT();
  return (
    <div>
      <h1 className="text-2xl font-bold">{t('nav.add')}</h1>
      <p className="mt-2 text-muted">{t('common.comingSoon')}</p>
    </div>
  );
}
