'use client';

import { type CSSProperties, type RefObject, useMemo } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import type { ChapterVerse, BookInfo, BookmarkVerse } from '@/src/domain/entities';
import type { BibleVersion } from '@/src/shared/constants/bible-versions';
import type { ReadingLayout, CrossRefsMode } from '@/src/shared/constants/reader-preferences';
import type { VerseSelection } from '@/src/presentation/hooks/use-verse-selection';
import type { HoverCluster } from '@/src/presentation/hooks/use-hover-cluster';
import { VerseNumber } from '@/src/presentation/components/atoms/a-verse-number';
import { BookInfoPanel } from '@/src/presentation/components/molecules/m-book-info-panel';
import { VersionCredits } from '@/src/presentation/components/molecules/m-version-credits';
import { VerseActions, type VerseActionsBundle } from '@/src/presentation/components/molecules/m-verse-actions';
import { HoverCluster as HoverClusterView } from '@/src/presentation/components/molecules/m-hover-cluster';

/** Id stable d'un verset en lecture continue. */
export const verseId = (bookId: string, chapter: number, n: number) => `${bookId}:${chapter}:${n}`;

/** Bloc de rendu pour la lecture continue : titre de section ou paragraphe de versets. */
type ReadBlock =
  | { kind: 'title'; key: string; text: string }
  | { kind: 'paragraph'; key: string; verses: ChapterVerse[] };

function buildBlocks(verses: ChapterVerse[]): ReadBlock[] {
  const blocks: ReadBlock[] = [];
  let current: ChapterVerse[] = [];

  const flush = () => {
    if (current.length > 0) {
      blocks.push({ kind: 'paragraph', key: `p-${current[0].number}`, verses: current });
      current = [];
    }
  };

  for (const v of verses) {
    if (v.titre) {
      flush();
      blocks.push({ kind: 'title', key: `t-${v.number}`, text: v.titre });
    } else if (v.paragraphe === 'start') {
      flush();
    }
    current.push(v);
    if (v.paragraphe === 'end') flush();
  }
  flush();
  return blocks;
}

interface ReaderContentProps {
  verses: ChapterVerse[];
  layout: ReadingLayout;
  /** Classes de largeur max + wrap colonnes calculées par le parent. */
  maxWCls: string;
  wrapCls: string;
  /** Taille + interligne en style inline. */
  textSizeStyle: CSSProperties;
  bookId: string;
  chapter: number;
  /** En-tête (infos du livre). */
  bookName?: string;
  bookInfo: BookInfo | null;
  infoOpen: boolean;
  onToggleInfo: () => void;
  /** Quiz du chapitre (affichés dans l'en-tête, Phase 6). */
  quizzes?: import('@/src/shared/constants/quiz').Quiz[];
  /** Navigue vers le verset d'une question quiz. */
  onNavigateQuiz?: (bookId: string, chapter: number, verse: string) => void;
  /** Marque une question quiz comme répondue (persistance). */
  onQuizSeen?: (quizId: string) => void;
  /** Crédits de version (pied du chapitre). */
  primary: BibleVersion;
  /** Versets surlignés (depuis l'URL `?v=`) + cible de l'auto-scroll. */
  highlightSet: Set<number>;
  highlightFirst: number | null;
  highlightRef: RefObject<HTMLElement | null>;
  selection: VerseSelection;
  coarse: boolean;
  focusMode: boolean;
  focusActive: boolean;
  dimmed: (isSel: boolean, isHl: boolean) => boolean;
  handleVerseClick: (id: string) => void;
  /** Construit l'id stable d'un signet/annotation pour un verset du chapitre courant. */
  bmIdFor: (b: string, c: number, n: number) => string;
  /** Couleur d'un groupe de signets par id (soulignement ondulé). */
  groupColorById: Map<string, string>;
  /** Signet associé à un id stable, s'il existe. */
  bookmarkOf: (id: string) => BookmarkVerse | undefined;
  /** Couleur de feutre d'un verset (annotation), sinon undefined. */
  highlightOf: (id: string) => string | undefined;
  /** Vrai si le verset porte une note. */
  hasNote: (id: string) => boolean;
  /** Ouvre le lecteur de note du verset (numéro dans le chapitre courant). */
  onOpenNote: (verseNumber: number) => void;
  /** Nombre de renvois (cross-references) d'un verset (0 = pas d'indicateur). */
  refsCountFor: (verseNumber: number) => number;
  /** Quand afficher l'indicateur de renvois : toujours, sélection seule, ou jamais. */
  crossRefsMode: CrossRefsMode;
  /** Ouvre le pop des renvois du verset. */
  onOpenRefs: (verseNumber: number) => void;
  /** État du cluster d'actions au survol (vue paragraphe / desktop). */
  hover: HoverCluster;
  /** Faisceau de props du cluster d'actions (desktop hover + tactile dock). */
  verseActions: VerseActionsBundle;
}

/**
 * Rendu du chapitre en lecture continue : en-tête (infos du livre) puis le texte selon le layout
 * (paragraphe au fil, verset par verset, ou sans numéros). Gère la surbrillance `?v=`, la sélection,
 * le mode focus (atténuation des versets hors sélection), le soulignement des signets, le
 * surlignage, l'indicateur de note et le cluster d'actions au survol (desktop).
 *
 * Phase 5 : décorations signets/notes/surlignage + cluster d'actions (verset du milieu de la
 * sélection) branchées, sur les deux layouts.
 */
export function ReaderContent({
  verses,
  layout,
  maxWCls,
  wrapCls,
  textSizeStyle,
  bookId,
  chapter,
  bookName,
  bookInfo,
  infoOpen,
  onToggleInfo,
  quizzes,
  onNavigateQuiz,
  onQuizSeen,
  primary,
  highlightSet,
  highlightFirst,
  highlightRef,
  selection,
  coarse,
  focusMode,
  focusActive,
  dimmed,
  handleVerseClick,
  bmIdFor,
  groupColorById,
  bookmarkOf,
  highlightOf,
  hasNote,
  onOpenNote,
  refsCountFor,
  crossRefsMode,
  onOpenRefs,
  hover,
  verseActions,
}: ReaderContentProps) {
  const blocks = useMemo(() => buildBlocks(verses), [verses]);

  // Verset du milieu de la sélection (médiane spatiale par numéro de verset) : héberge le cluster
  // d'actions desktop, afin que la bulle s'affiche au milieu de la plage sélectionnée plutôt qu'à
  // une extrémité (ancre/survol). Le positionnement horizontal propre au verset hôte est conservé.
  const middleId = useMemo(() => {
    const sel = verses.filter((v) => selection.isSelected(verseId(bookId, chapter, v.number)));
    if (sel.length === 0) return null;
    const sorted = [...sel].sort((a, b) => a.number - b.number);
    const mid = sorted[Math.floor(sorted.length / 2)];
    return verseId(bookId, chapter, mid.number);
  }, [verses, bookId, chapter, selection.isSelected]);

  // Indicateur de renvois : « always » sur tous, « selection » seulement sur les versets
  // sélectionnés, « never » jamais.
  const showRefsIndicator = (isSel: boolean) =>
    crossRefsMode === 'always' || (crossRefsMode === 'selection' && isSel);

  return (
    <article className="mt-24 px-4 pb-28 pt-6">
      <div className={cn('mx-auto', maxWCls)}>
        <BookInfoPanel
          bookName={bookName}
          bookInfo={bookInfo}
          chapter={chapter}
          open={infoOpen}
          onToggle={onToggleInfo}
          quizzes={quizzes}
          onNavigateQuiz={onNavigateQuiz}
          onQuizSeen={onQuizSeen}
        />

        {/* Texte du chapitre */}
        <div className={cn('gap-10', wrapCls)}>
          {blocks.map((block, bi) =>
            block.kind === 'title' ? (
              <h3
                key={block.key}
                className={cn(
                  'animate-fade-in-up break-after-avoid text-[12px] font-semibold uppercase tracking-widest text-black/50 transition-opacity duration-300 dark:text-white/50',
                  bi === 0 ? 'mb-3 mt-0' : 'mb-3 mt-8',
                  focusActive && 'opacity-10',
                )}
              >
                {block.text}
              </h3>
            ) : layout === 'verses' ? (
              // Affichage verset par verset : numéro en colonne + texte.
              <div key={block.key} className="mb-3 break-inside-avoid">
                {block.verses.map((v) => {
                  const isHl = highlightSet.has(v.number);
                  const id = verseId(bookId, chapter, v.number);
                  const isSel = selection.isSelected(id);
                  const annId = bmIdFor(bookId, chapter, v.number);
                  const bm = bookmarkOf(annId);
                  const bmColor = bm ? groupColorById.get(bm.groupId) : undefined;
                  const hlColor = highlightOf(annId);
                  const noted = hasNote(annId);
                  const refsCount = refsCountFor(v.number);
                  // Le feutre s'efface visuellement quand le verset est sélectionné/surbrillance
                  // (fond primaire) pour éviter la superposition de deux fonds.
                  const showHl = hlColor && !((isSel || isHl) && !focusMode);
                  return (
                    <div
                      key={v.number}
                      ref={(el) => {
                        if (v.number === highlightFirst) highlightRef.current = el;
                      }}
                      onClick={() => handleVerseClick(id)}
                      className={cn(
                        'relative flex cursor-pointer scroll-mt-24 gap-3 rounded-r px-2 py-0.5 transition-[color,opacity] duration-300',
                        (isSel || isHl) && !focusMode && 'border-l-2 border-primary bg-primary/5',
                        dimmed(isSel, isHl) && 'opacity-10',
                      )}
                    >
                      {/* Cluster d'actions horizontal, flottant au-dessus du verset du milieu de
                          la sélection. Tactile : remplacé par un cluster fixe global (cf. dock).
                          En focus, le cluster se retire — la pilule Strong flottante prend le
                          relais (spec 17). */}
                      {id === middleId && !coarse && !focusMode && (
                        <div
                          className="absolute bottom-full left-0 z-30 mb-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <VerseActions {...verseActions} />
                        </div>
                      )}
                      <span
                        className={cn(
                          'mt-[6px] min-w-[18px] shrink-0 select-none text-right font-reader text-[12px] font-bold',
                          (isHl || isSel) && !focusMode ? 'text-primary' : 'text-muted-foreground/55',
                        )}
                      >
                        {v.number}
                      </span>
                      <p
                        style={bmColor ? { ...textSizeStyle, textDecorationColor: bmColor } : textSizeStyle}
                        className={cn(
                          'flex-1 select-text font-reader antialiased',
                          (isHl || isSel) && !focusMode ? 'text-primary' : 'text-foreground',
                          bm && 'underline decoration-wavy underline-offset-4',
                        )}
                      >
                        <span
                          className={cn(showHl && 'verse-highlight box-decoration-clone')}
                          style={hlColor ? ({ '--hl-color': hlColor } as CSSProperties) : undefined}
                        >
                          {v.text}
                        </span>
                        {noted && (
                          <button
                            type="button"
                            title="Voir la note"
                            aria-label="Voir la note"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenNote(v.number);
                            }}
                            className="ml-1.5 inline-flex translate-y-0.5 text-primary/70 transition-colors hover:text-primary"
                          >
                            <Icon icon="hugeicons:sticky-note-01" className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {refsCount > 0 && showRefsIndicator(isSel) && !focusMode && (
                          <button
                            type="button"
                            title={`${refsCount} renvois`}
                            aria-label={`${refsCount} renvois`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenRefs(v.number);
                            }}
                            className="ml-1.5 inline-flex translate-y-0.5 items-center gap-0.5 align-baseline text-muted-foreground/60 transition-colors hover:text-primary"
                          >
                            <Icon icon="hugeicons:link-02" className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-semibold tabular-nums">{refsCount}</span>
                          </button>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Affichage continu : texte au fil (numéros en exposant, masqués en mode "plain").
              <p
                key={block.key}
                style={textSizeStyle}
                className="mb-4 select-text font-reader text-black antialiased dark:text-white"
              >
                {block.verses.map((v) => {
                  const isHl = highlightSet.has(v.number);
                  const id = verseId(bookId, chapter, v.number);
                  const isSel = selection.isSelected(id);
                  // Desktop : survol prolongé. Tactile : masqué — le dock mute en cluster à la place.
                  const canHover = !coarse && isSel;
                  const annId = bmIdFor(bookId, chapter, v.number);
                  const bm = bookmarkOf(annId);
                  const bmColor = bm ? groupColorById.get(bm.groupId) : undefined;
                  const hlColor = highlightOf(annId);
                  const noted = hasNote(annId);
                  const refsCount = refsCountFor(v.number);
                  const showHl = hlColor && !((isSel || isHl) && !focusMode);
                  return (
                    <span
                      key={v.number}
                      ref={(el) => {
                        if (v.number === highlightFirst) highlightRef.current = el;
                      }}
                      onClick={() => handleVerseClick(id)}
                      onMouseEnter={isSel ? () => hover.startHoverCluster(id) : undefined}
                      onMouseLeave={isSel ? hover.endHoverCluster : undefined}
                      style={{
                        ...(bmColor ? { textDecorationColor: bmColor } : {}),
                        ...(showHl ? ({ '--hl-color': hlColor } as CSSProperties) : {}),
                      }}
                      className={cn(
                        'cursor-pointer scroll-mt-24 transition-[color,opacity] duration-300',
                        canHover && 'relative',
                        (isSel || isHl) && !focusMode && 'box-decoration-clone rounded bg-primary/10 px-0.5 text-primary',
                        showHl && 'verse-highlight box-decoration-clone px-0.5',
                        bm && 'underline decoration-wavy underline-offset-4',
                        dimmed(isSel, isHl) && 'opacity-10',
                      )}
                    >
                      {/* Cluster d'actions : apparaît au survol prolongé (1 s) — ou dès la sélection
                          au clic — d'un verset sélectionné. Hébergé par le verset du milieu de la
                          sélection (médiane), centré au-dessus de lui ; entrée fade-in-up / sortie
                          fade-out-down. Le survol de n'importe quel verset sélectionné l'ouvre. */}
                      {canHover && id === middleId && (
                        <HoverClusterView
                          open={hover.hoverId !== null}
                          className="absolute bottom-full left-1/2 z-30 flex -translate-x-1/2 flex-col items-center pb-1.5"
                          enterClass="animate-pop-in"
                          exitClass="animate-pop-out"
                          onClick={(e) => e.stopPropagation()}
                          onMouseEnter={hover.cancelHide}
                          onMouseLeave={hover.endHoverCluster}
                        >
                          <VerseActions {...verseActions} onMenuToggle={hover.handleClusterMenu} />
                        </HoverClusterView>
                      )}
                      {layout !== 'plain' && (
                        <>
                          <VerseNumber
                            value={v.number}
                            className={cn((isHl || isSel) && !focusMode && 'text-primary')}
                          />{' '}
                        </>
                      )}
                      {v.text}
                      {noted && (
                        <button
                          type="button"
                          title="Voir la note"
                          aria-label="Voir la note"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenNote(v.number);
                          }}
                          className="ml-0.5 inline-flex translate-y-0.5 text-primary/70 transition-colors hover:text-primary"
                        >
                          <Icon icon="hugeicons:sticky-note-01" className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {refsCount > 0 && showRefsIndicator(isSel) && (
                        <button
                          type="button"
                          title={`${refsCount} renvois`}
                          aria-label={`${refsCount} renvois`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenRefs(v.number);
                          }}
                          className="ml-0.5 inline-flex translate-y-0.5 items-center gap-0.5 align-baseline text-muted-foreground/60 transition-colors hover:text-primary"
                        >
                          <Icon icon="hugeicons:link-02" className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-semibold tabular-nums">{refsCount}</span>
                        </button>
                      )}{' '}
                    </span>
                  );
                })}
              </p>
            ),
          )}
        </div>

        <VersionCredits versions={[primary]} />
      </div>
    </article>
  );
}

export default ReaderContent;