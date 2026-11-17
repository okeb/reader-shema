'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { GLASS_PILL, SELECTION_SURFACE } from '@/src/presentation/components/atoms/a-floating-button';
import { PortalPopover } from '@/src/presentation/components/atoms/a-portal-popover';
import { BookmarkPicker } from '@/src/presentation/components/molecules/m-bookmark-picker';
import { HIGHLIGHT_COLORS } from '@/src/domain/entities';
import type { BookmarkGroup } from '@/src/domain/entities';

export interface VerseActionsProps {
  /** Nombre de versets sélectionnés (pastille « N ✕ » / en-tête du dock). */
  count: number;
  /** Référence lisible de la sélection (ex. « Jean 3:16-17 »), affichée en tête du dock mobile. */
  reference?: string;
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

/**
 * Bouton d'action libellé : icône + mot court dessous, pour que chaque action se comprenne sans
 * info-bulle (absente au tactile).
 */
const ACTION_BTN =
  'flex h-10 min-w-[52px] flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary';

/** Variante « dock » (mobile) : les actions se partagent toute la largeur de la barre (~68 px
 *  chacune sur un téléphone). Plates — le relief est porté par le conteneur du dock. Icônes en
 *  text-foreground (noir en clair / blanc en sombre). */
const ACTION_BTN_BARE =
  'flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[14px] text-foreground transition-colors hover:bg-accent hover:text-primary';

/** Libellé sous l'icône. */
const LABEL_CLS = 'font-sans font-medium';

/**
 * Cluster d'actions présentationnel qui s'applique à toute la sélection : partager, favori,
 * Hébreu/Grec (Strong), note, plus (signet, surlignage), désélectionner. Chaque bouton porte un
 * libellé visible sous son icône. Deux formes : pilule flottante (ordinateur, pastille « N ✕ » en
 * bout) et dock mobile sur deux lignes (`bare` : référence + « Désélectionner », puis les actions
 * sur toute la largeur).
 */
export function VerseActions({
  count,
  reference,
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

  // En mode « dock » (bare) : barre sur deux lignes, boutons pleine largeur, icônes plus grandes,
  // pas de chrome de pilule.
  const btnCls = bare ? ACTION_BTN_BARE : ACTION_BTN;
  const iconCls = bare ? 'h-[22px] w-[22px]' : 'h-4 w-4';
  // Dock : 11 px, 10 px sur les très petits écrans (< 360 px) ; « Hébreu/Grec » peut alors passer
  // sur deux lignes après le « / » plutôt que déborder de son bouton.
  // (`leading-none` après la taille : tailwind-merge écarte un interligne placé avant `text-*`.)
  const labelCls = cn(
    LABEL_CLS,
    bare ? 'text-center text-[11px] max-[359px]:text-[10px]' : 'whitespace-nowrap text-[10px]',
    'leading-none',
  );
  // Emplacement d'un bouton à popover (envoi, menu ⋯) : prend sa part de largeur dans le dock.
  const slotCls = bare ? 'relative flex min-w-0 flex-1' : 'relative inline-flex';
  const versesLabel = `${count} verset${count > 1 ? 's' : ''}`;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [hlPickerOpen, setHlPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const overflowRef = useRef<HTMLSpanElement>(null);
  const sendRef = useRef<HTMLSpanElement>(null);

  // Bouton d'envoi fusionné (copier le verset / copier le lien / partager) — présent si l'une des actions existe.
  const hasSend = !!onCopyLink || !!onCopyVerse || !!onShare;
  // Le menu ⋯ (signet / surlignage) — Strong et la note restent des outils de base, hors menu
  // (la note est promue au premier niveau : accès direct à l'éditeur, sans popover). Spec 30.
  const hasOverflow = !!(groups && onBookmark) || !!onHighlight;

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

  const actions = (
    <>
      {hasSend && (
        <span ref={sendRef} className={slotCls}>
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
            <span className={labelCls}>Partager</span>
          </button>

          <PortalPopover
            open={sendOpen}
            anchorRef={sendRef}
            align="left"
            onClose={() => setSendOpen(false)}
            className={cn(SELECTION_SURFACE, 'flex w-44 flex-col gap-0.5 rounded-xl p-1')}
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
        <span className={labelCls}>Favori</span>
      </button>

      {/* Mots originaux (concordance Strong) : la lettre א dit « langue d'origine » mieux qu'un
          livre ouvert. Surligné tant que le panneau est ouvert (interrupteur). */}
      {onStrongs && (
        <button
          type="button"
          className={cn(btnCls, strongsOpen && 'bg-primary/10 text-primary')}
          title={strongsOpen ? 'Masquer les mots hébreux / grecs' : 'Afficher les mots hébreux / grecs (Strong)'}
          aria-pressed={strongsOpen}
          onClick={stop(onStrongs)}
        >
          <span
            aria-hidden="true"
            className={cn(
              'flex items-center justify-center font-serif font-semibold leading-none',
              bare ? 'h-[22px] w-[22px] text-[21px]' : 'h-4 w-4 text-[15px]',
            )}
          >
            א
          </span>
          <span className={labelCls}>
            Hébreu/
            {/* Coupure possible seulement dans le dock (Chrome coupe au <wbr> malgré nowrap). */}
            {bare && <wbr />}
            Grec
          </span>
        </button>
      )}

      {/* Note — promue au premier niveau (spec 30) : accès direct à l'éditeur de la sélection,
          sans popover intermédiaire. Crayon identique avec ou sans note ; un point signale qu'une
          note existe déjà. */}
      {onNote && (
        <button
          type="button"
          className={btnCls}
          title={hasNote ? 'Modifier la note' : 'Noter'}
          onClick={stop(onNote!)}
        >
          <span className="relative flex">
            <Icon icon="hugeicons:pencil-edit-02" className={iconCls} />
            {hasNote && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-0.5 h-[7px] w-[7px] rounded-full bg-primary"
              />
            )}
          </span>
          <span className={labelCls}>Note</span>
        </button>
      )}

      {hasOverflow && (
        <span ref={overflowRef} className={slotCls}>
          <button
            type="button"
            className={cn(btnCls, menuOpen && 'text-primary')}
            title="Plus d'actions"
            onClick={stop(() => setMenuOpen((v) => !v))}
          >
            <Icon icon="hugeicons:more-vertical-circle-01" className={cn(iconCls, 'rotate-90')} />
            <span className={labelCls}>Plus</span>
          </button>

          <PortalPopover
            open={menuOpen}
            anchorRef={overflowRef}
            align="right"
            onClose={() => setMenuOpen(false)}
            className={cn(SELECTION_SURFACE, 'flex w-44 flex-col gap-0.5 rounded-xl p-1')}
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
            className={cn(SELECTION_SURFACE, 'flex items-center gap-1.5 rounded-xl p-2')}
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

    </>
  );

  // Dock mobile : deux lignes. En tête, la référence de la sélection et « Désélectionner » ; en
  // dessous, les actions réparties sur toute la largeur.
  if (bare) {
    return (
      <span className={cn('flex w-full flex-col', className)}>
        <span className="flex items-center justify-between gap-2 border-b border-foreground/[7%] py-1.5 pl-3.5 pr-1">
          <span className="min-w-0 truncate font-sans text-[13px] text-foreground">
            {reference && <strong className="font-semibold">{reference}</strong>}
            <span className="text-muted-foreground">
              {reference ? ' · ' : ''}
              {versesLabel}
            </span>
          </span>
          <button
            type="button"
            className="flex h-9 shrink-0 items-center gap-1 rounded-full px-2.5 font-sans text-[13px] font-medium text-primary transition-colors hover:bg-primary/10"
            onClick={stop(onClear)}
          >
            <Icon icon="hugeicons:cancel-01" className="h-3.5 w-3.5" />
            Désélectionner
          </button>
        </span>
        <span className="flex w-full items-center px-1.5 pb-1.5 pt-1">{actions}</span>
      </span>
    );
  }

  // Pilule flottante (ordinateur) : le nombre de versets et l'effacement ne font qu'une pastille
  // « N ✕ » en bout de barre.
  return (
    <span
      className={cn(
        'inline-flex flex-row items-center gap-1 rounded-full p-1 shadow-lg',
        GLASS_PILL,
        SELECTION_SURFACE,
        className,
      )}
    >
      {actions}
      <button
        type="button"
        className="ml-0.5 flex h-8 shrink-0 items-center gap-1 rounded-full bg-primary/10 pl-3 pr-2.5 font-sans text-xs font-bold text-primary transition-colors hover:bg-primary/20"
        title={`${versesLabel} sélectionné${count > 1 ? 's' : ''} — désélectionner`}
        aria-label={`${versesLabel} sélectionné${count > 1 ? 's' : ''} — désélectionner`}
        onClick={stop(onClear)}
      >
        {count}
        <Icon icon="hugeicons:cancel-01" className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

export default VerseActions;