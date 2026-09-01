"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useScrollLock } from "@/src/presentation/hooks/use-scroll-lock";
import { useFocusTrap } from "@/src/presentation/hooks/use-focus-trap";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Titre court de l'action, ex. « Effacer l'historique ». */
  title: string;
  /** Explication des conséquences (pourquoi on demande confirmation). */
  description: string;
  /** Libellé du bouton de confirmation, ex. « Effacer ». */
  confirmLabel: string;
  /** Libellé du bouton d'annulation. */
  cancelLabel?: string;
  /** `destructive` (défaut) : rouge ; `default` : primaire. */
  variant?: "destructive" | "default";
  onConfirm: () => void;
}

/**
 * Modale de confirmation générique pour les actions irréversibles. Même coque que la modale de
 * compte : `createPortal`, `useScrollLock`, piège à focus (`use-focus-trap`), `role="dialog"`,
 * Échap pour fermer, bottom-sheet mobile / centrée desktop.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Annuler",
  variant = "destructive",
  onConfirm,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollLock(open);
  useFocusTrap(open, ref);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm overflow-hidden rounded-t-2xl border border-border bg-popover shadow-2xl animate-fade-in-up sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4">
          <div className="mb-2 flex items-center gap-2">
            {variant === "destructive" && (
              <Icon
                icon="hugeicons:alert-diamond"
                className="h-4.5 w-4.5 shrink-0 text-destructive"
              />
            )}
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          </div>
          <p className="mb-4 text-[13px] leading-snug text-muted-foreground">
            {description}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-lg border border-input px-3 py-2 text-sm text-foreground transition-colors hover:bg-foreground/5"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              className={
                variant === "destructive"
                  ? "flex-1 rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90"
                  : "flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              }
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default ConfirmDialog;
