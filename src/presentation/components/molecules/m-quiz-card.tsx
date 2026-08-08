'use client';

import { cn } from '@/lib/utils';
import type { Quiz } from '@/src/shared/constants/quiz';
import { useQuizState } from '@/src/presentation/hooks/use-quiz-state';
import { QuizPrompt } from './m-quiz-prompt';
import { QuizChoices } from './m-quiz-choices';
import { QuizExplanation } from './m-quiz-explanation';

export interface QuizCardProps {
  quizzes: Quiz[];
  onNavigate: (bookId: string, chapter: number, verse: string) => void;
  onSeen: (quizId: string) => void;
}

/**
 * Carte quiz du chapitre : invite à répondre, puis choix de réponse, puis résultat explicatif.
 * Compose `QuizPrompt` / `QuizChoices` / `QuizExplanation` (scission Phase 6) ; l'état local est
 * porté par `useQuizState`. Les cartes empilées derrière signalent d'autres questions
 * (décoratif — `activeIndex` reste à 0).
 *
 * Porté de l'ancien `components/molecules/m-quiz-card.tsx`.
 */
export function QuizCard({ quizzes, onNavigate, onSeen }: QuizCardProps) {
  const s = useQuizState({ quizzes, onSeen });
  const { quiz, expanded, answered } = s;

  if (s.dismissed || !quiz) return null;
  const collapsed = !expanded && !answered;

  return (
    <div className={cn('relative mt-12 mb-4 md:mb-6')}>
      {/* Cartes empilées derrière (décoratif) — replié uniquement. */}
      {!expanded && !answered && quizzes.length > 1 && (
        <>
          {quizzes.slice(1).map((_, i) => (
            <div
              key={i}
              className="absolute inset-x-0 top-0 rounded-3xl bg-foreground/[2%] border border-border/30"
              style={{
                transform: `translateY(${(i + 1) * 4}px) scale(${1 - (i + 1) * 0.02})`,
                zIndex: -(i + 1),
              }}
              aria-hidden="true"
            />
          ))}
        </>
      )}

      <div
        className={cn(
          'group rounded-3xl bg-foreground/[7%] hover:bg-primary/[5%] transition-all duration-500 ease-in-out relative mb-20',
          collapsed ? 'px-8 py-4 cursor-pointer hover:bg-foreground/[5%]' : 'px-6 py-5',
        )}
        onClick={collapsed ? s.handleExpand : undefined}
      >
        <QuizPrompt
          quiz={quiz}
          expanded={expanded}
          answered={answered}
          onExpand={s.handleExpand}
          onAbandon={s.handleAbandon}
          onClose={s.handleClose}
        />

        {expanded && !answered && (
          <QuizChoices
            quiz={quiz}
            isMultiple={s.isMultiple}
            isOrder={s.isOrder}
            selected={s.selected}
            orderedChoices={s.orderedChoices}
            dragOverIdx={s.dragOverIdx}
            canSubmit={s.canSubmit}
            onToggleChoice={s.toggleChoice}
            onAddOrderChoice={s.addOrderChoice}
            onSubmit={s.handleSubmit}
            onOrderDragStart={s.handleOrderDragStart}
            onOrderDragOver={s.handleOrderDragOver}
            onOrderDrop={s.handleOrderDrop}
            onOrderDragEnd={s.handleOrderDragEnd}
          />
        )}

        {answered && s.showResult && (
          <QuizExplanation
            quiz={quiz}
            isCorrect={s.isCorrect}
            isOrder={s.isOrder}
            isMultiple={s.isMultiple}
            correctAnswer={s.correctAnswer}
            onNavigate={onNavigate}
            onReset={s.handleReset}
          />
        )}
      </div>
    </div>
  );
}

export default QuizCard;