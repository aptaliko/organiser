'use client';

import { useEffect, useRef } from 'react';
import { XIcon } from './icons';

/**
 * Bottom sheet on phones, centred dialog on wider screens. Built on <dialog> for focus
 * trapping, Esc-to-close and the top layer (sits above the bottom nav).
 */
export function Sheet({
  open,
  onClose,
  title,
  closeLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // backdrop tap
      }}
      className="m-0 mt-auto max-h-[88dvh] w-full max-w-none rounded-t-3xl bg-surface p-0 text-text backdrop:bg-black/40 sm:m-auto sm:max-w-lg sm:rounded-3xl"
    >
      {open && (
        <div className="flex max-h-[88dvh] flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} aria-label={closeLabel} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-2">
              <XIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">{children}</div>
        </div>
      )}
    </dialog>
  );
}
