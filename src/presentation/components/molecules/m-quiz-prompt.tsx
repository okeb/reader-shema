'use client';

import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import type { Quiz } from '@/src/shared/constants/quiz';

interface QuizPromptProps {
  quiz: Quiz;
  /** Vrai si la carte est dépliée (mode question). */
  expanded: boolean;
  /** Vrai si la réponse a été validée (mode résultat). */
  answered: boolean;
  onExpand: () => void;
  onAbandon: () => void;
  onClose: () => void;
}

/**
 * En-tête de la carte quiz : libellé + question + icône. Se morphe entre l'état replié
 * (« À ton avis… », grosse icône, cliquable) et l'état déplié/répondu (libellé qualifiant le type
 * de question, icône réduite). Le bouton Fermer (replié) / Retour (déplié) / Fermer (répondu)
 * se place en haut à droite. Extrait de l'ancien `m-quiz-card` (Phase 6, scission).
 */
export function QuizPrompt({ quiz, expanded, answered, onExpand, onAbandon, onClose }: QuizPromptProps) {
  const collapsed = !expanded && !answered;
  const isOrder = quiz.type === 'order';
  const isMultiple = quiz.type === 'multiple';

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'transition-all duration-500 ease-in-out leading-snug text-foreground mb-2',
            collapsed
              ? 'text-[14px] font-light'
              : 'text-[15px] font-semibold uppercase tracking-widest',
          )}
        >
          {collapsed
            ? 'À ton avis…'
            : isOrder
              ? "Remettez dans l'ordre"
              : isMultiple
                ? 'Plusieurs réponses possibles'
                : 'Question'}
        </p>
        <p
          className={cn(
            'transition-all duration-500 ease-in-out leading-snug tracking-tight text-foreground/90',
            collapsed ? 'text-lg font-semibold md:text-2xl' : 'text-[20px] font-semibold',
          )}
        >
          {quiz.prompt}
        </p>
        <p
          className={cn(
            'mt-3 text-[13px] font-bold text-primary transition-all duration-400',
            collapsed ? 'opacity-40 group-hover:opacity-100' : 'h-0 mt-0 overflow-hidden opacity-0',
          )}
        >
          {/*Répondre à la question*/}
        </p>
      </div>

      <Icon
        icon={quiz.icon ?? 'hugeicons:help-circle'}
        className={cn(
          'shrink-0 text-primary/50 transition-all duration-500 ease-in-out md:-translate-x-7 -translate-x-4',
          expanded && !answered ? 'h-10 w-10' : 'md:h-24 md:w-24 h-20 w-20 group-hover:scale-110',
        )}
      />

      {/* Bouton Fermer (replié) — en haut à droite, n'ouvre pas la question. */}
      {collapsed && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          title="Fermer"
          aria-label="Fermer la question"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/40 transition-colors hover:bg-foreground/10 hover:text-foreground"
        >
          <Icon icon="ph:x" className="h-4 w-4" />
        </button>
      )}

      {/* Bouton Retour (déplié) / Fermer (répondu) — en haut à droite. */}
      {(expanded || answered) && (
        <button
          type="button"
          onClick={expanded ? onAbandon : onClose}
          title={expanded ? 'Retour' : 'Fermer'}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/40 transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <Icon icon={expanded ? 'hugeicons:arrow-turn-backward' : 'ph:x'} className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default QuizPrompt;