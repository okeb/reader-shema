'use client';

import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import type { Quiz } from '@/src/shared/constants/quiz';

interface QuizChoicesProps {
  quiz: Quiz;
  isMultiple: boolean;
  isOrder: boolean;
  /** Ids sélectionnés (pour « order », c'est l'ordre choisi). */
  selected: string[];
  /** Choix à afficher, éventuellement mélangés (mode « order »). */
  orderedChoices: Quiz['choices'];
  /** Index survolé pendant le glisser-déposer (mode « order »). */
  dragOverIdx: number | null;
  canSubmit: boolean;
  onToggleChoice: (choiceId: string) => void;
  onAddOrderChoice: (choiceId: string) => void;
  onSubmit: () => void;
  onOrderDragStart: (idx: number) => (e: React.DragEvent<HTMLDivElement>) => void;
  onOrderDragOver: (idx: number) => (e: React.DragEvent<HTMLDivElement>) => void;
  onOrderDrop: (idx: number) => (e: React.DragEvent<HTMLDivElement>) => void;
  onOrderDragEnd: () => void;
}

/**
 * Corps de la carte quiz : les choix de réponse selon le type.
 *  - « order » : tapez pour placer, puis glissez pour réordonner (poignée + numérotation).
 *  - « single » : boutons radio.
 *  - « multiple » : cases à cocher.
 * Suit le bouton « Valider ». Extrait de l'ancien `m-quiz-card` (Phase 6, scission).
 */
export function QuizChoices({
  quiz,
  isMultiple,
  isOrder,
  selected,
  orderedChoices,
  dragOverIdx,
  canSubmit,
  onToggleChoice,
  onAddOrderChoice,
  onSubmit,
  onOrderDragStart,
  onOrderDragOver,
  onOrderDrop,
  onOrderDragEnd,
}: QuizChoicesProps) {
  return (
    <fieldset className="mt-4 mb-4 space-y-2">
      <legend className="sr-only">Choix de réponse</legend>
      {isOrder ? (
        <>
          {selected.length > 0 && (
            <div className="space-y-2 mb-3">
              {selected.map((id, idx) => {
                const choice = quiz.choices.find((c) => c.id === id);
                return (
                  <div
                    key={id}
                    draggable
                    onDragStart={onOrderDragStart(idx)}
                    onDragOver={onOrderDragOver(idx)}
                    onDrop={onOrderDrop(idx)}
                    onDragEnd={onOrderDragEnd}
                    className={cn(
                      'flex items-center gap-3 rounded-lg bg-primary/15 px-3 py-2.5 text-sm font-medium text-foreground cursor-grab active:cursor-grabbing transition-all',
                      dragOverIdx === idx && 'ring-2 ring-primary',
                    )}
                  >
                    <Icon icon="ph:dots-six-vertical" className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary bg-primary text-[11px] font-bold text-primary-foreground">
                      {idx + 1}
                    </span>
                    <span className="text-base font-medium tracking-tight">{choice?.text}</span>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[12px] text-muted-foreground mb-2">Tapez pour replacer dans l&apos;ordre :</p>
          {orderedChoices
            .filter((c) => !selected.includes(c.id))
            .map((choice) => (
              <div
                key={choice.id}
                draggable={false}
                onClick={() => onAddOrderChoice(choice.id)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-400 cursor-pointer hover:bg-accent/40 hover:scale-[102%]"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors border-muted-foreground/30 text-muted-foreground">
                  {'+'}
                </span>
                <span className="text-base font-medium tracking-tight">{choice.text}</span>
              </div>
            ))}
        </>
      ) : (
        quiz.choices.map((choice) => {
          const isSelected = selected.includes(choice.id);
          return (
            <label
              key={choice.id}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-400 cursor-pointer hover:bg-accent/40 hover:scale-[102%]',
                isSelected && 'bg-primary/20 hover:bg-primary/40',
              )}
            >
              {isMultiple ? (
                <input
                  type="checkbox"
                  name={`quiz-${quiz.id}`}
                  value={choice.id}
                  checked={isSelected}
                  onChange={() => onToggleChoice(choice.id)}
                  className="shrink-0 accent-primary rounded"
                />
              ) : (
                <input
                  type="radio"
                  name={`quiz-${quiz.id}`}
                  value={choice.id}
                  checked={isSelected}
                  onChange={() => onToggleChoice(choice.id)}
                  className="shrink-0 accent-primary"
                />
              )}
              <span className="text-base font-medium tracking-tight">{choice.text}</span>
            </label>
          );
        })
      )}
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="w-full rounded-xl bg-primary py-3 text-base font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:dark:bg-gray-800 disabled:bg-gray-400"
      >
        Valider
      </button>
    </fieldset>
  );
}

export default QuizChoices;