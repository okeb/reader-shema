/**
 * Value-object de sélection de versets.
 * Reproduit make_selection() de l'API (shema/index.js) et la compression inverse.
 */
export class VerseSelection {
  private constructor(private readonly numbers: readonly number[]) {}

  static parse(input: string): VerseSelection {
    const out: number[] = [];
    for (const part of input.split(',')) {
      if (part.includes('-')) {
        const [a, b] = part.split('-').map(Number);
        if (Number.isFinite(a) && Number.isFinite(b)) {
          for (let i = a; i <= b; i++) out.push(i);
        }
      } else {
        const n = Number(part);
        if (Number.isFinite(n)) out.push(n);
      }
    }
    return new VerseSelection(out);
  }

  static fromList(nums: readonly number[]): VerseSelection {
    return new VerseSelection(nums);
  }

  getValue(): readonly number[] {
    return this.numbers;
  }

  /** Compresse la liste en une sélection lisible (ex. [1,2,3,5] → "1-3,5"). */
  compress(): string {
    const sorted = Array.from(new Set(this.numbers)).sort((a, b) => a - b);
    if (sorted.length === 0) return '';
    const parts: string[] = [];
    let start = sorted[0];
    let prev = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const n = sorted[i];
      if (n === prev + 1) {
        prev = n;
        continue;
      }
      parts.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = prev = n;
    }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`);
    return parts.join(',');
  }

  equals(other: VerseSelection): boolean {
    return this.compress() === other.compress();
  }
}

/** Helper libre : parse une sélection en liste de numéros. */
export function parseSelection(input: string): number[] {
  return VerseSelection.parse(input).getValue() as number[];
}

/** Helper libre : compresse une liste de numéros en sélection lisible. */
export function compressVerses(nums: readonly number[]): string {
  return VerseSelection.fromList(nums).compress();
}