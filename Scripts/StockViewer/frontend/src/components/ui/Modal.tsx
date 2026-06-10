import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={onClose}
    >
      <div
        className="w-[360px] bg-[#141414] border border-[#1e1e1e] rounded shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e1e1e]">
          <span className="text-[#f59e0b] text-xs font-semibold uppercase tracking-wider">{title}</span>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-[#e2e8f0] text-sm leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
