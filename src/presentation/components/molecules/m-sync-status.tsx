'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useAccount } from '@/src/presentation/stores/account.store';
import { useSyncQueue } from '@/src/presentation/stores/sync-queue.store';
import { useSyncStatus } from '@/src/presentation/stores/sync-status.store';

/** « à l'instant », « il y a 5 min », « il y a 2 h », sinon la date. */
function relative(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `le ${new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
}

/**
 * Ligne d'état de la synchronisation (page `/account`) — spec 39 §5.3.
 *
 * Rend visible ce qui était silencieux : dernière synchronisation réussie, modifications en
 * attente hors ligne, ou pause choisie par l'utilisateur.
 */
export function SyncStatus({ className }: { className?: string }) {
  const paused = useAccount((s) => s.syncPaused);
  const pending = useSyncQueue((s) => s.pending.length);
  const lastSyncAt = useSyncStatus((s) => s.lastSyncAt);
  const [now, setNow] = useState(() => Date.now());
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      clearInterval(timer);
    };
  }, []);

  let icon = 'hugeicons:cloud';
  let text: string;
  if (paused) {
    icon = 'hugeicons:pause';
    text = 'Synchronisation en pause';
  } else if (!online) {
    icon = 'hugeicons:wifi-off-01';
    text =
      pending > 0
        ? `${pending} modification${pending > 1 ? 's' : ''} en attente de connexion`
        : 'Hors ligne : la synchronisation reprendra à la connexion';
  } else if (lastSyncAt) {
    icon = 'hugeicons:checkmark-circle-02';
    text = `Synchronisé · ${relative(lastSyncAt, now)}`;
  } else {
    text = 'Synchronisation…';
  }

  return (
    <p role="status" className={className ?? 'flex items-center gap-1.5 px-4 text-[12px] text-muted-foreground'}>
      <Icon icon={icon} className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {text}
    </p>
  );
}

export default SyncStatus;
