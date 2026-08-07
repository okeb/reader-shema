'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { HighlightMap, NoteMap, Note, VerseRef, OldNote } from '@/src/domain/entities';
import { createMultiKeyStorage } from './multi-key-storage';

const HIGHLIGHTS_KEY = 'bymHighlights';
const NOTES_KEY = 'bymNotes';

function genNoteId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const t = typeof Date !== 'undefined' ? Date.now().toString(36) : '0';
  const r = typeof Math !== 'undefined' ? Math.random().toString(36).slice(2, 10) : 'xxxxxxxx';
  return `n-${t}-${r}`;
}
function now(): number {
  return typeof Date !== 'undefined' ? Date.now() : 0;
}

function isHighlightMap(x: unknown): x is HighlightMap {
  if (!x || typeof x !== 'object') return false;
  return Object.values(x as Record<string, unknown>).every((v) => typeof v === 'string');
}

function isVerseRef(x: unknown): x is VerseRef {
  if (!x || typeof x !== 'object') return false;
  const v = x as Record<string, unknown>;
  return (
    typeof v.verseId === 'string' &&
    typeof v.bookId === 'string' &&
    typeof v.chapter === 'number' &&
    typeof v.verse === 'number' &&
    typeof v.reference === 'string' &&
    typeof v.text === 'string'
  );
}

function isNewNote(x: unknown): x is Note {
  if (!x || typeof x !== 'object') return false;
  const n = x as Record<string, unknown>;
  return (
    typeof n.id === 'string' &&
    typeof n.text === 'string' &&
    typeof n.updatedAt === 'number' &&
    Array.isArray(n.verses) &&
    (n.verses as unknown[]).length > 0 &&
    (n.verses as unknown[]).every(isVerseRef)
  );
}

function isOldNote(x: unknown): x is OldNote {
  if (!x || typeof x !== 'object') return false;
  const n = x as Record<string, unknown>;
  return (
    typeof n.text === 'string' &&
    typeof n.updatedAt === 'number' &&
    typeof n.reference === 'string' &&
    typeof n.verseText === 'string' &&
    typeof n.bookId === 'string' &&
    typeof n.chapter === 'number' &&
    typeof n.verse === 'number'
  );
}

/**
 * Migre/valide les notes depuis le format parsé. Gère :
 *  - nouveau format `Record<noteId, Note>` ;
 *  - ancien format `Record<verseId, OldNote>` (1 verset ↔ 1 note) → note à un seul verset.
 */
function migrateNotes(parsed: unknown): NoteMap {
  if (!parsed || typeof parsed !== 'object') return {};
  const out: NoteMap = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (isNewNote(v)) {
      out[v.id] = v;
    } else if (isOldNote(v)) {
      const id = genNoteId();
      out[id] = {
        id,
        text: v.text,
        updatedAt: v.updatedAt,
        verses: [
          { verseId: k, bookId: v.bookId, chapter: v.chapter, verse: v.verse, reference: v.reference, text: v.verseText },
        ],
      };
    }
  }
  return out;
}

interface AnnotationsState {
  highlights: HighlightMap;
  notes: NoteMap;
  hydrated: boolean;
  // Surlignages
  setHighlight: (id: string, color: string) => void;
  removeHighlight: (id: string) => void;
  highlightOf: (id: string) => string | undefined;
  // Notes
  createNote: (verses: VerseRef[], text: string) => string;
  updateNoteText: (id: string, text: string) => void;
  setNoteVerses: (id: string, verses: VerseRef[]) => void;
  saveNote: (noteId: string | null, verses: VerseRef[], text: string) => string;
  removeNote: (id: string) => void;
  // Sélecteurs
  getNote: (id: string) => Note | undefined;
  notesList: () => Note[];
  notesForVerse: (verseId: string) => Note[];
  hasNote: (verseId: string) => boolean;
}

const multiKeyStorage = createMultiKeyStorage([
  { key: HIGHLIGHTS_KEY, field: 'highlights' },
  { key: NOTES_KEY, field: 'notes' },
]);

export const useAnnotations = create<AnnotationsState>()(
  persist(
    immer((set, get) => ({
      highlights: {},
      notes: {},
      hydrated: false,

      setHighlight: (id, color) =>
        set((s) => {
          s.highlights[id] = color;
        }),
      removeHighlight: (id) =>
        set((s) => {
          if (id in s.highlights) delete s.highlights[id];
        }),
      highlightOf: (id) => get().highlights[id],

      createNote: (verses, text) => {
        const id = genNoteId();
        set((s) => {
          s.notes[id] = { id, text, verses, updatedAt: now() };
        });
        return id;
      },
      updateNoteText: (id, text) =>
        set((s) => {
          const n = s.notes[id];
          if (n) { n.text = text; n.updatedAt = now(); }
        }),
      setNoteVerses: (id, verses) =>
        set((s) => {
          const n = s.notes[id];
          if (n) { n.verses = verses; n.updatedAt = now(); }
        }),
      saveNote: (noteId, verses, text) => {
        // Versets vides → on ne crée rien ; on supprime l'éventuelle note existante.
        if (verses.length === 0) {
          if (noteId) {
            set((s) => {
              if (s.notes[noteId]) delete s.notes[noteId];
            });
          }
          return '';
        }
        if (noteId) {
          set((s) => {
            const n = s.notes[noteId];
            if (n) { n.text = text; n.verses = verses; n.updatedAt = now(); }
          });
          return noteId;
        }
        return get().createNote(verses, text);
      },
      removeNote: (id) =>
        set((s) => {
          if (s.notes[id]) delete s.notes[id];
        }),

      getNote: (id) => get().notes[id],
      notesList: () =>
        Object.values(get().notes).sort((a, b) => b.updatedAt - a.updatedAt),
      notesForVerse: (verseId) => {
        const all = get().notes;
        return Object.values(all).filter((n) => n.verses.some((v) => v.verseId === verseId));
      },
      hasNote: (verseId) => Object.values(get().notes).some((n) => n.verses.some((v) => v.verseId === verseId)),
    })),
    {
      name: 'annotations',
      storage: createJSONStorage(() => multiKeyStorage),
      partialize: (s) => ({ highlights: s.highlights, notes: s.notes }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.highlights = isHighlightMap(state.highlights) ? state.highlights : {};
        state.notes = migrateNotes(state.notes);
        state.hydrated = true;
      },
    },
  ),
);

export const getAnnotations = () => useAnnotations.getState();