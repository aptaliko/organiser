import { redirect } from 'next/navigation';
import { BottomNav } from '@/components/BottomNav';
import { ToastProvider } from '@/components/Toast';
import { getHousehold } from '@/db/queries/households';
import { currentHousehold } from '@/lib/household';
import { HttpError } from '@/lib/http';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  let householdName: string;
  try {
    const { householdId } = await currentHousehold();
    householdName = (await getHousehold(householdId))?.name ?? '';
  } catch (err) {
    // Valid cookie for a user that no longer exists.
    if (err instanceof HttpError && err.status === 401) redirect('/login');
    throw err;
  }

  return (
    <ToastProvider>
      <header className="sticky top-0 z-10 border-b border-border bg-bg/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-12 max-w-2xl items-center px-4">
          <span className="truncate text-sm font-semibold text-muted">{householdName}</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4">
        {children}
      </main>
      <BottomNav />
    </ToastProvider>
  );
}
