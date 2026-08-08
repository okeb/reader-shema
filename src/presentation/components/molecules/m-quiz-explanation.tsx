'use client';

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
 * Résultat de la carte quiz : correct / pas tout à fait + bonne réponse + explication.
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
  const correctText = isOrder || isMultiple
    ? (Array.isArray(correctAnswer) ? correctAnswer : [])
        .map((id) => quiz.choices.find((c) => c.id === id)?.text)
        .join(' → ')
    : quiz.choices.find((c) => c.id === correctAnswer)?.text;

  return (
    <div>
      <p
        className={cn(
          'mb-2 text-[14px] font-semibold',
          isCorrect ? 'text-primary' : 'text-foreground',
        )}
      >
        {isCorrect ? 'Correct' : 'Pas tout à fait — la bonne réponse :'}
      </p>
      {!isCorrect && (
        <p className="mb-1 text-[13px] font-medium text-foreground">{correctText}</p>
      )}
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