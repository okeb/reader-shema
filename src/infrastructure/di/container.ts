import { BibleRepositoryImpl } from '@/src/infrastructure/repositories/bible.repository.impl';
import type { IBibleRepository } from '@/src/domain/repositories/bible.repository';
import { SyncRepositoryImpl } from '@/src/infrastructure/repositories/sync.repository.impl';
import type { ISyncRepository } from '@/src/domain/repositories/sync.repository';
import { cqrsBus } from '@/src/application/cqrs/cqrs-bus';
import { configureCQRS, configureSync } from '@/src/application/cqrs/cqrs-container';

/**
 * Container d'injection de dépendances (Infrastructure Layer).
 * Miroir de `whatpass_web/src/infrastructure/di/container.ts`.
 *
 * Universel (client + serveur) : les hooks React Query tournent côté client et
 * partagent le même graphe de modules que ce container, donc le bus y est configuré.
 * `configureContainer()` est idempotent — appelé paresseusement par les hooks.
 *
 * Bible (read-only) + sync (spec 22) : repositories + handlers de commande sur le bus.
 */

let bibleRepository: IBibleRepository | null = null;
let syncRepository: ISyncRepository | null = null;
let configuredQueries: string[] = [];
let configuredCommands: string[] = [];

/** Singleton du repository Bible. */
export function getBibleRepository(): IBibleRepository {
  if (!bibleRepository) {
    bibleRepository = new BibleRepositoryImpl();
  }
  return bibleRepository;
}

/** Singleton du repository de sync (client, `fetch` vers `/api/sync/*`). */
export function getSyncRepository(): ISyncRepository {
  if (!syncRepository) {
    syncRepository = new SyncRepositoryImpl();
  }
  return syncRepository;
}

/** Branche les handlers CQRS (Bible + sync) sur le bus (idempotent). */
export function configureContainer(): string[] {
  if (configuredQueries.length === 0) {
    configuredQueries = configureCQRS(getBibleRepository());
  }
  if (configuredCommands.length === 0) {
    configuredCommands = configureSync(getSyncRepository());
  }
  return [...configuredQueries, ...configuredCommands];
}

/** Accès au bus CQRS configuré. */
export function getCqrsBus() {
  return cqrsBus;
}

/** Réinitialise le container (tests). */
export function resetContainer(): void {
  bibleRepository = null;
  syncRepository = null;
  configuredQueries = [];
  configuredCommands = [];
  cqrsBus.clear();
}