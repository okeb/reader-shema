import { readFile } from "fs/promises";
import { resolve } from "path";
import { parseChangelog, type ChangelogEntry } from "@/src/shared/constants/legal";

/**
 * Lit et parse CHANGELOG.md au build time (server-only).
 * À utiliser uniquement dans les Server Components (pages info).
 */
export async function getChangelog(): Promise<ChangelogEntry[]> {
  const raw = await readFile(resolve(process.cwd(), "CHANGELOG.md"), "utf-8");
  return parseChangelog(raw);
}