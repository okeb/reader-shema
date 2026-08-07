'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { GLASS_PILL } from '@/src/presentation/components/atoms/a-floating-button';
import { PortalPopover } from '@/src/presentation/components/atoms/a-portal-popover';
import { BookmarkPicker } from '@/src/presentation/components/molecules/m-bookmark-picker';
import { HIGHLIGHT_COLORS } from '@/src/domain/entities';
import type { BookmarkGroup } from '@/src/domain/entities';

export interface VerseActionsProps {
  /** Nombre de versets sélectionnés (badge). */
  count: number;
  /** État « lien copié » (feedback d'icône) — propage le thème appliqué dans l'URL (spec 14). */
  linkCopied?: boolean;
  onCopyLink?: () => void;
  /** État « verset copié » (feedback d'icône) — contenu + référence + version dans le presse-papier. */
  verseCopied?: boolean;
  onCopyVerse?: () => void;
  /** État « partagé » (feedback d'icône) — feuille native ouverte / repli copié (spec 07). */
  shared?: boolean;
  onShare?: () => void;
  /** Vrai si tous les sélectionnés sont en favoris (cœur plein). */
  favorited: boolean;
  onToggleFavorite: () => void;
  onClear: () => void;
  /** Ouvre/ferme le panneau Strong des versets sélectionnés. */
  onStrongs?: () => void;
  /** Vrai si le panneau Strong est ouvert (bouton mis en évidence). */
  strongsOpen?: boolean;
  /** Signets : groupes disponibles + état/handlers (le bouton n'apparaît que si `groups` fourni). */
  groups?: BookmarkGroup[];
  /** Groupe courant de la sélection (si rangée dans un seul groupe), sinon null. */
  bookmarkGroupId?: string | null;
  /** Vrai si au moins un verset sélectionné est déjà un signet (icône pleine). */
  isBookmarked?: boolean;
  onBookmark?: (groupId: string) => void;
  onCreateBookmarkGroup?: (name: string, color: string) => void;
  onRemoveBookmark?: () => void;
  /** Surlignage : applique une couleur de feutre à la sélection (le bouton n'apparaît que si fourni). */
  onHighlight?: (color: string) => void;
  /** Couleur de feutre commune à la sélection (coche dans la palette), sinon null. */
  highlightColor?: string | null;
  /** Vrai si au moins un verset sélectionné est surligné (feutre actif). */
  highlighted?: boolean;
  onRemoveHighlight?: () => void;
  /** Note : ouvre l'éditeur de note du verset ancre (le bouton n'apparaît que si fourni). */
  onNote?: () => void;
  /** Vrai si le verset ancre porte déjà une note. */
  hasNote?: boolean;
  /** Notifie le parent à l'ouverture/fermeture du sélecteur de signet (pour épingler le cluster). */
  onMenuToggle?: (open: boolean) => void;
  /** Sans chrome de pilule (bordure/ombre/fond) : pour héberger le cluster dans le dock contextuel.
   *  Agrandit aussi les boutons (cibles tactiles 44 px) façon dock. */
  bare?: boolean;
  className?: string;
}

/**
 * Faisceau de props du cluster, construit une fois côté lecteur et propagé à chaque usage de
 * `VerseActions`. Exclut les props purement locales à chaque emplacement (`bare`, `className`,
 * `onMenuToggle`).
 */
export type VerseActionsBundle = Omit<VerseActionsProps, 'bare' | 'className' | 'onMenuToggle'>;

const ACTION_BTN =
  'flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary';

/** Variante « dock » : boutons 44 px alignés sur FLOATING_BTN (cf. a-floating-button). Plats —
 *  le relief est porté par le conteneur du dock (mode cluster tactile). Icônes en
 *  text-foreground (noir en clair / blanc en sombre). */
const ACTION_BTN_BARE =
  'flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-accent hover:text-primary';

/**
 * Cluster d'actions présentationnel (horizontal, compact) qui s'applique à toute la sélection :
 * copier, favori, signet, Strong, effacer.
 */
export function VerseActions({
  count,
  linkCopied = false,
  onCopyLink,
  verseCopied = false,
  onCopyVerse,
  shared = false,
  onShare,
  favorited,
  onToggleFavorite,
  onClear,
  onStrongs,
  strongsOpen = false,
  groups,
  bookmarkGroupId = null,
  isBookmarked = false,
  onBookmark,
  onCreateBookmarkGroup,
  onRemoveBookmark,
  onHighlight,
  highlightColor = null,
  highlighted = false,
  onRemoveHighlight,
  onNote,
  hasNote = false,
  onMenuToggle,
  bare = false,
  className,
}: VerseActionsProps) {
  // Empêche le clic de re-basculer le verset/carte ancre situé sous le cluster.
  const stop = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  // En mode « dock » (bare) : boutons 44 px, icônes plus grandes, pas de chrome de pilule.
  const btnCls = bare ? ACTION_BTN_BARE : ACTION_BTN;
  const iconCls = bare ? 'h-5 w-5' : 'h-4 w-4';

  const [pickerOpen, setPickerOpen] = useState(false);
  const [hlPickerOpen, setHlPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const overflowRef = useRef<HTMLSpanElement>(null);
  const sendRef = useRef<HTMLSpanElement>(null);

  // Bouton d'envoi fusionné (copier le verset / copier le lien / partager) — présent si l'une des actions existe.
  const hasSend = !!onCopyLink || !!onCopyVerse || !!onShare;
  // Le menu ⋯ (signet / surlignage / note) — Strong reste un outil de base, hors menu.
  const hasOverflow = !!(groups && onBookmark) || !!onHighlight || !!onNote;

  // Épingle le cluster tant qu'un popover (envoi / menu ⋯ / signet / surlignage) est ouvert. On ne
  // signale que les **transitions** (pas au montage) : un `onMenuToggle(false)` au montage
  // déclencherait `endHoverCluster` et fermerait le cluster 250 ms après son apparition (spec 12).
  const menuOpenPrev = useRef(false);
  useEffect(() => {
    const anyOpen = sendOpen || menuOpen || pickerOpen || hlPickerOpen;
    if (anyOpen === menuOpenPrev.current) return;
    menuOpenPrev.current = anyOpen;
    onMenuToggle?.(anyOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendOpen, menuOpen, pickerOpen, hlPickerOpen]);

  // Fermeture au clic extérieur : chaque popover est portailé (PortalPopover) et se ferme
  // lui-même (ancre + panneau exclus). Plus de listener global — les panneaux échappent au
  // conteneur du dock (frontière de backdrop), donc on ne peut pas se fier à un `contains` sur
  // `sendRef` / `overflowRef`.

  return (
    <span
      className={cn(
        bare
          ? 'inline-flex flex-row items-center gap-0.5'
          : `inline-flex flex-row items-center gap-0.5 rounded-full ${GLASS_PILL} p-1 shadow-lg`,
        className,
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-full bg-primary/10 font-bold leading-none text-primary',
          bare ? 'h-6 min-w-[24px] px-1.5 text-xs' : 'h-5 min-w-[20px] px-1 text-[11px]',
        )}
      >
        {count}
      </span>

      {hasSend && (
        <span ref={sendRef} className="relative inline-flex">
          <button
            type="button"
            className={cn(btnCls, sendOpen && 'text-primary')}
            title="Envoyer / partager"
            onClick={stop(() => setSendOpen((v) => !v))}
          >
            <Icon
              icon={linkCopied || verseCopied || shared ? 'hugeicons:checkmark-square-03' : 'hugeicons:share-04'}
              className={cn(iconCls, (linkCopied || verseCopied || shared) && 'text-green-500')}
            />
          </button>

          <PortalPopover
            open={sendOpen}
            anchorRef={sendRef}
            align="left"
            onClose={() => setSendOpen(false)}
            className="flex w-44 flex-col gap-0.5 rounded-xl p-1"
          >
            {onCopyVerse && (
              <button
                type="button"
                title="Copier le verset (contenu + référence + version)"
                onClick={stop(() => {
                  onCopyVerse();
                  setSendOpen(false);
                })}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-accent',
                  verseCopied ? 'text-primary' : 'text-foreground',
                )}
              >
                <Icon
                  icon={verseCopied ? 'hugeicons:checkmark-square-03' : 'hugeicons:copy-02'}
                  className={cn('h-4 w-4', verseCopied && 'text-green-500')}
                />
                Copier le verset
              </button>
            )}

            {onCopyLink && (
              <button
                type="button"
                title="Copier le lien (vignette au thème courant)"
                onClick={stop(() => {
                  onCopyLink();
                  setSendOpen(false);
                })}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-accent',
                  linkCopied ? 'text-primary' : 'text-foreground',
                )}
              >
                <Icon
                  icon={linkCopied ? 'hugeicons:checkmark-square-03' : 'hugeicons:copy-link'}
                  className={cn('h-4 w-4', linkCopied && 'text-green-500')}
                />
                Copier le lien
              </button>
            )}

            {onShare && (
              <button
                type="button"
                title="Partager la sélection"
                onClick={stop(() => {
                  onShare();
                  setSendOpen(false);
                })}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-accent',
                  shared ? 'text-primary' : 'text-foreground',
                )}
              >
                <Icon
                  icon={shared ? 'hugeicons:checkmark-square-03' : 'hugeicons:share-04'}
                  className={cn('h-4 w-4', shared && 'text-green-500')}
                />
                Partager
              </button>
            )}
          </PortalPopover>
        </span>
      )}

      <button
        type="button"
        className={cn(btnCls, favorited && 'text-primary')}
        title={favorited ? 'Retirer des favoris' : 'Mettre en favori'}
        onClick={stop(onToggleFavorite)}
      >
        <Icon icon={favorited ? 'ph:heart-fill' : 'ph:heart'} className={cn(iconCls, favorited && 'text-primary')} />
      </button>

      {onStrongs && (
        <button
          type="button"
          className={cn(btnCls, strongsOpen && 'text-primary')}
          title={strongsOpen ? 'Masquer les Strong' : 'Afficher les Strong'}
          onClick={stop(onStrongs)}
        >
          <Icon icon="hugeicons:book-open-01" className={iconCls} />
        </button>
      )}

      {hasOverflow && (
        <span ref={overflowRef} className="relative inline-flex">
          <button
            type="button"
            className={cn(btnCls, menuOpen && 'text-primary')}
            title="Plus d'actions"
            onClick={stop(() => setMenuOpen((v) => !v))}
          >
            <Icon icon="hugeicons:more-vertical-circle-01" className={cn(iconCls, 'rotate-90')} />
          </button>

          <PortalPopover
            open={menuOpen}
            anchorRef={overflowRef}
            align="right"
            onClose={() => setMenuOpen(false)}
            className="flex w-44 flex-col gap-0.5 rounded-xl p-1"
          >
            {groups && onBookmark && (
              <button
                type="button"
                title={isBookmarked ? 'Modifier le signet' : 'Mettre de côté (signet)'}
                onClick={stop(() => {
                  setMenuOpen(false);
                  setPickerOpen(true);
                })}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-accent',
                  isBookmarked ? 'text-primary' : 'text-foreground',
                )}
              >
                <Icon
                  icon={isBookmarked ? 'hugeicons:bookmark-02' : 'hugeicons:bookmark-add-02'}
                  className="h-4 w-4"
                />
                Signet
              </button>
            )}

            {onHighlight && (
              <button
                type="button"
                title={highlighted ? 'Modifier le surlignage' : 'Surligner'}
                onClick={stop(() => {
                  setMenuOpen(false);
                  setHlPickerOpen(true);
                })}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-accent',
                  highlighted ? 'text-primary' : 'text-foreground',
                )}
              >
                <Icon
                  icon="hugeicons:highlighter"
                  className="h-4 w-4"
                  style={highlightColor ? { color: highlightColor } : undefined}
                />
                Surligner
              </button>
            )}

            {onNote && (
              <button
                type="button"
                title={hasNote ? 'Modifier la note' : 'Noter'}
                onClick={stop(() => {
                  onNote();
                  setMenuOpen(false);
                })}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-accent',
                  hasNote ? 'text-primary' : 'text-foreground',
                )}
              >
                <Icon icon={hasNote ? 'hugeicons:note-edit' : 'hugeicons:sticky-note-01'} className="h-4 w-4" />
                Note
              </button>
            )}
          </PortalPopover>

          {pickerOpen && (
            <BookmarkPicker
              anchorRef={overflowRef}
              groups={groups!}
              currentGroupId={bookmarkGroupId}
              isBookmarked={isBookmarked}
              onPick={(gid) => onBookmark!(gid)}
              onCreate={(name, color) => onCreateBookmarkGroup?.(name, color)}
              onRemove={() => onRemoveBookmark?.()}
              onClose={() => setPickerOpen(false)}
            />
          )}

          <PortalPopover
            open={hlPickerOpen}
            anchorRef={overflowRef}
            align="right"
            width={220}
            onClose={() => setHlPickerOpen(false)}
            className="flex items-center gap-1.5 rounded-xl p-2"
          >
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title="Surligner"
                onClick={() => {
                  onHighlight!(c);
                  setHlPickerOpen(false);
                }}
                className={cn(
                  'h-6 w-6 rounded-full transition-transform hover:scale-110',
                  highlightColor === c && 'ring-2 ring-offset-2 ring-offset-popover',
                )}
                style={{
                  backgroundColor: c,
                  ...(highlightColor === c ? { boxShadow: `0 0 0 2px ${c}` } : {}),
                }}
              />
            ))}
            {highlighted && (
              <button
                type="button"
                title="Retirer le surlignage"
                onClick={() => {
                  onRemoveHighlight?.();
                  setHlPickerOpen(false);
                }}
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Icon icon="hugeicons:cancel-01" className="h-4 w-4" />
              </button>
            )}
          </PortalPopover>
        </span>
      )}

      <button type="button" className={cn(btnCls, 'text-primary')} title="Effacer la sélection" onClick={stop(onClear)}>
        <Icon icon="hugeicons:cancel-01" className={iconCls} />
      </button>
    </span>
  );
}

export default VerseActions;