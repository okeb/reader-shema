#!/usr/bin/env node
/**
 * check-changelog.mjs — Linter du CHANGELOG.md (Keep a Changelog + SemVer + anti-fuite).
 *
 * Vérifie que CHANGELOG.md destiné à la page publique /nouveautes :
 *   • respecte le format Keep a Changelog (F) ;
 *   • est cohérent avec le SemVer et les tags git (S) ;
 *   • ne divulgue aucune information interne ou de sécurité (L).
 *
 * Statique, sans dépendance, ESM. N'importe aucun code de l'app (comme arch-check) :
 * les 3 regex du parser dupliquent `src/shared/constants/legal.ts` `parseChangelog`,
 * mais conservent les numéros de ligne pour pointer `CHANGELOG.md:LINE`.
 *
 * Règles :
 *   F. Format Keep a Changelog (Unreleased en tête, en-têtes `## [X.Y.Z] : YYYY-MM-DD`,
 *      titres `### ` parmi Ajouté/Modifié/Corrigé/Retiré/Sécurisé, sections non vides).
 *   S. Cohérence SemVer : tags git (S1), bump vs contenu (S2), ordre monotone (S3).
 *   L. Fuite d'information : denylist de motifs sensibles (crypto, DB, API, identifiants
 *      internes, postmortem, provider/env, références spec) sur titres + items.
 *
 * Allowlist (échappatoire documenté) : `.changelog-allowlist.json` à la racine du dépôt.
 * Tableau d'entrées `{ "kind": "leak"|"section"|"version", "match": "<substr>", "reason": "..." }`.
 * Silencie respectivement un match LEAK, un titre de section non standard, une version
 * sans tag / hors-ordre. Pour les exceptions intentionnelles, pas pour masquer une dérive.
 *
 * Usage :
 *   node .claude/skills/changelog-check/check-changelog.mjs              # texte
 *   node .claude/skills/changelog-check/check-changelog.mjs --json        # JSON pour agent
 *   node .claude/skills/changelog-check/check-changelog.mjs --quiet        # code + résumé
 *   node .claude/skills/changelog-check/check-changelog.mjs --strict-tags  # tags fatals
 */

import { readFileSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHANGELOG = join(ROOT, 'CHANGELOG.md');

// ---------------------------------------------------------------------------
// Règles — la « loi » du changelog du projet.
// ---------------------------------------------------------------------------

// Parser — duplique `parseChangelog` (src/shared/constants/legal.ts) à l'identique.
const HEADING_RE = /^## \[([^\]]+)\]\s*(?:[:：—–-]\s*(.+))?$/;
const SUB_RE = /^### (.+)$/;
const ITEM_RE = /^- (.+)$/;

// Titres de section admis (FR primaire + alias EN Keep a Changelog).
const ALLOWED_SECTIONS = new Set([
  'Ajouté', 'Modifié', 'Corrigé', 'Retiré', 'Sécurisé',
  'Added', 'Changed', 'Fixed', 'Removed', 'Security',
]);

// Denylist de fuite — data-driven, se modifie ici. `reason` affiché au mainteneur.
// NB : « clé de récupération » et « mot de passe » sont des concepts USER-FACING
// (l'utilisateur les voit/saisit) — ils NE sont PAS dans cette liste.
const LEAK_DENYLIST = [
  // --- Crypto : détails d'implémentation, jamais vus par l'utilisateur ---
  { pattern: /PBKDF2/i, label: 'crypto', reason: "détail d'implémentation KDF" },
  { pattern: /AES-GCM/i, label: 'crypto', reason: 'algorithme de chiffrement interne' },
  { pattern: /SHA-256/i, label: 'crypto', reason: 'hash interne' },
  { pattern: /256-bit/i, label: 'crypto', reason: 'taille de clé interne' },
  { pattern: /non-extractable/i, label: 'crypto', reason: 'propriété de clé Web Crypto' },
  { pattern: /\bDEK\b/, label: 'crypto', reason: 'clé de chiffrement interne (DEK)' },
  { pattern: /\bKEK\b/, label: 'crypto', reason: 'clé de chiffrement interne (KEK)' },
  { pattern: /enveloppe/i, label: 'crypto', reason: 'structure cryptographique interne' },
  { pattern: /master key/i, label: 'crypto', reason: 'clé maîtresse interne' },
  { pattern: /\bnonce\b/i, label: 'crypto', reason: 'paramètre cryptographique' },
  { pattern: /ciphertext/i, label: 'crypto', reason: 'terminologie de chiffrement' },
  // --- DB / schéma ---
  { pattern: /BYTEA/i, label: 'db', reason: 'type SQL interne' },
  { pattern: /neon_auth/i, label: 'db', reason: 'schéma interne' },
  { pattern: /user_data/i, label: 'db', reason: 'table interne' },
  { pattern: /schéma public/i, label: 'db', reason: 'schéma interne' },
  { pattern: /ON CONFLICT/i, label: 'db', reason: 'SQL interne' },
  { pattern: /updated_at/i, label: 'db', reason: 'colonne interne' },
  { pattern: /\bFK\b/, label: 'db', reason: 'foreign key interne' },
  { pattern: /pg\.Pool/i, label: 'db', reason: 'client DB interne' },
  { pattern: /pooler/i, label: 'db', reason: 'endpoint DB interne' },
  // --- Surface d'API ---
  { pattern: /\/api\/sync/i, label: 'api', reason: 'route API interne' },
  { pattern: /\/api\/account/i, label: 'api', reason: 'route API interne' },
  { pattern: /\b(GET|PUT|POST|DELETE)\s+\/api/i, label: 'api', reason: 'verbe+route API interne' },
  // --- Identifiants internes (noms de fonctions, clés de stockage, mécanique sync) ---
  { pattern: /upgradeLegacyToEnvelope/, label: 'ident', reason: 'symbole interne' },
  { pattern: /pushKind/, label: 'ident', reason: 'symbole interne' },
  { pattern: /hasCloudData/, label: 'ident', reason: 'symbole interne' },
  { pattern: /migrateNotes/, label: 'ident', reason: 'symbole interne' },
  { pattern: /onRehydrateStorage/, label: 'ident', reason: 'symbole interne' },
  { pattern: /meta\[kind\]/, label: 'ident', reason: "détail d'implémentation sync" },
  { pattern: /bym:nav-history/, label: 'ident', reason: 'clé localStorage interne' },
  { pattern: /bibleReaderPrefs/, label: 'ident', reason: 'clé localStorage interne' },
  { pattern: /horloge LWW/i, label: 'ident', reason: 'mécanique de sync interne' },
  { pattern: /\bLWW\b/, label: 'ident', reason: 'mécanique de sync interne' },
  { pattern: /dated 0/i, label: 'ident', reason: 'détail de bug postmortem' },
  // --- Récit de bug interne (postmortem) ---
  { pattern: /ne pousse plus/i, label: 'postmortem', reason: 'récit de bug interne' },
  { pattern: /était ignoré/i, label: 'postmortem', reason: 'récit de bug interne' },
  // --- Provider / env / domaine internes ---
  { pattern: /send\.shemaproject\.org/i, label: 'provider', reason: "domaine d'envoi interne" },
  { pattern: /BETTER_AUTH_SECRET/i, label: 'env', reason: "variable d'environnement" },
  { pattern: /BETTER_AUTH_URL/i, label: 'env', reason: "variable d'environnement" },
  { pattern: /DATABASE_URL/i, label: 'env', reason: "variable d'environnement" },
  { pattern: /RESEND_API_KEY/i, label: 'env', reason: "variable d'environnement" },
  { pattern: /baseURL dérivé/i, label: 'provider', reason: "détail d'implémentation interne" },
  // --- Références spec internes ---
  { pattern: /\bspec\s+\d+/i, label: 'spec', reason: 'référence spec interne — reformuler côté utilisateur' },
  { pattern: /\(spec\s+\d+\)/i, label: 'spec', reason: 'référence spec interne' },
];

// Marqueur d'item « breaking ».
const BREAKING_RE = /\b(breaking|cass(e|é)|rupture|incompatible)\b/i;

// ---------------------------------------------------------------------------
// Parsing (avec numéros de ligne + continuation des items)
// ---------------------------------------------------------------------------

function parseChangelogWithLines(raw) {
  const lines = raw.split('\n');
  const entries = [];
  let cur = null;
  let curSec = null;
  let curItem = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ln = i + 1;

    const h = line.match(HEADING_RE);
    if (h) {
      cur = { version: h[1], date: h[2]?.trim() ?? null, headerLine: ln, sections: [] };
      entries.push(cur);
      curSec = null;
      curItem = null;
      continue;
    }
    if (!cur) continue;

    const s = line.match(SUB_RE);
    if (s) {
      curSec = { title: s[1].trim(), titleLine: ln, items: [] };
      cur.sections.push(curSec);
      curItem = null;
      continue;
    }

    const it = line.match(ITEM_RE);
    if (it) {
      if (!curSec) continue; // item sans section : ignoré (parité avec parseChangelog)
      curItem = { text: it[1].trim(), line: ln };
      curSec.items.push(curItem);
      continue;
    }

    // Ligne de continuation (non vide, sans marker) : concaténée à l'item courant
    // pour le scan LEAK (plus strict que la page, qui ne rend que la 1ʳᵉ ligne).
    if (curItem && line.trim() !== '' && !/^(#|\s*$)/.test(line)) {
      curItem.text += ' ' + line.trim();
    }
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Git tags
// ---------------------------------------------------------------------------

function getGitTags() {
  try {
    const out = execFileSync('git', ['tag', '--list', 'v*'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'],
    });
    return out.split('\n').map(s => s.trim()).filter(Boolean).map(t => t.replace(/^v/, ''));
  } catch {
    return null; // git absent → pas de checks tag
  }
}

// ---------------------------------------------------------------------------
// Allowlist
// ---------------------------------------------------------------------------

function loadAllowlist() {
  const file = join(ROOT, '.changelog-allowlist.json');
  if (!existsSync(file)) return [];
  try {
    const list = JSON.parse(readFileSync(file, 'utf8'));
    if (!Array.isArray(list)) throw new Error('la racine doit être un tableau');
    return list.map(e => ({ kind: e.kind, match: e.match, reason: e.reason || '' }));
  } catch (err) {
    console.error(`.changelog-allowlist.json invalide : ${err.message}`);
    process.exit(2);
  }
}

function leakAllowed(allowlist, matchedText) {
  return allowlist.some(e => e.kind === 'leak' && e.match && matchedText.includes(e.match));
}
function sectionAllowed(allowlist, title) {
  return allowlist.some(e => e.kind === 'section' && e.match && title.includes(e.match));
}
function versionAllowed(allowlist, version) {
  return allowlist.some(e => e.kind === 'version' && e.match === version);
}

// ---------------------------------------------------------------------------
// Semver
// ---------------------------------------------------------------------------

function cmpSemver(a, b) {
  const [a1, a2, a3] = a.split('.').map(Number);
  const [b1, b2, b3] = b.split('.').map(Number);
  return (a1 - b1) || (a2 - b2) || (a3 - b3);
}

function bumpType(prev, cur) {
  const [p1, p2, p3] = prev.split('.').map(Number);
  const [c1, c2, c3] = cur.split('.').map(Number);
  if (c1 > p1) return 'major';
  if (c2 > p2) return 'minor';
  if (c3 > p3) return 'patch';
  return 'none';
}

function contentProfile(entry) {
  const p = { added: 0, changed: 0, fixed: 0, removed: 0, security: 0, breaking: false };
  for (const s of entry.sections) {
    const t = s.title.toLowerCase();
    if (t === 'ajouté' || t === 'added') p.added += s.items.length;
    else if (t === 'modifié' || t === 'changed') p.changed += s.items.length;
    else if (t === 'corrigé' || t === 'fixed') p.fixed += s.items.length;
    else if (t === 'retiré' || t === 'removed') p.removed += s.items.length;
    else if (t === 'sécurisé' || t === 'security') p.security += s.items.length;
    if (s.items.some(i => BREAKING_RE.test(i.text))) p.breaking = true;
  }
  return p;
}

// ---------------------------------------------------------------------------
// Vérification
// ---------------------------------------------------------------------------

function check() {
  const allowlist = loadAllowlist();
  const violations = [];
  const sections = [];
  const versions = [];

  if (!existsSync(CHANGELOG)) {
    console.error(`CHANGELOG.md introuvable à ${CHANGELOG}`);
    process.exit(2);
  }
  const raw = readFileSync(CHANGELOG, 'utf8');
  const entries = parseChangelogWithLines(raw);
  const tags = getGitTags();

  // Index plat des sections (pour --json)
  for (const e of entries) {
    for (const s of e.sections) {
      sections.push({ version: e.version, title: s.title, titleLine: s.titleLine, itemCount: s.items.length });
    }
  }

  const realEntries = entries.filter(e => e.version !== 'Unreleased');
  for (const e of realEntries) {
    versions.push({ version: e.version, date: e.date, headerLine: e.headerLine });
  }

  // --- F1 : Unreleased en tête
  if (entries.length === 0 || entries[0].version !== 'Unreleased') {
    violations.push({ rule: 'F1', file: 'CHANGELOG.md', line: entries[0]?.headerLine ?? 1, severity: 'fatal',
      msg: "section ## [Unreleased] manquante en tête du fichier" });
  }

  // --- F2 : format d'en-tête de version (version + date ISO)
  for (const e of entries) {
    if (e.version === 'Unreleased') continue;
    if (!/^\d+\.\d+\.\d+$/.test(e.version)) {
      violations.push({ rule: 'F2', file: 'CHANGELOG.md', line: e.headerLine, severity: 'fatal',
        msg: `version non SemVer : « ${e.version} »` });
    }
    if (!e.date || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
      violations.push({ rule: 'F2', file: 'CHANGELOG.md', line: e.headerLine, severity: 'fatal',
        msg: `date ISO manquante pour [${e.version}]` });
    }
  }

  for (const e of entries) {
    // --- F3 : titres de section admis (allowlistable)
    for (const s of e.sections) {
      if (!ALLOWED_SECTIONS.has(s.title) && !sectionAllowed(allowlist, s.title)) {
        violations.push({ rule: 'F3', file: 'CHANGELOG.md', line: s.titleLine, severity: 'fatal',
          msg: `titre de section non user-facing : « ${s.title} »` });
      }
      // --- F4 : section non vide (sauf Unreleased)
      if (e.version !== 'Unreleased' && s.items.length === 0) {
        violations.push({ rule: 'F4', file: 'CHANGELOG.md', line: s.titleLine, severity: 'fatal',
          msg: `section vide dans [${e.version}] : « ${s.title} »` });
      }
    }
    // --- F5 : version non vide (sauf Unreleased)
    if (e.version !== 'Unreleased') {
      const total = e.sections.reduce((n, s) => n + s.items.length, 0);
      if (e.sections.length === 0 || total === 0) {
        violations.push({ rule: 'F5', file: 'CHANGELOG.md', line: e.headerLine, severity: 'fatal',
          msg: `version vide : [${e.version}] n'a aucun item` });
      }
    }
  }

  // --- F6 / L : scan LEAK sur titres + items (toutes entrées, y compris Unreleased)
  for (const e of entries) {
    for (const s of e.sections) {
      for (const deny of LEAK_DENYLIST) {
        const titleHit = s.title.match(deny.pattern);
        if (titleHit && !leakAllowed(allowlist, s.title)) {
          violations.push({ rule: 'L', file: 'CHANGELOG.md', line: s.titleLine, severity: 'fatal',
            label: deny.label, match: deny.reason,
            msg: `fuite ${deny.label} (titre) : « ${titleHit[0]} » — ${deny.reason}` });
        }
        for (const it of s.items) {
          const hit = it.text.match(deny.pattern);
          if (hit && !leakAllowed(allowlist, it.text)) {
            violations.push({ rule: 'L', file: 'CHANGELOG.md', line: it.line, severity: 'fatal',
              label: deny.label, match: deny.reason,
              msg: `fuite ${deny.label} : « ${hit[0]} » — ${deny.reason}` });
          }
        }
      }
    }
  }

  // --- S1 : cohérence tags git (warning sauf --strict-tags)
  if (tags) {
    for (const v of realEntries) {
      if (!tags.includes(v.version) && !versionAllowed(allowlist, v.version)) {
        violations.push({ rule: 'S1', file: 'CHANGELOG.md', line: v.headerLine, severity: 'warning',
          msg: `aucun tag git v${v.version}` });
      }
    }
    for (const t of tags) {
      if (!realEntries.some(e => e.version === t)) {
        violations.push({ rule: 'S1', file: 'CHANGELOG.md', line: 0, severity: 'warning',
          msg: `tag orphelin v${t} absent du CHANGELOG` });
      }
    }
  }

  // --- S2 : bump vs contenu (entrées réelles, ordre fichier = descendant)
  for (let k = 0; k < realEntries.length; k++) {
    const cur = realEntries[k];
    const prev = realEntries[k + 1]; // entrée plus ancienne, juste en dessous
    if (!prev) break;
    if (!/^\d+\.\d+\.\d+$/.test(cur.version) || !/^\d+\.\d+\.\d+$/.test(prev.version)) continue;
    if (versionAllowed(allowlist, cur.version)) continue; // exception historique documentée
    const bump = bumpType(prev.version, cur.version);
    const p = contentProfile(cur);
    const loc = { file: 'CHANGELOG.md', line: cur.headerLine };

    if (bump === 'none') {
      violations.push({ rule: 'S2', ...loc, severity: 'fatal',
        msg: `pas de montée de version : ${prev.version} → ${cur.version}` });
      continue;
    }
    if (p.added > 0 && bump === 'patch') {
      violations.push({ rule: 'S2', ...loc, severity: 'fatal',
        msg: `feature-in-patch : [${cur.version}] contient « Ajouté » mais le bump ${prev.version}→${cur.version} est un PATCH` });
    }
    const breaking = p.removed > 0 || p.security > 0 || p.breaking;
    if (breaking && bump === 'patch') {
      violations.push({ rule: 'S2', ...loc, severity: 'fatal',
        msg: `breaking-in-patch : [${cur.version}] contient un retrait/sécurité/breaking mais le bump est un PATCH` });
    }
    const fixOnly = p.fixed > 0 && p.added === 0 && p.removed === 0 && p.changed === 0 && p.security === 0;
    if (fixOnly && bump === 'minor') {
      violations.push({ rule: 'S2', ...loc, severity: 'fatal',
        msg: `fix-bumped-minor : [${cur.version}] ne contient que des correctifs mais le bump est un MINEUR` });
    }
    if (fixOnly && bump === 'major') {
      violations.push({ rule: 'S2', ...loc, severity: 'warning',
        msg: `fix-bumped-major : [${cur.version}] ne contient que des correctifs mais le bump est un MAJEUR` });
    }
    const changedOnly = p.changed > 0 && p.added === 0 && p.removed === 0 && p.fixed === 0 && p.security === 0;
    if (changedOnly && bump === 'major') {
      violations.push({ rule: 'S2', ...loc, severity: 'warning',
        msg: `changed-bumped-major : [${cur.version}] ne contient que des modifications mais le bump est un MAJEUR` });
    }
  }

  // --- S3 : ordre monotone décroissant (Unreleased = +∞)
  for (let k = 0; k < entries.length - 1; k++) {
    const cur = entries[k];
    const prev = entries[k + 1]; // plus ancien
    if (cur.version === 'Unreleased') continue;
    if (prev.version === 'Unreleased') {
      violations.push({ rule: 'S3', file: 'CHANGELOG.md', line: prev.headerLine, severity: 'fatal',
        msg: '## [Unreleased] doit être la première section' });
      continue;
    }
    if (!/^\d+\.\d+\.\d+$/.test(cur.version) || !/^\d+\.\d+\.\d+$/.test(prev.version)) continue;
    if (cmpSemver(cur.version, prev.version) <= 0) {
      violations.push({ rule: 'S3', file: 'CHANGELOG.md', line: cur.headerLine, severity: 'fatal',
        msg: `ordre non décroissant : [${cur.version}] placé après [${prev.version}]` });
    }
    if (cur.date && prev.date && cur.date < prev.date) {
      violations.push({ rule: 'S3', file: 'CHANGELOG.md', line: cur.headerLine, severity: 'warning',
        msg: `dates non monotones : [${cur.version}] ${cur.date} avant [${prev.version}] ${prev.date}` });
    }
  }

  violations.sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule));
  return { violations, sections, versions, tags: tags || [], allowlist, entriesCount: entries.length };
}

// ---------------------------------------------------------------------------
// Sortie
// ---------------------------------------------------------------------------

const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');
const quiet = args.has('--quiet');
const strictTags = args.has('--strict-tags');

const { violations, sections, versions, tags, allowlist, entriesCount } = check();

const fatal = violations.filter(v => v.severity === 'fatal' || (strictTags && v.rule === 'S1'));
const ok = fatal.length === 0;

if (asJson) {
  console.log(JSON.stringify({
    ok, violations, sections, versions, tags,
    allowlistEntries: allowlist.length,
    entriesCount,
  }, null, 2));
} else if (!quiet) {
  // En mode normal, les S1 (tags) sont des warnings non affichés dans le détail ;
  // --strict-tags les rend fatals et les montre.
  const display = strictTags ? violations : violations.filter(v => !(v.rule === 'S1' && v.severity === 'warning'));
  const byRule = {};
  for (const v of display) byRule[v.rule] = (byRule[v.rule] || 0) + 1;
  for (const v of display) {
    const loc = v.line ? `CHANGELOG.md:${v.line}` : 'CHANGELOG.md';
    console.log(`  ${v.severity === 'warning' ? '⚠' : '✗'} [${v.rule}] ${loc}  —  ${v.msg}`);
  }
  console.log('');
  console.log(`CHANGELOG entries : ${entriesCount}  ·  Sections : ${sections.length}  ·  Tags git : ${tags.length}`);
  console.log(`Allowlist : ${allowlist.length} entrée(s) documentée(s)`);
  console.log(`Violations : ${display.length}` +
    (display.length ? ` (${Object.entries(byRule).map(([r, n]) => `${r}×${n}`).join(', ')})` : ''));
  console.log(`  F = format Keep a Changelog | S = cohérence SemVer / tags | L = fuite d'information`);
}

if (ok) {
  if (!asJson && !quiet) console.log('\n✅ CHANGELOG conforme.');
  process.exit(0);
} else {
  if (!asJson && !quiet) console.log('\n❌ CHANGELOG non conforme — voir violations ci-dessus.');
  process.exit(1);
}