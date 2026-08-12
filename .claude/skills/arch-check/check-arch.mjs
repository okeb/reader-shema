#!/usr/bin/env node
/**
 * check-arch.mjs — Linter d'architecture (Clean Architecture + CQRS + atomic design).
 *
 * Vérifie, de façon stricte, que le projet reader_shema respecte ses conventions
 * d'architecture. Statique, sans dépendance, ESM. Sortie 0 si conforme, 1 sinon.
 *
 * Règles :
 *   A. Direction des dépendances entre couches (clean architecture, vers l'intérieur).
 *   B. Direction des tiers de composants (atomic design : un tier ne peut importer
 *      qu'un tier de rang ÉGAL ou INFÉRIEUR).
 *   C. Les fichiers `*.impl.ts` (implémentations de repositories/services) doivent
 *      vivre sous `src/infrastructure/`.
 *   D. `src/domain/` ne doit importer aucun framework UI/serveur (next, react,
 *      zustand, react-query, etc.) — le domaine reste pur.
 *
 * Allowlist (échappatoire documenté) : `.architecture-allowlist.json` à la racine
 * du dépôt. Tableau d'entrées `{ "from": "<chemin src>", "to": "<spec import>",
 * "reason": "..." }`. Une arête correspondante est silencée. Impliquez-la pour
 * les exceptions intentionnelles (ex. wiring du container DI), pas pour masquer
 * une dérive.
 *
 * Usage :
 *   node .claude/skills/arch-check/check-arch.mjs           # texte
 *   node .claude/skills/arch-check/check-arch.mjs --json     # JSON pour agent
 *   node .claude/skills/arch-check/check-arch.mjs --quiet    # juste code + résumé
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SRC = join(ROOT, 'src');

// ---------------------------------------------------------------------------
// Règles — la « loi » de l'architecture du projet.
// ---------------------------------------------------------------------------

// Couches clean architecture (rang = du plus interne au plus externe).
const LAYERS = ['domain', 'application', 'infrastructure', 'presentation', 'shared'];
// `shared` est le noyau partagé : tout le monde peut le lire, il ne lit personne.

// Dépendances autorisées par couche : une couche ne peut importer que vers les
// couches listées (vers l'intérieur). Toute arête vers une couche absente = violation.
const ALLOWED_LAYERS = {
  domain:         ['domain', 'shared'],
  application:    ['application', 'domain', 'shared'],
  infrastructure: ['infrastructure', 'application', 'domain', 'shared'],
  presentation:  ['presentation', 'application', 'domain', 'shared'],
  shared:         ['shared'],
};

// Tiers atomic design (rang croissant). Un composant ne peut importer qu'un tier
// de rang ÉGAL ou INFÉRIEUR (atoms → atoms ; molecules → atoms+molecules ; etc.).
const TIERS = ['atoms', 'molecules', 'organisms', 'templates'];

// Frameworks interdits dans `domain/` (le domaine doit rester pur).
const DOMAIN_FORBIDDEN = [
  'next', 'react', 'react-dom', '@tanstack', 'zustand', 'immer',
  'react-hook-form', 'zod', '@hookform', '@iconify', 'framer-motion',
  '@rive-app', 'sonner', 'next-intl', 'next-themes', 'better-auth',
];

// ---------------------------------------------------------------------------
// Parsing & résolution d'imports
// ---------------------------------------------------------------------------

const IMPORT_RE =
  /(?:import\s+(?:[^'"`\n]+?\s+from\s+)?|export\s+(?:[^'"`\n]+?\s+from\s+)?|require\s*\(\s*)['"`]([^'"`\n]+)['"`]/g;

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(e) && !/\.d\.ts$/.test(e)) out.push(p);
  }
  return out;
}

function classifyLayer(absPath) {
  const rel = relative(SRC, absPath);
  return LAYERS.find(l => rel === l || rel.startsWith(l + '/')) || null;
}

function classifyTier(absPath) {
  const compRoot = join(SRC, 'presentation', 'components');
  const rel = relative(compRoot, absPath);
  if (rel.startsWith('..') || rel === '') return null;
  return TIERS.find(t => rel === t || rel.startsWith(t + '/')) || null;
}

// Résout un spec d'import vers un chemin absolu (best-effort, style résolution TS).
function resolveSpec(fromFile, spec) {
  let base;
  if (spec.startsWith('@/')) base = resolve(ROOT, spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec);
  else return null; // module externe (npm)
  for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '.mjs']) {
    for (const cand of [base + ext, join(base, 'index' + ext)]) {
      if (existsSync(cand)) return cand;
    }
  }
  return null; // non résolu (type-only, barrel manquant, etc.)
}

function isExternalFramework(spec, libs) {
  return libs.some(lib => spec === lib || spec.startsWith(lib + '/'));
}

// ---------------------------------------------------------------------------
// Allowlist
// ---------------------------------------------------------------------------

function loadAllowlist() {
  const file = join(ROOT, '.architecture-allowlist.json');
  if (!existsSync(file)) return [];
  try {
    const list = JSON.parse(readFileSync(file, 'utf8'));
    if (!Array.isArray(list)) throw new Error('racine doit être un tableau');
    return list.map(e => ({ from: e.from, to: e.to, reason: e.reason || '' }));
  } catch (err) {
    console.error(`.architecture-allowlist.json invalide : ${err.message}`);
    process.exit(2);
  }
}

function edgeAllowed(allowlist, fromRel, spec) {
  return allowlist.some(e => e.from === fromRel && e.to === spec);
}

// ---------------------------------------------------------------------------
// Vérification
// ---------------------------------------------------------------------------

function check() {
  const allowlist = loadAllowlist();
  const violations = [];
  if (!existsSync(SRC)) {
    console.error(`Aucun dossier src/ trouvé à ${SRC}`);
    process.exit(2);
  }

  const files = walk(SRC);

  for (const f of files) {
    const fromLayer = classifyLayer(f);
    if (!fromLayer) continue;
    const fromRel = relative(ROOT, f);
    const fromTier = classifyTier(f);
    const fromRank = fromTier ? TIERS.indexOf(fromTier) : null;

    const lines = readFileSync(f, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      let m;
      IMPORT_RE.lastIndex = 0;
      while ((m = IMPORT_RE.exec(lines[i])) !== null) {
        const spec = m[1];
        const lineNo = i + 1;

        // --- Rule D : domain framework-free (sur le spec brut, avant résolution)
        if (fromLayer === 'domain' && isExternalFramework(spec, DOMAIN_FORBIDDEN)) {
          violations.push({ rule: 'D', file: fromRel, line: lineNo, spec,
            msg: `domain importe un framework interdit (${spec})` });
          continue;
        }

        const resolved = resolveSpec(f, spec);
        if (!resolved) continue; // externe ou non résolu
        const rel = relative(ROOT, resolved);
        if (!rel.startsWith('src/')) continue;

        const toLayer = classifyLayer(resolved);
        if (!toLayer) continue;

        // --- Rule A : direction des couches
        if (!ALLOWED_LAYERS[fromLayer].includes(toLayer)) {
          if (edgeAllowed(allowlist, fromRel, spec)) continue;
          violations.push({ rule: 'A', file: fromRel, line: lineNo, spec,
            msg: `${fromLayer} -> ${toLayer} interdit (attendu: ${ALLOWED_LAYERS[fromLayer].join(', ')})` });
          continue;
        }

        // --- Rule B : direction des tiers atomic design (uniquement entre composants)
        const toTier = classifyTier(resolved);
        if (fromTier && toTier) {
          const toRank = TIERS.indexOf(toTier);
          if (toRank > fromRank) {
            if (edgeAllowed(allowlist, fromRel, spec)) continue;
            violations.push({ rule: 'B', file: fromRel, line: lineNo, spec,
              msg: `tier ${fromTier} importe ${toTier} (rang supérieur interdit)` });
          }
        }
      }
    }
  }

  // --- Rule C : .impl.ts hors infrastructure
  for (const f of files) {
    const rel = relative(ROOT, f);
    if (/\.impl\.tsx?$/.test(f) && !relative(SRC, f).startsWith('infrastructure/')) {
      violations.push({ rule: 'C', file: rel, line: 0, spec: '',
        msg: 'implémentation .impl.ts en dehors de infrastructure/' });
    }
  }

  return { violations, allowlist, filesScanned: files.length };
}

// ---------------------------------------------------------------------------
// Sortie
// ---------------------------------------------------------------------------

const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');
const quiet = args.has('--quiet');

const { violations, allowlist, filesScanned } = check();
violations.sort((a, b) =>
  a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule));

if (asJson) {
  console.log(JSON.stringify({
    ok: violations.length === 0,
    violations,
    allowlistEntries: allowlist.length,
    filesScanned,
  }, null, 2));
} else if (!quiet) {
  const byRule = {};
  for (const v of violations) byRule[v.rule] = (byRule[v.rule] || 0) + 1;
  for (const v of violations) {
    const loc = v.line ? `${v.file}:${v.line}` : v.file;
    console.log(`  ✗ [${v.rule}] ${loc}  —  ${v.msg}  ${v.spec ? `(${v.spec})` : ''}`);
  }
  console.log('');
  console.log(`Fichiers scannés : ${filesScanned}`);
  console.log(`Allowlist : ${allowlist.length} entrée(s) documentée(s)`);
  console.log(`Violations : ${violations.length}` +
    (violations.length ? ` (${Object.entries(byRule).map(([r, n]) => `${r}×${n}`).join(', ')})` : ''));
  console.log(`  A = direction des couches | B = tiers atomic design | C = .impl.ts confiné | D = domain pur`);
}

if (violations.length === 0) {
  if (!asJson && !quiet) console.log('\n✅ Architecture conforme.');
  process.exit(0);
} else {
  if (!asJson && !quiet) console.log('\n❌ Architecture non conforme — voir violations ci-dessus.');
  process.exit(1);
}