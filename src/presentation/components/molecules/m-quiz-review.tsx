'use client';

import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import type { Quiz } from '@/src/shared/constants/quiz';

interface QuizReviewProps {
  quiz: Quiz;
  isMultiple: boolean;
  isOrder: boolean;
  /** Ids choisis par l'utilisateur (pour « order », l'ordre proposé). */
  selected: string[];
  /** Réponse correcte (id ou tableau d'ids selon le type). */
  correctAnswer: string | string[];
}

type Status = 'correct' | 'wrong' | 'missed' | 'neutral';

const ROW = 'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm';

const ROW_STATUS: Record<Status, string> = {
  correct: 'border-green-600/40 bg-green-600/10 dark:border-green-400/40 dark:bg-green-400/10',
  wrong: 'border-destructive/40 bg-destructive/10',
  missed: 'border-dashed border-green-600/50 dark:border-green-400/50',
  neutral: 'border-transparent opacity-50',
};

const ICON_STATUS: Record<Status, { icon: string; cls: string }> = {
  correct: { icon: 'ph:check-circle-fill', cls: 'text-green-600 dark:text-green-400' },
  wrong: { icon: 'ph:x-circle-fill', cls: 'text-destructive' },
  missed: { icon: 'ph:check-circle', cls: 'text-green-600 dark:text-green-400' },
  neutral: { icon: 'ph:circle', cls: 'text-muted-foreground/40' },
};

function Tag({ status, children }: { status: Status; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'ml-auto shrink-0 text-[11px] font-semibold uppercase tracking-wide',
        status === 'wrong' ? 'text-destructive' : 'text-green-700 dark:text-green-400',
      )}
    >
      {children}
    </span>
  );
}

function Row({
  status,
  lead,
  text,
  tag,
}: {
  status: Status;
  lead?: React.ReactNode;
  text?: string;
  tag?: React.ReactNode;
}) {
  const { icon, cls } = ICON_STATUS[status];
  return (
    <li className={cn(ROW, ROW_STATUS[status])}>
      <Icon icon={icon} className={cn('h-5 w-5 shrink-0', cls)} aria-hidden="true" />
      {lead}
      <span className="text-base font-medium tracking-tight">{text}</span>
      {tag}
    </li>
  );
}

/**
 * Récapitulatif des choix après validation : la liste reste affichée, verrouillée, et chaque
 * ligne indique ce que l'utilisateur a choisi et si c'était juste.
 *  - « single » : bonne réponse ✓ verte, choix erroné ✗ rouge (« Ta réponse »), autres grisés.
 *  - « multiple » : bien coché ✓, coché à tort ✗, bonne réponse oubliée en pointillé (« Oubliée »).
 *  - « order » : l'ordre proposé, position par position, puis l'ordre correct si différent.
 */
export function QuizReview({ quiz, isMultiple, isOrder, selected, correctAnswer }: QuizReviewProps) {
  const correctIds = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
  const textOf = (id: string) => quiz.choices.find((c) => c.id === id)?.text;

  if (isOrder) {
    const allRight = selected.every((id, i) => id === correctIds[i]);
    return (
      <div className="mt-4 mb-4">
        <p className="mb-2 text-[12px] text-muted-foreground">Ton ordre :</p>
        <ol className="space-y-2" aria-label="Ton ordre">
          {selected.map((id, idx) => {
            const ok = id === correctIds[idx];
            return (
              <Row
                key={id}
                status={ok ? 'correct' : 'wrong'}
                lead={<span className="w-4 shrink-0 text-center text-[13px] font-bold">{idx + 1}</span>}
                text={textOf(id)}
                tag={!ok && <Tag status="wrong">Mal placé</Tag>}
              />
            );
          })}
        </ol>
        {!allRight && (
          <>
            <p className="mt-4 mb-2 text-[12px] text-muted-foreground">Ordre correct :</p>
            <ol className="space-y-2" aria-label="Ordre correct">
              {correctIds.map((id, idx) => (
                <Row
                  key={id}
                  status="correct"
                  lead={<span className="w-4 shrink-0 text-center text-[13px] font-bold">{idx + 1}</span>}
                  text={textOf(id)}
                />
              ))}
            </ol>
          </>
        )}
      </div>
    );
  }

  return (
    <ul className="mt-4 mb-4 space-y-2" aria-label="Correction">
      {quiz.choices.map((choice) => {
        const picked = selected.includes(choice.id);
        const right = correctIds.includes(choice.id);
        const status: Status = picked
          ? right
            ? 'correct'
            : 'wrong'
          : right
            ? isMultiple
              ? 'missed'
              : 'correct'
            : 'neutral';
        const tag = picked ? (
          <Tag status={status}>Ta réponse</Tag>
        ) : status === 'missed' ? (
          <Tag status="missed">Oubliée</Tag>
        ) : status === 'correct' ? (
          <Tag status="correct">Bonne réponse</Tag>
        ) : null;
        return <Row key={choice.id} status={status} text={choice.text} tag={tag} />;
      })}
    </ul>
  );
}

export default QuizReview;
