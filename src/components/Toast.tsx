'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';

interface ToastMessage {
  id: number;
  text: string;
  action?: { label: string; onClick: () => void };
}

type Show = (text: string, action?: ToastMessage['action']) => void;
const ToastContext = createContext<Show | null>(null);

/**
 * Mounted in the (app) layout, which persists across client-side navigations — so a toast
 * shown right before router.push() stays visible on the next page.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback<Show>((text, action) => {
    clearTimeout(timer.current);
    setToast({ id: Date.now(), text, action });
    timer.current = setTimeout(() => setToast(null), action ? 6000 : 3000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4"
      >
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto flex max-w-md items-center gap-4 rounded-2xl bg-text px-4 py-3 text-sm text-bg shadow-lg"
          >
            <span>{toast.text}</span>
            {toast.action && (
              <button
                className="min-h-10 font-semibold text-accent-soft underline-offset-2 hover:underline"
                onClick={() => {
                  toast.action!.onClick();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Show {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast() must be used inside <ToastProvider>');
  return ctx;
}
