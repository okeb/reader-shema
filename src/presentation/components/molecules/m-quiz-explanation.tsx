'use client';

import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import type { Quiz } from '@/src/shared/constants/quiz';

interface QuizExplanationProps {
  quiz: Quiz;
  isCorrect: boolean;
  isOrder: boolean;
  isMultiple: boolean;
  /** Réponse correcte (id ou tableau d'ids selon le type). */
  correctAnswer: string | string[];
  /** Navigue vers le verset de la question. */
  onNavigate: (bookId: string, chapter: number, verse: string) => void;
  onReset: () => void;
}

/**
 * Résultat de la carte quiz : bandeau vert/rouge (bonne réponse rappelée si raté) + explication.
 * « Voir le verset » navigue vers la référence de la question ; « Refaire » réinitialise.
 * Extrait de l'ancien `m-quiz-card` (Phase 6, scission).
 */
export function QuizExplanation({
  quiz,
  isCorrect,
  isOrder,
  isMultiple,
  correctAnswer,
  onNavigate,
  onReset,
}: QuizExplanationProps) {
  const correctText = quiz.choices.find((c) => c.id === correctAnswer)?.text;

  // Le détail choix par choix est affiché par `QuizReview` ; ici, un bandeau sans ambiguïté
  // (couleur et icône fixes, indépendantes de la couleur d'accent).
  const headline = isCorrect
    ? 'Bonne réponse !'
    : isOrder
      ? "Raté : l'ordre n'est pas le bon"
      : isMultiple
        ? 'Pas tout à fait : voir la correction ci-dessus'
        : 'Raté';

  return (
    <div className="animate-in fade-in duration-300">
      <div
        role="status"
        className={cn(
          'mb-3 flex items-start gap-2.5 rounded-xl px-4 py-3',
          isCorrect
            ? 'bg-green-600/15 text-green-800 dark:bg-green-400/15 dark:text-green-300'
            : 'bg-destructive/15 text-destructive',
        )}
      >
        <Icon
          icon={isCorrect ? 'ph:check-circle-fill' : 'ph:x-circle-fill'}
          className="mt-0.5 h-5 w-5 shrink-0"
          aria-hidden="true"
        />
        <div>
          <p className="text-[15px] font-semibold">{headline}</p>
          {/* Choix unique : rappel de la bonne réponse. Multiple / ordre : la liste suffit. */}
          {!isCorrect && !isOrder && !isMultiple && (
            <p className="mt-0.5 text-[13px] text-foreground">
              La bonne réponse : <span className="font-semibold">{correctText}</span>
            </p>
          )}
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-foreground/80">{quiz.explanation}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onNavigate(quiz.verseRef.bookId, quiz.verseRef.chapter, quiz.verseRef.verse)}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-primary transition-colors hover:opacity-80"
        >
          Voir le verset
        </button>
        <button
          type="button"
          onClick={onReset}
          className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Refaire
        </button>
      </div>
    </div>
  );
}

export default QuizExplanation;