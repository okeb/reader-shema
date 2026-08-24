'use client';

import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/src/presentation/components/atoms/a-skeleton';
import { QuizCard } from '@/src/presentation/components/molecules/m-quiz-card';
import type { BookInfo } from '@/src/domain/entities';
import type { Quiz } from '@/src/shared/constants/quiz';

interface BookInfoPanelProps {
  /** Nom court du livre (fallback du titre). */
  bookName?: string;
  /** Infos détaillées du livre (peut être null pendant le chargement). */
  bookInfo: BookInfo | null;
  chapter: number;
  /** Panneau d'infos déplié. */
  open: boolean;
  onToggle: () => void;
  /** Quiz disponibles pour ce chapitre (affichés au-dessus du titre). */
  quizzes?: Quiz[];
  /** Navigue vers le verset d'une question (« Voir le verset »). */
  onNavigateQuiz?: (bookId: string, chapter: number, verse: string) => void;
  /** Marque une question comme répondue (persistance `quiz-seen.store`). */
  onQuizSeen?: (quizId: string) => void;
  /** Vrai si au moins un verset du chapitre a de l'audio (spec 37). */
  hasAudio?: boolean;
  /** Vrai si la lecture audio du chapitre est en cours. */
  isAudioPlaying?: boolean;
  /** Bascule la lecture audio du chapitre (playChapter / toggle). */
  onToggleListen?: () => void;
}

/**
 * En-tête du chapitre en lecture continue : titre du livre + bouton info déployant, et panneau
 * d'informations repliable (signification, auteur, thème, introduction…). La carte quiz du
 * chapitre (si active) s'affiche au-dessus du titre (Phase 6).
 *
 * Porté de l'ancien `components/molecules/m-book-info-panel.tsx`.
 */
export function BookInfoPanel({
  bookName,
  bookInfo,
  chapter,
  open,
  onToggle,
  quizzes,
  onNavigateQuiz,
  onQuizSeen,
  hasAudio,
  isAudioPlaying,
  onToggleListen,
}: BookInfoPanelProps) {
  return (
    <header className="pb-16">
      {quizzes && quizzes.length > 0 && onNavigateQuiz && (
        <QuizCard quizzes={quizzes} onNavigate={onNavigateQuiz} onSeen={(id) => onQuizSeen?.(id)} />
      )}
      <div className="flex items-start justify-between gap-2">
        <h2 className="animate-fade-in-up font-book text-3xl font-bold tracking-tight text-bold dark:text-white">
          {bookInfo?.titre || bookName}
        </h2>
        <div className="mt-1.5 flex shrink-0 items-center gap-1.5">
          {/* Bouton « Écouter le chapitre » (spec 37) — masqué si le chapitre n'a pas d'audio.
              Même motif que le bouton info : icône seule au repos, libellé déployé au survol. */}
          {hasAudio && onToggleListen && (
            <button
              type="button"
              onClick={onToggleListen}
              aria-label={isAudioPlaying ? 'Mettre en pause le chapitre' : 'Écouter le chapitre'}
              title={isAudioPlaying ? 'Mettre en pause le chapitre' : 'Écouter le chapitre'}
              className={cn(
                'group flex h-8 shrink-0 items-center overflow-hidden rounded-full pl-2 pr-2 transition-all duration-300 group-hover:pr-3',
                isAudioPlaying
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground/40 hover:bg-primary/10 hover:text-primary',
              )}
            >
              <Icon
                icon={isAudioPlaying ? 'hugeicons:pause' : 'hugeicons:play'}
                className="h-4 w-4 shrink-0"
              />
              <span className="max-w-0 overflow-hidden whitespace-nowrap text-[11px] font-medium opacity-0 transition-all duration-300 group-hover:ml-1 group-hover:max-w-[72px] group-hover:opacity-100">
                {isAudioPlaying ? 'Pause' : 'Écouter'}
              </span>
            </button>
          )}
          {/* Bouton info — un libellé se déploie horizontalement au survol (cf. m-book-chapter-selector). */}
          <button
            type="button"
            onClick={onToggle}
            title={open ? 'Masquer les informations' : 'Informations du livre'}
            className={cn(
              'group flex h-8 shrink-0 items-center overflow-hidden rounded-full pl-2 pr-2 transition-all duration-300 group-hover:pr-3',
              open
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground/40 hover:bg-primary/10 hover:text-primary',
            )}
          >
            <Icon icon="hugeicons:information-circle" className="h-4 w-4 shrink-0" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-[11px] font-medium opacity-0 transition-all duration-300 group-hover:ml-1 group-hover:max-w-[64px] group-hover:opacity-100">
              {open ? 'Fermer' : 'Infos'}
            </span>
          </button>
        </div>
      </div>
      <p className="mt-0.5 text-lg text-muted-foreground">Chapitre {chapter}</p>

      {/* Panneau d'infos du livre — animé via grid-rows (0fr→1fr) : la hauteur s'adapte au contenu. */}
      <div
        className={cn(
          'grid transition-all duration-500 ease-in-out',
          open ? 'mt-5 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 rounded-[7px] bg-foreground/[2%] px-4 py-3 sm:px-7">
            {bookInfo?.titre && (
              <p className="font-serif text-base font-semibold text-foreground">
                {bookName}
                {bookInfo.abreviation && (
                  <span className="ml-2 text-[11px] font-normal tracking-wide text-muted-foreground/60">
                    {bookInfo.abreviation}
                  </span>
                )}
              </p>
            )}
            <div className="space-y-1.5">
              {bookInfo?.signification && (
                <p className="text-[11px] leading-snug text-muted-foreground">
                  <span className="font-medium text-foreground/80">Signification · </span>
                  {bookInfo.signification}
                </p>
              )}
              {bookInfo?.auteur && (
                <p className="text-[11px] leading-snug text-muted-foreground">
                  <span className="font-medium text-foreground/80">Auteur · </span>
                  {bookInfo.auteur}
                </p>
              )}
              {bookInfo?.theme && (
                <p className="text-[11px] leading-snug text-muted-foreground">
                  <span className="font-medium text-foreground/80">Thème · </span>
                  {bookInfo.theme}
                </p>
              )}
              {bookInfo?.date && <p className="text-[11px] leading-snug text-muted-foreground">{bookInfo.date}</p>}
            </div>
            {bookInfo?.introduction && (
              <p className="pt-3 text-[15px] font-medium leading-relaxed text-foreground/90">
                {bookInfo.introduction}
              </p>
            )}
            {!bookInfo && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
                <Skeleton className="h-3 w-40 rounded" />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default BookInfoPanel;