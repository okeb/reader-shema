import { BibleRepositoryImpl } from '@/src/infrastructure/repositories/bible.repository.impl';
import type { IBibleRepository } from '@/src/domain/repositories/bible.repository';
import { cqrsBus } from '@/src/application/cqrs/cqrs-bus';
import { configureCQRS } from '@/src/application/cqrs/cqrs-container';

/**
 * Container d'injection de dépendances (Infrastructure Layer).
 * Miroir de `whatpass_web/src/infrastructure/di/container.ts`.
 *
 * Universel (client + serveur) : les hooks React Query tournent côté client et
 * partagent le même graphe de modules que ce container, donc le bus y est configuré.
 * `configureContainer()` est idempotent — appelé paresseusement par les hooks.
 *
 * Pour l'instant : un seul repository (Bible, read-only). L'auth / le compte-sync
 * (spec 22) ajouteront ici leurs repositories + command handlers.
 */

let bibleRepository: IBibleRepository | null = null;
let configuredQueries: string[] = [];

/** Singleton du repository Bible. */
export function getBibleRepository(): IBibleRepository {
  if (!bibleRepository) {
    bibleRepository = new BibleRepositoryImpl();
  }
  return bibleRepository;
}

/** Branche les handlers CQRS sur le bus (idempotent). */
export function configureContainer(): string[] {
  if (configuredQueries.length === 0) {
    configuredQueries = configureCQRS(getBibleRepository());
  }
  return configuredQueries;
}

/** Accès au bus CQRS configuré. */
export function getCqrsBus() {
  return cqrsBus;
}

/** Réinitialise le container (tests). */
export function resetContainer(): void {
  bibleRepository = null;
  configuredQueries = [];
  cqrsBus.clear();
}