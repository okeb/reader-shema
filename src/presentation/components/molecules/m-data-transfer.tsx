'use client';

import { useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import {
  downloadBackup,
  parseBackup,
  applyBackup,
  countBackup,
  type Backup,
  type ImportMode,
} from '@/src/presentation/lib/data-transfer';

interface Pending {
  backup: Backup;
  count: number;
}

/**
 * Bloc « Sauvegarde de mes données » : exporte favoris + signets + annotations dans un fichier JSON,
 * et restaure une sauvegarde (fusion ou remplacement). 100 % local — aucun envoi réseau.
 */
export function DataTransfer() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onPickFile = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      const backup = parseBackup(text);
      setPending({ backup, count: countBackup(backup) });
    } catch (e) {
      setPending(null);
      setError(e instanceof Error ? e.message : 'Import impossible.');
    }
  };

  const doImport = (mode: ImportMode) => {
    if (!pending) return;
    applyBackup(pending.backup, mode);
    // Recharge pour réhydrater les hooks depuis le localStorage mis à jour.
    window.location.reload();
  };

  return (
    <section className="mt-12 border-t border-input/50 pt-8">
      <h2 className="mb-1 text-[12px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        Sauvegarde de mes données
      </h2>
      <p className="mb-4 max-w-prose text-sm text-muted-foreground">
        Vos favoris, signets, surlignages et notes sont stockés sur cet appareil. Exportez-les pour
        ne rien perdre, ou restaurez une sauvegarde.
      </p>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => downloadBackup()}
          className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background/70 px-3.5 py-1.5 text-sm transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <Icon icon="hugeicons:download-04" className="h-4 w-4" />
          Exporter
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background/70 px-3.5 py-1.5 text-sm transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <Icon icon="hugeicons:upload-04" className="h-4 w-4" />
          Importer
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onPickFile(f);
            e.target.value = ''; // permet de re-sélectionner le même fichier
          }}
        />
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-destructive">
          <Icon icon="hugeicons:alert-02" className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {pending && (
        <div className="mt-4 rounded-xl border border-input bg-card/40 p-4">
          <p className="text-sm text-foreground/90">
            Sauvegarde valide — <strong>{pending.count}</strong> élément
            {pending.count > 1 ? 's' : ''} trouvé{pending.count > 1 ? 's' : ''}. Comment l'appliquer ?
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => doImport('merge')}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Fusionner
            </button>
            <button
              type="button"
              onClick={() => doImport('replace')}
              className="rounded-lg border border-input px-3 py-1.5 text-sm transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              Remplacer
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent"
            >
              Annuler
            </button>
          </div>
          <p className="mt-2.5 text-[12px] leading-snug text-muted-foreground/70">
            <strong>Fusionner</strong> : ajoute ce qui manque sans toucher à vos données actuelles.{' '}
            <strong>Remplacer</strong> : écrase vos données par celles de la sauvegarde.
          </p>
        </div>
      )}
    </section>
  );
}

export default DataTransfer;