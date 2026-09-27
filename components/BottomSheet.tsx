'use client';

/** Generic bottom-sheet modal — used for ShareCard and ToolsModal so neither needs a full page navigation. */
export default function BottomSheet({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className="max-h-[90vh] overflow-y-auto rounded-t-card bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
