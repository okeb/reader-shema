'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Quiz } from '@/src/shared/constants/quiz';

export interface UseQuizStateArgs {
  quizzes: Quiz[];
  /** Notifie qu'une question a été répondue (persistance `quiz-seen.store`). */
  onSeen: (quizId: string) => void;
}

/**
 * État local d'une carte quiz : index actif, repli/déploiement, sélection, réponse, ordre
 * mélangé (mode « order ») et glisser-déposer. Extrait de l'ancien `m-quiz-card` pour séparer
 * la logique du rendu (Phase 6 : `QuizPrompt` / `QuizChoices` / `QuizExplanation`).
 *
 * `activeIndex` reste à 0 — la carte n'avance pas automatiquement ; les cartes empilées derrière
 * ne sont que décoratives. « Refaire » réinitialise la même question.
 */
export function useQuizState({ quizzes, onSeen }: UseQuizStateArgs) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [shuffledOrder, setShuffledOrder] = useState<string[]>([]);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const quiz = quizzes[activeIndex];
  const isSingle = quiz?.type === 'single';
  const isMultiple = quiz?.type === 'multiple';
  const isOrder = quiz?.type === 'order';
  const correctAnswer = quiz?.answer;

  const isCorrect = isSingle
    ? selected[0] === correctAnswer
    : isMultiple
      ? Array.isArray(correctAnswer) &&
        selected.length === correctAnswer.length &&
        correctAnswer.every((a) => selected.includes(a)) &&
        selected.every((s) => correctAnswer.includes(s))
      : isOrder
        ? Array.isArray(correctAnswer) &&
          selected.length === correctAnswer.length &&
          selected.every((s, i) => s === correctAnswer[i])
        : false;

  // Réinitialise l'état + mélange l'ordre des choix (mode « order ») quand le jeu de questions
  // change. On s'assure de ne pas retomber sur l'ordre correct.
  useEffect(() => {
    setActiveIndex(0);
    setExpanded(false);
    setAnswered(false);
    setSelected([]);
    setDismissed(false);
    setShowResult(false);
    if (quiz && quiz.type === 'order') {
      const ids = quiz.choices.map((c) => c.id);
      const shuffled = [...ids];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const isSameOrder =
        Array.isArray(quiz.answer) && shuffled.every((id, i) => id === quiz.answer[i]);
      if (isSameOrder && shuffled.length > 1) {
        [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
      }
      setShuffledOrder(shuffled);
    } else {
      setShuffledOrder([]);
    }
    // Dépend du jeu de questions (ids joints) — pas des objets eux-mêmes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizzes.map((q) => q.id).join(',')]);

  const handleExpand = useCallback(() => {
    setExpanded(true);
    setSelected([]);
  }, []);

  const handleAbandon = useCallback(() => {
    setExpanded(false);
    setSelected([]);
  }, []);

  const handleClose = useCallback(() => {
    setDismissed(true);
  }, []);

  const handleSubmit = useCallback(() => {
    if (selected.length === 0 || !quiz) return;
    setAnswered(true);
    onSeen(quiz.id);
    setTimeout(() => setShowResult(true), 600);
  }, [selected, quiz?.id, onSeen, quiz]);

  const handleReset = useCallback(() => {
    setSelected([]);
    setAnswered(false);
    setShowResult(false);
  }, []);

  const handleOrderDragStart = useCallback(
    (idx: number) => (e: React.DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData('text/plain', String(idx));
      e.dataTransfer.effectAllowed = 'move';
    },
    [],
  );

  const handleOrderDragOver = useCallback(
    (idx: number) => (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverIdx(idx);
    },
    [],
  );

  const handleOrderDrop = useCallback(
    (dropIdx: number) => (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const fromIdx = Number(e.dataTransfer.getData('text/plain'));
      setDragOverIdx(null);
      if (Number.isNaN(fromIdx) || fromIdx === dropIdx) return;
      setSelected((prev) => {
        const arr = [...prev];
        const [moved] = arr.splice(fromIdx, 1);
        arr.splice(dropIdx, 0, moved);
        return arr;
      });
    },
    [],
  );

  const handleOrderDragEnd = useCallback(() => {
    setDragOverIdx(null);
  }, []);

  const addOrderChoice = useCallback((choiceId: string) => {
    setSelected((prev) => [...prev, choiceId]);
  }, []);

  const toggleChoice = useCallback(
    (choiceId: string) => {
      if (isSingle) {
        setSelected([choiceId]);
        return;
      }
      if (isMultiple) {
        setSelected((prev) =>
          prev.includes(choiceId) ? prev.filter((id) => id !== choiceId) : [...prev, choiceId],
        );
      }
    },
    [isSingle, isMultiple],
  );

  const canSubmit =
    selected.length > 0 && (isOrder ? selected.length === (quiz?.choices.length ?? 0) : true);

  const orderedChoices = useMemo(() => {
    if (!quiz) return [];
    if (isOrder && expanded && !answered) {
      return shuffledOrder
        .map((id) => quiz.choices.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c));
    }
    return quiz.choices;
  }, [quiz, isOrder, expanded, answered, shuffledOrder]);

  return {
    quiz,
    isSingle,
    isMultiple,
    isOrder,
    isCorrect,
    correctAnswer,
    expanded,
    answered,
    dismissed,
    showResult,
    selected,
    shuffledOrder,
    dragOverIdx,
    orderedChoices,
    canSubmit,
    handleExpand,
    handleAbandon,
    handleClose,
    handleSubmit,
    handleReset,
    handleOrderDragStart,
    handleOrderDragOver,
    handleOrderDrop,
    handleOrderDragEnd,
    addOrderChoice,
    toggleChoice,
    setSelected,
  };
}

export type QuizState = ReturnType<typeof useQuizState>;