'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { parseReference } from '@/src/presentation/lib/parse-reference';
import { runQuery } from '@/src/presentation/hooks/use-cqrs';
import { createGetVersesTextQuery } from '@/src/application/factories/bible';
import type { GetVersesTextResult } from '@/src/domain/use-cases/bible';
import type { Note, VerseRef } from '@/src/domain/entities';

export interface NoteEditorProps {
  open: boolean;
  /** Verset ancre (celui depuis lequel l'éditeur a été ouvert) — titre de la fenêtre. */
  anchorVerse: VerseRef | null;
  /** Versets à associer par défaut (versets sélectionnés, ou versets de la note éditée). */
  initialVerses: VerseRef[];
  /** Texte initial (note éditée) ; "" pour une nouvelle note. */
  initialText: string;
  /** Id de la note éditée, ou null pour une nouvelle note. */
  initialNoteId: string | null;
  /** Autres notes sur le verset ancre (pour basculer vers une existante / en créer une nouvelle). */
  otherNotes: Note[];
  /** Version active (pour résoudre le texte d'un verset ajouté via la saisie de référence). */
  version: string;
  /** Sauvegarde unifiée : crée ou met à jour ; `verses` vide → supprime la note existante. */
  onSave: (noteId: string | null, verses: VerseRef[], text: string) => void;
  /** Supprime une note existante (bouton « Supprimer »). */
  onDelete: (noteId: string) => void;
  /** Ferme l'éditeur (sans sauvegarder). */
  onClose: () => void;
}

/**
 * Éditeur de note plein écran (multi-versets). Une note peut référencer plusieurs versets et un
 * verset peut porter plusieurs notes. La fenêtre affiche :
 *  - le verset ancre (titre) ;
 *  - la liste des versets associés à la note courante (chacun détachable via ✕) ;
 *  - un champ « + Associer un verset » (saisie d'une référence, ex. « jean 3 16 ») ;
 *  - les autres notes sur le verset ancre (cliquables pour éditer) + bouton « Nouvelle note » ;
 *  - le textarea.
 *
 * Sauvegarde unifiée : si la note n'a plus aucun verset associé, elle est supprimée à
 * l'enregistrement (cohérent avec le retrait du dernier verset).
 *
 * Porté de l'ancien `m-note-editor.tsx` : état local manuel (sans react-hook-form/zod — un seul
 * textarea + des chips dynamiques ne le justifie pas, et la logique est éprouvée). La seule
 * adaptation : la résolution du texte d'un verset ajouté passe par CQRS (`runQuery` +
 * `createGetVersesTextQuery`) au lieu de `getVersesText` direct.
 */
export function NoteEditor({
  open,
  anchorVerse,
  initialVerses,
  initialText,
  initialNoteId,
  otherNotes,
  version,
  onSave,
  onDelete,
  onClose,
}: NoteEditorProps) {
  const [text, setText] = useState(initialText);
  const [verses, setVerses] = useState<VerseRef[]>(initialVerses);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(initialNoteId);
  const [adding, setAdding] = useState(false);
  const [refInput, setRefInput] = useState('');
  const [refError, setRefError] = useState<string | null>(null);
  const [refBusy, setRefBusy] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // (Ré)initialise l'état local à l'ouverture / au changement de cible.
  useEffect(() => {
    if (!open) return;
    setText(initialText);
    setVerses(initialVerses);
    setEditingNoteId(initialNoteId);
    setAdding(false);
    setRefInput('');
    setRefError(null);
  }, [open, initialText, initialVerses, initialNoteId]);

  // Échap = ferme (sans sauvegarder — la sauvegarde est explicite via Enregistrer).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    textRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const title = anchorVerse?.reference ?? 'Nouvelle note';
  const empty = verses.length === 0;

  /** Détache un verset de la note courante (retire du tableau local). */
  const detach = (verseId: string) => setVerses((prev) => prev.filter((v) => v.verseId !== verseId));

  /** Ajoute un verset saisi sous forme de référence (« jean 3 16 »). */
  const addVerse = async () => {
    const parsed = parseReference(refInput);
    if (!parsed || !parsed.selection) {
      setRefError('Référence invalide. Ex. « jean 3 16 ».');
      return;
    }
    // Prend le premier verset de la sélection (ex. « 12-20 » → 12).
    const first = parseInt(parsed.selection.split(/[,-]/)[0]!, 10);
    if (Number.isNaN(first)) {
      setRefError('Référence invalide. Ex. « jean 3 16 ».');
      return;
    }
    const verseId = `${version}:${parsed.bookId}:${parsed.chapter}:${first}`;
    if (verses.some((v) => v.verseId === verseId)) {
      setRefError('Ce verset est déjà associé.');
      return;
    }
    setRefBusy(true);
    setRefError(null);
    const itemKey = `${parsed.bookId}:${parsed.chapter}:${first}`;
    let verseText = '';
    try {
      const textMap = await runQuery<GetVersesTextResult>(
        createGetVersesTextQuery(version, [
          { id: itemKey, bookId: parsed.bookId, chapter: parsed.chapter, verse: first },
        ]),
      );
      verseText = textMap[itemKey] ?? '';
    } catch {
      /* texte indisponible — on associe quand même (référence affichée) */
    }
    setVerses((prev) => [
      ...prev,
      {
        verseId,
        bookId: parsed.bookId,
        chapter: parsed.chapter,
        verse: first,
        reference: `${parsed.bookName} ${parsed.chapter}:${first}`,
        text: verseText,
      },
    ]);
    setRefBusy(false);
    setRefInput('');
    setAdding(false);
  };

  /** Bascule vers une note existante (charge son texte + ses versets). */
  const loadNote = (note: Note) => {
    setEditingNoteId(note.id);
    setText(note.text);
    setVerses(note.verses);
    setAdding(false);
    setRefInput('');
    setRefError(null);
  };

  /** Démarre une nouvelle note (versets = versets sélectionnés à l'ouverture, ou ancre seule). */
  const startNew = () => {
    setEditingNoteId(null);
    setText('');
    // Reviens aux versets initiaux (ceux avec lesquels l'éditeur a été ouvert).
    setVerses(initialVerses.length > 0 ? initialVerses : anchorVerse ? [anchorVerse] : []);
    setAdding(false);
    setRefInput('');
    setRefError(null);
  };

  const handleSave = () => {
    onSave(editingNoteId, verses, text.trim());
    onClose();
  };

  const handleDelete = () => {
    if (editingNoteId) onDelete(editingNoteId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background" role="dialog" aria-label={`Note — ${title}`}>
      {/* En-tête */}
      <div className="flex items-center gap-2.5 border-b border-input/60 px-4 py-3.5">
        <Icon icon="hugeicons:sticky-note-01" className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{title}</h2>
          <p className="text-[11px] text-muted-foreground">
            {editingNoteId ? 'Modifier la note' : 'Nouvelle note'} · {verses.length} verset{verses.length > 1 ? 's' : ''} associé{verses.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Fermer (Échap)"
          aria-label="Fermer la note"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent"
        >
          <Icon icon="ph:x" className="h-4 w-4" />
        </button>
      </div>

      {/* Corps */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Versets associés */}
        <div className="mb-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Versets associés
          </p>
          {empty ? (
            <p className="text-[12px] leading-snug text-muted-foreground/70">
              Aucun verset associé. La note sera supprimée à l’enregistrement.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {verses.map((v) => (
                <li
                  key={v.verseId}
                  className="group/v flex items-center gap-1 rounded-full bg-foreground/[0.05] py-1 pl-2.5 pr-1 text-[12px]"
                >
                  <span className="truncate text-foreground/90">{v.reference}</span>
                  <button
                    type="button"
                    title="Détacher ce verset"
                    onClick={() => detach(v.verseId)}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Icon icon="hugeicons:cancel-01" className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Associer un verset (saisie de référence) */}
          {adding ? (
            <div className="mt-2 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={refInput}
                  onChange={(e) => setRefInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!refBusy) void addVerse();
                    } else if (e.key === 'Escape') {
                      setAdding(false);
                      setRefInput('');
                      setRefError(null);
                    }
                  }}
                  placeholder="ex. « jean 3 16 »"
                  disabled={refBusy}
                  className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-[13px] outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => void addVerse()}
                  disabled={refBusy}
                  className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {refBusy ? '…' : 'Ajouter'}
                </button>
              </div>
              {refError && <p className="text-[11px] text-destructive">{refError}</p>}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-primary transition-colors hover:opacity-80"
            >
              <Icon icon="hugeicons:add-01" className="h-3.5 w-3.5" />
              Associer un verset
            </button>
          )}
        </div>

        {/* Autres notes sur ce verset */}
        {otherNotes.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Autres notes sur ce verset
              </p>
              <button
                type="button"
                onClick={startNew}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary transition-colors hover:opacity-80"
              >
                <Icon icon="hugeicons:add-01" className="h-3 w-3" />
                Nouvelle note
              </button>
            </div>
            <ul className="space-y-1.5">
              {otherNotes.map((n) => {
                const isActive = editingNoteId === n.id;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => loadNote(n)}
                      className={cn(
                        'flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent/60',
                        isActive && 'bg-accent/60',
                      )}
                    >
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {n.verses.map((v) => v.reference).join(' · ')}
                      </span>
                      <span className="line-clamp-2 text-[13px] leading-snug text-foreground/85">
                        {n.text || <span className="italic text-muted-foreground/50">Note vide</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Votre réflexion…"
          aria-label={`Note pour ${title}`}
          className="h-48 w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary"
        />
      </div>

      {/* Pied : suppression (si édition) + enregistrement */}
      <div className="flex items-center justify-between gap-2 border-t border-input/60 px-4 py-3">
        {editingNoteId ? (
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Icon icon="ph:trash" className="h-4 w-4" />
            Supprimer
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!editingNoteId && empty}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {empty && editingNoteId ? 'Supprimer la note' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}

export default NoteEditor;