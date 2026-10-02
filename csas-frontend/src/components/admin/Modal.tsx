import { type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-surface p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-500 hover:bg-ink-100">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const adminField =
  "w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition-colors focus:border-brand-500 disabled:opacity-60";
export const adminLabel = "block text-xs font-medium text-ink-600 mb-1";
