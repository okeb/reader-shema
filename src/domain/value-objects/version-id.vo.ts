import { getVersion } from '@/src/shared/constants/bible-versions';

/**
 * Value-object identifiant une version de la Bible (ex. "bym", "lsg", "darby"). `orig` est une
 * source technique valide pour les textes originaux, sans être proposée comme version de lecture.
 * Valide à la construction via `getVersion` (retourne la version par défaut si inconnue).
 */
export class VersionId {
  static isValid(value: string): boolean {
    return value === 'orig' || (getVersion(value) !== undefined && getVersion(value).id === value);
  }

  private constructor(readonly value: string) {}

  static create(value: string): VersionId {
    // `getVersion` renvoie toujours au moins la version par défaut ; on vérifie l'exactitude.
    if (!VersionId.isValid(value)) {
      throw new Error(`VersionId invalide : "${value}"`);
    }
    return new VersionId(value);
  }

  static safe(value: string): VersionId | null {
    return VersionId.isValid(value) ? new VersionId(value) : null;
  }

  equals(other: VersionId): boolean {
    return this.value === other.value;
  }
}
